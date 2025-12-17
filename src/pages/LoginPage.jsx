import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import { motion } from 'framer-motion';
import { Send, Loader2, Lock, Sparkles } from 'lucide-react';

const LoginPage = ({ onLoginSuccess }) => {
  const [sessionId, setSessionId] = useState(null);
  const [status, setStatus] = useState('loading'); // loading, waiting, success, failed
  const [botLink, setBotLink] = useState('');

  // Имя твоего бота (без @)
  const BOT_USERNAME = 'AstroAuthBot'; 

  useEffect(() => {
    const initSession = async () => {
      // 1. Создаем новую сессию в базе
      const { data, error } = await supabase
        .from('auth_sessions')
        .insert([{ status: 'pending' }])
        .select()
        .single();

      if (error) {
        console.error('Error creating session:', error);
        return;
      }

      setSessionId(data.id);
      setBotLink(`https://t.me/${BOT_USERNAME}?start=${data.id}`);
      setStatus('waiting');

      // 2. Подписываемся на изменения этой сессии (Realtime)
      const channel = supabase
        .channel(`auth-${data.id}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'auth_sessions',
            filter: `id=eq.${data.id}`,
          },
          async (payload) => {
            const newStatus = payload.new.status;
            if (newStatus === 'success') {
              setStatus('success');
              // Получаем данные менеджера, чтобы сохранить в App
              const { data: mgr } = await supabase
                .from('managers')
                .select('*')
                .eq('id', payload.new.manager_id)
                .single();
              
              // Небольшая задержка для красоты анимации
              setTimeout(() => {
                onLoginSuccess(mgr);
              }, 1500);
            } else if (newStatus === 'failed') {
              setStatus('failed');
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    };

    initSession();
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0F172A] relative overflow-hidden font-sans text-white">
      
      {/* ФОНОВЫЕ ЭФФЕКТЫ */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-blue-600/20 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-purple-600/20 rounded-full blur-[120px]" />
      </div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-md p-8"
      >
        {/* КАРТОЧКА */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl text-center">
          
          {/* Логотип / Иконка */}
          <div className="mb-8 flex justify-center">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/30">
              <Sparkles className="text-white w-8 h-8" />
            </div>
          </div>

          <h1 className="text-3xl font-bold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
            AstroPanel
          </h1>
          <p className="text-gray-400 text-sm mb-8">
            Корпоративный доступ
          </p>

          {/* Состояния */}
          {status === 'loading' && (
            <div className="flex flex-col items-center gap-3 py-6">
              <Loader2 className="animate-spin text-blue-500" size={32} />
              <span className="text-sm text-gray-500">Подключение...</span>
            </div>
          )}

          {status === 'waiting' && (
            <motion.a
              href={botLink}
              target="_blank"
              rel="noopener noreferrer"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="group relative flex items-center justify-center gap-3 w-full bg-[#2AABEE] hover:bg-[#229ED9] text-white py-4 rounded-xl font-bold text-lg transition-all shadow-lg shadow-blue-500/20"
            >
              <Send size={20} />
              <span>Войти через Telegram</span>
              
              {/* Блик на кнопке */}
              <div className="absolute inset-0 rounded-xl overflow-hidden">
                <div className="absolute top-0 left-[-100%] w-[50%] h-full bg-white/20 skew-x-[-20deg] group-hover:left-[200%] transition-all duration-700 ease-in-out" />
              </div>
            </motion.a>
          )}

          {status === 'success' && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="py-2"
            >
              <div className="w-16 h-16 bg-green-500/20 text-green-500 rounded-full flex items-center justify-center mx-auto mb-4 border border-green-500/30">
                <Lock className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-green-400">Доступ разрешен!</h3>
              <p className="text-gray-400 text-xs mt-2">Перенаправление...</p>
            </motion.div>
          )}

          {status === 'failed' && (
            <div className="py-2">
              <div className="text-red-400 font-bold mb-4">Доступ запрещен</div>
              <p className="text-gray-400 text-xs mb-4">Ваш аккаунт не найден в базе данных.</p>
              <button 
                onClick={() => window.location.reload()}
                className="text-sm text-white underline hover:text-blue-400"
              >
                Попробовать снова
              </button>
            </div>
          )}

          {/* Футер карточки */}
          {status === 'waiting' && (
            <p className="mt-6 text-xs text-gray-500">
              Нажмите кнопку, чтобы открыть бота.<br/>
              Бот проверит ваш статус автоматически.
            </p>
          )}
        </div>
        
        <div className="mt-8 text-center text-[10px] text-gray-600 uppercase tracking-widest">
          Secure Internal System
        </div>

      </motion.div>
    </div>
  );
};

export default LoginPage;