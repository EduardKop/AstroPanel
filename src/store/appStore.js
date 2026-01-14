import { create } from 'zustand';
import { supabase } from '../services/supabaseClient';

export const useAppStore = create((set, get) => ({
  // --- STATE ---
  user: null,
  payments: [],
  managers: [],
  products: [],
  rules: [],
  
  // Данные для зарплат
  kpiRates: [],     
  kpiSettings: {},  

  // Справочник каналов
  channelsMap: {},

  // Данные трафика
  trafficStats: {},

  stats: { totalEur: 0, count: 0 },
  isLoading: false,
  isInitialized: false,

  // --- ACTIONS ---

  setUser: (user) => set({ user }),

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
      kpiRates: [], 
      kpiSettings: {}, 
      stats: { totalEur: 0, count: 0 } 
    });
  },

  fetchTrafficStats: async (dateFrom, dateTo) => {
    try {
      const map = get().channelsMap;

      // Загружаем данные для графика (здесь фильтр по дате нужен для оптимизации графика)
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

      // В. Оплаты, Продукты, Правила
      const { data: paymentsData } = await supabase.from('payments').select('*').order('transaction_date', { ascending: false });
      const { data: productsData } = await supabase.from('knowledge_products').select('*');
      const { data: rulesData } = await supabase.from('knowledge_rules').select('*');

      // Г. KPI
      const { data: kpiRatesData } = await supabase.from('kpi_product_rates').select('*').order('rate', { ascending: true });
      const { data: kpiSettingsData } = await supabase.from('kpi_settings').select('*');
      const kpiSettingsMap = {};
      if (kpiSettingsData) {
        kpiSettingsData.forEach(s => kpiSettingsMap[s.key] = s.value);
      }

      // Д. Трафик и Источники (LEADS)
      // Загружаем wazzup_chat_id для связки с никнеймом, и убираем лимит по времени,
      // чтобы найти источник даже для старых оплат
      const { data: leadsData } = await supabase
        .from('leads')
        .select('created_at, is_comment, channel_id, wazzup_chat_id');

      // 1. Создаем карту источников: nickname -> 'comments' | 'direct'
      const leadsSourceMap = {};
      
      // 2. Создаем статистику трафика (для дэшборда)
      let trafficResult = {};

      if (leadsData) {
        leadsData.forEach(lead => {
          // --- Логика маппинга источника ---
          if (lead.wazzup_chat_id) {
            // Нормализуем никнейм: убираем @, пробелы, приводим к нижнему регистру
            const normNick = lead.wazzup_chat_id.replace(/[@\s]/g, '').toLowerCase();
            // Если такой ник уже есть, и новый это коммент - перезаписываем (или наоборот, зависит от логики)
            // Сейчас просто сохраняем тип последнего/единственного лида
            leadsSourceMap[normNick] = lead.is_comment ? 'comments' : 'direct';
          }

          // --- Логика статистики трафика ---
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

      // Е. Форматируем платежи и добавляем SOURCE
      const formattedPayments = (paymentsData || []).map(item => {
        const rawDate = item.transaction_date || item.created_at;
        
        // Определяем источник по никнейму
        let source = 'unknown'; // По умолчанию
        if (item.crm_link) {
            // Берем ник из crm_link (там может быть @nick или ссылка)
            // Пытаемся вытащить чистое имя
            let cleanNick = item.crm_link.toLowerCase();
            // Если это ссылка инсты, вырезаем ник
            const match = cleanNick.match(/instagram\.com\/([^/?#]+)/);
            if (match) {
                cleanNick = match[1];
            }
            // Убираем @ и мусор
            cleanNick = cleanNick.replace(/[@\s\/]/g, '');
            
            // Ищем в карте лидов
            if (leadsSourceMap[cleanNick]) {
                source = leadsSourceMap[cleanNick];
            }
        }

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
          status: item.status || 'pending',
          source: source // ✅ Добавили поле source ('direct', 'comments', 'unknown')
        };
      });

      const total = formattedPayments.reduce((sum, item) => sum + item.amountEUR, 0);

      set({
        payments: formattedPayments,
        managers: managersData || [],
        products: productsData || [],
        rules: rulesData || [],
        kpiRates: kpiRatesData || [],       
        kpiSettings: kpiSettingsMap || {},  
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

  subscribeToRealtime: () => {
    const channel = supabase.channel('global-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payments' }, () => get().fetchAllData(true))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'managers' }, () => get().fetchAllData(true))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'knowledge_products' }, () => get().fetchAllData(true))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'channels' }, () => get().fetchAllData(true))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leads' }, () => get().fetchAllData(true))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'kpi_product_rates' }, () => get().fetchAllData(true))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'kpi_settings' }, () => get().fetchAllData(true))
      .subscribe();

    return () => supabase.removeChannel(channel);
  }
}));