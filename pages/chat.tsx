import { useState, useEffect, useRef } from 'react';
import { 
  ChatBubbleLeftRightIcon, 
  PaperAirplaneIcon,
  TrashIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '../components/AuthContext';
import { useToast } from '../components/ToastContext';
interface ChatMessage {
  id: number;
  user_id: number;
  user_name: string;
  user_avatar: string | null;
  message: string;
  image_url: string | null;
  timestamp: string;
  is_current_user: boolean;
  is_edited?: boolean;
}

export default function Chat() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [clearing, setClearing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (user) {
      loadMessages();
      markAsRead();
    }
  }, [user]);

  // Автообновление при возврате на страницу
  useEffect(() => {
    if (!user) return;
    
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        loadMessages();
        markAsRead();
      }
    };

    const handleFocus = () => {
      loadMessages();
      markAsRead();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [user]);

  const markAsRead = async () => {
    if (!user) return;
    
    try {
      const response = await fetch('/api/chat/mark-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user.id })
      });
      
      if (response.ok) {
        const data = await response.json();
        // Сохраняем время последнего прочтения в localStorage
        localStorage.setItem(`chat_last_read_${user.id}`, data.last_read_at);
      }
    } catch (error) {
      console.error('Ошибка отметки прочтения:', error);
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Автоматическое изменение высоты поля ввода
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [newMessage]);

  const loadMessages = async () => {
    try {
      const response = await fetch('/api/chat/messages');
      if (response.ok) {
        const data = await response.json();
        const messagesWithCurrentUser = (data.messages || []).map((msg: ChatMessage) => ({
          ...msg,
          is_current_user: user ? msg.user_id === user.id : false
        }));
        setMessages(messagesWithCurrentUser);
      }
    } catch (error) {
      console.error('Ошибка загрузки сообщений:', error);
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !user) return;

    setSending(true);
    try {
      const response = await fetch('/api/chat/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: newMessage,
          user_id: user.id
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        setMessages(prev => [...prev, data.message]);
        setNewMessage('');
        
        // Сразу обновляем last_read_at, чтобы собственное сообщение не считалось непрочитанным
        if (user) {
          const now = new Date().toISOString();
          localStorage.setItem(`chat_last_read_${user.id}`, now);
          // Обновляем счетчик непрочитанных сообщений
          markAsRead();
        }
        
        // Сброс высоты поля ввода
        if (textareaRef.current) {
          textareaRef.current.style.height = 'auto';
        }
      }
    } catch (error) {
      console.error('Ошибка отправки сообщения:', error);
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleClearChat = async () => {
    if (!user || user.role_id !== 1) {
      showToast('Только администратор может очищать чат', 'error');
      return;
    }

    if (!confirm('Вы уверены, что хотите очистить весь чат? Это действие нельзя отменить.')) {
      return;
    }

    setClearing(true);
    try {
      const response = await fetch('/api/chat/clear', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Ошибка очистки чата');
      }
      
      showToast('Чат успешно очищен', 'success');
      setMessages([]);
    } catch (error: any) {
      console.error('Ошибка очистки чата:', error);
      showToast(error.message || 'Ошибка очистки чата', 'error');
    } finally {
      setClearing(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('ru-RU', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Сегодня';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Вчера';
    } else {
      return date.toLocaleDateString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    }
  };

  const groupMessagesByDate = (messages: ChatMessage[]) => {
    const groups: { [key: string]: ChatMessage[] } = {};
    
    messages.forEach(message => {
      const dateKey = new Date(message.timestamp).toDateString();
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(message);
    });

    return Object.entries(groups).map(([dateKey, messages]) => ({
      date: dateKey,
      messages
    }));
  };

  const messageGroups = groupMessagesByDate(messages);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-gray-500">Загрузка...</div>
      </div>
    );
  }

  return (
    <div className="h-[86vh] flex flex-col bg-gray-50">
      {/* Область сообщений */}
      <div className="flex-1 overflow-y-auto p-6">
        {loading ? (
          <div className="flex justify-center items-center h-32">
            <div className="text-gray-500">Загрузка...</div>
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center text-gray-500 h-full flex flex-col justify-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <ChatBubbleLeftRightIcon className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Начните общение</h3>
            <p className="text-gray-500">Отправьте первое сообщение в чат</p>
          </div>
        ) : (
          <div className="space-y-6">
            {messageGroups.map((group) => (
              <div key={group.date}>
                {/* Разделитель дат */}
                <div className="flex items-center justify-center my-6">
                  <div className="bg-white border border-gray-200 text-gray-600 text-xs px-4 py-2 rounded-full shadow-sm">
                    {formatDate(group.messages[0].timestamp)}
                  </div>
                </div>

                {/* Сообщения за день */}
                <div className="space-y-4">
                  {group.messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.is_current_user ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`flex ${message.is_current_user ? 'flex-row-reverse' : 'flex-row'} items-end space-x-3 max-w-2xl`}>
                        {/* Аватарка */}
                        <div className="flex-shrink-0">
                          {message.user_avatar ? (
                            <img
                              src={message.user_avatar}
                              alt={message.user_name}
                              className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-sm"
                            />
                          ) : (
                            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-medium text-sm shadow-sm">
                              {message.user_name.charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>

                        {/* Сообщение */}
                        <div className={`flex flex-col ${message.is_current_user ? 'items-end' : 'items-start'}`}>
                          {/* Имя отправителя (только для чужих сообщений) */}
                          {!message.is_current_user && (
                            <div className="mb-1">
                              <span className="text-sm font-medium text-gray-900">
                                {message.user_name}
                              </span>
                            </div>
                          )}

                          {/* Контейнер сообщения */}
                          <div
                            className={`px-4 py-3 rounded-2xl shadow-sm max-w-md ${
                              message.is_current_user
                                ? 'bg-blue-500 text-white'
                                : 'bg-white text-gray-900 border border-gray-200'
                            }`}
                          >
                            {/* Текст сообщения */}
                            {message.message && (
                              <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.message}</p>
                            )}

                            {/* Изображение */}
                            {message.image_url && (
                              <div className="mt-3">
                                <img
                                  src={message.image_url}
                                  alt="Изображение"
                                  className="max-w-full max-h-64 rounded-lg object-cover cursor-pointer hover:opacity-90"
                                  onClick={() => window.open(message.image_url!, '_blank')}
                                />
                              </div>
                            )}
                          </div>

                          {/* Время и статус */}
                          <div className={`flex items-center mt-1 space-x-2 ${message.is_current_user ? 'flex-row-reverse space-x-reverse' : ''}`}>
                            <p className="text-xs text-gray-600">
                              {formatTime(message.timestamp)}
                            </p>
                            {message.is_edited && (
                              <span
                                className={`text-xs ${
                                  message.is_current_user ? 'text-blue-300' : 'text-gray-400'
                                }`}
                              >
                                изменено
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Поле ввода */}
      <div className="p-4">
        <div className="flex items-center space-x-3">
          {/* Поле ввода */}
          <div className="flex-1 bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent">
            <textarea
              ref={textareaRef}
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Напишите сообщение..."
              className="w-full bg-transparent border-none outline-none resize-none text-sm text-gray-900 placeholder-gray-500 min-h-[20px] max-h-[120px]"
              rows={1}
              disabled={sending}
            />
          </div>
          
          {/* Кнопка отправки */}
          <button
            onClick={() => sendMessage()}
            disabled={sending || !newMessage.trim()}
            className={`p-3 rounded-full ${
              sending || !newMessage.trim()
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                : 'bg-blue-500 hover:bg-blue-600 text-white shadow-lg hover:shadow-xl transform hover:scale-105'
            }`}
          >
            <PaperAirplaneIcon className="w-5 h-5" />
          </button>
          
          {/* Кнопка очистки (только для админа) */}
          {user && user.role_id === 1 && (
            <button
              onClick={handleClearChat}
              disabled={clearing}
              className={`p-3 rounded-full ${
                clearing
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  : 'bg-gray-200 hover:bg-gray-300 text-gray-600 hover:text-gray-800'
              }`}
              title="Очистить чат"
            >
              <TrashIcon className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
} 