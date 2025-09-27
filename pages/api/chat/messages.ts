import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../../lib/supabaseClient';
import { getUserIdFromCookie } from '../../../lib/actionLogger';
import { logAction } from '../../../lib/actionLogger';

// Интерфейс для сообщения чата
interface ChatMessage {
  id: number;
  user_id: number;
  message: string;
  image_url?: string;
  created_at: string;
  users?: {
    id: number;
    first_name?: string;
    last_name?: string;
    avatar_url?: string;
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      // ОТКЛЮЧАЕМ КЭШИРОВАНИЕ - данные загружаются в реальном времени
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
      
      // Получаем последние 50 сообщений
      const { data: messages, error } = await supabase
        .from('chat_messages')
        .select(`
          id,
          user_id,
          message,
          image_url,
          created_at,
          users!chat_messages_user_id_fkey (
            id,
            first_name,
            last_name,
            avatar_url
          )
        `)
        .order('created_at', { ascending: true })
        .limit(50);

      if (error) {
        console.error('Ошибка получения сообщений:', error);
        return res.status(500).json({ error: 'Ошибка получения сообщений' });
      }

      // Форматируем данные для фронтенда
      const formattedMessages = (messages as ChatMessage[])?.map((msg: ChatMessage) => ({
        id: msg.id,
        user_id: msg.user_id,
        user_name: `${msg.users?.first_name || ''} ${msg.users?.last_name || ''}`.trim() || 'Неизвестный пользователь',
        user_avatar: msg.users?.avatar_url || null,
        message: msg.message,
        image_url: msg.image_url || null,
        timestamp: msg.created_at,
        is_edited: false // Временно отключено
      })) || [];

      return res.status(200).json({ messages: formattedMessages });

    } catch (error) {
      console.error('Ошибка при получении сообщений:', error);
      return res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
  }

  if (req.method === 'POST') {
    try {
      const { message, user_id, image_url } = req.body;

      if (!message?.trim() && !image_url) {
        return res.status(400).json({ error: 'Сообщение или изображение обязательны' });
      }

      if (!user_id) {
        return res.status(400).json({ error: 'ID пользователя обязателен' });
      }

      // Сохраняем сообщение
      const { data, error } = await supabase
        .from('chat_messages')
        .insert([
          {
            user_id: user_id,
            message: message?.trim() || '',
            image_url: image_url || null
          }
        ])
        .select(`
          id,
          user_id,
          message,
          image_url,
          created_at,
          users!chat_messages_user_id_fkey (
            id,
            first_name,
            last_name,
            avatar_url
          )
        `)
        .single();

      if (error) {
        console.error('Ошибка сохранения сообщения:', error);
        try {
          const actorId = getUserIdFromCookie(req) || user_id;
          await logAction({ user_id: actorId || 0, action_name: 'Отправка сообщения в чате', status: 'error', details: `Ошибка: ${error.message}` });
        } catch {}
        return res.status(500).json({ error: 'Ошибка отправки сообщения' });
      }

      // Форматируем ответ
      const messageData = data as ChatMessage;
      const formattedMessage = {
        id: messageData.id,
        user_id: messageData.user_id,
        user_name: `${messageData.users?.first_name || ''} ${messageData.users?.last_name || ''}`.trim() || 'Неизвестный пользователь',
        user_avatar: messageData.users?.avatar_url || null,
        message: messageData.message,
        image_url: messageData.image_url || null,
        timestamp: messageData.created_at,
        is_current_user: true,
        is_edited: false // Временно отключено
      };

      try {
        const actorId = getUserIdFromCookie(req) || user_id;
        await logAction({ user_id: actorId || 0, action_name: 'Отправка сообщения в чате', status: 'success', details: message?.trim() ? `Текст ${message.trim().slice(0, 64)}${message.trim().length > 64 ? '…' : ''}` : 'Изображение' });
      } catch {}
      return res.status(201).json({ message: formattedMessage });

    } catch (error) {
      console.error('Ошибка при отправке сообщения:', error);
      return res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
  }

  return res.status(405).json({ error: 'Метод не поддерживается' });
} 