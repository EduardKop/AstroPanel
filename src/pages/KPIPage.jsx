import React, { useState, useEffect } from 'react';
import { useAppStore } from '../store/appStore';
import { supabase } from '../services/supabaseClient';
import { showToast } from '../utils/toastEvents';
import {
  Wallet, Trophy, Target, Calendar,
  Sparkles, TrendingUp, Zap, Edit, Plus, Trash2, X, Save,
  Users, ChevronLeft, ChevronRight
} from 'lucide-react';

// Маппинг флагов
const FLAGS = {
  UA: '🇺🇦', PL: '🇵🇱', IT: '🇮🇹', HR: '🇭🇷',
  BG: '🇧🇬', CZ: '🇨🇿', RO: '🇷🇴', LT: '🇱🇹',
  TR: '🇹🇷', FR: '🇫🇷', PT: '🇵🇹', DE: '🇩🇪',
  US: '🇺🇸', ES: '🇪🇸', SK: '🇸🇰', HU: '🇭🇺'
};

const KPIPage = () => {
  const { kpiRates, kpiSettings, user, fetchAllData, managers, managerRates } = useAppStore();
  const [isEditOpen, setIsEditOpen] = useState(false);

  // Безопасное получение данных из стора с дефолтными значениями
  const baseSalary = kpiSettings?.base_salary || 0;

  // Парсим JSON настройки тиров, если они пришли строкой или объектом
  const dailyTiers = typeof kpiSettings?.daily_tiers === 'string'
    ? JSON.parse(kpiSettings.daily_tiers)
    : (kpiSettings?.daily_tiers || []);

  const monthlyTiers = typeof kpiSettings?.monthly_tiers === 'string'
    ? JSON.parse(kpiSettings.monthly_tiers)
    : (kpiSettings?.monthly_tiers || []);

  const isAdmin = user?.role === 'Admin' || user?.role === 'C-level'; // Доступ к кнопке

  return (
    <div className="animate-in fade-in zoom-in duration-300 pb-10 font-sans">

      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold dark:text-white flex items-center gap-2 tracking-tight">
            <Target className="text-blue-500" size={20} />
            Система Мотивации
          </h2>
          <p className="text-gray-500 dark:text-gray-400 text-xs mt-1 font-medium">
            Актуальная тарифная сетка и бонусы
          </p>
        </div>

        {/* КНОПКА ИЗМЕНИТЬ (Только для Админа) */}
        {isAdmin && (
          <button
            onClick={() => setIsEditOpen(true)}
            className="flex items-center gap-2 bg-black dark:bg-white text-white dark:text-black px-4 py-2 rounded-lg text-xs font-bold hover:opacity-80 transition-opacity shadow-sm"
          >
            <Edit size={14} /> Изменить KPI
          </button>
        )}
      </div>

      {/* 1. HERO BLOCK: BASE SALARY */}
      <div className="relative overflow-hidden rounded-xl bg-white dark:bg-[#111] border border-gray-200 dark:border-gray-800 shadow-xl mb-6 group">
        <div className="absolute inset-0 opacity-10 dark:opacity-20 pointer-events-none"
          style={{ backgroundImage: 'linear-gradient(#333 1px, transparent 1px), linear-gradient(90deg, #333 1px, transparent 1px)', backgroundSize: '20px 20px' }}>
        </div>
        <div className="absolute inset-0 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 pointer-events-none"></div>

        <div className="relative z-10 p-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="p-4 bg-blue-100 dark:bg-blue-600/10 border border-blue-200 dark:border-blue-500/30 rounded-2xl shadow-[0_0_15px_rgba(37,99,235,0.2)]">
              <Wallet size={32} className="text-blue-600 dark:text-blue-500" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest mb-1">Гарантированный оклад</h3>
              <p className="text-gray-500 dark:text-gray-400 text-xs max-w-sm leading-relaxed">
                Фиксированная выплата каждую неделю при выполнении минимальных требований активности.
              </p>
            </div>
          </div>
          <div className="flex items-start">
            <span className="text-2xl mt-2 text-gray-400 dark:text-gray-500 font-mono mr-1">$</span>
            <span className="text-6xl font-black text-gray-900 dark:text-white tracking-tighter font-mono drop-shadow-lg">{baseSalary}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* LEFT COLUMN */}
        <div className="lg:col-span-8 space-y-6">

          {/* ТАРИФЫ (Динамические из БД) */}
          <div className="bg-white dark:bg-[#111] rounded-xl border border-gray-200 dark:border-[#333] shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-200 dark:border-[#333] flex items-center justify-between bg-gray-50/50 dark:bg-[#161616]">
              <div className="flex items-center gap-2">
                <Sparkles size={16} className="text-purple-500" />
                <h3 className="text-sm font-bold dark:text-white uppercase tracking-wide">Тарифы за прогноз</h3>
              </div>
              <span className="text-[10px] bg-purple-500/10 text-purple-400 px-2 py-0.5 rounded font-bold uppercase">Dynamic</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2">
              {kpiRates.map((rate) => (
                <BonusItem
                  key={rate.id}
                  title={rate.product_name}
                  // subtitle={rate.subtitle} 
                  price={Number(rate.rate).toFixed(2)}
                  isHighlight={rate.is_highlight}
                />
              ))}
              {kpiRates.length === 0 && (
                <div className="p-6 text-center text-xs text-gray-400 col-span-2">Тарифы не настроены</div>
              )}
            </div>
          </div>

          {/* КОМАНДНАЯ ПРЕМИЯ (Статика для визуализации, пока нет логики команд в БД) */}
          <div className="bg-white dark:bg-[#111] rounded-xl border border-gray-200 dark:border-[#333] shadow-sm p-5">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <Trophy size={16} className="text-amber-500" />
                <h3 className="text-sm font-bold dark:text-white uppercase tracking-wide">Командная гонка</h3>
              </div>
              <div className="flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/20 text-amber-500 text-xs font-bold px-3 py-1 rounded-full">
                <Zap size={12} fill="currentColor" /> +$30 бонус
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <TeamCard number="I" countries={["UA", "PL", "IT", "HR"]} color="border-blue-500/30 bg-blue-500/5 text-blue-400" />
              <TeamCard number="II" countries={["BG", "CZ", "RO", "LT"]} color="border-purple-500/30 bg-purple-500/5 text-purple-400" />
              <TeamCard number="III" countries={["TR", "FR", "PT", "DE"]} color="border-emerald-500/30 bg-emerald-500/5 text-emerald-400" />
            </div>
            <p className="text-[10px] text-gray-500 mt-3 text-center opacity-70">
              * Бонус начисляется каждому участнику победившей группы по итогам недели
            </p>
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div className="lg:col-span-4 space-y-6">

          {/* ДНЕВНЫЕ ЦЕЛИ (Динамические из БД) */}
          <div className="bg-white dark:bg-[#111] rounded-xl border border-gray-200 dark:border-[#333] shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-200 dark:border-[#333] bg-gray-50/50 dark:bg-[#161616] flex items-center gap-2">
              <TrendingUp size={16} className="text-emerald-500" />
              <h3 className="text-sm font-bold dark:text-white uppercase tracking-wide">Дневной KPI</h3>
            </div>

            <div className="p-4 space-y-3">
              {dailyTiers.map((tier, idx) => (
                <DailyTier
                  key={idx}
                  count={`${tier.min}${tier.max > 100 ? '+' : ' – ' + tier.max}`}
                  reward={tier.reward}
                  isMax={tier.reward >= 10}
                />
              ))}
              {dailyTiers.length === 0 && <div className="text-xs text-gray-400 text-center">Не настроено</div>}
            </div>
          </div>

          {/* ИТОГИ МЕСЯЦА (Динамические из БД) */}
          <div className="relative overflow-hidden rounded-xl bg-white dark:bg-[#09090b] border border-gray-200 dark:border-gray-800 shadow-md">
            <div className="absolute inset-0 bg-gradient-to-b from-gray-50/50 to-gray-100/80 dark:from-gray-800/50 dark:to-black/80 pointer-events-none"></div>
            <div className="relative z-10 p-5">
              <div className="flex items-center gap-2 mb-5">
                <Calendar size={16} className="text-blue-500 dark:text-blue-400" />
                <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wide">Бонус месяца</h3>
              </div>

              <div className="space-y-0">
                {monthlyTiers.map((tier, idx) => (
                  <MonthTier
                    key={idx}
                    label={tier.max > 1000 ? `${tier.min}+ продаж` : `${tier.min} - ${tier.max} продаж`}
                    reward={tier.reward}
                    isHighlight={tier.reward >= 100}
                    isDim={tier.reward < 75}
                  />
                ))}
                {monthlyTiers.length === 0 && <div className="text-xs text-gray-500 text-center">Не настроено</div>}
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* МОДАЛКА РЕДАКТИРОВАНИЯ */}
      {isEditOpen && (
        <EditKPIModal
          onClose={() => setIsEditOpen(false)}
          onUpdate={fetchAllData}
          kpiRates={kpiRates}
          kpiSettings={kpiSettings}
          managers={managers}
          managerRates={managerRates}
        />
      )}
    </div>
  );
};

