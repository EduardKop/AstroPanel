import { create } from 'zustand';
import { supabase } from '../services/supabaseClient';

export const useAppStore = create((set, get) => ({
  // --- STATE ---
  user: null,
  payments: [],
  managers: [],
  products: [], // ✅ Добавлено: Продукты базы знаний
  stats: { totalEur: 0, count: 0 },
  isLoading: false,
  isInitialized: false,

  // --- ACTIONS ---

  // 1. Установка пользователя (вызывается при входе)
  setUser: (user) => set({ user }),

  // 2. Логаут
  logout: async () => {
    await supabase.auth.signOut();
    localStorage.removeItem('astroUser');
    set({ user: null, payments: [], managers: [], products: [], stats: { totalEur: 0, count: 0 } });
  },

  // 3. ГЛАВНАЯ ФУНКЦИЯ ЗАГРУЗКИ (Payments + Managers + Products)
  fetchAllData: async (forceUpdate = false) => {
    // Если уже загружаем и не форсим обновление - выходим
    if (get().isLoading && !forceUpdate) return;
    
    set({ isLoading: true });

    try {
      // А. Загружаем Менеджеров (ВСЕ поля, важно для страницы EmployeesPage)
      const { data: managersData, error: managersError } = await supabase
        .from('managers')
        .select('*') 
        .order('created_at', { ascending: false });
      
      if (managersError) throw managersError;

      // Создаем карту: ID -> Имя (для быстрого поиска в платежах)
      const managersMap = {};
      managersData?.forEach(m => {
        managersMap[m.id] = m.name;
      });

      // Б. Загружаем Платежи
      const { data: paymentsData, error: paymentsError } = await supabase
        .from('payments')
        .select('*')
        .order('transaction_date', { ascending: false });

      if (paymentsError) throw paymentsError;

      // В. Загружаем Продукты (База знаний)
      // ✅ Новая логика для раздела "Продукты"
      const { data: productsData, error: productsError } = await supabase
        .from('knowledge_products')
        .select('*')
        .order('created_at', { ascending: true });

      if (productsError) {
        console.warn('Warning fetching products:', productsError);
      }

      // Г. НОРМАЛИЗАЦИЯ ПЛАТЕЖЕЙ (Приводим к единому виду)
      const formattedPayments = paymentsData.map(item => {
        // Определяем дату безопасно
        const rawDate = item.transaction_date || item.created_at;
        
        return {
          ...item, // Оставляем оригинальные поля
          
          // Поля для совместимости (CamelCase)
          id: item.id,
          transactionDate: rawDate,
          
          // Валюта (гарантируем число)
          amountEUR: Number(item.amount_eur) || Number(item.amountEUR) || 0,
          amountLocal: Number(item.amount_local) || 0,
          
          // Fallback для универсального поля amount
          amount: Number(item.amount_local) || Number(item.amount_eur) || 0,
          
          // Менеджер (Имя вместо ID)
          manager: managersMap[item.manager_id] || 'Не назначен', 
          managerId: item.manager_id,

          // Тип (Payment Type)
          type: item.payment_type || 'Other',
          
          // Статус
          status: item.status || 'pending'
        };
      });

      // Д. Считаем статистику
      const total = formattedPayments.reduce((sum, item) => sum + item.amountEUR, 0);

      // Е. Обновляем стейт
      set({ 
        payments: formattedPayments,
        managers: managersData || [],
        products: productsData || [], // ✅ Сохраняем продукты
        stats: { totalEur: total.toFixed(2), count: formattedPayments.length },
        isLoading: false,
        isInitialized: true
      });

    } catch (error) {
      console.error('Critical Store Error:', error);
      set({ isLoading: false });
    }
  },

  // 4. Подписка на Realtime (Вебхуки)
  subscribeToRealtime: () => {
    const channel = supabase.channel('global-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payments' }, 
        () => { get().fetchAllData(true); }
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'managers' }, 
        () => { get().fetchAllData(true); }
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'knowledge_products' }, 
        () => { get().fetchAllData(true); } // ✅ Слушаем изменения в продуктах
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }
}));