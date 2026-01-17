import { supabase } from './supabaseClient';
import axios from 'axios';

// --- 1. ПЛАТЕЖИ ---
export const fetchPaymentsData = async () => {
  try {
    let allData = [];
    let from = 0;
    const step = 1000;

    while (true) {
      const { data, error } = await supabase
        .from('payments')
        .select(`*, managers (name)`)
        .order('transaction_date', { ascending: false })
        .range(from, from + step - 1);

      if (error) throw error;

      if (data) {
        allData = [...allData, ...data];
        if (data.length < step) break;
      } else {
        break;
      }
      from += step;
    }

    return allData.map(p => ({
      id: p.id,
      transactionDate: p.transaction_date ? p.transaction_date.replace('T', ' ').slice(0, 16) : '',
      manager: p.managers?.name || 'Неизвестно',
      amountEUR: p.amount_eur,
      amountLocal: p.amount_local,
      country: p.country,
      product: p.product,
      type: p.payment_type,
      crmLink: p.crm_link,
      screenshotUrl: p.screenshot_url
    }));
  } catch (err) {
    console.warn("Supabase error (payments), fallback...", err.message);
    try {
      const res = await axios.get('http://localhost:3001/api/payments');
      if (res.data.success) return res.data.data;
    } catch (apiErr) {
      console.error("All sources failed:", apiErr);
      return [];
    }
  }
  return [];
};

// --- 2. МЕНЕДЖЕРЫ (Получаем ВСЕХ для админки) ---
export const fetchManagersData = async () => {
  try {
    let allData = [];
    let from = 0;
    const step = 1000;

    // Убрали .eq('status', 'active'), чтобы видеть и заблокированных
    while (true) {
      const { data, error } = await supabase
        .from('managers')
        .select('*')
        .order('name')
        .range(from, from + step - 1);

      if (error) throw error;

      if (data) {
        allData = [...allData, ...data];
        if (data.length < step) break;
      } else {
        break;
      }
      from += step;
    }
    return allData;
  } catch (err) {
    console.error("Error fetching managers:", err);
    return [];
  }
};

// --- 3. ПОЛУЧИТЬ ОДНОГО МЕНЕДЖЕРА (Для редактирования) ---
export const fetchManagerById = async (id) => {
  try {
    const { data, error } = await supabase
      .from('managers')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  } catch (err) {
    console.error("Error fetching manager by id:", err);
    return null;
  }
};

// --- 4. ОБНОВИТЬ ДАННЫЕ МЕНЕДЖЕРА ---
export const updateManagerProfile = async (id, updates) => {
  const { error } = await supabase
    .from('managers')
    .update(updates)
    .eq('id', id);

  if (error) throw error;
  return true;
};

// --- 5. БЛОКИРОВКА / РАЗБЛОКИРОВКА ---
export const toggleManagerStatus = async (id, currentStatus) => {
  const newStatus = currentStatus === 'active' ? 'blocked' : 'active';
  const { error } = await supabase
    .from('managers')
    .update({ status: newStatus })
    .eq('id', id);

  if (error) throw error;
  return newStatus;
};

// --- 6. ПОЛУЧЕНИЕ ТРАФИКА (KeyCRM) ---
export const fetchTrafficData = async (startDate, endDate) => {
  try {
    // Формируем тело запроса с датами для фильтрации на сервере
    const body = {
      dateFrom: startDate,
      dateTo: endDate
    };

    // Вызываем Edge Function 'keycrm-stats'
    // ВАЖНО: Убедись, что ты задеплоил функцию именно с этим именем:
    // supabase functions deploy keycrm-stats --no-verify-jwt
    // Если ты оставил имя папки 'umnico-stats', поменяй название ниже.
    const { data, error } = await supabase.functions.invoke('keycrm-stats', {
      body: body
    });

    if (error) {
      console.error("Ошибка при вызове функции keycrm-stats:", error);
      return {};
    }

    // Функция возвращает { data: { "PL": ... }, debug: ... }
    // Нам нужны только данные
    return data?.data || {};
  } catch (err) {
    console.error("Глобальная ошибка запроса трафика:", err);
    return {};
  }
};