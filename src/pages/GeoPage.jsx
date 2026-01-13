import React, { useState, useMemo, useEffect } from 'react';
import { useAppStore } from '../store/appStore'; 
import { 
  Filter, RotateCcw, XCircle, ArrowUpDown, 
  Users, TrendingUp, DollarSign, Globe, 
  Calendar as CalendarIcon, Coins 
} from 'lucide-react';

import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

// --- КОМПОНЕНТЫ ---

const DenseSelect = ({ label, value, options, onChange }) => (
  <div className="relative group w-full sm:w-auto flex-1 sm:flex-none min-w-[100px]">
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full appearance-none bg-white dark:bg-[#111] border border-gray-200 dark:border-[#333] text-gray-700 dark:text-gray-200 py-1.5 pl-2 pr-6 rounded-[6px] text-xs font-medium focus:outline-none focus:border-blue-500 hover:border-gray-400 dark:hover:border-[#555] transition-colors cursor-pointer truncate"
    >
      <option value="">{label}: Все</option>
      {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
    </select>
    <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400"><Filter size={10} /></div>
  </div>
);

const getLastWeekRange = () => {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - 7);
  return [start, end];
};

const GeoPage = () => {
  const { payments, trafficStats, fetchTrafficStats } = useAppStore();

  const [dateRange, setDateRange] = useState(getLastWeekRange());
  const [startDate, endDate] = dateRange;
  
  const [filters, setFilters] = useState({ manager: '', product: '', type: '' });
  // Сортировка по умолчанию по Евро
  const [sortConfig, setSortConfig] = useState({ key: 'salesSumEUR', direction: 'desc' });

  const hasActiveFilters = useMemo(() => {
    return !!(filters.manager || filters.product || filters.type);
  }, [filters]);

  const resetFilters = () => setFilters({ manager: '', product: '', type: '' });
  const resetDateRange = () => setDateRange(getLastWeekRange());

  useEffect(() => {
    if (fetchTrafficStats) {
      const isoStart = startDate ? new Date(startDate.getTime()).toISOString() : undefined;
      const isoEnd = endDate ? new Date(endDate.getTime()).toISOString() : undefined;
      fetchTrafficStats(isoStart, isoEnd);
    }
  }, [fetchTrafficStats, startDate, endDate]);

  const uniqueValues = useMemo(() => ({
    managers: [...new Set(payments.map(p => p.manager).filter(Boolean))].sort(),
    products: [...new Set(payments.map(p => p.product).filter(Boolean))].sort(),
    types: [...new Set(payments.map(p => p.type).filter(Boolean))].sort()
  }), [payments]);

  // Основная логика
  const geoStats = useMemo(() => {
    const filteredPayments = payments.filter(item => {
      if (!item.transactionDate) return false;
      const transDate = new Date(item.transactionDate);
      
      if (startDate && transDate < new Date(startDate.setHours(0,0,0,0))) return false;
      if (endDate && transDate > new Date(endDate.setHours(23,59,59,999))) return false;

      if (filters.manager && item.manager !== filters.manager) return false;
      if (filters.product && item.product !== filters.product) return false;
      if (filters.type && item.type !== filters.type) return false;
      
      return true;
    });

    const statsByGeo = {};
    filteredPayments.forEach(p => {
      const code = p.country || 'Unknown';
      if (!statsByGeo[code]) statsByGeo[code] = { count: 0, sumEUR: 0, sumLocal: 0 };
      
      statsByGeo[code].count += 1;
      statsByGeo[code].sumEUR += (p.amountEUR || 0);
      statsByGeo[code].sumLocal += (p.amountLocal || 0);
    });

    return Object.entries(statsByGeo).map(([code, data]) => {
      
      let realTraffic = 0;
      if (trafficStats && trafficStats[code]) {
        Object.entries(trafficStats[code]).forEach(([dateStr, val]) => {
          const d = new Date(dateStr);
          if (startDate && d < new Date(startDate.setHours(0,0,0,0))) return;
          if (endDate && d > new Date(endDate.setHours(23,59,59,999))) return;
          const num = typeof val === 'object' ? (val.all || 0) : (Number(val) || 0);
          realTraffic += num;
        });
      }

      const realCR = realTraffic > 0 
        ? ((data.count / realTraffic) * 100).toFixed(2) 
        : "0.00";
      
      return {
        code,
        salesCount: data.count,
        salesSumEUR: data.sumEUR,
        salesSumLocal: data.sumLocal,
        traffic: realTraffic,
        cr: parseFloat(realCR)
      };
    }).sort((a, b) => {
      if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === 'asc' ? -1 : 1;
      if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [payments, trafficStats, startDate, endDate, filters, sortConfig]);

  const requestSort = (key) => setSortConfig({ key, direction: sortConfig.key === key && sortConfig.direction === 'desc' ? 'asc' : 'desc' });
  const SortIcon = ({ col }) => sortConfig.key === col ? <ArrowUpDown size={10} className={`ml-1 ${sortConfig.direction === 'asc' ? 'rotate-180' : ''}`} /> : <ArrowUpDown size={10} className="ml-1 opacity-20" />;

  return (
    <div className="animate-in fade-in zoom-in duration-300 pb-10 w-full max-w-full overflow-x-hidden">
      
      {/* HEADER & FILTERS */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between mb-4 gap-3">
        <div>
           <h2 className="text-lg font-bold dark:text-white text-gray-900 tracking-tight flex items-center gap-2">
             <Globe size={18} className="text-blue-500" /> География продаж
           </h2>
        </div>
        
        <div className="flex flex-wrap items-center gap-2 w-full xl:w-auto xl:justify-end">
            
            <div className="flex items-center bg-white dark:bg-[#111] border border-gray-200 dark:border-[#333] rounded-[6px] px-2 py-0.5 shadow-sm w-full sm:w-auto min-w-[200px] justify-between h-[34px]">
               <div className="flex items-center flex-1 min-w-0 w-full">
                 <CalendarIcon size={12} className="text-gray-400 mr-2 shrink-0" />
                 <DatePicker
                    selectsRange={true} startDate={startDate} endDate={endDate} onChange={(u) => setDateRange(u)}
                    dateFormat="dd.MM.yyyy" placeholderText="Период"
                    className="bg-transparent text-xs font-medium dark:text-white outline-none w-full cursor-pointer text-center min-w-0"
                    popperPlacement="bottom-end"
                 />
               </div>
            </div>
            
            <button onClick={resetDateRange} className="hidden sm:block text-gray-400 hover:text-black dark:hover:text-white p-1"><RotateCcw size={14}/></button>

            <div className="flex flex-wrap sm:flex-nowrap gap-2 w-full sm:w-auto">
              <DenseSelect label="Менеджер" value={filters.manager} options={uniqueValues.managers} onChange={(val) => setFilters(p => ({ ...p, manager: val }))} />
              <DenseSelect label="Продукт" value={filters.product} options={uniqueValues.products} onChange={(val) => setFilters(p => ({ ...p, product: val }))} />
              <DenseSelect label="Тип" value={filters.type} options={uniqueValues.types} onChange={(val) => setFilters(p => ({ ...p, type: val }))} />
            </div>
            
            <button 
              onClick={resetFilters} 
              disabled={!hasActiveFilters}
              className={`shrink-0 p-1.5 bg-red-500/10 text-red-500 rounded-[6px] hover:bg-red-500/20 flex justify-center items-center h-[34px] w-[34px] transition-opacity duration-200 ${hasActiveFilters ? 'opacity-100 cursor-pointer' : 'opacity-0 cursor-default pointer-events-none'}`}
            >
              <XCircle size={14} />
            </button>
        </div>
      </div>

      {/* TABLE */}
      <div className="bg-white dark:bg-[#111] border border-gray-200 dark:border-[#333] rounded-lg overflow-hidden shadow-sm w-full min-w-0">
        <div className="overflow-x-auto w-full min-w-0">
          <table className="w-full text-left text-xs text-gray-600 dark:text-[#888] whitespace-nowrap">
            <thead className="bg-gray-50 dark:bg-[#161616] font-medium border-b border-gray-200 dark:border-[#333] text-gray-500 dark:text-[#666]">
              <tr>
                <th className="px-4 py-2 cursor-pointer hover:text-black dark:hover:text-white" onClick={() => requestSort('code')}>
                  <div className="flex items-center">ГЕО <SortIcon col="code"/></div>
                </th>
                <th className="px-4 py-2 text-center cursor-pointer hover:text-black dark:hover:text-white" onClick={() => requestSort('traffic')}>
                  <div className="flex items-center justify-center gap-1"><Users size={10}/> Трафик <SortIcon col="traffic"/></div>
                </th>
                <th className="px-4 py-2 text-center cursor-pointer hover:text-black dark:hover:text-white" onClick={() => requestSort('cr')}>
                  <div className="flex items-center justify-center gap-1"><TrendingUp size={10}/> Конверсия <SortIcon col="cr"/></div>
                </th>
                <th className="px-4 py-2 text-right cursor-pointer hover:text-black dark:hover:text-white" onClick={() => requestSort('salesCount')}>
                  <div className="flex items-center justify-end">Оплат (шт) <SortIcon col="salesCount"/></div>
                </th>
                
                {/* ✅ ДВА ОТДЕЛЬНЫХ ЗАГОЛОВКА */}
                <th className="px-4 py-2 text-right cursor-pointer hover:text-black dark:hover:text-white" onClick={() => requestSort('salesSumLocal')}>
                  <div className="flex items-center justify-end gap-1"><Coins size={10}/> Сумма (Local) <SortIcon col="salesSumLocal"/></div>
                </th>
                <th className="px-4 py-2 text-right cursor-pointer hover:text-black dark:hover:text-white" onClick={() => requestSort('salesSumEUR')}>
                  <div className="flex items-center justify-end gap-1"><DollarSign size={10}/> Сумма (EUR) <SortIcon col="salesSumEUR"/></div>
                </th>

              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-[#222]">
              {geoStats.length === 0 ? (
                <tr><td colSpan="6" className="px-4 py-8 text-center">Нет данных</td></tr>
              ) : (
                geoStats.map((geo, index) => {
                  let crColorClass = 'text-gray-500';
                  if (geo.cr >= 8) crColorClass = 'text-emerald-500 font-bold';
                  else if (geo.cr >= 4) crColorClass = 'text-amber-500 font-medium';
                  else crColorClass = 'text-red-500';

                  return (
                    <tr key={geo.code} className="hover:bg-gray-50 dark:hover:bg-[#1A1A1A] transition-colors group">
                      <td className="px-4 py-2">
                        <div className="flex items-center gap-2">
                           <div className="w-6 h-6 rounded bg-gray-100 dark:bg-[#222] flex items-center justify-center text-[10px] font-bold text-gray-500 dark:text-[#AAA] border border-gray-200 dark:border-[#333]">
                             {geo.code}
                           </div>
                           <span className="font-bold dark:text-white">{geo.code}</span>
                           {index === 0 && sortConfig.key === 'salesSumEUR' && sortConfig.direction === 'desc' && (
                             <span className="text-[9px] bg-amber-500/10 text-amber-500 px-1.5 py-0.5 rounded font-bold uppercase ml-2">#1</span>
                           )}
                        </div>
                      </td>
                      <td className="px-4 py-2 text-center font-mono text-gray-500">{geo.traffic}</td>
                      <td className="px-4 py-2 text-center"><span className={`text-xs font-mono ${crColorClass}`}>{geo.cr}%</span></td>
                      <td className="px-4 py-2 text-right"><span className="inline-block min-w-[24px] text-center font-mono font-bold text-gray-900 dark:text-white bg-gray-100 dark:bg-[#222] rounded px-1 py-0.5 text-[11px]">{geo.salesCount}</span></td>
                      
                      {/* ✅ ДВЕ ОТДЕЛЬНЫЕ КОЛОНКИ С ДАННЫМИ */}
                      <td className="px-4 py-2 text-right font-mono font-bold text-gray-700 dark:text-gray-300">
                         {geo.salesSumLocal.toLocaleString('ru-RU', { maximumFractionDigits: 0 })} <span className="text-[10px] text-gray-400 font-normal">loc</span>
                      </td>
                      <td className="px-4 py-2 text-right font-mono font-bold text-gray-900 dark:text-white">
                         € {geo.salesSumEUR.toLocaleString('ru-RU', { maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default GeoPage;