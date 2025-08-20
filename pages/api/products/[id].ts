import { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { cleanProductText } from '../../../lib/textCleaner';
import { canChangeProductColor } from '../../../lib/warehouseChecker';
import { normalizeColorName } from '../../../lib/colorNormalizer';
import { logUserActionDirect as logUserAction, getUserIdFromCookie } from '../../../lib/actionLogger';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
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
        console.error('Ошибка при получении товара:', error);
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

      return res.status(200).json(cleaned);
    } catch (error) {
      console.error('Ошибка сервера:', error);
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
            details: [colorCheck.reason || 'Товар имеет складские остатки'],
            stockInfo: colorCheck.stockInfo
          });
        }
      }

      // Проверяем, существует ли уже товар с таким артикулом и цветом (исключая текущий товар)
      if (article) {
        let existingProduct = null;
        let checkError = null;

        if (color_id) {
          // Проверяем товар с артикулом и цветом
          const result = await supabaseAdmin
            .from('products')
            .select('id, name, article, color_id')
            .eq('article', article)
            .eq('color_id', parseInt(color_id))
            .neq('id', id) // Исключаем текущий товар
            .single();
          
          existingProduct = result.data;
          checkError = result.error;
        } else {
          // Проверяем товар с артикулом без цвета
          const result = await supabaseAdmin
            .from('products')
            .select('id, name, article, color_id')
            .eq('article', article)
            .is('color_id', null)
            .neq('id', id) // Исключаем текущий товар
            .single();
          
          existingProduct = result.data;
          checkError = result.error;
        }

        if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows returned
          console.error('Ошибка проверки существующего товара:', checkError);
          return res.status(500).json({ error: 'Ошибка проверки существующего товара' });
        }

        if (existingProduct) {
          const colorText = color_id ? 'и выбранным цветом' : 'без указания цвета';
          return res.status(400).json({ 
            error: `Товар с артикулом "${article}" ${colorText} уже существует. На один артикул и цвет может быть только одна карточка товара.`
          });
        }
      }

      // Обновляем товар только если все обязательные поля заполнены
      const updateData = {
        name: name.trim(),
        article: article.trim(),
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
        console.error('Ошибка при обновлении товара:', error);
        const userId = getUserIdFromCookie(req);
        await logUserAction(userId, 'Редактирование товара', 'error', `Ошибка: ${error.message}`);
        return res.status(500).json({ error: 'Ошибка при обновлении товара' });
      }

      // Логируем успешное обновление
      const userId = getUserIdFromCookie(req);
      await logUserAction(userId, 'Редактирование товара', 'success', `Обновлен товар: ${name} (${article})`);

      return res.status(200).json(product);
    } catch (error) {
      console.error('Ошибка сервера:', error);
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

      // Если есть складские остатки, предлагаем альтернативу
      if (receiptItems && receiptItems.length > 0) {
        const totalStock = receiptItems.reduce((sum: number, item: any) => sum + (item.qty || 0), 0);
        return res.status(400).json({ 
          error: `Нельзя удалить товар. На складе осталось ${totalStock} шт. Сначала удалите складские остатки или скройте товар.`,
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

        console.log('Удаляем файлы из Storage:', filesToDelete);

        // Удаляем файлы из Storage
        const { error: storageError } = await supabaseAdmin.storage
          .from('images')
          .remove(filesToDelete);

        if (storageError) {
          console.error('Ошибка удаления файлов из Storage:', storageError);
        } else {
          console.log(`Удалено ${filesToDelete.length} файлов из Storage`);
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
        console.error('Ошибка при удалении товара:', error);
        const userId = getUserIdFromCookie(req);
        await logUserAction(userId, 'Удаление товара', 'error', `Ошибка: ${error.message}`);
        return res.status(500).json({ error: 'Ошибка при удалении товара' });
      }

      // Логируем успешное удаление
      const userId = getUserIdFromCookie(req);
      await logUserAction(userId, 'Удаление товара', 'success', `Удален товар с ID: ${id}`);

      return res.status(200).json({ message: 'Товар успешно удален' });
    } catch (error) {
      console.error('Ошибка сервера:', error);
      return res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
  }

  return res.status(405).json({ error: 'Метод не поддерживается' });
} 