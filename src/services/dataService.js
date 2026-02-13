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

// --- 7. УПРАВЛЕНИЕ ГЕО (COUNTRIES) ---
export const addCountry = async (countryData) => {
  const { error } = await supabase
    .from('countries')
    .insert([countryData]);

  if (error) throw error;
  return true;
};

export const deleteCountry = async (code) => {
  const { error } = await supabase
    .from('countries')
    .delete()
    .eq('code', code);

  if (error) throw error;
  return true;
};

// --- 8. TOGGLE GEO STATUS (Active/Inactive) ---
export const toggleGeoStatus = async (code, newIsActive, userName) => {
  // 1. Get current status_history
  const { data: country, error: fetchError } = await supabase
    .from('countries')
    .select('status_history')
    .eq('code', code)
    .single();

  if (fetchError) throw fetchError;

  const history = Array.isArray(country?.status_history) ? country.status_history : [];

  // 2. Append new entry
  history.push({
    action: newIsActive ? 'activated' : 'deactivated',
    at: new Date().toISOString(),
    by: userName || 'Unknown'
  });

  // 3. Update both fields (with .select() to verify)
  const { data, error } = await supabase
    .from('countries')
    .update({
      is_active: newIsActive,
      status_history: history
    })
    .eq('code', code)
    .select();

  if (error) throw error;
  if (!data || data.length === 0) {
    throw new Error('Update blocked by RLS or row not found');
  }
  return true;
};

// --- 9. GEO NOTES ---
export const fetchGeoNotes = async (geoCode) => {
  const { data, error } = await supabase
    .from('geo_notes')
    .select('*')
    .eq('geo_code', geoCode)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching notes:', error);
    return [];
  }
  return data || [];
};

export const addGeoNote = async (geoCode, note, authorName, userId = null) => {
  const { data, error } = await supabase
    .from('geo_notes')
    .insert([{
      geo_code: geoCode,
      note: note,
      author_name: authorName,
      created_by: userId
    }])
    .select();

  if (error) throw error;
  return data;
};

export const fetchGeoNotesInRange = async (startDate, endDate) => {
  // Ensure we have valid ISO strings
  const start = startDate instanceof Date ? startDate.toISOString() : startDate;
  const end = endDate instanceof Date ? endDate.toISOString() : endDate;

  const { data, error } = await supabase
    .from('geo_notes')
    .select('*')
    .gte('created_at', start)
    .lte('created_at', end)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching notes range:', error);
    return [];
  }
  return data || [];
};