// --- КОМПОНЕНТЫ UI ---

const BonusItem = ({ title, subtitle, price, isHighlight }) => (
  <div className={`
    flex justify-between items-center p-4 border-b sm:border-b-0 sm:odd:border-r border-gray-200 dark:border-[#333] last:border-0 hover:bg-gray-50 dark:hover:bg-[#161616] transition-colors group
    ${isHighlight ? 'bg-purple-50/30 dark:bg-purple-900/5' : ''}
  `}>
    <div>
      <div className={`text-xs font-bold ${isHighlight ? 'text-purple-700 dark:text-purple-300' : 'text-gray-700 dark:text-gray-300'}`}>
        {title}
      </div>
      {subtitle && <div className="text-[10px] text-gray-400 mt-0.5">{subtitle}</div>}
    </div>
    <div className={`text-sm font-mono font-bold flex items-center ${isHighlight ? 'text-purple-600 dark:text-purple-400' : 'text-gray-900 dark:text-white'}`}>
      <span className="text-[10px] mr-0.5 opacity-60">$</span>{price}
    </div>
  </div>
);

const DailyTier = ({ count, reward, isMax }) => (
  <div className={`
    flex justify-between items-center p-3 rounded-lg border transition-all
    ${isMax
      ? 'bg-emerald-500/10 border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.1)]'
      : 'bg-gray-50 dark:bg-[#161616] border-gray-200 dark:border-[#333] hover:border-gray-300 dark:hover:border-[#444]'
    }
  `}>
    <div className="flex flex-col">
      <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Продаж</span>
      <span className={`text-sm font-bold ${isMax ? 'text-emerald-400' : 'text-gray-700 dark:text-gray-200'}`}>
        {count}
      </span>
    </div>
    <div className={`flex items-center gap-1 font-mono font-bold text-lg ${isMax ? 'text-emerald-500' : 'text-gray-400 dark:text-gray-500'}`}>
      <span className="text-xs opacity-50">+</span>${reward}
    </div>
  </div>
);

