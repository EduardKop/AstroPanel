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

  // Данные для зарплат
  kpiRates: [],
  kpiSettings: {},

  // Справочник каналов
  channelsMap: {},
  channels: [], // Raw channels data

  // Данные трафика
  trafficStats: {},

  // Dynamic Settings (Role Permissions & Docs)
  permissions: {},
  roleDocs: {},

  stats: { totalEur: 0, count: 0 },
  isLoading: false,
  isInitialized: false,

  // --- ACTIONS ---

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

        if (data && data.length > 0) {
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
          // ✅ FIX: Используем UTC для ключа даты (как просил юзер)
          const dateStr = extractUTCDate(lead.created_at);

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
      set({ channelsMap: newChannelsMap, channels: channelsData || [] });

      // Б. Менеджеры
      const managersData = await fetchAll('managers', '*', 'created_at', false);
      const managersMap = {};
      managersData.forEach(m => managersMap[m.id] = { name: m.name, role: m.role });

      // В. Оплаты, Продукты, Правила, Countries, Schedules
      const paymentsData = await fetchAll('payments', '*', 'transaction_date', false);
      const productsData = await fetchAll('knowledge_products', '*', 'created_at', false);
      const rulesData = await fetchAll('knowledge_rules', '*', 'created_at', false);
      const learningData = await fetchAll('knowledge_learning', '*', 'created_at', false);
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

      // SAVE TO CACHE
      localStorage.setItem('astroPermissions', JSON.stringify(permissionsMap));
      localStorage.setItem('astroRoleDocs', JSON.stringify(roleDocsMap));

      // Д. Трафик и Источники (LEADS)
      // Используем пагинацию для загрузки ВСЕХ лидов (1066+)
      let leadsData = [];
      let from = 0;
      const step = 1000;
      while (true) {
        const { data, error } = await supabase
          .from('leads')
          .select('created_at, is_comment, channel_id, wazzup_chat_id')
          .range(from, from + step - 1);

        if (error) throw error;
        if (data && data.length > 0) {
          leadsData = [...leadsData, ...data];
          if (data.length < step) break;
        } else {
          break;
        }
        from += step;
      }

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
          // ✅ FIX: Используем UTC для ключа даты (как просил юзер)
          const dateStr = extractUTCDate(lead.created_at);

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
      .on('postgres_changes', { event: '*', schema: 'public', table: 'knowledge_learning' }, () => get().fetchAllData(true))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'channels' }, () => get().fetchAllData(true))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leads' }, () => get().fetchAllData(true))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'kpi_product_rates' }, () => get().fetchAllData(true))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'kpi_settings' }, () => get().fetchAllData(true))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'app_settings' }, () => get().fetchAllData(true))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'countries' }, () => get().fetchAllData(true))
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