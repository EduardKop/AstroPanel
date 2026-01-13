import { create } from 'zustand';
import { supabase } from '../services/supabaseClient';

export const useAppStore = create((set, get) => ({
  // --- STATE ---
  user: null,
  payments: [],
  managers: [],
  products: [],
  rules: [],
  
  // ✅ НОВОЕ: Данные для зарплат
  kpiRates: [],     // Тарифы за продукты
  kpiSettings: {},  // Оклад, настройки бонусов

  // Справочник каналов: { "aa48...": "PL", "bb21...": "DE" }
  channelsMap: {},

  // Данные трафика: { "PL": { "2026-01-13": { direct: 5, comments: 2, all: 7 } } }
  trafficStats: {},

  stats: { totalEur: 0, count: 0 },
  isLoading: false,
  isInitialized: false,

  // --- ACTIONS ---

  // 1. Установка пользователя
  setUser: (user) => set({ user }),

  // 2. Логаут
  logout: async () => {
    await supabase.auth.signOut();
    localStorage.removeItem('astroUser');
    set({ 
      user: null, 
      payments: [], 
      managers: [], 
      products: [], 
      rules: [], 
      trafficStats: {}, 
      kpiRates: [], // Сброс
      kpiSettings: {}, // Сброс
      stats: { totalEur: 0, count: 0 } 
    });
  },

  // 3. ФУНКЦИЯ ЗАГРУЗКИ ТРАФИКА
  fetchTrafficStats: async (dateFrom, dateTo) => {
    try {
      const map = get().channelsMap;

      let query = supabase
        .from('leads')
        .select('created_at, is_comment, channel_id');

      if (dateFrom) query = query.gte('created_at', dateFrom);
      if (dateTo) query = query.lte('created_at', dateTo);

      const { data: leadsData, error } = await query;
      if (error) throw error;

      const formattedStats = {};

      if (leadsData) {
        leadsData.forEach(lead => {
          const countryCode = map[lead.channel_id] || 'Other';
          const dateStr = lead.created_at.split('T')[0];

          if (!formattedStats[countryCode]) formattedStats[countryCode] = {};
          if (!formattedStats[countryCode][dateStr]) {
            formattedStats[countryCode][dateStr] = { direct: 0, comments: 0, all: 0 };
          }

          if (lead.is_comment) {
            formattedStats[countryCode][dateStr].comments++;
          } else {
            formattedStats[countryCode][dateStr].direct++;
          }
          formattedStats[countryCode][dateStr].all++;
        });
      }

      set({ trafficStats: formattedStats });

    } catch (error) {
      console.error('Error fetching traffic stats:', error);
    }
  },

  // 4. ГЛАВНАЯ ФУНКЦИЯ ЗАГРУЗКИ (При старте)
  fetchAllData: async (forceUpdate = false) => {
    if (get().isLoading && !forceUpdate) return;

    set({ isLoading: true });

    try {
      // А. Каналы
      const { data: channelsData } = await supabase.from('channels').select('*');
      const newChannelsMap = {};
      if (channelsData) {
        channelsData.forEach(ch => {
          newChannelsMap[ch.wazzup_id] = ch.country_code; 
        });
      }
      set({ channelsMap: newChannelsMap });

      // Б. Менеджеры
      const { data: managersData } = await supabase.from('managers').select('*').order('created_at', { ascending: false });
      const managersMap = {};
      managersData?.forEach(m => managersMap[m.id] = m.name);

      // В. Оплаты, Продукты (База знаний), Правила
      const { data: paymentsData } = await supabase.from('payments').select('*').order('transaction_date', { ascending: false });
      const { data: productsData } = await supabase.from('knowledge_products').select('*');
      const { data: rulesData } = await supabase.from('knowledge_rules').select('*');

      // ✅ Г. НОВОЕ: Загружаем KPI (Тарифы и Настройки)
      const { data: kpiRatesData } = await supabase.from('kpi_product_rates').select('*').order('rate', { ascending: true });
      const { data: kpiSettingsData } = await supabase.from('kpi_settings').select('*');
      
      // Превращаем настройки из массива [{key: 'base', value: 100}] в объект {base: 100}
      const kpiSettingsMap = {};
      if (kpiSettingsData) {
        kpiSettingsData.forEach(s => kpiSettingsMap[s.key] = s.value);
      }

      // Д. Трафик (30 дней)
      const today = new Date();
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(today.getDate() - 30);

      const { data: leadsData } = await supabase
        .from('leads')
        .select('created_at, is_comment, channel_id')
        .gte('created_at', thirtyDaysAgo.toISOString());

      let trafficResult = {};
      if (leadsData) {
        leadsData.forEach(lead => {
          const countryCode = newChannelsMap[lead.channel_id] || 'Other';
          const dateStr = lead.created_at.split('T')[0];

          if (!trafficResult[countryCode]) trafficResult[countryCode] = {};
          if (!trafficResult[countryCode][dateStr]) {
            trafficResult[countryCode][dateStr] = { direct: 0, comments: 0, all: 0 };
          }
          if (lead.is_comment) trafficResult[countryCode][dateStr].comments++;
          else trafficResult[countryCode][dateStr].direct++;
          trafficResult[countryCode][dateStr].all++;
        });
      }

      // Е. Форматируем платежи
      const formattedPayments = (paymentsData || []).map(item => {
        const rawDate = item.transaction_date || item.created_at;
        return {
          ...item,
          id: item.id,
          transactionDate: rawDate,
          amountEUR: Number(item.amount_eur) || 0,
          amountLocal: Number(item.amount_local) || 0, 
          amount: Number(item.amount_local) || Number(item.amount_eur) || 0,
          manager: managersMap[item.manager_id] || 'Не назначен',
          managerId: item.manager_id,
          type: item.payment_type || 'Other',
          status: item.status || 'pending'
        };
      });

      const total = formattedPayments.reduce((sum, item) => sum + item.amountEUR, 0);

      set({
        payments: formattedPayments,
        managers: managersData || [],
        products: productsData || [],
        rules: rulesData || [],
        kpiRates: kpiRatesData || [],       // ✅ Сохраняем тарифы
        kpiSettings: kpiSettingsMap || {},  // ✅ Сохраняем настройки
        trafficStats: trafficResult,
        stats: { totalEur: total.toFixed(2), count: formattedPayments.length },
        isLoading: false,
        isInitialized: true
      });

    } catch (error) {
      console.error('Critical Store Error:', error);
      set({ isLoading: false });
    }
  },

  // 5. Подписка на Realtime
  subscribeToRealtime: () => {
    const channel = supabase.channel('global-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payments' }, () => get().fetchAllData(true))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'managers' }, () => get().fetchAllData(true))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'knowledge_products' }, () => get().fetchAllData(true))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'channels' }, () => get().fetchAllData(true))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leads' }, () => get().fetchAllData(true))
      // ✅ НОВОЕ: Слушаем изменения в KPI
      .on('postgres_changes', { event: '*', schema: 'public', table: 'kpi_product_rates' }, () => get().fetchAllData(true))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'kpi_settings' }, () => get().fetchAllData(true))
      .subscribe();

    return () => supabase.removeChannel(channel);
  }
}));