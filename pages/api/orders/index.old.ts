import { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { logUserAction } from '../../../lib/actionLogger';
import { 
  handleApiError, 
  validateRequired, 
  validateEmail, 
  validatePositiveInteger
} from '../../../lib/apiUtils';
import { logError } from '../../../lib/errorHandler';
import { CreateOrderRequest, CustomerData } from '../../../types';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      // УБИРАЮ КЭШИРОВАНИЕ ДЛЯ ЗАКАЗОВ
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
      const { limit = '20', offset = '0', page = '1', status, search } = req.query;

      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);
      const offsetNum = (pageNum - 1) * limitNum;

      let query = supabaseAdmin
        .from('orders')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false });

      if (status) {
        // Поддержка множественных статусов через запятую
        const statusStr = Array.isArray(status) ? status[0] : status;
        if (statusStr && statusStr.includes(',')) {
          const statuses = statusStr.split(',').map(s => s.trim());
          query = query.in('status', statuses);
        } else {
          query = query.eq('status', statusStr);
        }
      }

      if (search && typeof search === 'string' && search.trim() !== '') {
        const s = `*${search.trim()}*`;
        query = query.or(`order_number.ilike.${s},id.ilike.${s},customer_data->>'fullName'.ilike.${s},customer_data->>'email'.ilike.${s},customer_data->>'phone'.ilike.${s}`);
      }

      const { data: orders, error, count } = await query
        .range(offsetNum, offsetNum + limitNum - 1);

      if (error) {
        console.error('Ошибка при получении заказов:', error);
        return res.status(500).json({ error: 'Ошибка при получении заказов' });
      }

      const totalPages = Math.ceil((count || 0) / limitNum);

      return res.status(200).json({
        orders: orders || [],
        pagination: {
          total: count || 0,
          page: pageNum,
          limit: limitNum,
          totalPages
        }
      });
    } catch (error) {
      console.error('Ошибка сервера:', error);
      return res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
  }

  if (req.method === 'POST') {
    try {
      let { user_id, product_id, quantity, status = 'pending', customer_data } = req.body as CreateOrderRequest;

      try {
        // СТРОГАЯ ВАЛИДАЦИЯ ВХОДНЫХ ДАННЫХ
        validateRequired(customer_data, 'customer_data');
        validateRequired(customer_data.email, 'email');
        validateEmail(customer_data.email);
        validateRequired(customer_data.fullName, 'fullName');
        validatePositiveInteger(product_id, 'product_id');
        validatePositiveInteger(quantity, 'quantity');
        
        if (status) {
          validateRequired(status, 'status');
        }
      } catch (validationError) {
        const apiError = handleApiError(validationError);
        return res.status(apiError.status || 400).json({ error: apiError.message });
      }

      // --- Новый блок: поиск/создание пользователя по email ---
      let user;
      let isNewUser = false;
      if (!user_id) {
        // Проверяем наличие email в customer_data
        const email = customer_data?.email;
        if (!email) {
          return res.status(400).json({ error: 'Необходимо указать email покупателя' });
        }
        // Ищем пользователя по email
        const { data: existingUser, error: findUserError } = await supabaseAdmin
          .from('users')
          .select('*')
          .eq('email', email)
          .single();
        if (existingUser) {
          user = existingUser;
          user_id = user.id;
        } else {
          // Создаем пользователя
          const { data: newUser, error: createUserError } = await supabaseAdmin
            .from('users')
            .insert({
              email,
              first_name: customer_data?.firstName || customer_data?.fullName || 'Покупатель',
              last_name: customer_data?.lastName || '',
              phone: customer_data?.phone || null
            })
            .select()
            .single();
          if (createUserError || !newUser) {
            return res.status(500).json({ error: 'Ошибка создания пользователя', details: createUserError });
          }
          user = newUser;
          user_id = user.id;
          isNewUser = true;
        }
      } else {
        // Получаем пользователя по user_id
        const { data: userData, error: userError } = await supabaseAdmin
          .from('users')
          .select('first_name, last_name, email, phone')
          .eq('id', user_id)
          .single();
        if (userError || !userData) {
          return res.status(400).json({ error: 'Пользователь не найден' });
        }
        user = userData;
      }

      // Логируем создание пользователя, если он новый
      if (isNewUser && user_id) {
        logUserAction.userCreate(user_id, `Регистрация нового пользователя через заказ: ${user.email}`);
      }

      // Получаем информацию о товаре
      const { data: product, error: productError } = await supabaseAdmin
        .from('products')
        .select('name, price, article')
        .eq('id', product_id)
        .single();
      if (productError || !product) {
        return res.status(400).json({ error: 'Товар не найден' });
      }

      // Генерируем номер заказа
      const timestamp = Date.now();
      const orderNumber = `${timestamp}`.slice(-4);

      // Создаем заказ
      const orderData = {
        order_number: orderNumber,
        status,
        total_amount: product.price * quantity,
        final_total: product.price * quantity,
        user_id,
        customer_data: {
          fullName: `${user.first_name} ${user.last_name}`,
          firstName: user.first_name,
          lastName: user.last_name,
          email: user.email,
          phone: user.phone || customer_data?.phone || null
        },
        items: [{
          product_id,
          name: product.name,
          article: product.article,
          price: product.price,
          quantity,
          totalPrice: product.price * quantity,
          image: null // Пока оставляем null, так как поле images не доступно в API
        }],
        items_count: 1
      };

      const { data: order, error: orderError } = await supabaseAdmin
        .from('orders')
        .insert(orderData)
        .select()
        .single();

      if (orderError) {
        console.error('Ошибка создания заказа:', orderError);
        return res.status(500).json({ error: 'Ошибка создания заказа', details: orderError });
      }

      // Логируем создание заказа
      if (user_id) {
        logUserAction.orderCreate(user_id, `Создан заказ №${order.order_number} для ${user.email}`);
      }

      return res.status(201).json({ order });
    } catch (error) {
      console.error('Ошибка сервера:', error);
      return res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
  }

  return res.status(405).json({ error: 'Метод не поддерживается' });
} 