const MonthTier = ({ label, reward, isDim, isHighlight }) => (
  <div className={`
    flex justify-between items-center py-3 border-b border-gray-200 dark:border-gray-800 last:border-0
    ${isHighlight ? 'py-4' : ''}
  `}>
    <span className={`text-xs font-medium ${isDim ? 'text-gray-400 dark:text-gray-500' : 'text-gray-700 dark:text-gray-300'} ${isHighlight ? 'text-black dark:text-white font-bold' : ''}`}>
      {label}
    </span>
    <div className={`
      flex items-center gap-1 font-mono font-bold
      ${isHighlight ? 'text-emerald-600 dark:text-emerald-400 text-lg drop-shadow-md' : isDim ? 'text-gray-400 dark:text-gray-600' : 'text-emerald-600/70 dark:text-emerald-600/70'}
    `}>
      <span className="text-xs opacity-50">+</span>${reward}
    </div>
  </div>
);

const TeamCard = ({ number, countries, color }) => (
  <div className={`p-4 rounded-lg border ${color} flex flex-col items-center text-center relative overflow-hidden`}>
    <div className="text-[10px] font-black opacity-50 uppercase tracking-widest mb-3">Группа {number}</div>
    <div className="flex flex-wrap justify-center gap-2">
      {countries.map(c => (
        <span
          key={c}
          className="flex items-center gap-1.5 px-2 py-1 rounded-[6px] bg-black/40 border border-white/10 text-white text-[11px] font-bold shadow-sm"
        >
          <span className="text-sm leading-none">{FLAGS[c] || '🏳️'}</span>
          {c}
        </span>
      ))}
    </div>
  </div>
);

