import React, { useState, useMemo, useEffect } from 'react';
import { useAppStore } from '../store/appStore';
import {
  Filter, RotateCcw, XCircle,
  Users, DollarSign, Percent, CreditCard, LayoutDashboard,
  Activity, Trophy, Globe, Layers, MessageCircle, MessageSquare, Phone, Calendar as CalendarIcon
} from 'lucide-react';
import { AreaChart, Area, XAxis, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';

import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

// --- КОНФИГУРАЦИЯ ---
const TIMEZONE = 'Europe/Kyiv';

const FLAGS = {
  UA: '🇺🇦', PL: '🇵🇱', IT: '🇮🇹', HR: '🇭🇷',
  BG: '🇧🇬', CZ: '🇨🇿', RO: '🇷🇴', LT: '🇱🇹',
  TR: '🇹🇷', FR: '🇫🇷', PT: '🇵🇹', DE: '🇩🇪',
  US: '🇺🇸', ES: '🇪🇸', SK: '🇸🇰', HU: '🇭🇺',
  KZ: '🇰🇿', UZ: '🇺🇿', MD: '🇲🇩'
};
const getFlag = (code) => FLAGS[code] || '🏳️';

const getCRColor = (val) => {
  const num = parseFloat(val);
  if (num >= 10) return 'text-emerald-600 dark:text-emerald-400';
  if (num >= 5) return 'text-amber-600 dark:text-amber-400';
  return 'text-rose-600 dark:text-rose-400';
};

const getPaymentBadgeStyle = (type) => {
  const t = (type || '').toLowerCase();
  if (t.includes('lava')) return 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20';
  if (t.includes('jet') || t.includes('fex')) return 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20';
  if (t.includes('iban')) return 'bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20';
  if (t.includes('req') || t.includes('рек') || t.includes('прям')) return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20';
  return 'bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/20';
};

const getRankEmoji = (index) => {
  if (index === 0) return '🥇';
  if (index === 1) return '🥈';
  if (index === 2) return '🥉';
  return <span className="text-gray-400 text-[10px] font-mono">#{index + 1}</span>;
}

const getLastWeekRange = () => {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - 7);
  return [start, end];
};

