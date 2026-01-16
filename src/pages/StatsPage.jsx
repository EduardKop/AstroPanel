import React, { useState, useMemo } from 'react';
import { useAppStore } from '../store/appStore';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { Calendar as CalendarIcon, BarChart2, PieChart, RotateCcw, Maximize2, X, Filter, LayoutDashboard, MessageCircle, MessageSquare, Phone } from 'lucide-react';
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

const THEME_COLORS = [
  { main: '#6366F1', gradient: ['#6366F1', '#818CF8'] },
  { main: '#EC4899', gradient: ['#EC4899', '#F472B6'] },
  { main: '#10B981', gradient: ['#10B981', '#34D399'] },
  { main: '#F59E0B', gradient: ['#F59E0B', '#FBBF24'] },
  { main: '#8B5CF6', gradient: ['#8B5CF6', '#A78BFA'] },
  { main: '#06B6D4', gradient: ['#06B6D4', '#22D3EE'] },
];

const getLastWeekRange = () => {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - 7);
  return [start, end];
};

const getCurrentMonthRange = () => {
  const date = new Date();
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  return [start, end];
};

// ХЕЛПЕР: Дату в YYYY-MM-DD (локально)
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

const StatsPage = () => {
  const { payments, user: currentUser } = useAppStore();
  const [dateRange, setDateRange] = useState(getLastWeekRange());
  const [startDate, endDate] = dateRange;
  const [expandedChart, setExpandedChart] = useState(null);
  const [filters, setFilters] = useState({ manager: '', country: '', product: '', type: '', source: 'all' });

  const isRestrictedUser = useMemo(() => {
    if (!currentUser) return false;
    return ['Sales', 'Retention', 'Consultant'].includes(currentUser.role);
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

  // --- ФИЛЬТРАЦИЯ (RAW MODE) ---
  const filteredData = useMemo(() => {
    const startStr = startDate ? toYMD(startDate) : '0000-00-00';
    const endStr = endDate ? toYMD(endDate) : '9999-99-99';

    let data = payments.filter(item => {
      if (!item.transactionDate) return false;

      // Берем дату из базы как строку "YYYY-MM-DD"
      const dbDateStr = item.transactionDate.slice(0, 10);

      // Строгое сравнение строк
      if (dbDateStr < startStr || dbDateStr > endStr) return false;

      if (isRestrictedUser) {
        if (item.manager !== currentUser.name) return false;
      } else {
        if (filters.manager && item.manager !== filters.manager) return false;
      }

      if (filters.country && item.country !== filters.country) return false;
      if (filters.product && item.product !== filters.product) return false;
      if (filters.type && item.type !== filters.type) return false;

      if (filters.source !== 'all' && item.source !== filters.source) return false;

      return true;
    });

    // Сортировка (строковая)
    return data.sort((a, b) => (a.transactionDate || '').localeCompare(b.transactionDate || ''));
  }, [payments, startDate, endDate, isRestrictedUser, currentUser, filters]);

  // --- ГРУППИРОВКА ДЛЯ ГРАФИКОВ ---
  const prepareData = (dataKey, sourceData) => {
    const grouped = {};
    const allKeys = new Set();

    sourceData.forEach(item => {
      // Ключ группировки - "YYYY-MM-DD" из базы (без сдвигов времени)
      const dateKey = item.transactionDate.slice(0, 10);
      const key = item[dataKey] || 'Unknown';
      allKeys.add(key);

      if (!grouped[dateKey]) grouped[dateKey] = { date: dateKey };
      if (!grouped[dateKey][key]) grouped[dateKey][key] = 0;
      grouped[dateKey][key] += 1;
    });

    return {
      // Сортируем по дате (строке)
      chartData: Object.values(grouped).sort((a, b) => a.date.localeCompare(b.date)),
      keys: Array.from(allKeys)
    };
  };

  const geoData = useMemo(() => prepareData('country', filteredData), [filteredData]);
  const productData = useMemo(() => prepareData('product', filteredData), [filteredData]);
  const typeData = useMemo(() => prepareData('type', filteredData), [filteredData]);
  const managerData = useMemo(() => prepareData('manager', filteredData), [filteredData]);

  const resetDateRange = () => setDateRange(getLastWeekRange());
  const resetFilters = () => setFilters({ manager: '', country: '', product: '', type: '', source: 'all' });

  return (
    <div className="pb-10 transition-colors duration-200 w-full max-w-full overflow-x-hidden">

      {/* HEADER + FILTERS */}
      <div className="sticky top-0 z-20 bg-[#F5F5F5] dark:bg-[#0A0A0A] -mx-3 px-3 md:-mx-6 md:px-6 py-3 border-b border-transparent transition-colors duration-200 flex flex-col gap-3">

        {/* Заголовок */}
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-bold dark:text-white tracking-tight flex items-center gap-2 truncate min-w-0">
            <LayoutDashboard size={18} className="text-blue-600 dark:text-blue-500 shrink-0" />
            <span className="truncate">Аналитика трендов</span>
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
              <button onClick={resetDateRange} className="ml-2 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
                <RotateCcw size={12} className="text-gray-400" />
              </button>
            </div>

            {/* Global Reset */}
            <button
              onClick={resetFilters}
              className="bg-gray-200 dark:bg-[#1A1A1A] hover:bg-gray-300 dark:hover:bg-[#333] text-gray-500 dark:text-gray-400 p-1.5 rounded-[6px] transition-colors h-[34px] w-[34px] flex items-center justify-center"
              title="Сбросить фильтры"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <ChartWidget id="geo" title="Динамика по ГЕО" subtitle="Активность стран по дням" type="area" data={geoData.chartData} keys={geoData.keys} onExpand={() => setExpandedChart('country')} />
        <ChartWidget id="manager" title={isRestrictedUser ? "Моя эффективность" : "Вклад Менеджеров"} subtitle="Результативность команды" type="area" data={managerData.chartData} keys={managerData.keys} onExpand={() => setExpandedChart('manager')} />
        <ChartWidget id="product" title="Популярность Продуктов" subtitle="Сравнение объемов продаж" type="bar" data={productData.chartData} keys={productData.keys} onExpand={() => setExpandedChart('product')} />
        <ChartWidget id="type" title="Методы Оплаты" subtitle="Предпочтения клиентов" type="bar" data={typeData.chartData} keys={typeData.keys} onExpand={() => setExpandedChart('type')} />
      </div>

      {expandedChart && (
        <ExpandedChartModal chartKey={expandedChart} rawPayments={filteredData} onClose={() => setExpandedChart(null)} />
      )}
    </div>
  );
};

const ExpandedChartModal = ({ chartKey, rawPayments, onClose }) => {
  const [dateRange, setDateRange] = useState(getCurrentMonthRange());
  const [startDate, endDate] = dateRange;

  const filteredData = useMemo(() => {
    const startStr = startDate ? toYMD(startDate) : '0000-00-00';
    const endStr = endDate ? toYMD(endDate) : '9999-99-99';

    let data = rawPayments.filter(item => {
      if (!item.transactionDate) return false;
      const dbDateStr = item.transactionDate.slice(0, 10);
      if (dbDateStr < startStr || dbDateStr > endStr) return false;
      return true;
    });
    return data.sort((a, b) => (a.transactionDate || '').localeCompare(b.transactionDate || ''));
  }, [rawPayments, startDate, endDate]);

  const prepared = useMemo(() => {
    const grouped = {};
    const allKeys = new Set();

    filteredData.forEach(item => {
      const dateKey = item.transactionDate.slice(0, 10);
      const key = item[chartKey] || 'Unknown';
      allKeys.add(key);

      if (!grouped[dateKey]) grouped[dateKey] = { date: dateKey };
      if (!grouped[dateKey][key]) grouped[dateKey][key] = 0;
      grouped[dateKey][key] += 1;
    });

    return {
      chartData: Object.values(grouped).sort((a, b) => a.date.localeCompare(b.date)),
      keys: Array.from(allKeys)
    };
  }, [filteredData, chartKey]);

  const titles = { country: "Детальная аналитика по ГЕО", manager: "Детальная аналитика по Менеджерам", product: "Детальная аналитика по Продуктам", type: "Детальная аналитика по Методам Оплаты" };
  const isBar = chartKey === 'product' || chartKey === 'type';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-[#09090b] w-full max-w-6xl h-[85vh] rounded-2xl border border-gray-200 dark:border-[#333] shadow-2xl flex flex-col overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-[#222]">
          <div>
            <h2 className="text-2xl font-bold dark:text-white flex items-center gap-2">{titles[chartKey]}</h2>
            <p className="text-sm text-gray-500 mt-1">Данные за период: {startDate?.toLocaleDateString()} - {endDate?.toLocaleDateString()}</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center bg-gray-50 dark:bg-[#111] border border-gray-200 dark:border-[#333] rounded-lg px-3 py-2">
              <CalendarIcon size={16} className="text-gray-400 mr-2" />
              <DatePicker selectsRange={true} startDate={startDate} endDate={endDate} onChange={(u) => setDateRange(u)} dateFormat="dd.MM.yyyy" placeholderText="Период" className="bg-transparent text-sm font-medium dark:text-white outline-none w-48 cursor-pointer text-center" />
            </div>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-[#222] rounded-full text-gray-500 transition-colors"><X size={24} /></button>
          </div>
        </div>
        <div className="flex-1 p-6 min-h-0">
          <ResponsiveContainer width="100%" height="100%">
            {isBar ? (
              <BarChart data={prepared.chartData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" opacity={0.1} vertical={false} />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#666', fontSize: 12 }} tickMargin={10} tickFormatter={(str) => new Date(str).toLocaleDateString(undefined, { day: '2-digit', month: '2-digit' })} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#666', fontSize: 12 }} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
                <Legend wrapperStyle={{ paddingTop: '20px' }} />
                {prepared.keys.map((key, index) => <Bar key={key} dataKey={key} fill={THEME_COLORS[index % THEME_COLORS.length].main} radius={[4, 4, 0, 0]} stackId="a" />)}
              </BarChart>
            ) : (
              <AreaChart data={prepared.chartData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                <defs>{prepared.keys.map((key, index) => { const color = THEME_COLORS[index % THEME_COLORS.length]; return (<linearGradient key={key} id={`grad-modal-${key}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={color.main} stopOpacity={0.4} /><stop offset="100%" stopColor={color.main} stopOpacity={0} /></linearGradient>); })}</defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" opacity={0.1} vertical={false} />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#666', fontSize: 12 }} tickMargin={10} tickFormatter={(str) => new Date(str).toLocaleDateString(undefined, { day: '2-digit', month: '2-digit' })} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#666', fontSize: 12 }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ paddingTop: '20px' }} />
                {prepared.keys.map((key, index) => <Area key={key} type="monotone" dataKey={key} stroke={THEME_COLORS[index % THEME_COLORS.length].main} fill={`url(#grad-modal-${key})`} strokeWidth={3} activeDot={{ r: 6 }} />)}
              </AreaChart>
            )}
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

const ChartWidget = ({ title, subtitle, data, keys, type, onExpand }) => {
  const hasData = data && data.length > 0;
  return (
    <div className="bg-white dark:bg-[#111] border border-gray-200 dark:border-[#333] rounded-xl p-5 shadow-sm relative overflow-hidden group">
      <div className="mb-6 z-10 relative flex justify-between items-start cursor-pointer" onClick={onExpand} title="Нажмите, чтобы развернуть детальную статистику">
        <div>
          <h3 className="text-sm font-bold dark:text-white flex items-center gap-2 group-hover:text-blue-500 transition-colors">
            {type === 'area' ? <BarChart2 size={14} className="text-blue-500" /> : <PieChart size={14} className="text-pink-500" />}
            {title}
          </h3>
          <p className="text-[10px] text-gray-500 mt-0.5">{subtitle}</p>
        </div>
        <div className="p-1.5 rounded-lg bg-gray-50 dark:bg-[#1A1A1A] text-gray-400 group-hover:text-blue-500 group-hover:bg-blue-50 dark:group-hover:bg-blue-900/20 transition-all"><Maximize2 size={14} /></div>
      </div>
      <div className="h-[300px] w-full text-[10px] relative z-10">
        {!hasData ? (<div className="h-full flex items-center justify-center text-gray-400 text-xs">Нет данных</div>) : (
          <ResponsiveContainer width="100%" height="100%">
            {type === 'area' ? (
              <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>{keys.map((key, index) => { const color = THEME_COLORS[index % THEME_COLORS.length]; return (<linearGradient key={key} id={`grad-${key}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={color.main} stopOpacity={0.4} /><stop offset="100%" stopColor={color.main} stopOpacity={0} /></linearGradient>); })}</defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" opacity={0.1} vertical={false} />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#666', fontSize: 10, fontFamily: 'monospace' }} tickMargin={10} tickFormatter={(str) => new Date(str).toLocaleDateString(undefined, { day: '2-digit', month: '2-digit' })} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#666', fontSize: 10, fontFamily: 'monospace' }} allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#555', strokeWidth: 1, strokeDasharray: '3 3' }} />
                {keys.map((key, index) => <Area key={key} type="monotone" dataKey={key} stroke={THEME_COLORS[index % THEME_COLORS.length].main} fill={`url(#grad-${key})`} strokeWidth={2} isAnimationActive={false} />)}
              </AreaChart>
            ) : (
              <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" opacity={0.1} vertical={false} />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#666', fontSize: 10, fontFamily: 'monospace' }} tickMargin={10} tickFormatter={(str) => new Date(str).toLocaleDateString(undefined, { day: '2-digit', month: '2-digit' })} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#666', fontSize: 10, fontFamily: 'monospace' }} allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
                {keys.map((key, index) => <Bar key={key} dataKey={key} fill={THEME_COLORS[index % THEME_COLORS.length].main} radius={[4, 4, 0, 0]} stackId="a" barSize={20} isAnimationActive={false} />)}
              </BarChart>
            )}
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white/95 dark:bg-[#09090b]/90 backdrop-blur-md border border-gray-200 dark:border-[#333] p-3 rounded-lg shadow-2xl text-xs">
        <p className="font-bold dark:text-white mb-2 font-mono border-b border-gray-200 dark:border-[#333] pb-1">
          {new Date(label).toLocaleDateString(undefined, { day: 'numeric', month: 'long' })}
        </p>
        <div className="space-y-1">
          {payload.map((entry, index) => (
            <div key={index} className="flex items-center justify-between gap-6">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: entry.color }}></div>
                <span className="text-gray-600 dark:text-gray-400">{entry.name}</span>
              </div>
              <span className="font-bold dark:text-white font-mono">{entry.value}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
};

export default StatsPage;