// --- MODAL EDITOR (АДМИНСКАЯ ПАНЕЛЬ) ---
const SALES_ROLES = ['Sales', 'SeniorSales', 'SalesTaro'];

const EditKPIModal = ({ onClose, onUpdate, kpiRates, kpiSettings, managers, managerRates }) => {
  const [activeTab, setActiveTab] = useState('tariffs'); // 'tariffs' | 'rates'

  // --- Tab: Tariffs ---
  const [rates, setRates] = useState(kpiRates || []);
  const [baseSalary, setBaseSalary] = useState(kpiSettings?.base_salary || 0);
  const [newProduct, setNewProduct] = useState({ name: '', rate: '' });
  const [isSaving, setIsSaving] = useState(false);

  // --- Tab: Employee Rates ---
  const [isMonthly, setIsMonthly] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  // Фильтруем только Sales/SeniorSales/SalesTaro и active
  const salesManagers = (managers || []).filter(
    m => SALES_ROLES.includes(m.role) && m.status === 'active'
  ).sort((a, b) => a.name.localeCompare(b.name));

  // Строим map ставок: manager_id -> { default: {...}, 'YYYY-MM': {...} }
  const ratesMap = {};
  (managerRates || []).forEach(r => {
    if (!ratesMap[r.manager_id]) ratesMap[r.manager_id] = {};
    const key = r.month || 'default';
    ratesMap[r.manager_id][key] = r;
  });

  // Получаем ставку для сотрудника (месячная или default)
  const getRate = (managerId) => {
    const mRates = ratesMap[managerId] || {};
    if (isMonthly && mRates[selectedMonth]) {
      return { ...mRates[selectedMonth], isOverride: true };
    }
    if (mRates['default']) {
      return { ...mRates['default'], isOverride: false };
    }
    return { base_rate: 0, bonus: 0, penalty: 0, isOverride: false };
  };

  // Локальный стейт для редактируемых ставок сотрудников
  const [editedRates, setEditedRates] = useState({});

  // Инициализация при смене режима/месяца
  useEffect(() => {
    const initial = {};
    salesManagers.forEach(m => {
      const r = getRate(m.id);
      initial[m.id] = {
        base_rate: r.base_rate || 0,
        bonus: r.bonus || 0,
        penalty: r.penalty || 0,
        isOverride: r.isOverride || false
      };
    });
    setEditedRates(initial);
  }, [isMonthly, selectedMonth, managerRates]);

  const updateEmployeeRate = (managerId, field, value) => {
    setEditedRates(prev => ({
      ...prev,
      [managerId]: { ...prev[managerId], [field]: value }
    }));
  };

  // Навигация по месяцам
  const shiftMonth = (delta) => {
    const [y, m] = selectedMonth.split('-').map(Number);
    const d = new Date(y, m - 1 + delta, 1);
    setSelectedMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  };

  const monthLabel = (monthStr) => {
    const [y, m] = monthStr.split('-');
    const months = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
    return `${months[parseInt(m) - 1]} ${y}`;
  };

  // --- SAVE ---
  const handleSave = async () => {
    setIsSaving(true);
    try {
      if (activeTab === 'tariffs') {
        // 1. Обновляем существующие тарифы
        for (const r of rates) {
          await supabase.from('kpi_product_rates').upsert({
            id: r.id,
            product_name: r.product_name,
            rate: parseFloat(r.rate)
          });
        }
        // 2. Добавляем новый, если введен
        if (newProduct.name && newProduct.rate) {
          await supabase.from('kpi_product_rates').insert({
            product_name: newProduct.name,
            rate: parseFloat(newProduct.rate)
          });
        }
        // 3. Обновляем настройки (Оклад)
        await supabase.from('kpi_settings').upsert({ key: 'base_salary', value: baseSalary });
      } else {
        // Сохраняем ставки сотрудников
        const monthValue = isMonthly ? selectedMonth : null;
        for (const managerId of Object.keys(editedRates)) {
          const r = editedRates[managerId];
          // Ищем существующую запись
          const existing = (managerRates || []).find(
            mr => mr.manager_id === managerId && (mr.month || null) === monthValue
          );
          const payload = {
            manager_id: managerId,
            base_rate: parseFloat(r.base_rate) || 0,
            bonus: parseFloat(r.bonus) || 0,
            penalty: parseFloat(r.penalty) || 0,
            month: monthValue,
            updated_at: new Date().toISOString()
          };
          if (existing) {
            await supabase.from('manager_rates').update(payload).eq('id', existing.id);
          } else {
            await supabase.from('manager_rates').insert(payload);
          }
        }
      }

      await onUpdate();
      showToast('Сохранено', 'success');
      onClose();
    } catch (e) {
      console.error(e);
      showToast('Ошибка при сохранении', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Удалить этот тариф?')) return;
    await supabase.from('kpi_product_rates').delete().eq('id', id);
    setRates(prev => prev.filter(r => r.id !== id));
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-[#111] w-full max-w-2xl rounded-xl border border-gray-200 dark:border-[#333] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="p-4 border-b border-gray-200 dark:border-[#333] flex justify-between items-center bg-gray-50/50 dark:bg-[#161616]">
          <h3 className="text-sm font-bold dark:text-white flex items-center gap-2">
            <Edit size={16} className="text-blue-500" /> Редактор KPI
          </h3>
          <button onClick={onClose} className="text-gray-500 hover:text-black dark:hover:text-white"><X size={18} /></button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-[#333] bg-gray-50/30 dark:bg-[#161616]">
          <button
            onClick={() => setActiveTab('tariffs')}
            className={`flex-1 px-4 py-2.5 text-xs font-bold uppercase tracking-wide transition-colors flex items-center justify-center gap-2 ${activeTab === 'tariffs'
                ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400 bg-blue-50/50 dark:bg-blue-900/10'
                : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
          >
            <Sparkles size={14} /> Тарифы
          </button>
          <button
            onClick={() => setActiveTab('rates')}
            className={`flex-1 px-4 py-2.5 text-xs font-bold uppercase tracking-wide transition-colors flex items-center justify-center gap-2 ${activeTab === 'rates'
                ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400 bg-blue-50/50 dark:bg-blue-900/10'
                : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
          >
            <Users size={14} /> Ставки сотрудников
          </button>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto custom-scrollbar space-y-6 flex-1">

          {/* TAB: TARIFFS */}
          {activeTab === 'tariffs' && (
            <>
              {/* Base Salary */}
              <div>
                <label className="text-[10px] font-bold uppercase text-gray-500 mb-1 block">Базовая ставка ($)</label>
                <input
                  type="number"
                  value={baseSalary}
                  onChange={e => setBaseSalary(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-[#1A1A1A] border border-gray-200 dark:border-[#333] rounded p-2 text-sm font-bold dark:text-white outline-none focus:border-blue-500 transition-colors"
                />
              </div>

              {/* Product Rates */}
              <div>
                <label className="text-[10px] font-bold uppercase text-gray-500 mb-2 block">Тарифы продуктов</label>
                <div className="space-y-2 bg-gray-50 dark:bg-[#161616] p-3 rounded-lg border border-gray-200 dark:border-[#222]">
                  {rates.map((r, idx) => (
                    <div key={r.id} className="flex gap-2 items-center group">
                      <input
                        value={r.product_name}
                        onChange={e => { const n = [...rates]; n[idx].product_name = e.target.value; setRates(n) }}
                        className="flex-1 bg-transparent border-b border-gray-300 dark:border-[#444] text-xs py-1 dark:text-white outline-none focus:border-blue-500"
                      />
                      <span className="text-gray-400 text-xs">$</span>
                      <input
                        type="number"
                        value={r.rate}
                        onChange={e => { const n = [...rates]; n[idx].rate = e.target.value; setRates(n) }}
                        className="w-14 bg-transparent border-b border-gray-300 dark:border-[#444] text-xs py-1 font-mono font-bold text-right dark:text-white outline-none focus:border-blue-500"
                      />
                      <button onClick={() => handleDelete(r.id)} className="text-gray-400 hover:text-red-500 p-1 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={12} /></button>
                    </div>
                  ))}

                  {/* Add New */}
                  <div className="flex gap-2 items-center pt-3 border-t border-dashed border-gray-300 dark:border-[#333] mt-2">
                    <Plus size={14} className="text-green-500" />
                    <input
                      placeholder="Название нового продукта..."
                      value={newProduct.name}
                      onChange={e => setNewProduct({ ...newProduct, name: e.target.value })}
                      className="flex-1 bg-transparent text-xs py-1 dark:text-white outline-none placeholder:text-gray-500"
                    />
                    <span className="text-gray-400 text-xs">$</span>
                    <input
                      type="number"
                      placeholder="0.00"
                      value={newProduct.rate}
                      onChange={e => setNewProduct({ ...newProduct, rate: e.target.value })}
                      className="w-14 bg-transparent border-b border-gray-300 dark:border-[#444] text-xs py-1 font-mono text-right dark:text-white outline-none focus:border-green-500"
                    />
                  </div>
                </div>
              </div>
            </>
          )}

          {/* TAB: EMPLOYEE RATES */}
          {activeTab === 'rates' && (
            <>
              {/* Mode toggle + Month selector */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                {/* Toggle */}
                <div className="flex bg-gray-100 dark:bg-[#1A1A1A] rounded-lg p-0.5 border border-gray-200 dark:border-[#333]">
                  <button
                    onClick={() => setIsMonthly(false)}
                    className={`px-3 py-1.5 text-[11px] font-bold rounded-md transition-all ${!isMonthly
                        ? 'bg-white dark:bg-[#333] text-black dark:text-white shadow-sm'
                        : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                      }`}
                  >
                    По умолчанию
                  </button>
                  <button
                    onClick={() => setIsMonthly(true)}
                    className={`px-3 py-1.5 text-[11px] font-bold rounded-md transition-all ${isMonthly
                        ? 'bg-white dark:bg-[#333] text-black dark:text-white shadow-sm'
                        : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                      }`}
                  >
                    Помесячно
                  </button>
                </div>

                {/* Month Picker */}
                {isMonthly && (
                  <div className="flex items-center gap-2 bg-gray-100 dark:bg-[#1A1A1A] rounded-lg border border-gray-200 dark:border-[#333] px-1">
                    <button onClick={() => shiftMonth(-1)} className="p-1 text-gray-500 hover:text-black dark:hover:text-white">
                      <ChevronLeft size={16} />
                    </button>
                    <span className="text-xs font-bold dark:text-white min-w-[120px] text-center">
                      {monthLabel(selectedMonth)}
                    </span>
                    <button onClick={() => shiftMonth(1)} className="p-1 text-gray-500 hover:text-black dark:hover:text-white">
                      <ChevronRight size={16} />
                    </button>
                  </div>
                )}
              </div>

              {isMonthly && (
                <div className="text-[10px] text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/30 rounded-lg px-3 py-2 font-medium">
                  ⚠️ Помесячные ставки переопределяют значения по умолчанию только для выбранного месяца
                </div>
              )}

              {/* Employee List */}
              <div className="space-y-3">
                {salesManagers.length === 0 && (
                  <div className="text-center text-xs text-gray-400 py-8">Нет сотрудников с ролью Sales</div>
                )}
                {salesManagers.map(m => {
                  const ed = editedRates[m.id] || { base_rate: 0, bonus: 0, penalty: 0 };
                  const hasDefault = ratesMap[m.id]?.['default'];
                  const hasOverride = isMonthly && ratesMap[m.id]?.[selectedMonth];

                  return (
                    <div
                      key={m.id}
                      className={`rounded-lg border p-3 transition-colors ${hasOverride
                          ? 'border-amber-300 dark:border-amber-700/50 bg-amber-50/30 dark:bg-amber-900/5'
                          : 'border-gray-200 dark:border-[#333] bg-gray-50/50 dark:bg-[#161616]'
                        }`}
                    >
                      {/* Name row */}
                      <div className="flex items-center gap-2 mb-2.5">
                        {m.avatar_url ? (
                          <img src={m.avatar_url} alt="" className="w-6 h-6 rounded-full object-cover border border-gray-200 dark:border-[#444]" />
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-gray-200 dark:bg-[#333] flex items-center justify-center text-[10px] font-bold text-gray-500">
                            {m.name?.[0]}
                          </div>
                        )}
                        <span className="text-xs font-bold dark:text-white flex-1 truncate">{m.name}</span>
                        <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${m.role === 'SeniorSales' ? 'bg-purple-100 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400'
                            : m.role === 'SalesTaro' ? 'bg-amber-100 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400'
                              : 'bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                          }`}>
                          {m.role}
                        </span>
                        {isMonthly && !hasOverride && hasDefault && (
                          <span className="text-[9px] text-gray-400 italic">по умолч.</span>
                        )}
                      </div>

                      {/* Fields */}
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className="text-[9px] font-bold uppercase text-gray-400 mb-0.5 block">Ставка $</label>
                          <input
                            type="number"
                            value={ed.base_rate}
                            onChange={e => updateEmployeeRate(m.id, 'base_rate', e.target.value)}
                            className="w-full bg-white dark:bg-[#111] border border-gray-200 dark:border-[#444] rounded px-2 py-1 text-xs font-mono font-bold dark:text-white outline-none focus:border-blue-500 transition-colors"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] font-bold uppercase text-emerald-500 mb-0.5 block">Надбавка $</label>
                          <input
                            type="number"
                            value={ed.bonus}
                            onChange={e => updateEmployeeRate(m.id, 'bonus', e.target.value)}
                            className="w-full bg-white dark:bg-[#111] border border-emerald-200 dark:border-emerald-800/30 rounded px-2 py-1 text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400 outline-none focus:border-emerald-500 transition-colors"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] font-bold uppercase text-red-400 mb-0.5 block">Штраф $</label>
                          <input
                            type="number"
                            value={ed.penalty}
                            onChange={e => updateEmployeeRate(m.id, 'penalty', e.target.value)}
                            className="w-full bg-white dark:bg-[#111] border border-red-200 dark:border-red-800/30 rounded px-2 py-1 text-xs font-mono font-bold text-red-500 dark:text-red-400 outline-none focus:border-red-500 transition-colors"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-[#333] bg-gray-50/50 dark:bg-[#161616] flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-xs font-bold text-gray-500 hover:text-gray-800 dark:hover:text-white transition-colors">Отмена</button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-xs font-bold transition-colors disabled:opacity-50"
          >
            <Save size={14} /> {isSaving ? 'Сохранение...' : 'Сохранить'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default KPIPage;