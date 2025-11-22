import { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { cleanProductText } from '../../../lib/textCleaner';
import { canChangeProductColor } from '../../../lib/warehouseChecker';
import { normalizeColorName } from '../../../lib/colorNormalizer';
import { logUserActionDirect as logUserAction, getUserIdFromCookie } from '../../../lib/actionLogger';
import { withPermissions, RoleChecks } from '../../../lib/api/roleAuth';
import { normalizeArticle } from '../../../lib/utils/normalize';
import { withCsrfProtection } from '../../../lib/csrf';
import { withRateLimit, RateLimitConfigs } from '../../../lib/rateLimiter';
import { log } from '../../../lib/loggingService';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;

  if (req.method === 'GET') {
    try {
      const { data: product, error } = await supabaseAdmin
        .from('products')
        .select(`
          *,
          brand:brands!products_brand_id_fkey (
            id,
            name
          ),
          category:categories!products_category_id_fkey (
            id,
            name
          )
        `)
        .eq('id', id)
        .single();

      if (error) {
        log.error('Ошибка при получении товара', error as Error, {
          endpoint: `/api/products/${id}`,
          metadata: { productId: id }
        });
        return res.status(404).json({ error: 'Товар не найден' });
      }

      // Загружаем цвет отдельно, если есть color_id
      let colorData = null;
      if (product.color_id) {
        const { data: color } = await supabaseAdmin
          .from('colors')
          .select('id, name')
          .eq('id', product.color_id)
          .single();
        colorData = color ? {
          id: color.id,
          name: normalizeColorName(color.name)
        } : null;
      }

      // Нормализуем массивы text[] в строки без [" "] для UI
      const normalize = (v: any) => {
        if (v === null || v === undefined) return '';
        if (Array.isArray(v)) {
          return v.join(' ').replace(/\["|"\]/g, '');
        }
        if (typeof v === 'string') {
          // Удаляем квадратные скобки и кавычки из строк
          let cleaned = v.replace(/\["|"\]/g, '').replace(/^\[|\]$/g, '');
          // Дополнительная очистка от лишних символов экранирования
          cleaned = cleaned.replace(/\\+"/g, '"');
          cleaned = cleaned.replace(/\\+/g, '\\');
          cleaned = cleaned.replace(/^["\\[\s]+/, '');
          cleaned = cleaned.replace(/["\\]\s]+$/, '');
          cleaned = cleaned.replace(/\|+/g, '');
          return cleaned.trim();
        }
        return v;
      };
      
      const normalized = {
        ...product,
        color: colorData,
        care_instructions: normalize((product as any).care_instructions),
        features: normalize((product as any).features),
        technical_specs: normalize((product as any).technical_specs),
        materials_info: normalize((product as any).materials_info),
        description: normalize((product as any).description),
      };

      // Очищаем текстовые поля от лишних символов
      const cleaned = cleanProductText(normalized);

      return res.status(200).json({ data: { product: cleaned } });
    } catch (error) {
      log.error('Ошибка сервера при получении товара', error as Error, {
        endpoint: `/api/products/${id}`,
        metadata: { productId: id }
      });
      return res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
  }

  if (req.method === 'PUT') {
    try {
      const {
        name,
        article,
        brand_id,
        category_id,
        color_id,
        composition,
        price,
        old_price,
        is_popular,
        is_visible,
        care_instructions
      } = req.body;

      // Строгая валидация обязательных полей
      const errors: string[] = [];

      // Проверяем, что все обязательные поля присутствуют и не пустые
      if (!name || typeof name !== 'string' || !name.trim()) {
        errors.push('Название товара обязательно');
      }
      if (!brand_id || isNaN(parseInt(brand_id))) {
        errors.push('Бренд обязателен');
      }
      if (!category_id || isNaN(parseInt(category_id))) {
        errors.push('Категория обязательна');
      }
      if (!color_id || isNaN(parseInt(color_id))) {
        errors.push('Цвет обязателен');
      }
      if (!article || typeof article !== 'string' || !article.trim()) {
        errors.push('Артикул обязателен');
      }
      if (!price || isNaN(parseFloat(price)) || parseFloat(price) <= 0) {
        errors.push('Цена должна быть больше 0');
      }
      if (!composition || typeof composition !== 'string' || !composition.trim()) {
        errors.push('Состав обязателен');
      }
      // Описание необязательно - убираем валидацию

      // Валидация артикула
      if (article && article.trim()) {
        const latinOnly = /^[a-zA-Z0-9\s\-_]+$/;
        if (!latinOnly.test(article)) {
          errors.push('Артикул может содержать только латинские буквы, цифры, пробелы, дефисы и подчеркивания');
        }
      }

      if (errors.length > 0) {
        return res.status(400).json({ 
          error: 'Ошибки валидации',
          details: errors
        });
      }

      // Нормализуем артикул: первая буква должна быть заглавной
      const normalizedArticle = normalizeArticle(article);

      // Проверяем, можно ли изменить цвет товара
      const currentProduct = await supabaseAdmin
        .from('products')
        .select('color_id')
        .eq('id', id)
        .single();

      if (currentProduct.data && currentProduct.data.color_id !== parseInt(color_id)) {
        const colorCheck = await canChangeProductColor(parseInt(id as string));
        
        if (!colorCheck.canChange) {
          return res.status(400).json({
            error: 'Нельзя изменить цвет товара',
            details: [colorCheck.reason || 'Товар имеет Склад'],
            stockInfo: colorCheck.stockInfo
          });
        }
      }

      // Проверяем, существует ли уже товар с таким артикулом и цветом (исключая текущий товар)
      if (normalizedArticle && color_id) {
        // Проверяем только товары с указанным цветом
        const result = await supabaseAdmin
          .from('products')
          .select('id, name, article, color_id')
          .eq('article', normalizedArticle)
          .eq('color_id', parseInt(color_id))
          .neq('id', id) // Исключаем текущий товар
          .single();
        
        if (result.error && result.error.code !== 'PGRST116') { // PGRST116 = no rows returned
          log.error('Ошибка проверки существующего товара', result.error as Error, {
            endpoint: `/api/products/${id}`,
            metadata: { productId: id, article: normalizedArticle }
          });
          return res.status(500).json({ error: 'Ошибка проверки существующего товара' });
        }

        if (result.data) {
          return res.status(400).json({ 
            error: `Товар с артикулом "${article}" и выбранным цветом уже существует. На один артикул и цвет может быть только одна карточка товара.`
          });
        }
      }

      // Обновляем товар только если все обязательные поля заполнены
      const updateData = {
        name: name.trim(),
        article: normalizedArticle,
        brand_id: parseInt(brand_id),
        category_id: parseInt(category_id),
        color_id: parseInt(color_id),
        composition: composition.trim(),
        care_instructions: (care_instructions ?? '').toString().trim() || null,
        price: parseFloat(price),
        old_price: old_price ? parseFloat(old_price) : null,
        is_popular: is_popular || false,
        is_visible: is_visible !== undefined ? is_visible : true,
        updated_at: new Date().toISOString()
      };

      const { data: product, error } = await supabaseAdmin
        .from('products')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        const userId = getUserIdFromCookie(req);
        log.error('Ошибка при обновлении товара', error as Error, {
          endpoint: `/api/products/${id}`,
          userId: userId || undefined,
          metadata: { productId: id }
        });
        if (userId) {
          await logUserAction(userId, 'Редактирование товара', 'error', `Ошибка: ${error.message}`);
        }
        return res.status(500).json({ error: 'Ошибка при обновлении товара' });
      }

      // 🚫 АВТОМАТИЧЕСКОЕ СКРЫТИЕ: Проверяем наличие изображений после обновления
      const { data: productImages, error: imagesError } = await supabaseAdmin
        .from('product_images')
        .select('id')
        .eq('product_id', id);

      if (!imagesError && (!productImages || productImages.length === 0)) {
        // Товар без изображений - скрываем его
        await supabaseAdmin
          .from('products')
          .update({ 
            is_visible: false, 
            updated_at: new Date().toISOString() 
          })
          .eq('id', id);
        
        log.info(`Товар ${id} (${article}) скрыт - нет изображений`, {
          endpoint: `/api/products/${id}`,
          metadata: { productId: id, article: normalizedArticle }
        });
      }

      // Логируем успешное обновление
      const userId = getUserIdFromCookie(req);
      if (userId) {
        await logUserAction(userId, 'Редактирование товара', 'success', `Обновлен товар: ${name} (${article})`);
      }

      return res.status(200).json(product);
    } catch (error) {
      log.error('Ошибка сервера при обновлении товара', error as Error, {
        endpoint: `/api/products/${id}`,
        metadata: { productId: id }
      });
      return res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
  }

  if (req.method === 'DELETE') {
    try {
      // Проверяем зависимости товара
      const { data: receiptItems } = await supabaseAdmin
        .from('receipt_items')
        .select('id, qty')
        .eq('product_id', id);
      
      const { data: realizationItems } = await supabaseAdmin
        .from('realization_items')
        .select('id, qty')
        .eq('product_id', id);

      // Если есть Склад, предлагаем альтернативу
      if (receiptItems && receiptItems.length > 0) {
        const totalStock = receiptItems.reduce((sum: number, item: any) => sum + (item.qty || 0), 0);
        return res.status(400).json({ 
          error: `Нельзя удалить товар. На складе осталось ${totalStock} шт. Сначала удалите Склад или скройте товар.`,
          stockCount: totalStock,
          hasStock: true
        });
      }

      // Если есть реализации, предлагаем альтернативу
      if (realizationItems && realizationItems.length > 0) {
        return res.status(400).json({ 
          error: 'Нельзя удалить товар. Есть записи реализации. Сначала удалите реализации или скройте товар.',
          hasRealizations: true
        });
      }

      // Сначала получаем изображения товара для удаления из Storage
      const { data: productImages } = await supabaseAdmin
        .from('product_images')
        .select('image_url')
        .eq('product_id', id);

      // Удаляем файлы из Storage
      if (productImages && productImages.length > 0) {
        const filesToDelete = productImages.map((img: any) => {
          // Извлекаем путь к файлу из URL
          const url = new URL(img.image_url);
          const pathParts = url.pathname.split('/');
          const filePath = pathParts.slice(-2).join('/'); // products/filename.jpg
          return filePath;
        });

        log.debug('Удаляем файлы из Storage', {
          endpoint: `/api/products/${id}`,
          metadata: { productId: id, filesCount: filesToDelete.length }
        });

        // Удаляем файлы из Storage
        const { error: storageError } = await supabaseAdmin.storage
          .from('images')
          .remove(filesToDelete);

        if (storageError) {
          log.error('Ошибка удаления файлов из Storage', storageError as Error, {
            endpoint: `/api/products/${id}`,
            metadata: { productId: id }
          });
        } else {
          log.info(`Удалено ${filesToDelete.length} файлов из Storage`, {
            endpoint: `/api/products/${id}`,
            metadata: { productId: id }
          });
        }
      }

      // Удаляем записи изображений из БД
      await supabaseAdmin
        .from('product_images')
        .delete()
        .eq('product_id', id);

      // Затем удаляем сам товар
      const { error } = await supabaseAdmin
        .from('products')
        .delete()
        .eq('id', id);

      if (error) {
        const userId = getUserIdFromCookie(req);
        log.error('Ошибка при удалении товара', error as Error, {
          endpoint: `/api/products/${id}`,
          userId: userId || undefined,
          metadata: { productId: id }
        });
        if (userId) {
          await logUserAction(userId, 'Удаление товара', 'error', `Ошибка: ${error.message}`);
        }
        return res.status(500).json({ error: 'Ошибка при удалении товара' });
      }

      // Логируем успешное удаление
      const userId = getUserIdFromCookie(req);
      if (userId) {
        await logUserAction(userId, 'Удаление товара', 'success', `Удален товар с ID: ${id}`);
      }

      return res.status(200).json({ message: 'Товар успешно удален' });
    } catch (error) {
      log.error('Ошибка сервера при удалении товара', error as Error, {
        endpoint: `/api/products/${id}`,
        metadata: { productId: id }
      });
      return res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
  }

  return res.status(405).json({ error: 'Метод не поддерживается' });
}

// Разрешаем управление товарами админам, менеджерам и кладовщикам
const handlerWithAuth = withPermissions(
  RoleChecks.canManageProducts,
  'Недостаточно прав для управления товарами'
)(handler);

// Применяем CSRF защиту и rate limiting для модифицирующих операций
// GET запросы не требуют CSRF, но требуют rate limiting
export default withCsrfProtection(
  withRateLimit(RateLimitConfigs.WRITE)(handlerWithAuth as any) as typeof handlerWithAuth
);