import { create } from 'zustand';
import { supabase } from '../services/supabaseClient';
import { showToast } from '../utils/toastEvents';
import { extractKyivDate, extractUTCDate } from '../utils/kyivTime';

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

  console.log(`📊 fetchAll('${table}'): загружено ${allData.length} записей`);
  return allData;
};

export const useAppStore = create((set, get) => ({
  // --- STATE ---
  user: null,
  originalUser: null, // For impersonation (backup)
  payments: [],
  managers: [],
  products: [],
  rules: [],
  learningArticles: [], // NEW: Learning Center articles
  countries: [], // NEW: Countries with flags
  schedules: [], // NEW: Schedule data
  onlineUsers: [], // NEW: Realtime Online Users
  activityLogs: [], // NEW: Activity Logs
  auditExceptions: [], // NEW: Audit Exceptions

  // Данные для зарплат
  kpiRates: [],
  kpiSettings: {},
  managerRates: [], // NEW: Individual employee rates

  // Справочник каналов
  channelsMap: {},
  channels: [], // Raw channels data

  // Данные трафика
  trafficStats: {},
  salesStats: [], // NEW: Optimized sales stats from RPC

  // Dynamic Settings (Role Permissions & Docs)
  permissions: {},
  roleDocs: {},

  stats: { totalEur: 0, count: 0 },
  isLoading: false,
  isInitialized: false,

  // Knowledge Base Sharing
  sharedPages: {}, // { pageKey: { slug, isActive, settings, visitCount } }

  // --- ACTIONS ---

  // SHARED PAGES ACTIONS
  fetchSharedPage: async (pageKey) => {
    try {
      const { data, error } = await supabase
        .from('shared_pages')
        .select('*')
        .eq('page_key', pageKey)
        .maybeSingle();

      if (error) {
        console.error('Error fetching shared page:', error);
        return null;
      }

      set(state => ({
        sharedPages: { ...state.sharedPages, [pageKey]: data || null }
      }));
      return data;
    } catch (e) {
      console.error('Fetch shared page failed', e);
      return null;
    }
  },

  createSharedPage: async (pageKey, settings = {}) => {
    try {
      const user = get().user;
      // Generate a random slug
      const randomSlug = Math.random().toString(36).substring(2, 10) + Math.random().toString(36).substring(2, 10);

      const { data, error } = await supabase
        .from('shared_pages')
        .insert({
          page_key: pageKey,
          slug: randomSlug,
          is_active: true,
          settings,
          updated_by: user?.id
        })
        .select()
        .single();

      if (error) throw error;

      set(state => ({
        sharedPages: { ...state.sharedPages, [pageKey]: data }
      }));
      return data;
    } catch (e) {
      console.error('Create shared page failed', e);
      return null;
    }
  },

  updateSharedPage: async (pageKey, updates) => {
    try {
      const { data, error } = await supabase
        .from('shared_pages')
        .update({ ...updates, updated_at: new Date() })
        .eq('page_key', pageKey)
        .select()
        .single();

      if (error) throw error;

      set(state => ({
        sharedPages: { ...state.sharedPages, [pageKey]: data }
      }));
      return data;
    } catch (e) {
      console.error('Update shared page failed', e);
      return null;
    }
  },

  getPublicPage: async (slug) => {
    try {
      // Public Access via RLS (anon key)
      const { data, error } = await supabase
        .from('shared_pages')
        .select('*')
        .eq('slug', slug)
        .eq('is_active', true)
        .maybeSingle();

      if (error) throw error;

      // Increment visit count (fire and forget)
      if (data) {
        await supabase.rpc('increment_visit_count', { page_id: data.id });
      }

      return data;
    } catch (e) {
      console.error('Get public page failed', e);
      return null;
    }
  },

  // NEW: Fetch specific data for public pages (KPI, Products, etc.)
  fetchPublicData: async (pageKey) => {
    try {
      switch (pageKey) {
        case 'kpi': {
          const [rates, settings] = await Promise.all([
            supabase.from('kpi_product_rates').select('*'),
            supabase.from('kpi_settings').select('*')
          ]);

          const kpiSettingsMap = {};
          (settings.data || []).forEach(s => kpiSettingsMap[s.key] = s.value);

          set({
            kpiRates: rates.data || [],
            kpiSettings: kpiSettingsMap
          });
          break;
        }
        case 'products': {
          const { data } = await supabase.from('knowledge_products').select('*');
          set({ products: data || [] });
          break;
        }
        case 'rules': {
          const { data } = await supabase.from('knowledge_rules').select('*');
          set({ rules: data || [] });
          break;
        }
        case 'learning': {
          const { data } = await supabase.from('knowledge_learning').select('*');
          set({ learningArticles: data || [] });
          break;
        }
      }
    } catch (e) {
      console.error('Fetch public data failed', e);
    }
  },

  setUser: (user) => set({ user }),

  impersonateRole: (role) => {
    const currentUser = get().user;
    if (!currentUser) return;

    // If already impersonating, just update the role (don't overwrite originalUser again)
    const existingOriginal = get().originalUser;

    set({
      originalUser: existingOriginal || currentUser, // Save real user
      user: { ...currentUser, role: role, isImpersonating: true }
    });

    showToast(`Режим просмотра: ${role}`, 'info');
  },

  stopImpersonation: () => {
    const original = get().originalUser;
    if (original) {
      set({
        user: original,
        originalUser: null
      });
      showToast('Режим просмотра отключен', 'success');
    }
  },

  logout: async () => {
    await supabase.auth.signOut();
    localStorage.removeItem('astroUser');
    set({
      user: null,
      originalUser: null,
      payments: [],
      managers: [],
      // ...      products: [],
      rules: [],
      learningArticles: [],
      countries: [],
      schedules: [],
      // ...
      auditExceptions: [],
      trafficStats: {},
      salesStats: [],
      kpiRates: [],
      kpiSettings: {},
      managerRates: [],
      stats: { totalEur: 0, count: 0 }
    });
  },

  fetchTrafficStats: async (dateFrom, dateTo) => {
    try {
      const map = get().channelsMap;

      // Use RPC for filtered stats
      const { data, error } = await supabase.rpc('get_lead_stats_v2', {
        start_date: dateFrom,
        end_date: dateTo
      });

      if (error) throw error;

      const formattedStats = {};
      if (data) {
        data.forEach(stat => {
          const countryCode = map[stat.channel_id] || 'Other';
          const dateStr = stat.created_date; // YYYY-MM-DD from RPC

          if (!formattedStats[countryCode]) formattedStats[countryCode] = {};
          if (!formattedStats[countryCode][dateStr]) {
            formattedStats[countryCode][dateStr] = { direct: 0, comments: 0, whatsapp: 0, all: 0 };
          }

          const count = Number(stat.count || 0);

          if (stat.is_whatsapp) formattedStats[countryCode][dateStr].whatsapp += count;
          else if (stat.is_comment) formattedStats[countryCode][dateStr].comments += count;
          else formattedStats[countryCode][dateStr].direct += count;

          formattedStats[countryCode][dateStr].all += count;
        });
      }

      set({ trafficStats: formattedStats });
    } catch (error) {
      console.error('Error fetching traffic stats:', error);
    }
  },

  // NEW: Time Comparison Actions (Fetch P1 and P2 separately and merge)
  fetchSalesStatsTimeComparison: async (p1Start, p1End, p2Start, p2End) => {
    try {
      const [p1Data, p2Data] = await Promise.all([
        supabase.rpc('get_sales_stats_v2', { start_date: p1Start, end_date: p1End }),
        supabase.rpc('get_sales_stats_v2', { start_date: p2Start, end_date: p2End })
      ]);

      const processStats = (data) => {
        const stats = {};
        (data.data || []).forEach(item => {
          if (!stats[item.country]) stats[item.country] = {};
          if (!stats[item.country][item.created_date]) {
            stats[item.country][item.created_date] = { all: 0, whatsapp: 0, direct: 0, comments: 0, unknown: 0 };
          }
          const counts = stats[item.country][item.created_date];
          counts.all += Number(item.count);
          if (item.source === 'whatsapp') counts.whatsapp += Number(item.count);
          else if (item.source === 'direct') counts.direct += Number(item.count);
          else if (item.source === 'comments') counts.comments += Number(item.count);
          else counts.unknown += Number(item.count);
        });
        return stats;
      };

      // Merge logic: Since dates are usually distinct (Yesterday vs Today), we can just merge objects?
      // If keys overlap (e.g. comparing Today vs Today), last one wins (which is fine if identical).
      // But usually P1 is Past, P2 is Today. "created_date" keys will be different.
      // So we can merge the country objects.

      const stats1 = processStats(p1Data);
      const stats2 = processStats(p2Data);

      const mergedStats = { ...stats1 };
      Object.keys(stats2).forEach(country => {
        if (!mergedStats[country]) mergedStats[country] = {};
        Object.assign(mergedStats[country], stats2[country]);
      });

      set({ salesStats: mergedStats });
    } catch (error) {
      console.error('Error fetching time comparison sales stats:', error);
    }
  },

  fetchTrafficStatsTimeComparison: async (p1Start, p1End, p2Start, p2End) => {
    try {
      const [p1Data, p2Data] = await Promise.all([
        supabase.rpc('get_lead_stats_v2', { start_date: p1Start, end_date: p1End }),
        supabase.rpc('get_lead_stats_v2', { start_date: p2Start, end_date: p2End })
      ]);

      const processStats = (data) => {
        const stats = {};
        (data.data || []).forEach(item => {
          // created_date is YYYY-MM-DD
          const country = get().channelsMap[item.channel_id] || 'Unknown';
          if (!stats[country]) stats[country] = {};
          if (!stats[country][item.created_date]) {
            stats[country][item.created_date] = { all: 0, whatsapp: 0, comments: 0, direct: 0 };
          }
          const counts = stats[country][item.created_date];
          counts.all += Number(item.count);
          if (item.is_whatsapp) counts.whatsapp += Number(item.count);
          else if (item.is_comment) counts.comments += Number(item.count);
          else counts.direct += Number(item.count);
        });
        return stats;
      };

      const stats1 = processStats(p1Data);
      const stats2 = processStats(p2Data);

      const mergedStats = { ...stats1 };
      Object.keys(stats2).forEach(country => {
        if (!mergedStats[country]) mergedStats[country] = {};
        Object.assign(mergedStats[country], stats2[country]);
      });

      set({ trafficStats: mergedStats });

    } catch (error) {
      console.error('Error fetching time comparison traffic stats:', error);
    }
  },

  fetchSalesStats: async (dateFrom, dateTo) => {
    try {
      const { data, error } = await supabase.rpc('get_sales_stats', {
        start_date: dateFrom,
        end_date: dateTo
      });

      if (error) throw error;

      const formattedStats = {};
      if (data) {
        data.forEach(stat => {
          const countryCode = stat.country || 'Other';
          const dateStr = stat.created_date; // YYYY-MM-DD from RPC

          if (!formattedStats[countryCode]) formattedStats[countryCode] = {};
          if (!formattedStats[countryCode][dateStr]) {
            formattedStats[countryCode][dateStr] = { direct: 0, comments: 0, whatsapp: 0, all: 0, unknown: 0 };
          }

          const count = Number(stat.count || 0);
          const source = stat.source || 'unknown';

          if (formattedStats[countryCode][dateStr][source] !== undefined) {
            formattedStats[countryCode][dateStr][source] += count;
          } else {
            formattedStats[countryCode][dateStr].unknown += count;
          }

          formattedStats[countryCode][dateStr].all += count;
        });
      }

      set({ salesStats: formattedStats });
    } catch (error) {
      console.error('Error fetching sales stats:', error);
    }
  },

  initializeFromCache: () => {
    try {
      const cachedPermissions = localStorage.getItem('astroPermissions');
      const cachedDocs = localStorage.getItem('astroRoleDocs');

      if (cachedPermissions) {
        set({ permissions: JSON.parse(cachedPermissions) });
      }
      if (cachedDocs) {
        set({ roleDocs: JSON.parse(cachedDocs) });
      }
    } catch (e) {
      console.error('Error loading from cache:', e);
    }
  },

  updateSettings: async (key, value) => {
    try {
      const { error } = await supabase
        .from('app_settings')
        .upsert({ key, value });

      if (error) throw error;

      // Optimistic update & Cache
      if (key === 'role_permissions') {
        set({ permissions: value });
        localStorage.setItem('astroPermissions', JSON.stringify(value));
      }
      if (key === 'role_documentation') {
        set({ roleDocs: value });
        localStorage.setItem('astroRoleDocs', JSON.stringify(value));
      }

      // 📝 LOG ACTIVITY
      get().logActivity({
        action: 'update',
        entity: 'settings',
        entityId: key,
        details: { key, value_preview: JSON.stringify(value).slice(0, 50) + '...' },
        importance: 'medium'
      });

    } catch (error) {
      console.error('Error updating settings:', error);
      showToast('Ошибка при сохранении настроек', 'error');
    }
  },

  fetchReferenceData: async () => {
    // If we already have managers and schedules, we assume reference data is loaded
    if (get().managers.length > 0 && get().schedules.length > 0) return;

    set({ isLoading: true });
    try {
      // Load everything EXCEPT payments and activity logs
      const [
        channelsData,
        managersData,
        productsData,
        rulesData,
        learningData,
        countriesData,
        schedulesData,
        appSettingsData
      ] = await Promise.all([
        fetchAll('channels', '*', 'id', true),
        fetchAll('managers', '*', 'created_at', false),
        fetchAll('knowledge_products', '*', 'created_at', false),
        fetchAll('knowledge_rules', '*', 'created_at', false),
        fetchAll('knowledge_learning', '*', 'created_at', false),
        fetchAll('countries', '*', 'code', true),
        fetchAll('schedules', '*', 'date', false),
        fetchAll('app_settings', '*', 'key', true),
      ]);

      // Process Channels
      const newChannelsMap = {};
      (channelsData || []).forEach(ch => {
        newChannelsMap[ch.wazzup_id] = ch.country_code;
      });

      // Process App Settings
      const permissionsMap = (appSettingsData || []).find(s => s.key === 'role_permissions')?.value || {};
      const roleDocsMap = (appSettingsData || []).find(s => s.key === 'role_documentation')?.value || {};

      set({
        channels: channelsData || [],
        channelsMap: newChannelsMap,
        managers: managersData || [],
        products: productsData || [],
        rules: rulesData || [],
        learningArticles: learningData || [],
        countries: countriesData || [],
        schedules: schedulesData || [],
        permissions: permissionsMap,
        roleDocs: roleDocsMap,
        isLoading: false
      });
    } catch (error) {
      console.error('Error fetching reference data:', error);
      set({ isLoading: false });
    }
  },

  fetchAllData: async (forceUpdate = false) => {
    if (get().isLoading && !forceUpdate) return;
    // ... existing implementation ...

    set({ isLoading: true });

    try {
      // А. Каналы
      // А. Каналы
      // Optimized: Fetch leads stats via RPC instead of raw rows


      // PARALLEL FETCHING: Group independent requests including LEADS
      const [
        channelsData,
        managersData,
        paymentsData,
        productsData,
        rulesData,
        learningData,
        countriesData,
        schedulesData,
        exceptionsData,
        kpiRatesData,
        kpiSettingsData,
        appSettingsData,
        managerRatesData,
        // leadsMappingData REMOVED - using View now
        leadsStatsData,    // RPC for traffic charts
        sharedPagesData    // Added: Fetch all shared pages
      ] = await Promise.all([
        fetchAll('channels', '*', 'id', true),
        fetchAll('managers', '*', 'created_at', false),
        fetchAll('enriched_payments_view', '*', 'transaction_date', false), // USED VIEW
        fetchAll('knowledge_products', '*', 'created_at', false),
        fetchAll('knowledge_rules', '*', 'created_at', false),
        fetchAll('knowledge_learning', '*', 'created_at', false),
        fetchAll('countries', '*', 'code', true),
        fetchAll('schedules', '*', 'date', false),
        fetchAll('payment_audit_exceptions', '*', 'created_at', false),
        fetchAll('kpi_product_rates', '*', 'rate', true),
        fetchAll('kpi_settings', '*', 'key', true),
        fetchAll('app_settings', '*', 'key', true),
        fetchAll('manager_rates', '*', 'created_at', false),
        // supabase.rpc('get_leads_mapping').then(r => r.data || []), // REMOVED
        supabase.rpc('get_lead_stats_v2', { start_date: '2020-01-01', end_date: '2030-01-01' }).then(r => r.data || []),
        fetchAll('shared_pages', '*', 'page_key', true).catch(err => {
          console.warn('Shared pages table not found or empty (skipping):', err);
          return [];
        })
      ]);


      // Process Channels
      const newChannelsMap = {};
      (channelsData || []).forEach(ch => {
        newChannelsMap[ch.wazzup_id] = ch.country_code;
      });
      set({ channelsMap: newChannelsMap, channels: channelsData || [] });

      // Process Managers
      const managersMap = {};
      (managersData || []).forEach(m => managersMap[m.id] = { name: m.name, role: m.role });

      // Process KPI Settings
      const kpiSettingsMap = {};
      (kpiSettingsData || []).forEach(s => kpiSettingsMap[s.key] = s.value);

      // Process App Settings
      const permissionsMap = (appSettingsData || []).find(s => s.key === 'role_permissions')?.value || {};
      const roleDocsMap = (appSettingsData || []).find(s => s.key === 'role_documentation')?.value || {};

      // Process Shared Pages
      const sharedPagesMap = {};
      (sharedPagesData || []).forEach(p => {
        sharedPagesMap[p.page_key] = p;
      });


      // SAVE TO CACHE
      localStorage.setItem('astroPermissions', JSON.stringify(permissionsMap));
      localStorage.setItem('astroRoleDocs', JSON.stringify(roleDocsMap));


      // 1. Создаем карту источников: REMOVED (Logic moved to View)
      // const leadsSourceMap = {}; ...

      // 2. Статистика трафика (RPC data)
      let trafficResult = {};
      if (leadsStatsData) {
        leadsStatsData.forEach(stat => {
          const countryCode = newChannelsMap[stat.channel_id] || 'Other';
          const dateStr = stat.created_date; // YYYY-MM-DD from RPC

          if (!trafficResult[countryCode]) trafficResult[countryCode] = {};
          if (!trafficResult[countryCode][dateStr]) {
            trafficResult[countryCode][dateStr] = { direct: 0, comments: 0, whatsapp: 0, all: 0 };
          }

          const count = Number(stat.count || 0);

          if (stat.is_whatsapp) trafficResult[countryCode][dateStr].whatsapp += count;
          else if (stat.is_comment) trafficResult[countryCode][dateStr].comments += count;
          else trafficResult[countryCode][dateStr].direct += count;

          trafficResult[countryCode][dateStr].all += count;
        });
      }

      // Е. Форматируем платежи и добавляем SOURCE
      const formattedPayments = (paymentsData || []).map(item => {
        const rawDate = item.transaction_date || item.created_at;

        // Определяем источник из View
        let source = item.derived_source || 'direct'; // Default to direct if missing
        if (source === 'unknown') source = 'direct';  // Unknown usually means direct in legacy logic? Or just 'unknown'?
        // The previous logic defaulted to 'unknown' if not found in leads.
        // But here user said "if not comment then Direct".
        // My view logic:
        // WHEN p.crm_link ~ '^\+?[0-9\s()-]+$' THEN 'whatsapp'
        // WHEN l.is_comment IS TRUE THEN 'comments'
        // WHEN l.is_comment IS FALSE THEN 'direct'
        // ELSE 'unknown'

        // Let's trust the View. If 'unknown' -> maybe treat as 'direct' or keep 'unknown'?
        // In dashboard, filters are 'direct', 'comments', 'whatsapp'.
        // If I return 'unknown', it won't match any filter except 'all'.

        // User request: "если оно true тогда это коментарий если нет тогда Direct"
        // So 'unknown' (no lead match) implies 'direct' (or maybe they assume every client is in leads?)
        // If crm_link exists but no lead match -> it's a lead that we missed or manually entered?
        // Let's Default 'unknown' to 'direct' if crm_link is present?
        // Or better: stick to View logic and let user see 'unknown' if they want? 
        // User said: "трафик и тут есть поле is_comment если оно true тогда это коментарий если нет тогда Direct".
        // This implies boolean: true -> comment, false -> direct.
        // If there IS NO LEAD, then is_comment is NULL.
        // My View returns 'unknown' for NULL.
        // I should probably map 'unknown' to 'direct' to match user expectation "if no comment then Direct".
        if (source === 'unknown') source = 'direct';

        return {
          ...item,
          id: item.id,
          transactionDate: rawDate,
          amountEUR: Number(item.amount_eur) || 0,
          amountLocal: Number(item.amount_local) || 0,
          amount: Number(item.amount_local) || Number(item.amount_eur) || 0,
          manager: managersMap[item.manager_id]?.name || 'Не назначен',
          managerId: item.manager_id,
          managerRole: managersMap[item.manager_id]?.role || null,
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
        learningArticles: learningData || [],
        countries: countriesData || [],
        schedules: schedulesData || [],
        auditExceptions: exceptionsData || [],
        kpiRates: kpiRatesData || [],
        kpiSettings: kpiSettingsMap || {},
        managerRates: managerRatesData || [],
        permissions: permissionsMap,
        roleDocs: roleDocsMap,
        trafficStats: trafficResult,
        stats: { totalEur: total.toFixed(2), count: formattedPayments.length },
        sharedPages: sharedPagesMap, // Added: Set shared pages state
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
      .on('postgres_changes', { event: '*', schema: 'public', table: 'knowledge_learning' }, () => get().fetchAllData(true))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'channels' }, () => get().fetchAllData(true))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leads' }, () => get().fetchAllData(true))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'kpi_product_rates' }, () => get().fetchAllData(true))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'kpi_settings' }, () => get().fetchAllData(true))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'app_settings' }, () => get().fetchAllData(true))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'countries' }, () => get().fetchAllData(true))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payment_audit_exceptions' }, () => get().fetchAllData(true))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'manager_rates' }, () => get().fetchAllData(true))
      .subscribe();

    return () => supabase.removeChannel(channel);
  },

  // --- ONLINE PRESENCE ---
  // --- ACTIVITY LOGS ---
  fetchLogs: async (from = 0, to = 49) => {
    try {
      const { data, error } = await supabase
        .from('activity_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) throw error;

      if (from === 0) {
        set({ activityLogs: data || [] });
      } else {
        set(state => ({ activityLogs: [...state.activityLogs, ...(data || [])] }));
      }

      return data;
    } catch (error) {
      console.error('Error fetching logs:', error);
      return [];
    }
  },

  // --- UPDATE PAYMENT (C-Level or users with transactions_edit permission) ---
  updatePayment: async (paymentId, updates) => {
    try {
      const user = get().user;
      const permissions = get().permissions;
      const hasEditPermission = user?.role === 'C-level' || permissions?.[user?.role]?.transactions_edit === true;

      if (!user || !hasEditPermission) {
        showToast('Недостаточно прав для редактирования', 'error');
        return false;
      }

      // Map frontend fields to database columns
      const dbUpdates = {};
      if (updates.transactionDate !== undefined) dbUpdates.transaction_date = updates.transactionDate;
      if (updates.manager_id !== undefined) dbUpdates.manager_id = updates.manager_id;
      if (updates.country !== undefined) dbUpdates.country = updates.country;
      if (updates.product !== undefined) dbUpdates.product = updates.product;
      if (updates.type !== undefined) dbUpdates.payment_type = updates.type;
      if (updates.crm_link !== undefined) dbUpdates.crm_link = updates.crm_link;
      if (updates.amountLocal !== undefined) dbUpdates.amount_local = updates.amountLocal;
      if (updates.amountEUR !== undefined) dbUpdates.amount_eur = updates.amountEUR;

      const { error } = await supabase
        .from('payments')
        .update(dbUpdates)
        .eq('id', paymentId);

      if (error) throw error;

      // Log activity
      get().logActivity({
        action: 'edit_payment',
        entity: 'payment',
        entityId: paymentId,
        details: { updated_fields: Object.keys(dbUpdates), updated_by: user.name },
        importance: 'high'
      });

      showToast('Платёж обновлён', 'success');

      // Refresh data
      await get().fetchAllData(true);
      return true;
    } catch (error) {
      console.error('Error updating payment:', error);
      showToast('Ошибка при обновлении платежа', 'error');
      return false;
    }
  },

  // --- BULK UPDATE PAYMENTS ---
  bulkUpdatePayments: async (paymentIds, updates) => {
    try {
      const user = get().user;
      const permissions = get().permissions;
      const hasEditPermission = user?.role === 'C-level' || permissions?.[user?.role]?.transactions_edit === true;

      if (!user || !hasEditPermission) {
        showToast('Недостаточно прав для редактирования', 'error');
        return false;
      }

      if (!paymentIds || paymentIds.length === 0) {
        showToast('Не выбраны платежи', 'error');
        return false;
      }

      // Map frontend fields to database columns
      const dbUpdates = {};
      if (updates.manager_id !== undefined) dbUpdates.manager_id = updates.manager_id;
      if (updates.country !== undefined) dbUpdates.country = updates.country;
      if (updates.product !== undefined) dbUpdates.product = updates.product;
      if (updates.type !== undefined) dbUpdates.payment_type = updates.type;

      if (Object.keys(dbUpdates).length === 0) {
        showToast('Нет полей для обновления', 'error');
        return false;
      }

      console.log('📝 Attempting to update payments:', paymentIds, dbUpdates);

      const { data, error } = await supabase
        .from('payments')
        .update(dbUpdates)
        .in('id', paymentIds)
        .select();

      console.log('📝 Update result:', { data, error });

      if (error) throw error;

      if (!data || data.length === 0) {
        console.warn('⚠️ Update returned no affected rows - RLS may be blocking');
        showToast('Обновление заблокировано (RLS)', 'error');
        return false;
      }

      // Log activity
      get().logActivity({
        action: 'bulk_edit_payments',
        entity: 'payment',
        entityId: null,
        details: {
          payment_ids: paymentIds,
          count: paymentIds.length,
          updated_fields: Object.keys(dbUpdates),
          updated_by: user.name
        },
        importance: 'high'
      });

      showToast(`Обновлено ${paymentIds.length} платежей`, 'success');

      // Refresh data
      await get().fetchAllData(true);
      return true;
    } catch (error) {
      console.error('Error bulk updating payments:', error);
      showToast('Ошибка при массовом обновлении', 'error');
      return false;
    }
  },

  // --- BULK DELETE PAYMENTS ---
  bulkDeletePayments: async (paymentIds) => {
    try {
      const user = get().user;
      const permissions = get().permissions;
      const hasEditPermission = user?.role === 'C-level' || permissions?.[user?.role]?.transactions_edit === true;

      if (!user || !hasEditPermission) {
        showToast('Недостаточно прав для удаления', 'error');
        return false;
      }

      if (!paymentIds || paymentIds.length === 0) {
        showToast('Не выбраны платежи', 'error');
        return false;
      }

      console.log('🗑️ Attempting to delete payments:', paymentIds);

      const { data, error } = await supabase
        .from('payments')
        .delete()
        .in('id', paymentIds)
        .select();

      console.log('🗑️ Delete result:', { data, error });

      if (error) throw error;

      if (!data || data.length === 0) {
        console.warn('⚠️ Delete returned no affected rows - RLS may be blocking');
        showToast('Удаление заблокировано (RLS)', 'error');
        return false;
      }

      // Log activity
      get().logActivity({
        action: 'bulk_delete_payments',
        entity: 'payment',
        entityId: null,
        details: {
          payment_ids: paymentIds,
          count: paymentIds.length,
          deleted_by: user.name
        },
        importance: 'high'
      });

      showToast(`Удалено ${paymentIds.length} платежей`, 'success');

      // Refresh data
      await get().fetchAllData(true);
      return true;
    } catch (error) {
      console.error('Error bulk deleting payments:', error);
      showToast('Ошибка при массовом удалении', 'error');
      return false;
    }
  },

  // --- AUDIT EXCEPTIONS ---
  addAuditException: async (paymentId, reason = 'manual_hide') => {
    try {
      const user = get().user;
      if (!user) return false;

      const { error } = await supabase
        .from('payment_audit_exceptions')
        .insert({
          payment_id: paymentId,
          manager_id: user.id, // Who hid it
          reason: reason
        });

      if (error) throw error;

      showToast('Платёж скрыт из проверки', 'success');
      get().fetchAllData(true);
      return true;
    } catch (error) {
      console.error('Error adding audit exception:', error);
      showToast('Ошибка при добавлении исключения', 'error');
      return false;
    }
  },

  removeAuditException: async (exceptionId) => {
    try {
      const { error } = await supabase
        .from('payment_audit_exceptions')
        .delete()
        .eq('id', exceptionId);

      if (error) throw error;

      showToast('Платёж восстановлен', 'success');
      get().fetchAllData(true);
      return true;
    } catch (error) {
      console.error('Error removing audit exception:', error);
      showToast('Ошибка при удалении исключения', 'error');
      return false;
    }
  },

  logActivity: async ({ action, entity, entityId = null, details = {}, importance = 'low' }) => {
    try {
      const user = get().user;
      console.log('📝 logActivity called:', { action, entity, user_id: user?.id });

      if (!user) {
        console.error('❌ logActivity failed: No user in store');
        return;
      }

      const { data, error } = await supabase
        .from('activity_logs')
        .insert({
          user_id: user.id,
          user_name: user.name || 'Unknown',
          action_type: action,
          entity_type: entity,
          entity_id: entityId,
          details: details,
          importance: importance
        })
        .select();

      if (error) {
        console.error('❌ Failed to log activity to DB:', error);
      } else {
        console.log('✅ Activity logged successfully:', data);
      }
    } catch (e) {
      console.error('❌ Log activity exception:', e);
    }
  },

  subscribeToPresence: () => {
    const user = get().user;
    if (!user) return () => { };

    const channel = supabase.channel('online-users', {
      config: {
        presence: {
          key: user.id,
        },
      },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const newState = channel.presenceState();
        const onlineIds = Object.keys(newState);
        set({ onlineUsers: onlineIds });
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        // Optional: show toast "User X came online"
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        // Optional: show toast "User X went offline"
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            online_at: new Date().toISOString(),
            user_id: user.id,
            role: user.role,
          });
        }
      });

    // EXPOSE FOR DEBUGGING
    window.logActivityTest = get().logActivity;

    return () => supabase.removeChannel(channel);
  }
}));