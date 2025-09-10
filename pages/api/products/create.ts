import { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { logUserActionDirect as logUserAction, getUserIdFromCookie } from '../../../lib/actionLogger';
import { translateSupabaseError } from '../../../lib/supabaseErrorTranslations';
import { withPermissions, RoleChecks, AuthenticatedRequest, logAccess } from '../../../lib/api/roleAuth';
import { createItemResponse, createErrorResponse } from '../../../lib/api/standardResponse';
import { handleDatabaseError, handleGenericError } from '../../../lib/api/errorHandling';
import { ValidationService } from '../../../lib/validationService';
import { DatabaseService } from '../../../lib/databaseService';

// Разрешаем создание товаров админам, менеджерам и кладовщикам
export default withPermissions(
  RoleChecks.canCreateProducts,
  'Недостаточно прав для создания товаров'
)(async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    try {
      // 🔒 Логируем доступ к созданию товара
      logAccess(req, 'CREATE_PRODUCT');
      const {
        name,
        article,
        brand_id,
        category_id,
        color_id,
        price,
        old_price,
        is_popular,
        is_visible,
        composition,
        care_instructions
      } = req.body;

      // Валидация данных товара
      const validationData = {
        name,
        article,
        brand_id,
        category_id,
        color_id,
        price,
        old_price,
        composition
      };

      const validationResult = ValidationService.validateProduct(validationData);
      if (!ValidationService.validateAndSendErrors(res, validationResult)) {
        return;
      }

      // Проверяем, существует ли уже товар с таким артикулом и цветом
      if (article) {
        let existingProduct = null;
        let checkError = null;

        if (color_id) {
          // Проверяем товар с артикулом и цветом
          const result = await supabaseAdmin
            .from('products')
            .select('id, name, article, color_id')
            .eq('article', article)
            .eq('color_id', color_id)
            .single();
          
          existingProduct = result.data;
          checkError = result.error;
        } else {
          // Для товаров без цвета НЕ проверяем существование - разрешаем копирование
          // existingProduct = null; // Уже установлено
        }

        if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows returned
          console.error('Ошибка проверки существующего товара:', checkError);
          return res.status(500).json({ error: 'Ошибка проверки существующего товара' });
        }

        if (existingProduct) {
          return res.status(400).json({ 
            error: `Товар с артикулом "${article}" и выбранным цветом уже существует. На один артикул и цвет может быть только одна карточка товара.`
          });
        }
      }



      // Создаем товар только если все обязательные поля заполнены
      const productData = {
        name: name.trim(),
        article: article.trim(),
        brand_id: parseInt(brand_id),
        category_id: parseInt(category_id),
        color_id: color_id,
        care_instructions: (care_instructions ?? '').toString().trim() || null,
        composition: composition.trim(),
        price: parseFloat(price),
        old_price: old_price ? parseFloat(old_price) : null,
        is_popular: is_popular || false,
        is_visible: is_visible !== undefined ? is_visible : true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data: product, error } = await supabaseAdmin
        .from('products')
        .insert([productData])
        .select()
        .single();

      if (error) {
        const friendly = translateSupabaseError(error);
        console.error('Ошибка создания товара:', error);
        const userId = getUserIdFromCookie(req);
        await logUserAction(userId, 'Создание товара', 'error', `Ошибка: ${error.message}`);
        return res.status(400).json({ 
          error: friendly,
          details: error.message
        });
      }

      // Логируем успешное создание
      const userId = req.user!.id;
      await logUserAction(userId, 'Создание товара', 'success', `${name} (${article})`);

      // 📊 Стандартизированный ответ
      const response = createItemResponse(product, 'product', {
        created_by: req.user!.id,
        user_role: req.user!.role_id
      });

      return res.status(201).json(response);
    } catch (error) {
      return handleGenericError(error, res, 'product creation');
    }
  }

  // Неподдерживаемый метод
  const errorResponse = createErrorResponse('Метод не поддерживается');
  return res.status(405).json(errorResponse);
}); 