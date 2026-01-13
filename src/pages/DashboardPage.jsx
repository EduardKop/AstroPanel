import React, { useState, useMemo, useEffect } from 'react';
import { useAppStore } from '../store/appStore';
import {
  Filter, Calendar, RotateCcw, XCircle,
  Users, DollarSign, Percent, CreditCard, LayoutDashboard,
  Activity, Trophy, Globe, Layers, MessageCircle, MessageSquare
} from 'lucide-react';
import { AreaChart, Area, XAxis, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

// --- CONFIGURATION ---
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
  if (num >= 10) return 'text-emerald-500';
  if (num >= 5) return 'text-amber-500';
  return 'text-rose-500';
};

const getPaymentBadgeStyle = (type) => {
  const t = (type || '').toLowerCase();
  if (t.includes('lava')) return 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20';
  if (t.includes('jet') || t.includes('fex')) return 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20';
  if (t.includes('iban')) return 'bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20';
  if (t.includes('req') || t.includes('рек') || t.includes('прям')) return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20';
  return 'bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/20';
};

const getLastWeekRange = () => {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - 7);
  return [start, end];
};

const DenseSelect = ({ label, value, options, onChange }) => (
  <div className="relative group w-full sm:w-auto min-w-0 flex-1 sm:flex-none">
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full appearance-none bg-white dark:bg-[#111] border border-gray-200 dark:border-[#333] text-gray-700 dark:text-gray-200 py-2.5 sm:py-2 pl-3 pr-8 rounded-[8px] sm:rounded-[6px] text-sm font-medium focus:outline-none focus:border-blue-500 hover:border-gray-400 dark:hover:border-[#555] transition-colors cursor-pointer truncate"
    >
      <option value="">{label}</option>
      {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
    </select>
    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400"><Filter size={14} /></div>
  </div>
);

const DashboardPage = () => {
  const { payments, user: currentUser, isLoading, trafficStats, fetchTrafficStats } = useAppStore();

  const [dateRange, setDateRange] = useState(getLastWeekRange());
  const [startDate, endDate] = dateRange;
  const [filters, setFilters] = useState({ manager: '', country: '', product: '', type: '', source: 'all' });

  // ✅ Загружаем статистику (из таблицы leads) при изменении дат
  useEffect(() => {
    if (fetchTrafficStats) {
      // Передаем даты в ISO формате, чтобы запрос в Supabase сработал корректно
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

  // Фильтрация платежей (Supabase)
  const filteredData = useMemo(() => {
    let data = payments.filter(item => {
      if (!item.transactionDate) return false;
      const d = new Date(item.transactionDate);

      if (startDate && d < new Date(startDate.setHours(0, 0, 0, 0))) return false;
      if (endDate && d > new Date(endDate.setHours(23, 59, 59, 999))) return false;

      if (isRestrictedUser) {
        if (item.manager !== currentUser.name) return false;
      } else {
        if (filters.manager && item.manager !== filters.manager) return false;
      }

      if (filters.country && item.country !== filters.country) return false;
      if (filters.product && item.product !== filters.product) return false;
      if (filters.type && item.type !== filters.type) return false;

      return true;
    });
    return data.sort((a, b) => new Date(b.transactionDate) - new Date(a.transactionDate));
  }, [payments, startDate, endDate, filters, isRestrictedUser, currentUser]);

  // --- ГЛАВНЫЙ БЛОК: ПОДСЧЕТ ТРАФИКА (из store/leads) ---
  const stats = useMemo(() => {
    const totalEur = filteredData.reduce((sum, item) => sum + (item.amountEUR || 0), 0);
    const count = filteredData.length;

    let traffic = 0;

    // trafficStats приходит в формате: { "PL": { "2026-01-12": { direct: 5, comments: 2, all: 7 } }, "DE": ... }
    if (trafficStats && Object.keys(trafficStats).length > 0) {

      const countTrafficForGeo = (geo) => {
        const geoData = trafficStats[geo];
        if (!geoData) return 0;

        let sum = 0;

        Object.entries(geoData).forEach(([dateStr, val]) => {
          const d = new Date(dateStr);

          // Проверяем фильтр даты на клиенте (дополнительно)
          if (startDate && d < new Date(startDate.setHours(0, 0, 0, 0))) return;
          if (endDate && d > new Date(endDate.setHours(23, 59, 59, 999))) return;

          // ✅ ЛОГИКА ВЫБОРА ИСТОЧНИКА (Direct / Comments / All)
          if (typeof val === 'object' && val !== null) {
            if (filters.source === 'all') {
              sum += (val.all || 0);
            } else if (filters.source === 'direct') {
              sum += (val.direct || 0);
            } else if (filters.source === 'comments') {
              sum += (val.comments || 0);
            }
          } else {
            // Фоллбэк
            sum += (Number(val) || 0);
          }
        });
        return sum;
      };

      if (filters.country) {
        traffic = countTrafficForGeo(filters.country);
      } else {
        // Суммируем по всем странам, которые есть в trafficStats
        traffic = Object.keys(trafficStats).reduce((acc, geo) => acc + countTrafficForGeo(geo), 0);
      }
    }

    const conversion = traffic > 0
      ? ((count / traffic) * 100).toFixed(2)
      : "0.00";

    return { traffic, conversion, totalEur: totalEur.toFixed(2), count };
  }, [filteredData, trafficStats, filters.country, filters.source, startDate, endDate]);

  const kpiData = useMemo(() => {
    const salesCount = filteredData.length;
    const activeMgrs = new Set(filteredData.map(p => p.manager)).size || (isRestrictedUser ? 1 : 0);
    const totalSum = stats.totalEur;

    return {
      ltc: {
        cr: "12.4",
        active: activeMgrs,
        sales: salesCount,
        depositSum: totalSum
      },
      consultants: {
        cr: "4.2",
        active: Math.max(1, Math.floor(activeMgrs / 2)),
        sales: Math.floor(salesCount * 0.3),
        depositSum: (totalSum * 0.4).toFixed(2)
      }
    };
  }, [filteredData, stats.totalEur, isRestrictedUser]);

  // ГРАФИК ПРОДАЖ (Динамика)
  const chartData = useMemo(() => {
    const grouped = {};
    filteredData.forEach(item => {
      const date = new Date(item.transactionDate).toISOString().split('T')[0];
      if (!grouped[date]) grouped[date] = { date, count: 0 };
      grouped[date].count += 1;
    });
    return Object.values(grouped).sort((a, b) => new Date(a.date) - new Date(b.date));
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
      const mockTraffic = data.count * 12; // Пока моковые данные для CR в топе стран, т.к. трафик не привязан жестко к продажам в этом массиве
      const mockCR = ((data.count / mockTraffic) * 100).toFixed(1);
      return { code, salesCount: data.count, salesSum: data.sum, traffic: mockTraffic, cr: mockCR };
    }).sort((a, b) => b.salesSum - a.salesSum).slice(0, 5);
  }, [filteredData]);

  const resetDateRange = () => setDateRange(getLastWeekRange());
  const resetFilters = () => setFilters({ manager: '', country: '', product: '', type: '', source: 'all' });

  return (
    <div className="pb-10 transition-colors duration-200 w-full max-w-full overflow-x-hidden">

      {/* HEADER + FILTERS */}
      <div className="sticky top-0 z-20 bg-[#F5F5F5] dark:bg-[#0A0A0A] -mx-3 px-3 md:-mx-6 md:px-6 py-2 border-b border-transparent transition-colors duration-200">

        <div className="flex justify-between items-center mb-2 md:mb-4">
          <h2 className="text-lg font-bold dark:text-white tracking-tight flex items-center gap-2 truncate min-w-0">
            <LayoutDashboard size={18} className="text-blue-600 dark:text-blue-500 shrink-0" />
            <span className="truncate">Панель отдела продаж</span>
          </h2>
        </div>

        <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2 w-full min-w-0">

          <div className="flex items-center bg-white dark:bg-[#111] border border-gray-200 dark:border-[#333] rounded-[8px] sm:rounded-[6px] px-3 py-2 sm:py-1 shadow-sm w-full sm:w-auto justify-between min-w-0">
            <div className="flex items-center flex-1 min-w-0 w-full">
              <Calendar size={16} className="text-gray-400 mr-2 shrink-0" />
              <DatePicker
                selectsRange={true} startDate={startDate} endDate={endDate} onChange={(u) => setDateRange(u)}
                dateFormat="dd.MM.yyyy" placeholderText="Период"
                wrapperClassName="w-full min-w-0"
                className="bg-transparent text-sm font-medium dark:text-white outline-none w-full cursor-pointer text-center min-w-0"
                popperPlacement="bottom-center"
              />
            </div>
            <button onClick={resetDateRange} className="ml-2 text-gray-400 hover:text-black dark:hover:text-white shrink-0 p-1"><RotateCcw size={14} /></button>
          </div>

          <div className="flex bg-gray-200 dark:bg-[#1A1A1A] p-1 rounded-[8px] sm:rounded-[6px] w-full sm:w-auto min-w-0">
            <button
              onClick={() => setFilters(prev => ({ ...prev, source: 'all' }))}
              className={`flex-1 sm:flex-none px-3 py-1.5 rounded-[6px] sm:rounded-[4px] text-xs font-bold transition-all ${filters.source === 'all' ? 'bg-white dark:bg-[#333] text-black dark:text-white shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
            >
              Все
            </button>
            <button
              onClick={() => setFilters(prev => ({ ...prev, source: 'direct' }))}
              className={`flex-1 sm:flex-none px-3 py-1.5 rounded-[6px] sm:rounded-[4px] text-xs font-bold transition-all flex items-center justify-center gap-1 ${filters.source === 'direct' ? 'bg-white dark:bg-[#333] text-blue-600 dark:text-blue-400 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
            >
              <MessageCircle size={12} /> Direct
            </button>
            <button
              onClick={() => setFilters(prev => ({ ...prev, source: 'comments' }))}
              className={`flex-1 sm:flex-none px-3 py-1.5 rounded-[6px] sm:rounded-[4px] text-xs font-bold transition-all flex items-center justify-center gap-1 ${filters.source === 'comments' ? 'bg-white dark:bg-[#333] text-orange-600 dark:text-orange-400 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
            >
              <MessageSquare size={12} /> Comm
            </button>
          </div>

          {!isRestrictedUser && (
            <DenseSelect label="Менеджер" value={filters.manager} options={uniqueValues.managers} onChange={(val) => setFilters(p => ({ ...p, manager: val }))} />
          )}

          <DenseSelect label="Страна" value={filters.country} options={uniqueValues.countries} onChange={(val) => setFilters(p => ({ ...p, country: val }))} />
          <DenseSelect label="Продукт" value={filters.product} options={uniqueValues.products} onChange={(val) => setFilters(p => ({ ...p, product: val }))} />
          <DenseSelect label="Платежки" value={filters.type} options={uniqueValues.types} onChange={(val) => setFilters(p => ({ ...p, type: val }))} />

          {(filters.manager || filters.country || filters.product || filters.type || filters.source !== 'all') && (
            <button onClick={resetFilters} className="p-2.5 sm:p-1.5 bg-red-500/10 text-red-500 rounded-[8px] sm:rounded-[6px] hover:bg-red-500/20 flex justify-center items-center w-full sm:w-auto font-medium text-xs sm:text-sm shrink-0">
              <XCircle size={16} className="mr-1 sm:mr-0" /> <span className="sm:hidden">Сбросить фильтры</span>
            </button>
          )}
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
                    <RechartsTooltip
                      contentStyle={{ backgroundColor: '#111', borderColor: '#333', fontSize: '12px', color: '#fff' }}
                      itemStyle={{ color: '#fff' }}
                      cursor={{ stroke: '#555', strokeWidth: 1 }}
                    />
                    <Area
                      type="monotone"
                      dataKey="count"
                      stroke="#3B82F6"
                      fillOpacity={1}
                      fill="url(#colorCount)"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>

        {/* 2. KPI CARDS */}
        <div className="col-span-12 md:col-span-6 lg:col-span-3 xl:col-span-4 flex flex-col gap-3 min-w-0">
          <ProductCard
            title="LTC"
            subtitle="Конверсия в оплату"
            mainValue={kpiData.ltc.cr}
            mainType="percent"
            data={[
              { label: 'Активных менеджеров', val: kpiData.ltc.active },
              { label: 'Всего продаж', val: kpiData.ltc.sales },
              { label: 'Сумма депозитов', val: `€${kpiData.ltc.depositSum}` }
            ]}
          />
          <ProductCard
            title="Консультанты"
            subtitle="Повторные депозиты"
            mainValue={kpiData.consultants.cr}
            mainType="percent"
            data={[
              { label: 'Активных менеджеров', val: kpiData.consultants.active },
              { label: 'Всего продаж', val: kpiData.consultants.sales },
              { label: 'Сумма депозитов', val: `€${kpiData.consultants.depositSum}` }
            ]}
          />
        </div>

        {/* 3. LEADERBOARDS */}
        <div className="col-span-12 md:col-span-6 lg:col-span-4 flex flex-col gap-3 min-w-0">

          {/* Top Managers */}
          <div className="bg-white dark:bg-[#111] border border-gray-200 dark:border-[#333] rounded-xl overflow-hidden flex-1 shadow-sm transition-colors duration-200 min-w-0">
            <div className="px-4 py-2.5 border-b border-gray-200 dark:border-[#333] flex justify-between items-center bg-gray-50/50 dark:bg-[#161616]">
              <div className="flex items-center gap-2 min-w-0">
                <Trophy size={14} className="text-amber-500 shrink-0" />
                <span className="text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-400 truncate">Топ менеджеры</span>
              </div>
            </div>
            <div className="p-0">
              {topManagers.map((mgr, i) => (
                <div key={mgr.name} className="flex items-center justify-between px-4 py-2 border-b border-gray-100 dark:border-[#222] last:border-0 hover:bg-gray-50 dark:hover:bg-[#1A1A1A]">
                  <div className="flex items-center gap-2 min-w-0 overflow-hidden">
                    <span className={`text-[10px] w-4 font-bold shrink-0 ${i === 0 ? 'text-amber-500' : 'text-gray-400'}`}>{i + 1}</span>
                    <span className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate">{mgr.name}</span>
                  </div>
                  <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap ml-2">€{mgr.sum.toFixed(0)}</span>
                </div>
              ))}
              {topManagers.length === 0 && <div className="text-center py-4 text-xs text-gray-500">Нет данных</div>}
            </div>
          </div>

          {/* Top Geo */}
          <div className="bg-white dark:bg-[#111] border border-gray-200 dark:border-[#333] rounded-xl overflow-hidden flex-1 shadow-sm transition-colors duration-200 min-w-0">
            <div className="px-4 py-2.5 border-b border-gray-200 dark:border-[#333] flex justify-between items-center bg-gray-50/50 dark:bg-[#161616]">
              <div className="flex items-center gap-2 min-w-0">
                <Globe size={14} className="text-blue-500 shrink-0" />
                <span className="text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-400 truncate">Топ ГЕО</span>
              </div>
            </div>
            <div className="p-0">
              {topCountries.map((geo, i) => (
                <div key={geo.code} className="flex items-center justify-between px-4 py-2 border-b border-gray-100 dark:border-[#222] last:border-0 hover:bg-gray-50 dark:hover:bg-[#1A1A1A]">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-sm shrink-0">{getFlag(geo.code)}</span>
                    <span className="text-xs font-bold text-gray-700 dark:text-gray-200 truncate">{geo.code}</span>
                    <span className="text-[10px] text-gray-400 whitespace-nowrap">({geo.salesCount})</span>
                  </div>
                  <span className={`text-xs font-mono font-bold ${getCRColor(geo.cr)} whitespace-nowrap ml-2`}>
                    CR: {geo.cr}%
                  </span>
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
                <th className="px-4 py-2">Дата</th>
                <th className="px-4 py-2">Менеджер</th>
                <th className="px-4 py-2">ГЕО</th>
                <th className="px-4 py-2">Метод</th>
                <th className="px-4 py-2">Сумма</th>
                <th className="px-4 py-2 text-right">Статус</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-[#222]">
              {isLoading ? (
                <tr><td colSpan="7" className="px-4 py-6 text-center text-xs">Загрузка...</td></tr>
              ) : filteredData.slice(0, 10).map((p) => (
                <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-[#1A1A1A] transition-colors">
                  <td className="px-4 py-2 font-mono text-[10px] text-gray-400" title={p.id}>
                    #{p.id.slice(0, 8)}...
                  </td>
                  <td className="px-4 py-2 text-gray-500">
                    {new Date(p.transactionDate).toLocaleDateString('ru-RU')}
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
                  <td className="px-4 py-2 font-mono font-bold text-gray-900 dark:text-white">€{p.amountEUR}</td>
                  <td className="px-4 py-2 text-right">
                    <span className="text-emerald-500 text-[10px] font-bold uppercase">{p.status}</span>
                  </td>
                </tr>
              ))}
              {!isLoading && filteredData.length === 0 && (
                <tr><td colSpan="7" className="px-4 py-6 text-center text-xs">Нет данных</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
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