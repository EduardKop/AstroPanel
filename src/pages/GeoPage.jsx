import React, { useState, useMemo, useEffect } from 'react';
import { useAppStore } from '../store/appStore';
import {
  Filter, RotateCcw, XCircle, ArrowUpDown,
  Users, TrendingUp, DollarSign, Globe,
  Calendar as CalendarIcon, Coins,
  LayoutDashboard, MessageCircle, MessageSquare, Phone, X
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
      <option value="">{label}</option>
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

// ХЕЛПЕР: Превращает объект Date в строку "YYYY-MM-DD"
// Важно использовать локальные методы (getFullYear и т.д.), так как DatePicker возвращает локальное время 00:00
const toYMD = (date) => {
  if (!date) return '';
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const GeoPage = () => {
  const { payments, trafficStats, fetchTrafficStats, user: currentUser } = useAppStore();

  const [dateRange, setDateRange] = useState(getLastWeekRange());
  const [startDate, endDate] = dateRange;

  const [filters, setFilters] = useState({ manager: '', product: '', type: '', source: 'all' });
  // Сортировка по умолчанию по Евро
  const [sortConfig, setSortConfig] = useState({ key: 'salesSumEUR', direction: 'desc' });

  const hasActiveFilters = useMemo(() => {
    return !!(filters.manager || filters.product || filters.type || filters.source !== 'all');
  }, [filters]);

  const resetFilters = () => setFilters({ manager: '', product: '', type: '', source: 'all' });
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

  const isRestrictedUser = useMemo(() => {
    if (!currentUser) return false;
    return ['Sales', 'Retention', 'Consultant'].includes(currentUser.role);
  }, [currentUser]);

  // Основная логика (RAW MODE)
  const geoStats = useMemo(() => {
    // 1. Подготовка границ дат в строковом формате
    const startStr = startDate ? toYMD(startDate) : '0000-00-00';
    const endStr = endDate ? toYMD(endDate) : '9999-99-99';

    // 2. Фильтрация платежей
    const filteredPayments = payments.filter(item => {
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

      if (filters.product && item.product !== filters.product) return false;
      if (filters.type && item.type !== filters.type) return false;
      if (filters.source !== 'all' && item.source !== filters.source) return false;

      return true;
    });

    // 3. Агрегация по странам
    const statsByGeo = {};
    filteredPayments.forEach(p => {
      const code = p.country || 'Unknown';
      if (!statsByGeo[code]) statsByGeo[code] = { count: 0, sumEUR: 0, sumLocal: 0 };

      statsByGeo[code].count += 1;
      statsByGeo[code].sumEUR += (p.amountEUR || 0);
      statsByGeo[code].sumLocal += (p.amountLocal || 0);
    });

    // 4. Добавление трафика и расчет конверсии
    return Object.entries(statsByGeo).map(([code, data]) => {

      let realTraffic = 0;
      if (trafficStats && trafficStats[code]) {
        Object.entries(trafficStats[code]).forEach(([dateStr, val]) => {
          // dateStr уже в формате YYYY-MM-DD, сравниваем напрямую со строками границ
          if (dateStr < startStr || dateStr > endStr) return;

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
  }, [payments, trafficStats, startDate, endDate, filters, sortConfig, isRestrictedUser, currentUser]);

  const requestSort = (key) => setSortConfig({ key, direction: sortConfig.key === key && sortConfig.direction === 'desc' ? 'asc' : 'desc' });
  const SortIcon = ({ col }) => sortConfig.key === col ? <ArrowUpDown size={10} className={`ml-1 ${sortConfig.direction === 'asc' ? 'rotate-180' : ''}`} /> : <ArrowUpDown size={10} className="ml-1 opacity-20" />;

  return (
    <div className="animate-in fade-in zoom-in duration-300 pb-10 w-full max-w-full overflow-x-hidden">

      {/* HEADER + FILTERS */}
      <div className="sticky top-0 z-20 bg-[#F5F5F5] dark:bg-[#0A0A0A] -mx-3 px-3 md:-mx-6 md:px-6 py-3 border-b border-transparent transition-colors duration-200 flex flex-col gap-3">

        {/* Заголовок */}
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-bold dark:text-white tracking-tight flex items-center gap-2 truncate min-w-0">
            <Globe size={18} className="text-blue-500 shrink-0" />
            <span className="truncate">География продаж</span>
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
            <DenseSelect label="Продукт" value={filters.product} options={uniqueValues.products} onChange={(val) => setFilters(p => ({ ...p, product: val }))} />
            <DenseSelect label="Тип" value={filters.type} options={uniqueValues.types} onChange={(val) => setFilters(p => ({ ...p, type: val }))} />

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
              disabled={!hasActiveFilters}
              className={`bg-gray-200 dark:bg-[#1A1A1A] hover:bg-gray-300 dark:hover:bg-[#333] text-gray-500 dark:text-gray-400 p-1.5 rounded-[6px] transition-colors h-[34px] w-[34px] flex items-center justify-center ${hasActiveFilters ? 'opacity-100 cursor-pointer' : 'opacity-50 cursor-default pointer-events-none'}`}
              title="Сбросить фильтры"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* TABLE */}
      <div className="bg-white dark:bg-[#111] border border-gray-200 dark:border-[#333] rounded-lg overflow-hidden shadow-sm w-full min-w-0">
        <div className="overflow-x-auto w-full min-w-0">
          <table className="w-full text-left text-xs text-gray-600 dark:text-[#888] whitespace-nowrap">
            <thead className="bg-gray-50 dark:bg-[#161616] font-medium border-b border-gray-200 dark:border-[#333] text-gray-500 dark:text-[#666]">
              <tr>
                <th className="px-4 py-2 cursor-pointer hover:text-black dark:hover:text-white text-xs font-bold uppercase tracking-wider" onClick={() => requestSort('code')}>
                  <div className="flex items-center">ГЕО <SortIcon col="code" /></div>
                </th>
                <th className="px-4 py-2 text-center cursor-pointer hover:text-black dark:hover:text-white text-xs font-bold uppercase tracking-wider" onClick={() => requestSort('traffic')}>
                  <div className="flex items-center justify-center gap-1"><Users size={10} /> Трафик <SortIcon col="traffic" /></div>
                </th>
                <th className="px-4 py-2 text-center cursor-pointer hover:text-black dark:hover:text-white text-xs font-bold uppercase tracking-wider" onClick={() => requestSort('cr')}>
                  <div className="flex items-center justify-center gap-1"><TrendingUp size={10} /> Конверсия <SortIcon col="cr" /></div>
                </th>
                <th className="px-4 py-2 text-right cursor-pointer hover:text-black dark:hover:text-white text-xs font-bold uppercase tracking-wider" onClick={() => requestSort('salesCount')}>
                  <div className="flex items-center justify-end">Оплат (шт) <SortIcon col="salesCount" /></div>
                </th>

                {/* ✅ ДВА ОТДЕЛЬНЫХ ЗАГОЛОВКА */}
                <th className="px-4 py-2 text-right cursor-pointer hover:text-black dark:hover:text-white text-xs font-bold uppercase tracking-wider" onClick={() => requestSort('salesSumLocal')}>
                  <div className="flex items-center justify-end gap-1"><Coins size={10} /> Сумма (Local) <SortIcon col="salesSumLocal" /></div>
                </th>
                <th className="px-4 py-2 text-right cursor-pointer hover:text-black dark:hover:text-white text-xs font-bold uppercase tracking-wider" onClick={() => requestSort('salesSumEUR')}>
                  <div className="flex items-center justify-end gap-1"><DollarSign size={10} /> Сумма (EUR) <SortIcon col="salesSumEUR" /></div>
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