import { create } from 'zustand';
import { supabase } from '../services/supabaseClient';

// Хелпер для очистки никнейма (для сравнения)
const normalizeNick = (raw) => {
  if (!raw) return '';
  let clean = String(raw).toLowerCase().trim();

  // Если это ссылка, берем последнюю часть
  if (clean.includes('instagram.com')) {
    const match = clean.match(/instagram\.com\/([^/?#]+)/);
    if (match) clean = match[1];
  }

  // Убираем @, пробелы, слэши, точки в конце
  clean = clean.replace(/[@\s\/]/g, '');

  // Убираем точки в конце (например, "nick." -> "nick")
  clean = clean.replace(/\.+$/g, '');

  // Убираем множественные подчеркивания (например, "__nick__" -> "nick")
  // НО сохраняем одиночные подчеркивания внутри никнейма
  clean = clean.replace(/^_+|_+$/g, ''); // убираем _ в начале и конце

  return clean.trim();
};

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

      // Загружаем данные для графика
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
          // Берем дату как строку YYYY-MM-DD
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
      // Берем wazzup_chat_id для связки
      // ⚠️ ВАЖНО: По умолчанию Supabase возвращает только 1000 записей!
      // Используем .range() чтобы получить до 10000 записей
      const { data: leadsData, error: leadsError } = await supabase
        .from('leads')
        .select('created_at, is_comment, channel_id, wazzup_chat_id')
        .order('created_at', { ascending: false }) // Сначала новые
        .range(0, 9999); // Загружаем до 10000 лидов

      if (leadsError) {
        console.error('❌ Error loading leads:', leadsError);
      }

      // 1. Создаем карту источников: nickname -> 'comments' | 'direct'
      const leadsSourceMap = {};

      // 2. Статистика трафика (для init загрузки, чтобы не ждать fetchTrafficStats)
      let trafficResult = {};

      if (leadsData) {
        leadsData.forEach(lead => {
          // --- Логика маппинга источника ---
          if (lead.wazzup_chat_id) {
            const normNick = normalizeNick(lead.wazzup_chat_id);

            if (normNick) {
              // Если есть дубликаты, приоритет у 'comments' (если человек писал и там и там)
              // Либо просто перезаписываем последним. 
              // Для надежности: если уже записано comments, не меняем на direct
              if (leadsSourceMap[normNick] !== 'comments') {
                leadsSourceMap[normNick] = lead.is_comment ? 'comments' : 'direct';
              }
            }
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
        let source = 'direct'; // Default fallback

        if (item.crm_link) {
          const cleanNick = normalizeNick(item.crm_link);

          // Проверяем, является ли crm_link телефонным номером
          // Телефон: только цифры (может быть с + в начале)
          const isPhoneNumber = /^[\d+\s()-]+$/.test(item.crm_link.trim());

          if (isPhoneNumber) {
            // Это WhatsApp контакт (телефонный номер)
            source = 'whatsapp';
          } else {
            // Пытаемся найти в карте лидов (Instagram)
            if (leadsSourceMap[cleanNick]) {
              source = leadsSourceMap[cleanNick]; // 'direct' или 'comments'
            } else {
              // Не нашли в leads и это не телефон - unknown
              source = 'unknown';
            }
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
          source: source // 'direct', 'comments', 'whatsapp', 'unknown'
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