// ХЕЛПЕР ДЛЯ ВРЕМЕНИ (Raw Mode)
const toYMD = (date) => {
  if (!date) return '';
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const DenseSelect = ({ label, value, options, onChange }) => (
  <div className="relative group w-full sm:w-auto flex-1 sm:flex-none min-w-[100px]">
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full appearance-none bg-white dark:bg-[#111] border border-gray-200 dark:border-[#333] text-gray-700 dark:text-gray-200 py-1.5 pl-2 pr-6 rounded-[6px] text-xs font-medium focus:outline-none focus:border-blue-500 hover:border-gray-400 dark:hover:border-[#555] transition-colors cursor-pointer truncate"
    >
      <option value="">{label}</option>
      {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
    </select>
    <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400"><Filter size={10} /></div>
  </div>
);

const DashboardPage = () => {
  const { payments, user: currentUser, isLoading, trafficStats, fetchTrafficStats, fetchAllData } = useAppStore();

  const [dateRange, setDateRange] = useState(getLastWeekRange());
  const [startDate, endDate] = dateRange;

  const [filters, setFilters] = useState({ manager: '', country: '', product: '', type: '', source: 'all' });

  const hasActiveFilters = useMemo(() => {
    return !!(filters.manager || filters.country || filters.product || filters.type || filters.source !== 'all');
  }, [filters]);

  // 🔄 ПРИНУДИТЕЛЬНОЕ ОБНОВЛЕНИЕ ДАННЫХ ПРИ МОНТИРОВАНИИ
  useEffect(() => {
    if (fetchAllData) {
      fetchAllData(true); // force update
    }
  }, [fetchAllData]);

  useEffect(() => {
    if (fetchTrafficStats) {
      const isoStart = startDate ? new Date(startDate.setHours(0, 0, 0, 0)).toISOString() : undefined;
      const isoEnd = endDate ? new Date(endDate.setHours(23, 59, 59, 999)).toISOString() : undefined;
      fetchTrafficStats(isoStart, isoEnd);
    }
  }, [fetchTrafficStats, startDate, endDate]);

  const isRestrictedUser = useMemo(() => {
    if (!currentUser) return false;
    const restrictedRoles = ['Sales', 'Retention', 'Consultant'];
    return restrictedRoles.includes(currentUser.role);
  }, [currentUser]);

  const uniqueValues = useMemo(() => {
    const getUnique = (key) => [...new Set(payments.map(p => p[key]).filter(Boolean))].sort();
    return {
      managers: getUnique('manager'),
      countries: getUnique('country'),
      products: getUnique('product'),
      types: getUnique('type')
    };
  }, [payments]);

  // 🔥 RAW ФИЛЬТРАЦИЯ
  const filteredData = useMemo(() => {
    const startStr = startDate ? toYMD(startDate) : '0000-00-00';
    const endStr = endDate ? toYMD(endDate) : '9999-99-99';

    let data = payments.filter(item => {
      if (!item.transactionDate) return false;
      const dbDateStr = item.transactionDate.slice(0, 10);

      if (dbDateStr < startStr || dbDateStr > endStr) return false;

      if (isRestrictedUser) {
        if (item.manager !== currentUser.name) return false;
      } else {
        if (filters.manager && item.manager !== filters.manager) return false;
      }

      if (filters.country && item.country !== filters.country) return false;
      if (filters.product && item.product !== filters.product) return false;
      if (filters.type && item.type !== filters.type) return false;

      // Фильтр по источнику
      if (filters.source !== 'all') {
        if (item.source !== filters.source) return false;
      }

      return true;
    });

    return data.sort((a, b) => new Date(b.transactionDate) - new Date(a.transactionDate));
  }, [payments, startDate, endDate, filters, isRestrictedUser, currentUser]);

  const stats = useMemo(() => {
    const totalEur = filteredData.reduce((sum, item) => sum + (item.amountEUR || 0), 0);
    const count = filteredData.length;
    let traffic = 0;

    if (trafficStats && Object.keys(trafficStats).length > 0) {
      const startStr = startDate ? toYMD(startDate) : '0000-00-00';
      const endStr = endDate ? toYMD(endDate) : '9999-99-99';

      const countTrafficForGeo = (geo) => {
        const geoData = trafficStats[geo];
        if (!geoData) return 0;
        let sum = 0;
        Object.entries(geoData).forEach(([dateStr, val]) => {
          if (dateStr < startStr || dateStr > endStr) return;

          if (typeof val === 'object' && val !== null) {
            if (filters.source === 'all') sum += (val.all || 0);
            else if (filters.source === 'direct') sum += (val.direct || 0);
            else if (filters.source === 'comments') sum += (val.comments || 0);
            else if (filters.source === 'whatsapp') sum += (val.whatsapp || 0);
          } else {
            sum += (Number(val) || 0);
          }
        });
        return sum;
      };

      if (filters.country) {
        traffic = countTrafficForGeo(filters.country);
      } else {
        traffic = Object.keys(trafficStats).reduce((acc, geo) => acc + countTrafficForGeo(geo), 0);
      }
    }

    const conversion = traffic > 0 ? ((count / traffic) * 100).toFixed(2) : "0.00";
    return { traffic, conversion, totalEur: totalEur.toFixed(2), count };
  }, [filteredData, trafficStats, filters.country, filters.source, startDate, endDate]);

  // ✅ РАСЧЕТ KPI ПО ИСТОЧНИКАМ
  // Direct, Comments, WhatsApp - всегда показывает полные данные
  const kpiData = useMemo(() => {
    let direct = { count: 0, sum: 0, activeMgrs: new Set() };
    let comments = { count: 0, sum: 0, activeMgrs: new Set() };
    let whatsapp = { count: 0, sum: 0, activeMgrs: new Set() };

    filteredData.forEach(item => {
      if (item.source === 'comments') {
        comments.count++;
        comments.sum += (item.amountEUR || 0);
        comments.activeMgrs.add(item.manager);
      } else if (item.source === 'whatsapp') {
        whatsapp.count++;
        whatsapp.sum += (item.amountEUR || 0);
        whatsapp.activeMgrs.add(item.manager);
      } else if (item.source === 'direct') {
        direct.count++;
        direct.sum += (item.amountEUR || 0);
        direct.activeMgrs.add(item.manager);
      }
      // unknown игнорируем в KPI
    });

    return {
      direct: {
        active: direct.activeMgrs.size,
        sales: direct.count,
        depositSum: direct.sum.toFixed(2)
      },
      comments: {
        active: comments.activeMgrs.size,
        sales: comments.count,
        depositSum: comments.sum.toFixed(2)
      },
      whatsapp: {
        active: whatsapp.activeMgrs.size,
        sales: whatsapp.count,
        depositSum: whatsapp.sum.toFixed(2)
      }
    };
  }, [filteredData]);

  const chartData = useMemo(() => {
    const grouped = {};
    filteredData.forEach(item => {
      const dateKey = item.transactionDate.slice(0, 10); // "YYYY-MM-DD"
      if (!grouped[dateKey]) grouped[dateKey] = { date: dateKey, count: 0 };
      grouped[dateKey].count += 1;
    });
    return Object.values(grouped).sort((a, b) => a.date.localeCompare(b.date));
  }, [filteredData]);

  const topManagers = useMemo(() => {
    const statsByName = {};
    filteredData.forEach(p => {
      const name = p.manager || 'Unknown';
      if (!statsByName[name]) statsByName[name] = { count: 0, sum: 0 };
      statsByName[name].count += 1;
      statsByName[name].sum += (p.amountEUR || 0);
    });
    return Object.entries(statsByName).map(([name, data]) => ({ name, ...data })).sort((a, b) => b.sum - a.sum).slice(0, 5);
  }, [filteredData]);

  const topCountries = useMemo(() => {
    const statsByGeo = {};
    filteredData.forEach(p => {
      const code = p.country || 'Unk';
      if (!statsByGeo[code]) statsByGeo[code] = { count: 0, sum: 0 };
      statsByGeo[code].count += 1;
      statsByGeo[code].sum += (p.amountEUR || 0);
    });

    return Object.entries(statsByGeo).map(([code, data]) => {
      let realTraffic = 0;
      if (trafficStats && trafficStats[code]) {
        const startStr = startDate ? toYMD(startDate) : '0000-00-00';
        const endStr = endDate ? toYMD(endDate) : '9999-99-99';

        Object.entries(trafficStats[code]).forEach(([dateStr, val]) => {
          if (dateStr < startStr || dateStr > endStr) return;
          if (typeof val === 'object' && val !== null) {
            if (filters.source === 'all') realTraffic += (val.all || 0);
            else if (filters.source === 'direct') realTraffic += (val.direct || 0);
            else if (filters.source === 'comments') realTraffic += (val.comments || 0);
          } else {
            realTraffic += (Number(val) || 0);
          }
        });
      }

      const cr = realTraffic > 0
        ? ((data.count / realTraffic) * 100).toFixed(1)
        : "0.0";

      return {
        code,
        salesCount: data.count,
        salesSum: data.sum,
        traffic: realTraffic,
        cr: cr
      };
    }).sort((a, b) => b.salesSum - a.salesSum).slice(0, 5);
  }, [filteredData, trafficStats, startDate, endDate, filters.source]);

  const resetDateRange = () => setDateRange(getLastWeekRange());
  const resetFilters = () => setFilters({ manager: '', country: '', product: '', type: '', source: 'all' });

  return (
    <div className="pb-10 transition-colors duration-200 w-full max-w-full overflow-x-hidden">

      {/* HEADER + FILTERS */}
      <div className="sticky top-0 z-20 bg-[#F5F5F5] dark:bg-[#0A0A0A] -mx-3 px-2 md:px-6 py-2 md:py-3 border-b border-transparent transition-colors duration-200">

        {/* Заголовок */}
        <div className="flex items-center gap-2 mb-2 md:mb-3">
          <h2 className="text-base md:text-lg font-bold dark:text-white tracking-tight flex items-center gap-2 truncate min-w-0">
            <LayoutDashboard size={16} className="text-blue-600 dark:text-blue-500 shrink-0 md:w-5 md:h-5" />
            <span className="truncate">Панель отдела продаж</span>
          </h2>
        </div>


        {/* Все фильтры в один ряд */}
        <div className="flex flex-wrap items-center gap-2 justify-between">

          {/* Левая часть: Кнопки источников */}
          <div className="flex bg-gray-200 dark:bg-[#1A1A1A] p-0.5 rounded-[6px] h-[34px] items-center">
            <button onClick={() => setFilters(prev => ({ ...prev, source: 'all' }))} className={`px-2.5 h-full rounded-[4px] text-[10px] font-bold transition-all whitespace-nowrap ${filters.source === 'all' ? 'bg-white dark:bg-[#333] text-black dark:text-white shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}>Все</button>
            <button onClick={() => setFilters(prev => ({ ...prev, source: 'direct' }))} className={`px-2 h-full rounded-[4px] text-[10px] font-bold transition-all flex items-center gap-1 whitespace-nowrap ${filters.source === 'direct' ? 'bg-white dark:bg-[#333] text-blue-600 dark:text-blue-400 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}><MessageCircle size={10} />Direct</button>
            <button onClick={() => setFilters(prev => ({ ...prev, source: 'comments' }))} className={`px-2 h-full rounded-[4px] text-[10px] font-bold transition-all flex items-center gap-1 whitespace-nowrap ${filters.source === 'comments' ? 'bg-white dark:bg-[#333] text-orange-600 dark:text-orange-400 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}><MessageSquare size={10} />Comm</button>
            <button onClick={() => setFilters(prev => ({ ...prev, source: 'whatsapp' }))} className={`px-2 h-full rounded-[4px] text-[10px] font-bold transition-all flex items-center gap-1 whitespace-nowrap ${filters.source === 'whatsapp' ? 'bg-white dark:bg-[#333] text-green-600 dark:text-green-400 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}><Phone size={10} />WP</button>
          </div>

          {/* Правая часть: Фильтры + Календарь */}
          <div className="flex flex-wrap items-center gap-2">
            {!isRestrictedUser && (<DenseSelect label="Менеджер" value={filters.manager} options={uniqueValues.managers} onChange={(val) => setFilters(p => ({ ...p, manager: val }))} />)}
            <DenseSelect label="Страна" value={filters.country} options={uniqueValues.countries} onChange={(val) => setFilters(p => ({ ...p, country: val }))} />
            <DenseSelect label="Продукт" value={filters.product} options={uniqueValues.products} onChange={(val) => setFilters(p => ({ ...p, product: val }))} />
            <DenseSelect label="Платежки" value={filters.type} options={uniqueValues.types} onChange={(val) => setFilters(p => ({ ...p, type: val }))} />
            <div className="flex items-center bg-white dark:bg-[#111] border border-gray-200 dark:border-[#333] rounded-[6px] px-2 py-0.5 shadow-sm h-[34px]">
              <CalendarIcon size={12} className="text-gray-400 mr-2 shrink-0" />
              <div className="relative flex-1">
                <DatePicker
                  selectsRange={true} startDate={startDate} endDate={endDate} onChange={(update) => setDateRange(update)}
                  dateFormat="dd.MM.yyyy" placeholderText="Период"
                  className="bg-transparent text-xs font-medium dark:text-white outline-none w-full cursor-pointer text-center"
                  popperPlacement="bottom-end"
                />
              </div>
              <button onClick={resetDateRange} className="ml-2 p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-gray-400 transition-colors">
                <RotateCcw size={12} />
              </button>
            </div>

            <button onClick={resetFilters} disabled={!hasActiveFilters} className={`shrink-0 p-1.5 bg-red-500/10 text-red-500 rounded-[6px] hover:bg-red-500/20 flex justify-center items-center h-[34px] w-[34px] transition-opacity duration-200 ${hasActiveFilters ? 'opacity-100 cursor-pointer' : 'opacity-0 cursor-default pointer-events-none'}`}><XCircle size={14} /></button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-3 md:gap-4 mb-6 mt-4 w-full min-w-0">

        {/* 1. ГЛАВНЫЙ БЛОК */}
        <div className="col-span-12 lg:col-span-5 xl:col-span-4 flex flex-col relative group rounded-xl overflow-hidden border border-gray-200 dark:border-[#333] shadow-sm bg-white dark:bg-[#0F0F11] transition-colors duration-200 min-w-0">
          <div className="absolute inset-0 bg-white dark:bg-[#0F0F11] transition-colors duration-200"></div>
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-purple-500/5 pointer-events-none"></div>

          <div className="relative z-10 flex flex-col h-full p-4 md:p-5 overflow-hidden">
            <div className="mb-4 flex items-center justify-between min-w-0">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white tracking-wide flex items-center gap-2 truncate">
                <Activity size={16} className="text-blue-500 shrink-0" /> Ключевые метрики
              </h3>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-2 gap-px bg-gray-100 dark:bg-[#222] border border-gray-100 dark:border-[#222] rounded-lg overflow-hidden mb-4 transition-colors duration-200 w-full">
              <TechStatItem icon={CreditCard} label="Продажи" value={stats.count} />
              <TechStatItem icon={DollarSign} label="Оборот" value={`€${Number(stats.totalEur).toLocaleString()}`} highlight />
              <TechStatItem icon={Users} label="Трафик" value={stats.traffic} />
              <TechStatItem icon={Percent} label="Конверсия" value={`${stats.conversion}%`} valueColor={getCRColor(stats.conversion)} />
            </div>

            <div className="flex-1 min-h-[100px] w-full min-w-0">
              <div className="text-[10px] font-bold text-gray-400 uppercase mb-2 truncate">Динамика продаж</div>
              <div className="h-24 w-full min-w-0 overflow-hidden">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="date" hide />
                    <RechartsTooltip contentStyle={{ backgroundColor: '#111', borderColor: '#333', fontSize: '12px', color: '#fff' }} itemStyle={{ color: '#fff' }} cursor={{ stroke: '#555', strokeWidth: 1 }} />
                    <Area type="monotone" dataKey="count" stroke="#3B82F6" fillOpacity={1} fill="url(#colorCount)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>

        {/* 2. KPI CARDS (First Dynamic, Second Static) */}
        <div className="col-span-12 md:col-span-6 lg:col-span-3 xl:col-span-4 flex flex-col gap-3 min-w-0">

          <ProductCard
            title="Отдел Продаж"
            subtitle="Первые продажи"
            mainValue={filters.source === 'whatsapp' ? kpiData.whatsapp.sales : filters.source === 'comments' ? 0 : filters.source === 'all' ? (kpiData.direct.sales + kpiData.whatsapp.sales) : kpiData.direct.sales}
            mainType="count"
            data={[
              { label: 'Активных менеджеров', val: filters.source === 'whatsapp' ? kpiData.whatsapp.active : filters.source === 'comments' ? 0 : filters.source === 'all' ? (kpiData.direct.active + kpiData.whatsapp.active) : kpiData.direct.active },
              { label: 'Сумма депозитов', val: filters.source === 'whatsapp' ? `€${kpiData.whatsapp.depositSum}` : filters.source === 'comments' ? '€0.00' : filters.source === 'all' ? `€${(Number(kpiData.direct.depositSum) + Number(kpiData.whatsapp.depositSum)).toFixed(2)}` : `€${kpiData.direct.depositSum}` },
              { label: 'Средний чек', val: filters.source === 'whatsapp' ? `€${kpiData.whatsapp.sales > 0 ? (Number(kpiData.whatsapp.depositSum) / kpiData.whatsapp.sales).toFixed(2) : '0.00'}` : filters.source === 'comments' ? '€0.00' : filters.source === 'all' ? `€${(kpiData.direct.sales + kpiData.whatsapp.sales) > 0 ? ((Number(kpiData.direct.depositSum) + Number(kpiData.whatsapp.depositSum)) / (kpiData.direct.sales + kpiData.whatsapp.sales)).toFixed(2) : '0.00'}` : `€${kpiData.direct.sales > 0 ? (Number(kpiData.direct.depositSum) / kpiData.direct.sales).toFixed(2) : '0.00'}` }
            ]}
          />

          <ProductCard
            title="Консультанты"
            subtitle="Продажи с Консультаций"
            mainValue={(filters.source === 'comments' || filters.source === 'all') ? kpiData.comments.sales : 0}
            mainType="count"
            data={[
              { label: 'Активных менеджеров', val: (filters.source === 'comments' || filters.source === 'all') ? kpiData.comments.active : 0 },
              { label: 'Сумма депозитов', val: (filters.source === 'comments' || filters.source === 'all') ? `€${kpiData.comments.depositSum}` : '€0.00' },
              { label: 'Средний чек', val: (filters.source === 'comments' || filters.source === 'all') ? `€${kpiData.comments.sales > 0 ? (Number(kpiData.comments.depositSum) / kpiData.comments.sales).toFixed(2) : '0.00'}` : '€0.00' }
            ]}
          />

        </div>

        {/* 3. LEADERBOARDS */}
        <div className="col-span-12 md:col-span-6 lg:col-span-4 flex flex-col gap-3 min-w-0">

          {/* Top Managers */}
          <div className="bg-white dark:bg-[#111] border border-gray-200 dark:border-[#333] rounded-xl overflow-hidden flex-1 shadow-sm transition-colors duration-200 min-w-0">
            <div className="px-4 py-3 border-b border-gray-200 dark:border-[#333] flex justify-between items-center bg-gray-50/50 dark:bg-[#161616]">
              <div className="flex items-center gap-2 min-w-0">
                <Trophy size={14} className="text-amber-500 shrink-0" />
                <span className="text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-400 truncate">Топ менеджеры</span>
              </div>
            </div>
            <div className="p-2 space-y-1">
              {topManagers.map((mgr, i) => (
                <div key={mgr.name} className="flex items-center justify-between py-2 px-3 rounded-[6px] bg-gray-50 dark:bg-[#1A1A1A] border border-gray-100 dark:border-[#222] hover:border-gray-300 dark:hover:border-[#444] transition-all group">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-sm w-5 text-center shrink-0 font-bold leading-none">{getRankEmoji(i)}</span>
                    <span className="text-xs font-bold text-gray-800 dark:text-gray-200 truncate leading-none">{mgr.name}</span>
                  </div>
                  <div className="flex items-center gap-3 text-right">
                    <span className="text-[10px] text-gray-400 font-medium whitespace-nowrap">{mgr.count} Lead</span>
                    <span className="text-xs font-mono font-bold text-gray-900 dark:text-white whitespace-nowrap w-[60px]">€{mgr.sum.toFixed(0)}</span>
                  </div>
                </div>
              ))}
              {topManagers.length === 0 && <div className="text-center py-4 text-xs text-gray-500">Нет данных</div>}
            </div>
          </div>

          {/* Top Geo */}
          <div className="bg-white dark:bg-[#111] border border-gray-200 dark:border-[#333] rounded-xl overflow-hidden flex-1 shadow-sm transition-colors duration-200 min-w-0">
            <div className="px-4 py-3 border-b border-gray-200 dark:border-[#333] flex justify-between items-center bg-gray-50/50 dark:bg-[#161616]">
              <div className="flex items-center gap-2 min-w-0">
                <Globe size={14} className="text-blue-500 shrink-0" />
                <span className="text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-400 truncate">Топ ГЕО</span>
              </div>
            </div>
            <div className="p-2 space-y-1">
              {topCountries.map((geo, i) => (
                <div key={geo.code} className="flex items-center justify-between py-2 px-3 rounded-[6px] bg-gray-50 dark:bg-[#1A1A1A] border border-gray-100 dark:border-[#222] hover:border-gray-300 dark:hover:border-[#444] transition-all group">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-sm w-5 text-center shrink-0 font-bold leading-none">{getRankEmoji(i)}</span>
                    <div className="flex items-center gap-1.5 leading-none">
                      <span className="text-base">{getFlag(geo.code)}</span>
                      <span className="text-xs font-bold text-gray-800 dark:text-gray-200">{geo.code}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-right">
                    <span className="text-[10px] text-gray-400 font-medium whitespace-nowrap">{geo.salesCount} Lead</span>
                    <span className="text-xs font-mono font-bold text-gray-900 dark:text-white whitespace-nowrap w-[50px]">€{geo.salesSum.toFixed(0)}</span>
                    <span className={`text-[10px] font-bold w-[35px] text-right ${getCRColor(geo.cr)}`}>{geo.cr}%</span>
                  </div>
                </div>
              ))}
              {topCountries.length === 0 && <div className="text-center py-4 text-xs text-gray-500">Нет данных</div>}
            </div>
          </div>

        </div>
      </div>

      {/* --- BOTTOM TABLE --- */}
      <div className="mt-2 bg-white dark:bg-[#111] border border-gray-200 dark:border-[#333] rounded-xl overflow-hidden shadow-sm transition-colors duration-200 min-w-0 w-full">
        <div className="px-4 py-3 border-b border-gray-200 dark:border-[#333] flex items-center gap-2 bg-gray-50/50 dark:bg-[#161616]">
          <Layers size={14} className="text-gray-400 shrink-0" />
          <span className="text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-400 truncate">Последние операции</span>
        </div>
        <div className="overflow-x-auto w-full min-w-0">
          <table className="w-full text-left text-xs text-gray-600 dark:text-[#888] whitespace-nowrap">
            <thead className="bg-gray-50 dark:bg-[#161616] font-medium border-b border-gray-200 dark:border-[#333]">
              <tr>
                <th className="px-4 py-2">ID</th>
                <th className="px-4 py-2">Дата (UTC)</th>
                <th className="px-4 py-2">Менеджер</th>
                <th className="px-4 py-2">ГЕО</th>
                <th className="px-4 py-2">Метод</th>
                <th className="px-4 py-2 text-right">Сумма (Loc)</th>
                <th className="px-4 py-2 text-right">Сумма (EUR)</th>
                <th className="px-4 py-2 text-right">Статус</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-[#222]">
              {isLoading ? (
                <tr><td colSpan="8" className="px-4 py-6 text-center text-xs">Загрузка...</td></tr>
              ) : filteredData.slice(0, 10).map((p) => (
                <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-[#1A1A1A] transition-colors">
                  <td className="px-4 py-2 font-mono text-[10px] text-gray-400" title={p.id}>
                    #{p.id.slice(0, 8)}...
                  </td>
                  <td className="px-4 py-2 text-gray-500 font-mono">
                    {/* Raw time */}
                    {p.transactionDate ? p.transactionDate.substring(0, 16).replace('T', ' ') : '-'}
                  </td>
                  <td className="px-4 py-2 font-medium text-gray-700 dark:text-gray-300">
                    {p.manager}
                  </td>
                  <td className="px-4 py-2">
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-gray-100 dark:bg-[#222] border border-gray-200 dark:border-[#333] text-[10px] font-bold text-gray-600 dark:text-gray-300">
                      {getFlag(p.country)} {p.country}
                    </span>
                  </td>
                  <td className="px-4 py-2">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${getPaymentBadgeStyle(p.type)}`}>
                      {p.type || 'Other'}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-right font-bold text-gray-700 dark:text-gray-300">
                    {p.amountLocal ? p.amountLocal.toLocaleString() : '-'}
                  </td>
                  <td className="px-4 py-2 text-right font-mono font-bold text-gray-900 dark:text-white">€{p.amountEUR}</td>
                  <td className="px-4 py-2 text-right">
                    <span className="text-emerald-500 text-[10px] font-bold uppercase">{p.status}</span>
                  </td>
                </tr>
              ))}
              {!isLoading && filteredData.length === 0 && (
                <tr><td colSpan="8" className="px-4 py-6 text-center text-xs">Нет данных</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div >
  );
};

// --- Sub-components ---

const TechStatItem = ({ icon: Icon, label, value, highlight, valueColor }) => (
  <div className="bg-white dark:bg-[#151515] p-3 flex flex-col justify-center transition-colors hover:bg-gray-50 dark:hover:bg-[#1A1A1A] min-w-0 overflow-hidden">
    <div className="flex items-center gap-2 mb-1 text-gray-400 dark:text-gray-500 min-w-0">
      <Icon size={14} className="shrink-0" />
      <span className="text-[10px] font-bold uppercase tracking-wider truncate">{label}</span>
    </div>
    <div className={`text-lg font-mono font-bold leading-none truncate ${valueColor ? valueColor : highlight ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-900 dark:text-white'}`} title={value}>
      {value}
    </div>
  </div>
);

const ProductCard = ({ title, subtitle, mainValue, mainType, data }) => (
  <div className="bg-white dark:bg-[#111] border border-gray-200 dark:border-[#333] rounded-xl p-4 md:p-5 flex flex-col justify-between flex-1 shadow-sm transition-all hover:border-gray-300 dark:hover:border-[#444] min-w-0 overflow-hidden">
    <div className="flex justify-between items-start mb-3 min-w-0">
      <div className="min-w-0 flex-1 mr-2">
        <h4 className="font-bold text-sm text-gray-900 dark:text-white flex items-center gap-2 truncate">
          {title} <span className="text-gray-400 font-normal text-[10px] shrink-0">/ KPI</span>
        </h4>
        <p className="text-[10px] text-gray-500 mt-0.5 truncate">{subtitle}</p>
      </div>
      <span className={`text-xl font-mono font-bold whitespace-nowrap shrink-0 ${getCRColor(mainValue)}`}>
        {mainValue}{mainType === 'percent' ? '%' : ''}
      </span>
    </div>

    <div className="space-y-2 pt-3 border-t border-gray-100 dark:border-[#222] flex-1 w-full">
      {data.map((item, idx) => (
        <div key={idx} className="flex justify-between text-xs items-center min-w-0">
          <span className="text-gray-500 truncate mr-2">{item.label}</span>
          <span className="font-medium text-gray-700 dark:text-gray-300 font-mono whitespace-nowrap shrink-0">{item.val}</span>
        </div>
      ))}
    </div>
  </div>
);

export default DashboardPage;