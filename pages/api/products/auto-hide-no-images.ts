import { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { withAuth } from '../../../lib/middleware';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Метод не поддерживается' });
  }

  try {
    console.log('🔍 Автоматическое скрытие товаров без изображений...');
    
    // Получаем все видимые товары без изображений
    const { data: productsWithoutImages, error: fetchError } = await supabaseAdmin
      .from('products')
      .select(`
        id,
        name,
        article,
        is_visible,
        product_images(id)
      `)
      .eq('is_visible', true);

    if (fetchError) {
      console.error('❌ Ошибка при получении товаров:', fetchError);
      return res.status(500).json({ error: 'Ошибка при получении товаров' });
    }

    // Фильтруем товары без изображений
    const productsToHide = productsWithoutImages.filter((product: any) => 
      !product.product_images || product.product_images.length === 0
    );

    if (productsToHide.length === 0) {
      console.log('✅ Все товары с изображениями или уже скрыты');
      return res.status(200).json({ 
        success: true, 
        message: 'Все товары с изображениями или уже скрыты',
        hidden_count: 0 
      });
    }

    console.log(`🚫 Найдено ${productsToHide.length} товаров без изображений для скрытия`);

    // Скрываем товары без изображений
    const productIdsToHide = productsToHide.map((p: any) => p.id);
    
    const { error: updateError } = await supabaseAdmin
      .from('products')
      .update({ 
        is_visible: false, 
        updated_at: new Date().toISOString() 
      })
      .in('id', productIdsToHide);

    if (updateError) {
      console.error('❌ Ошибка при скрытии товаров:', updateError);
      return res.status(500).json({ error: 'Ошибка при скрытии товаров' });
    }

    console.log(`✅ Успешно скрыто ${productIdsToHide.length} товаров без изображений`);

    return res.status(200).json({ 
      success: true, 
      message: `Скрыто ${productIdsToHide.length} товаров без изображений`,
      hidden_count: productIdsToHide.length,
      hidden_products: productsToHide.slice(0, 10).map((p: any) => ({
        id: p.id,
        article: p.article,
        name: p.name
      }))
    });

  } catch (error) {
    console.error('❌ Критическая ошибка:', error);
    return res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
}

export default withAuth(handler);
