import React, { useState, useMemo } from 'react';
import { useAppStore } from '../store/appStore'; // ✅ Store
import { 
  Filter, Calendar, RotateCcw, XCircle, 
  ArrowUpDown, Globe, ShoppingCart, DollarSign, 
  Briefcase, Clock, Percent, Wallet 
} from 'lucide-react';
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

const ManagersPage = () => {
  // ✅ 1. Берем данные из стора
  const { payments } = useAppStore();

  const [dateRange, setDateRange] = useState([new Date(new Date().setDate(new Date().getDate() - 7)), new Date()]);
  const [startDate, endDate] = dateRange;
  const [filters, setFilters] = useState({ country: '', product: '', type: '' });
  const [sortConfig, setSortConfig] = useState({ key: 'salesCount', direction: 'desc' });

  // Уникальные значения для фильтров
  const uniqueValues = useMemo(() => {
    const getUnique = (key) => [...new Set(payments.map(p => p[key]).filter(Boolean))].sort();
    return {
      countries: getUnique('country'),
      products: getUnique('product'),
      types: getUnique('type')
    };
  }, [payments]);

  const resetFilters = () => setFilters({ country: '', product: '', type: '' });
  const resetDateRange = () => setDateRange([new Date(new Date().setDate(new Date().getDate() - 7)), new Date()]);

  // Основная логика
  const managersStats = useMemo(() => {
    // 1. Фильтрация
    const filtered = payments.filter(item => {
      // Безопасная проверка даты
      if (!item.transactionDate) return false;
      const transDate = new Date(item.transactionDate);
      
      if (startDate && transDate < new Date(startDate.setHours(0,0,0,0))) return false;
      if (endDate && transDate > new Date(endDate.setHours(23,59,59,999))) return false;
      if (filters.country && item.country !== filters.country) return false;
      if (filters.product && item.product !== filters.product) return false;
      if (filters.type && item.type !== filters.type) return false;
      return true;
    });

    // 2. Группировка
    const statsByName = {};
    filtered.forEach(p => {
      const name = p.manager || 'Неизвестно'; // manager уже имя (из Store)
      if (!statsByName[name]) {
        statsByName[name] = { count: 0, sum: 0, countries: new Set() };
      }
      statsByName[name].count += 1;
      statsByName[name].sum += (p.amountEUR || 0); // amountEUR уже число
      if (p.country) statsByName[name].countries.add(p.country);
    });

    // 3. Формирование списка + Mock данные
    return Object.entries(statsByName).map(([name, data]) => {
      // Mock данные для примера (т.к. их нет в payments)
      const mockCR = (Math.random() * (15 - 3) + 3).toFixed(1);
      const mockShifts = Math.floor(Math.random() * 5) + 2;
      const mockSalary = (300 + (data.sum * 0.05)).toFixed(0);
      const role = data.count > 10 ? 'Senior Sales' : 'Sales Manager';

      return {
        name,
        role,
        shifts: mockShifts,
        geoDisplay: Array.from(data.countries).slice(0, 3).join(', ') + (data.countries.size > 3 ? '...' : ''),
        salesCount: data.count,
        salesSum: data.sum,
        cr: parseFloat(mockCR),
        salary: parseInt(mockSalary)
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
             <Briefcase size={18} className="text-blue-500" /> Эффективность
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
            
            <SelectFilter label="ГЕО" value={filters.country} options={uniqueValues.countries} onChange={(val) => setFilters(p => ({ ...p, country: val }))} />
            <SelectFilter label="Продукт" value={filters.product} options={uniqueValues.products} onChange={(val) => setFilters(p => ({ ...p, product: val }))} />
            <SelectFilter label="Тип" value={filters.type} options={uniqueValues.types} onChange={(val) => setFilters(p => ({ ...p, type: val }))} />
            
            {(filters.country || filters.product || filters.type) && (
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
                <th className="px-4 py-2 cursor-pointer hover:text-black dark:hover:text-white" onClick={() => requestSort('name')}>
                  <div className="flex items-center">Менеджер <SortIcon col="name"/></div>
                </th>
                <th className="px-4 py-2 hidden sm:table-cell"><div className="flex items-center gap-1"><Briefcase size={10}/> Роль</div></th>
                <th className="px-4 py-2"><div className="flex items-center gap-1"><Globe size={10}/> ГЕО</div></th>
                <th className="px-4 py-2 text-center hidden sm:table-cell"><div className="flex items-center justify-center gap-1"><Clock size={10}/> Смены</div></th>
                <th className="px-4 py-2 text-center cursor-pointer hover:text-black dark:hover:text-white" onClick={() => requestSort('cr')}>
                  <div className="flex items-center justify-center gap-1"><Percent size={10}/> CR <SortIcon col="cr"/></div>
                </th>
                <th className="px-4 py-2 text-center cursor-pointer hover:text-black dark:hover:text-white" onClick={() => requestSort('salesCount')}>
                  <div className="flex items-center justify-center gap-1"><ShoppingCart size={10}/> Продаж <SortIcon col="salesCount"/></div>
                </th>
                <th className="px-4 py-2 text-right cursor-pointer hover:text-black dark:hover:text-white" onClick={() => requestSort('salesSum')}>
                  <div className="flex items-center justify-end gap-1"><DollarSign size={10}/> Оборот <SortIcon col="salesSum"/></div>
                </th>
                <th className="px-4 py-2 text-right cursor-pointer hover:text-black dark:hover:text-white" onClick={() => requestSort('salary')}>
                  <div className="flex items-center justify-end gap-1"><Wallet size={10}/> ЗП (est) <SortIcon col="salary"/></div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-[#222]">
              {managersStats.length === 0 ? (
                <tr><td colSpan="8" className="px-4 py-8 text-center">Нет данных</td></tr>
              ) : (
                managersStats.map((mgr) => {
                  let crColorClass = 'text-gray-500';
                  if (mgr.cr >= 10) crColorClass = 'text-emerald-500 font-bold';
                  else if (mgr.cr >= 5) crColorClass = 'text-amber-500 font-medium';
                  else crColorClass = 'text-red-500';

                  return (
                    <tr key={mgr.name} className="hover:bg-gray-50 dark:hover:bg-[#1A1A1A] transition-colors group">
                      
                      <td className="px-4 py-2">
                        <div className="flex items-center gap-2">
                           <div className="w-6 h-6 rounded bg-gray-100 dark:bg-[#222] flex items-center justify-center text-[10px] font-bold text-gray-500 dark:text-[#AAA]">
                             {mgr.name[0]}
                           </div>
                           <span className="font-medium text-gray-900 dark:text-gray-200">{mgr.name}</span>
                        </div>
                      </td>

                      <td className="px-4 py-2 hidden sm:table-cell">
                        <span className="text-[10px] bg-gray-50 dark:bg-[#222] border border-gray-100 dark:border-[#333] px-1.5 py-0.5 rounded text-gray-500">
                          {mgr.role}
                        </span>
                      </td>

                      <td className="px-4 py-2 text-[10px] font-mono text-gray-500">
                        {mgr.geoDisplay || '-'}
                      </td>

                      <td className="px-4 py-2 text-center font-mono hidden sm:table-cell">
                        {mgr.shifts}
                      </td>

                      <td className="px-4 py-2 text-center">
                        <span className={`text-xs font-mono ${crColorClass}`}>
                          {mgr.cr}%
                        </span>
                      </td>

                      <td className="px-4 py-2 text-center">
                        <span className="inline-block min-w-[24px] text-center font-mono font-bold text-gray-900 dark:text-white bg-gray-100 dark:bg-[#222] rounded px-1 py-0.5 text-[11px]">
                          {mgr.salesCount}
                        </span>
                      </td>

                      <td className="px-4 py-2 text-right font-mono text-gray-600 dark:text-gray-400">
                        € {mgr.salesSum.toFixed(0)}
                      </td>

                      <td className="px-4 py-2 text-right">
                        <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          € {mgr.salary}
                        </span>
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

export default ManagersPage;