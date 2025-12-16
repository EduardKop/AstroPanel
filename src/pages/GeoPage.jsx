import React, { useState, useMemo } from 'react';
import { Filter, Calendar, RotateCcw, XCircle, ArrowUpDown, Users, TrendingUp, DollarSign, Globe } from 'lucide-react';
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

// Компактный фильтр
const SelectFilter = ({ label, value, options, onChange }) => (
  <div className="relative group">
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full appearance-none bg-white dark:bg-[#111] border border-gray-300 dark:border-[#333] text-gray-900 dark:text-gray-200 py-1.5 pl-2.5 pr-6 rounded-[6px] text-xs font-medium focus:outline-none focus:border-blue-500 hover:border-gray-400 dark:hover:border-[#555] transition-colors cursor-pointer min-w-[100px]"
    >
      <option value="">{label}: Все</option>
      {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
    </select>
    <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400"><Filter size={10} /></div>
  </div>
);

const GeoPage = ({ payments = [] }) => {
  const [dateRange, setDateRange] = useState([new Date(new Date().setDate(new Date().getDate() - 7)), new Date()]);
  const [startDate, endDate] = dateRange;
  const [filters, setFilters] = useState({ manager: '', product: '', type: '' });
  const [sortConfig, setSortConfig] = useState({ key: 'salesSum', direction: 'desc' });

  // Уникальные значения
  const uniqueValues = useMemo(() => ({
    managers: [...new Set(payments.map(p => p.manager).filter(Boolean))].sort(),
    products: [...new Set(payments.map(p => p.product).filter(Boolean))].sort(),
    types: [...new Set(payments.map(p => p.type).filter(Boolean))].sort()
  }), [payments]);

  const resetFilters = () => setFilters({ manager: '', product: '', type: '' });
  const resetDateRange = () => setDateRange([new Date(new Date().setDate(new Date().getDate() - 7)), new Date()]);

  // Основная логика
  const geoStats = useMemo(() => {
    const filtered = payments.filter(item => {
      if (!item.transactionDate) return false;
      const d = item.transactionDate.split(' ')[0];
      if (startDate && d < startDate.toISOString().split('T')[0]) return false;
      if (endDate && d > endDate.toISOString().split('T')[0]) return false;
      if (filters.manager && item.manager !== filters.manager) return false;
      if (filters.product && item.product !== filters.product) return false;
      if (filters.type && item.type !== filters.type) return false;
      return true;
    });

    const statsByGeo = {};
    filtered.forEach(p => {
      const code = p.country || 'Unknown';
      if (!statsByGeo[code]) statsByGeo[code] = { count: 0, sum: 0 };
      statsByGeo[code].count += 1;
      statsByGeo[code].sum += (p.amountEUR || 0);
    });

    return Object.entries(statsByGeo).map(([code, data]) => {
      // Mock данные для трафика (т.к. нет в payments)
      const mockTraffic = data.count * 12; 
      const mockCR = ((data.count / mockTraffic) * 100).toFixed(1);
      
      return {
        code,
        salesCount: data.count,
        salesSum: data.sum,
        traffic: mockTraffic,
        cr: parseFloat(mockCR)
      };
    }).sort((a, b) => {
      if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === 'asc' ? -1 : 1;
      if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [payments, startDate, endDate, filters, sortConfig]);

  const requestSort = (key) => setSortConfig({ key, direction: sortConfig.key === key && sortConfig.direction === 'desc' ? 'asc' : 'desc' });
  const SortIcon = ({ col }) => sortConfig.key === col ? <ArrowUpDown size={10} className={`ml-1 ${sortConfig.direction === 'asc' ? 'rotate-180' : ''}`} /> : <ArrowUpDown size={10} className="ml-1 opacity-20" />;

  return (
    <div className="animate-in fade-in zoom-in duration-300 pb-10">
      
      {/* HEADER & FILTERS */}
      <div className="flex flex-col md:flex-row items-end justify-between mb-4 gap-3">
        <div>
           <h2 className="text-lg font-bold dark:text-white text-gray-900 tracking-tight flex items-center gap-2">
             <Globe size={18} className="text-blue-500" /> География продаж
           </h2>
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center bg-white dark:bg-[#111] border border-gray-300 dark:border-[#333] rounded-[6px] px-2 py-1">
               <Calendar size={14} className="text-gray-400 mr-2"/>
               <DatePicker
                  selectsRange={true} startDate={startDate} endDate={endDate} onChange={(u) => setDateRange(u)}
                  dateFormat="dd.MM" placeholderText="Дата"
                  className="bg-transparent text-xs font-medium dark:text-white outline-none w-20 cursor-pointer text-center"
               />
               <button onClick={resetDateRange} className="ml-1 text-gray-400 hover:text-white"><RotateCcw size={10}/></button>
            </div>
            
            <SelectFilter label="Менеджер" value={filters.manager} options={uniqueValues.managers} onChange={(val) => setFilters(p => ({ ...p, manager: val }))} />
            <SelectFilter label="Продукт" value={filters.product} options={uniqueValues.products} onChange={(val) => setFilters(p => ({ ...p, product: val }))} />
            <SelectFilter label="Тип" value={filters.type} options={uniqueValues.types} onChange={(val) => setFilters(p => ({ ...p, type: val }))} />
            
            {(filters.manager || filters.product || filters.type) && (
               <button onClick={resetFilters} className="p-1.5 bg-red-500/10 text-red-500 rounded-[6px] hover:bg-red-500/20"><XCircle size={14}/></button>
            )}
        </div>
      </div>

      {/* TABLE */}
      <div className="bg-white dark:bg-[#111] border border-gray-200 dark:border-[#333] rounded-lg overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-gray-600 dark:text-[#888]">
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
                  <div className="flex items-center justify-end">Продаж (шт) <SortIcon col="salesCount"/></div>
                </th>
                <th className="px-4 py-2 text-right cursor-pointer hover:text-black dark:hover:text-white" onClick={() => requestSort('salesSum')}>
                  <div className="flex items-center justify-end gap-1"><DollarSign size={10}/> Оборот <SortIcon col="salesSum"/></div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-[#222]">
              {geoStats.length === 0 ? (
                <tr><td colSpan="5" className="px-4 py-8 text-center">Нет данных</td></tr>
              ) : (
                geoStats.map((geo, index) => {
                  // Логика цвета для CR
                  let crColorClass = 'text-gray-500';
                  if (geo.cr >= 8) crColorClass = 'text-emerald-500 font-bold';
                  else if (geo.cr >= 4) crColorClass = 'text-amber-500 font-medium';
                  else crColorClass = 'text-red-500';

                  return (
                    <tr key={geo.code} className="hover:bg-gray-50 dark:hover:bg-[#1A1A1A] transition-colors group">
                      
                      {/* ГЕО */}
                      <td className="px-4 py-2">
                        <div className="flex items-center gap-2">
                           <div className="w-6 h-6 rounded bg-gray-100 dark:bg-[#222] flex items-center justify-center text-[10px] font-bold text-gray-500 dark:text-[#AAA] border border-gray-200 dark:border-[#333]">
                             {geo.code}
                           </div>
                           <span className="font-bold dark:text-white">{geo.code}</span>
                           {index === 0 && sortConfig.key === 'salesSum' && sortConfig.direction === 'desc' && (
                             <span className="text-[9px] bg-amber-500/10 text-amber-500 px-1.5 py-0.5 rounded font-bold uppercase ml-2">#1</span>
                           )}
                        </div>
                      </td>

                      {/* Трафик */}
                      <td className="px-4 py-2 text-center font-mono text-gray-500">
                        {geo.traffic}
                      </td>

                      {/* Конверсия */}
                      <td className="px-4 py-2 text-center">
                        <span className={`text-xs font-mono ${crColorClass}`}>
                          {geo.cr}%
                        </span>
                      </td>

                      {/* Продажи */}
                      <td className="px-4 py-2 text-right">
                        <span className="inline-block min-w-[24px] text-center font-mono font-bold text-gray-900 dark:text-white bg-gray-100 dark:bg-[#222] rounded px-1 py-0.5 text-[11px]">
                          {geo.salesCount}
                        </span>
                      </td>

                      {/* Оборот */}
                      <td className="px-4 py-2 text-right font-mono font-bold text-gray-900 dark:text-white">
                        € {geo.salesSum.toFixed(2)}
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