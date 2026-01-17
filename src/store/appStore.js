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


// Helper for pagination (to bypass 1000 rows limit)
const fetchAll = async (table, select, orderBy = 'created_at', ascending = false) => {
  let allData = [];
  let from = 0;
  const step = 1000;

  while (true) {
    const { data, error } = await supabase
      .from(table)
      .select(select)
      .order(orderBy, { ascending })
      .range(from, from + step - 1);

    if (error) {
      console.error(`Error fetching ${table}:`, error);
      break;
    }

    if (data) {
      allData = [...allData, ...data];
      if (data.length < step) break; // Reached end
    } else {
      break;
    }

    from += step;
  }
  return allData;
};

export const useAppStore = create((set, get) => ({
  // --- STATE ---
  user: null,
  payments: [],
  managers: [],
  products: [],
  rules: [],
  countries: [], // NEW: Countries with flags
  schedules: [], // NEW: Schedule data

  // Данные для зарплат
  kpiRates: [],
  kpiSettings: {},

  // Справочник каналов
  channelsMap: {},

  // Данные трафика
  trafficStats: {},

  trafficStats: {},

  // Dynamic Settings (Role Permissions & Docs)
  permissions: {},
  roleDocs: {},

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
      countries: [],
      schedules: [],
      trafficStats: {},
      kpiRates: [],
      kpiSettings: {},
      stats: { totalEur: 0, count: 0 }
    });
  },

  fetchTrafficStats: async (dateFrom, dateTo) => {
    try {
      const map = get().channelsMap;

      // Логика пагинации для графика с фильтрами
      let allLeads = [];
      let from = 0;
      const step = 1000;

      while (true) {
        let query = supabase
          .from('leads')
          .select('created_at, is_comment, channel_id, wazzup_chat_id')
          .range(from, from + step - 1);

        if (dateFrom) query = query.gte('created_at', dateFrom);
        if (dateTo) query = query.lte('created_at', dateTo);

        const { data, error } = await query;
        if (error) throw error;

        if (data) {
          allLeads = [...allLeads, ...data];
          if (data.length < step) break;
        } else {
          break;
        }
        from += step;
      }

      const formattedStats = {};

      if (allLeads) {
        allLeads.forEach(lead => {
          const countryCode = map[lead.channel_id] || 'Other';
          const dateStr = lead.created_at.split('T')[0];

          if (!formattedStats[countryCode]) formattedStats[countryCode] = {};
          if (!formattedStats[countryCode][dateStr]) {
            formattedStats[countryCode][dateStr] = { direct: 0, comments: 0, whatsapp: 0, all: 0 };
          }

          let type = lead.is_comment ? 'comments' : 'direct';
          // Check for whatsapp (phone number check)
          if (lead.wazzup_chat_id && /^[\d+\s()-]+$/.test(lead.wazzup_chat_id)) {
            type = 'whatsapp';
          }

          if (type === 'whatsapp') formattedStats[countryCode][dateStr].whatsapp++;
          else if (type === 'comments') formattedStats[countryCode][dateStr].comments++;
          else formattedStats[countryCode][dateStr].direct++;

          formattedStats[countryCode][dateStr].all++;
        });
      }

      set({ trafficStats: formattedStats });

    } catch (error) {
      console.error('Error fetching traffic stats:', error);
    }
  },

  updateSettings: async (key, value) => {
    try {
      const { error } = await supabase
        .from('app_settings')
        .upsert({ key, value });

      if (error) throw error;

      // Optimistic update
      if (key === 'role_permissions') set({ permissions: value });
      if (key === 'role_documentation') set({ roleDocs: value });

    } catch (error) {
      console.error('Error updating settings:', error);
      alert('Ошибка при сохранении настроек');
    }
  },

  fetchAllData: async (forceUpdate = false) => {
    if (get().isLoading && !forceUpdate) return;

    set({ isLoading: true });

    try {
      // А. Каналы
      const channelsData = await fetchAll('channels', '*', 'id', true);
      const newChannelsMap = {};
      channelsData.forEach(ch => {
        newChannelsMap[ch.wazzup_id] = ch.country_code;
      });
      set({ channelsMap: newChannelsMap });

      // Б. Менеджеры
      const managersData = await fetchAll('managers', '*', 'created_at', false);
      const managersMap = {};
      managersData.forEach(m => managersMap[m.id] = m.name);

      // В. Оплаты, Продукты, Правила, Countries, Schedules
      const paymentsData = await fetchAll('payments', '*', 'transaction_date', false);
      const productsData = await fetchAll('knowledge_products', '*', 'created_at', false);
      const rulesData = await fetchAll('knowledge_rules', '*', 'created_at', false);
      const countriesData = await fetchAll('countries', '*', 'code', true);
      const schedulesData = await fetchAll('schedules', '*', 'date', false);

      // Г. KPI & Settings
      const kpiRatesData = await fetchAll('kpi_product_rates', '*', 'rate', true);
      const kpiSettingsData = await fetchAll('kpi_settings', '*', 'key', true);
      const kpiSettingsMap = {};
      kpiSettingsData.forEach(s => kpiSettingsMap[s.key] = s.value);

      // Load App Settings
      const appSettingsData = await fetchAll('app_settings', '*', 'key', true);
      const permissionsMap = appSettingsData.find(s => s.key === 'role_permissions')?.value || {};
      const roleDocsMap = appSettingsData.find(s => s.key === 'role_documentation')?.value || {};

      // Д. Трафик и Источники (LEADS)
      // Используем пагинацию для загрузки ВСЕХ лидов (1066+)
      const leadsData = await fetchAll('leads', 'created_at, is_comment, channel_id, wazzup_chat_id', 'created_at', false);

      const leadsError = null; // Removed check inside helper, caught by try/catch


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
            trafficResult[countryCode][dateStr] = { direct: 0, comments: 0, whatsapp: 0, all: 0 };
          }

          let type = lead.is_comment ? 'comments' : 'direct';
          // Check for whatsapp (phone number check)
          if (lead.wazzup_chat_id && /^[\d+\s()-]+$/.test(lead.wazzup_chat_id)) {
            type = 'whatsapp';
          }

          if (type === 'whatsapp') trafficResult[countryCode][dateStr].whatsapp++;
          else if (type === 'comments') trafficResult[countryCode][dateStr].comments++;
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
        countries: countriesData || [],
        schedules: schedulesData || [],
        kpiRates: kpiRatesData || [],
        kpiSettings: kpiSettingsMap || {},
        permissions: permissionsMap,
        roleDocs: roleDocsMap,
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
      .on('postgres_changes', { event: '*', schema: 'public', table: 'app_settings' }, () => get().fetchAllData(true))
      .subscribe();

    return () => supabase.removeChannel(channel);
  }
}));