import React, { useState, useMemo, useEffect } from 'react';
import { 
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import { Calendar, BarChart2, PieChart, RotateCcw, Maximize2, X } from 'lucide-react';
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

// --- ПАЛИТРА ---
const THEME_COLORS = [
  { main: '#6366F1', gradient: ['#6366F1', '#818CF8'] }, 
  { main: '#EC4899', gradient: ['#EC4899', '#F472B6'] }, 
  { main: '#10B981', gradient: ['#10B981', '#34D399'] }, 
  { main: '#F59E0B', gradient: ['#F59E0B', '#FBBF24'] }, 
  { main: '#8B5CF6', gradient: ['#8B5CF6', '#A78BFA'] }, 
  { main: '#06B6D4', gradient: ['#06B6D4', '#22D3EE'] }, 
];

// --- ХЕЛПЕРЫ ДАТ ---
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

// --- ОСНОВНОЙ КОМПОНЕНТ ---
const StatsPage = ({ payments = [], currentUser }) => {
  const [dateRange, setDateRange] = useState(getLastWeekRange());
  const [startDate, endDate] = dateRange;
  const [expandedChart, setExpandedChart] = useState(null);

  // ✅ 1. ПРОВЕРКА РОЛИ
  const isRestrictedUser = useMemo(() => {
    if (!currentUser) return false;
    return ['Sales', 'Retention', 'Consultant'].includes(currentUser.role);
  }, [currentUser]);

  // ✅ 2. ФИЛЬТРАЦИЯ
  const filteredData = useMemo(() => {
    let data = payments.filter(item => {
      if (!item.transactionDate) return false;
      const d = new Date(item.transactionDate.split(' ')[0]);
      if (startDate && d < new Date(startDate.setHours(0,0,0,0))) return false;
      if (endDate && d > new Date(endDate.setHours(23,59,59,999))) return false;

      // 🔒 ПРИВАТНОСТЬ: Если пользователь ограничен, показываем только его данные
      if (isRestrictedUser) {
        if (item.manager !== currentUser.name) return false;
      }

      return true;
    });
    return data.sort((a, b) => new Date(a.transactionDate) - new Date(b.transactionDate));
  }, [payments, startDate, endDate, isRestrictedUser, currentUser]);

  const prepareData = (dataKey, sourceData) => {
    const grouped = {};
    const allKeys = new Set();
    sourceData.forEach(item => {
      const date = item.transactionDate.split(' ')[0];
      const key = item[dataKey] || 'Unknown';
      allKeys.add(key);
      if (!grouped[date]) grouped[date] = { date };
      if (!grouped[date][key]) grouped[date][key] = 0;
      grouped[date][key] += 1;
    });
    return {
      chartData: Object.values(grouped).sort((a, b) => new Date(a.date) - new Date(b.date)),
      keys: Array.from(allKeys)
    };
  };

  const geoData = useMemo(() => prepareData('country', filteredData), [filteredData]);
  const productData = useMemo(() => prepareData('product', filteredData), [filteredData]);
  const typeData = useMemo(() => prepareData('type', filteredData), [filteredData]);
  const managerData = useMemo(() => prepareData('manager', filteredData), [filteredData]);

  return (
    <div className="animate-in fade-in zoom-in duration-300 pb-10">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
            <h2 className="text-xl font-bold dark:text-white flex items-center gap-2">
              <BarChart2 size={20} className="text-blue-500"/> Аналитика трендов
            </h2>
            <p className="text-gray-500 dark:text-gray-400 text-xs mt-1">Визуализация данных продаж</p>
        </div>
        
        <div className="flex items-center bg-white dark:bg-[#111] border border-gray-300 dark:border-[#333] rounded-[6px] px-3 py-1.5 shadow-sm min-w-[240px]">
             <div className="text-gray-400 pointer-events-none mr-2"><Calendar size={14} /></div>
             <div className="relative flex-1">
                <DatePicker
                    selectsRange={true} startDate={startDate} endDate={endDate} onChange={(update) => setDateRange(update)}
                    dateFormat="dd.MM.yyyy" placeholderText="Период"
                    className="bg-transparent text-xs font-medium dark:text-white outline-none w-full cursor-pointer text-center"
                />
             </div>
             <button onClick={() => setDateRange(getLastWeekRange())} className="ml-2 p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-gray-400 transition-colors">
                <RotateCcw size={12} />
             </button>
        </div>
      </div>

      {/* --- GRID 2x2 --- */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        
        <ChartWidget 
          id="geo"
          title="Динамика по ГЕО" 
          subtitle="Активность стран по дням"
          type="area"
          data={geoData.chartData} 
          keys={geoData.keys}
          onExpand={() => setExpandedChart('country')}
        />

        <ChartWidget 
          id="manager"
          title={isRestrictedUser ? "Моя эффективность" : "Вклад Менеджеров"} 
          subtitle="Результативность команды"
          type="area"
          data={managerData.chartData} 
          keys={managerData.keys}
          onExpand={() => setExpandedChart('manager')}
        />

        <ChartWidget 
          id="product"
          title="Популярность Продуктов" 
          subtitle="Сравнение объемов продаж"
          type="bar"
          data={productData.chartData} 
          keys={productData.keys}
          onExpand={() => setExpandedChart('product')}
        />

        <ChartWidget 
          id="type"
          title="Методы Оплаты" 
          subtitle="Предпочтения клиентов"
          type="bar"
          data={typeData.chartData} 
          keys={typeData.keys}
          onExpand={() => setExpandedChart('type')}
        />

      </div>

      {/* --- МОДАЛЬНОЕ ОКНО ДЕТАЛЬНОГО ПРОСМОТРА --- */}
      {expandedChart && (
        <ExpandedChartModal 
          chartKey={expandedChart} 
          rawPayments={filteredData} // Передаем УЖЕ отфильтрованные данные
          onClose={() => setExpandedChart(null)} 
        />
      )}

    </div>
  );
};

// --- КОМПОНЕНТ МОДАЛЬНОГО ОКНА ---
const ExpandedChartModal = ({ chartKey, rawPayments, onClose }) => {
  const [dateRange, setDateRange] = useState(getCurrentMonthRange());
  const [startDate, endDate] = dateRange;

  const filteredData = useMemo(() => {
    let data = rawPayments.filter(item => {
      if (!item.transactionDate) return false;
      const d = new Date(item.transactionDate.split(' ')[0]);
      if (startDate && d < new Date(startDate.setHours(0,0,0,0))) return false;
      if (endDate && d > new Date(endDate.setHours(23,59,59,999))) return false;
      return true;
    });
    return data.sort((a, b) => new Date(a.transactionDate) - new Date(b.transactionDate));
  }, [rawPayments, startDate, endDate]);

  const prepared = useMemo(() => {
    const grouped = {};
    const allKeys = new Set();
    filteredData.forEach(item => {
      const date = item.transactionDate.split(' ')[0];
      const key = item[chartKey] || 'Unknown';
      allKeys.add(key);
      if (!grouped[date]) grouped[date] = { date };
      if (!grouped[date][key]) grouped[date][key] = 0;
      grouped[date][key] += 1;
    });
    return {
      chartData: Object.values(grouped).sort((a, b) => new Date(a.date) - new Date(b.date)),
      keys: Array.from(allKeys)
    };
  }, [filteredData, chartKey]);

  const titles = {
    country: "Детальная аналитика по ГЕО",
    manager: "Детальная аналитика по Менеджерам",
    product: "Детальная аналитика по Продуктам",
    type: "Детальная аналитика по Методам Оплаты"
  };

  const isBar = chartKey === 'product' || chartKey === 'type';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-[#09090b] w-full max-w-6xl h-[85vh] rounded-2xl border border-gray-200 dark:border-[#333] shadow-2xl flex flex-col overflow-hidden">
        
        {/* HEADER MODAL */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-[#222]">
          <div>
            <h2 className="text-2xl font-bold dark:text-white flex items-center gap-2">{titles[chartKey]}</h2>
            <p className="text-sm text-gray-500 mt-1">Данные за период: {startDate?.toLocaleDateString()} - {endDate?.toLocaleDateString()}</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center bg-gray-50 dark:bg-[#111] border border-gray-200 dark:border-[#333] rounded-lg px-3 py-2">
                <Calendar size={16} className="text-gray-400 mr-2"/>
                <DatePicker selectsRange={true} startDate={startDate} endDate={endDate} onChange={(u) => setDateRange(u)} dateFormat="dd.MM.yyyy" placeholderText="Период" className="bg-transparent text-sm font-medium dark:text-white outline-none w-48 cursor-pointer text-center"/>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-[#222] rounded-full text-gray-500 transition-colors"><X size={24} /></button>
          </div>
        </div>

        {/* CHART AREA */}
        <div className="flex-1 p-6 min-h-0">
           <ResponsiveContainer width="100%" height="100%">
              {isBar ? (
                <BarChart data={prepared.chartData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                   <CartesianGrid strokeDasharray="3 3" stroke="#333" opacity={0.1} vertical={false} />
                   <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#666', fontSize: 12 }} tickMargin={10} tickFormatter={(str) => new Date(str).toLocaleDateString(undefined, {day:'2-digit', month:'2-digit'})} />
                   <YAxis axisLine={false} tickLine={false} tick={{ fill: '#666', fontSize: 12 }} />
                   <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
                   <Legend wrapperStyle={{ paddingTop: '20px' }} />
                   {prepared.keys.map((key, index) => <Bar key={key} dataKey={key} fill={THEME_COLORS[index % THEME_COLORS.length].main} radius={[4, 4, 0, 0]} stackId="a" />)}
                </BarChart>
              ) : (
                <AreaChart data={prepared.chartData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                   <defs>{prepared.keys.map((key, index) => { const color = THEME_COLORS[index % THEME_COLORS.length]; return (<linearGradient key={key} id={`grad-modal-${key}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={color.main} stopOpacity={0.4}/><stop offset="100%" stopColor={color.main} stopOpacity={0}/></linearGradient>); })}</defs>
                   <CartesianGrid strokeDasharray="3 3" stroke="#333" opacity={0.1} vertical={false} />
                   <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#666', fontSize: 12 }} tickMargin={10} tickFormatter={(str) => new Date(str).toLocaleDateString(undefined, {day:'2-digit', month:'2-digit'})} />
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

// --- ВИДЖЕТ ГРАФИКА (MINI) ---
const ChartWidget = ({ title, subtitle, data, keys, type, onExpand }) => {
  const hasData = data && data.length > 0;
  return (
    <div className="bg-white dark:bg-[#111] border border-gray-200 dark:border-[#333] rounded-xl p-5 shadow-sm relative overflow-hidden group">
      <div className="mb-6 z-10 relative flex justify-between items-start cursor-pointer" onClick={onExpand} title="Нажмите, чтобы развернуть детальную статистику">
        <div>
          <h3 className="text-sm font-bold dark:text-white flex items-center gap-2 group-hover:text-blue-500 transition-colors">
            {type === 'area' ? <BarChart2 size={14} className="text-blue-500"/> : <PieChart size={14} className="text-pink-500"/>}
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
                <defs>{keys.map((key, index) => { const color = THEME_COLORS[index % THEME_COLORS.length]; return (<linearGradient key={key} id={`grad-${key}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={color.main} stopOpacity={0.4}/><stop offset="100%" stopColor={color.main} stopOpacity={0}/></linearGradient>); })}</defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" opacity={0.1} vertical={false} />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#666', fontSize: 10, fontFamily: 'monospace' }} tickMargin={10} tickFormatter={(str) => new Date(str).toLocaleDateString(undefined, {day:'2-digit', month:'2-digit'})} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#666', fontSize: 10, fontFamily: 'monospace' }} allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#555', strokeWidth: 1, strokeDasharray: '3 3' }} />
                {keys.map((key, index) => <Area key={key} type="monotone" dataKey={key} stroke={THEME_COLORS[index % THEME_COLORS.length].main} fill={`url(#grad-${key})`} strokeWidth={2} isAnimationActive={false} />)}
              </AreaChart>
            ) : (
              <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" opacity={0.1} vertical={false} />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#666', fontSize: 10, fontFamily: 'monospace' }} tickMargin={10} tickFormatter={(str) => new Date(str).toLocaleDateString(undefined, {day:'2-digit', month:'2-digit'})} />
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