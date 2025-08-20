import { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { hashPassword } from '../../../lib/auth';
import { logUserActionDirect as logUserAction, getUserIdFromCookie } from '../../../lib/actionLogger';
import { withManagement, AuthenticatedRequest, logAccess } from '../../../lib/api/roleAuth';
import { createItemResponse, createErrorResponse } from '../../../lib/api/standardResponse';
import { handleDatabaseError, handleGenericError } from '../../../lib/api/errorHandling';

export default withManagement(async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    try {
      // 🔒 Логируем доступ к созданию пользователя
      logAccess(req, 'CREATE_USER');
      
      const { email, password, role_id, first_name, last_name } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: 'Email и пароль обязательны' });
      }

      if (password.length < 4) {
        return res.status(400).json({ error: 'Пароль должен содержать минимум 4 символа' });
      }

      const hashedPassword = await hashPassword(password);

      const { data, error } = await supabaseAdmin
        .from('users')
        .insert({
          email,
          password_hash: hashedPassword,
          role_id: role_id || 1,
          first_name: first_name || '',
          last_name: last_name || ''
        })
        .select('*')
        .single();

      if (error) {
        console.error('Ошибка при создании пользователя:', error);
        const userId = getUserIdFromCookie(req);
        await logUserAction(userId, 'Создание пользователя', 'error', `Ошибка: ${error.message}`);
        
        if (error.code === '23505') {
          return res.status(400).json({ error: 'Пользователь с таким email уже существует' });
        }
        return res.status(500).json({ error: `Ошибка при создании пользователя: ${error.message}` });
      }

      // Логируем успешное создание пользователя
      const userId = req.user!.id;
      await logUserAction(userId, 'Создание пользователя', 'success', `Создан пользователь: ${email}`);

      // Убираем пароль из ответа
      const { password_hash: _, ...userWithoutPassword } = data;
      
      // 📊 Стандартизированный ответ
      const response = createItemResponse(userWithoutPassword, 'user', {
        created_by: req.user!.id,
        user_role: req.user!.role_id
      });

      return res.status(201).json(response);
    } catch (error) {
      return handleGenericError(error, res, 'user creation');
    }
  }

  // Неподдерживаемый метод
  const errorResponse = createErrorResponse('Метод не поддерживается');
  return res.status(405).json(errorResponse);
}); 