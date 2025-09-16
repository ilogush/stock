import { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';

interface ProductValidation {
  product_id: number;
  product_name: string;
  issues: string[];
  severity: 'low' | 'medium' | 'high';
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Метод не поддерживается' });
  }

  try {
    // Получаем все товары с их связями
    const { data: products, error } = await supabaseAdmin
      .from('products')
      .select(`
        id,
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
        care_instructions,
        materials_info,
        brand:brands!products_brand_id_fkey (
          id, 
          name,
          brand_managers!brand_managers_brand_id_fkey (
            user_id,
            user:users!brand_managers_user_id_fkey (id, first_name, last_name, role_id)
          )
        ),
        category:categories!products_category_id_fkey (id, name),
        product_images (id, image_url)
      `)
      .order('id');

    if (error) {
      console.error('Ошибка получения товаров:', error);
      return res.status(500).json({ error: 'Ошибка базы данных' });
    }

    const validations: ProductValidation[] = [];

    // Проверяем каждый товар
    for (const product of products || []) {
      const issues: string[] = [];
      let severity: 'low' | 'medium' | 'high' = 'low';

      // 1. Проверка обязательных полей
      if (!product.name || product.name.trim().length < 3) {
        issues.push('Название товара слишком короткое или отсутствует');
        severity = 'high';
      }

      if (!product.article || product.article.trim().length < 2) {
        issues.push('Артикул товара отсутствует или слишком короткий');
        severity = 'high';
      }

      if (!product.brand_id || !product.brand) {
        issues.push('Бренд не выбран');
        severity = 'high';
      }

      if (!product.category_id || !product.category) {
        issues.push('Категория не выбрана');
        severity = 'high';
      }

      // 2. Проверка цен
      if (!product.price || product.price <= 0) {
        issues.push('Цена не установлена или равна нулю');
        severity = 'medium';
      }

      if (product.old_price && product.old_price <= product.price) {
        issues.push('Старая цена меньше или равна текущей цене');
        severity = 'medium';
      }

      // 3. Проверка изображений
      if (!product.product_images || product.product_images.length === 0) {
        issues.push('Отсутствуют изображения товара');
        severity = 'medium';
      }



      // 5. Проверка состава
      if (!product.composition || product.composition.trim().length < 5) {
        issues.push('Состав товара не указан');
        severity = 'medium';
      }

      // 6. Проверка видимости
      if (!product.is_visible) {
        issues.push('Товар скрыт от покупателей');
        severity = 'low';
      }

      // 7. Проверка цвета
      if (!product.color_id) {
        issues.push('Цвет товара не выбран');
        severity = 'medium';
      }

      // Если есть проблемы, добавляем в список
      if (issues.length > 0) {
        validations.push({
          product_id: product.id,
          product_name: product.name,
          issues,
          severity
        });
      }
    }

    // Группируем по серьезности
    const highPriority = validations.filter(v => v.severity === 'high');
    const mediumPriority = validations.filter(v => v.severity === 'medium');
    const lowPriority = validations.filter(v => v.severity === 'low');

    // Создаем задачи для проблем валидации (только для high и medium)
    const tasksToCreate = [];
    
    // Создаем задачи только для критичных и важных проблем
    for (const severity of ['high', 'medium']) {
      const issues = severity === 'high' ? highPriority : mediumPriority;
      
      for (const validation of issues) {
        // Находим товар с полной информацией о бренде и менеджерах
        const product = products?.find((p: any) => p.id === validation.product_id);
        
        if (product && product.brand) {
          for (const issue of validation.issues) {
            const taskDescription = `Проблема с товаром "${validation.product_name}" (ID: ${validation.product_id}): ${issue}`;
            
            // Для всех товаров LRC назначаем Катю Логуш (ID 3) как исполнителя
            tasksToCreate.push({
              description: taskDescription,
              status: 'new',
              assignee_id: 3, // Катя Логуш - бренд-менеджер
              author_id: 1 // ID системы (Артем Логуш как представитель системы)
            });
          }
        }
      }
    }

    // Создаем задачи в базе данных
    if (tasksToCreate.length > 0) {
      const { error: createError } = await supabaseAdmin
        .from('tasks')
        .insert(tasksToCreate);

      if (createError) {
        console.error('Ошибка создания задач из валидации:', createError);
      }
    }

    return res.status(200).json({
      total_products: products?.length || 0,
      products_with_issues: validations.length,
      issues_by_severity: {
        high: highPriority.length,
        medium: mediumPriority.length,
        low: lowPriority.length
      },
      validations: {
        high: highPriority,
        medium: mediumPriority,
        low: lowPriority
      },
      tasks_created: tasksToCreate.length
    });

  } catch (error) {
    console.error('Ошибка валидации товаров:', error);
    return res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
}
