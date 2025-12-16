import { supabase } from './supabaseClient';
import axios from 'axios';

// --- 1. ПЛАТЕЖИ ---
export const fetchPaymentsData = async () => {
  try {
    const { data, error } = await supabase
      .from('payments')
      .select(`*, managers (name)`)
      .order('transaction_date', { ascending: false });

    if (error) throw error;

    return data.map(p => ({
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
    // Убрали .eq('status', 'active'), чтобы видеть и заблокированных
    const { data, error } = await supabase
      .from('managers')
      .select('*')
      .order('name');

    if (error) throw error;
    return data;
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