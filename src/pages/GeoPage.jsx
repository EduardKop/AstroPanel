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

// Mobile Custom Dropdown
const MobileSelect = ({ label, value, options, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleSelect = (val) => {
    onChange(val);
    setIsOpen(false);
  };

  return (
    <div className="relative w-full">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-white dark:bg-[#111] border border-gray-200 dark:border-[#333] text-gray-700 dark:text-gray-200 py-1.5 px-3 rounded-[6px] text-xs font-medium hover:border-gray-400 dark:hover:border-[#555] transition-colors text-left flex justify-between items-center"
      >
        <span className={value ? '' : 'text-gray-400'}>{value || label}</span>
        <Filter size={10} className="shrink-0 ml-2" />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-[#111] border border-gray-200 dark:border-[#333] rounded-lg shadow-lg max-h-60 overflow-y-auto z-50">
            <button
              onClick={() => handleSelect('')}
              className={`w-full px-3 py-2 text-left text-xs hover:bg-gray-100 dark:hover:bg-[#222] transition-colors ${!value ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-bold' : ''}`}
            >
              {label}
            </button>
            {options.map(opt => (
              <button
                key={opt}
                onClick={() => handleSelect(opt)}
                className={`w-full px-3 py-2 text-left text-xs hover:bg-gray-100 dark:hover:bg-[#222] transition-colors ${value === opt ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-bold' : ''}`}
              >
                {opt}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

// Desktop Native Select
const DesktopSelect = ({ label, value, options, onChange }) => (
  <div className="relative group w-full sm:w-auto flex-1 sm:flex-none min-w-[100px]">
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full appearance-none bg-white dark:bg-[#111] border border-gray-200 dark:border-[#333] text-gray-700 dark:text-gray-200 py-1.5 pl-2 pr-6 rounded-[6px] text-xs font-medium focus:outline-none focus:border-blue-500 hover:border-gray-400 dark:hover:border-[#555] transition-colors cursor-pointer"
    >
      <option value="">{label}</option>
      {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
    </select>
    <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400"><Filter size={10} /></div>
  </div>
);

// Adaptive Select Component
const DenseSelect = (props) => (
  <>
    <div className="md:hidden w-full">
      <MobileSelect {...props} />
    </div>
    <div className="hidden md:block">
      <DesktopSelect {...props} />
    </div>
  </>
);

// Mobile Date Range Picker
const MobileDateRangePicker = ({ startDate, endDate, onChange, onReset }) => {
  const formatDate = (date) => {
    if (!date) return '';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const parseDate = (str) => {
    if (!str) return null;
    const [year, month, day] = str.split('-');
    return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  };

  const handleStartChange = (e) => {
    const newStart = parseDate(e.target.value);
    onChange([newStart, endDate]);
  };

  const handleEndChange = (e) => {
    const newEnd = parseDate(e.target.value);
    onChange([startDate, newEnd]);
  };

  const displayText = () => {
    if (!startDate && !endDate) return 'Период';
    if (!startDate) return `По ${endDate.toLocaleDateString('ru-RU')}`;
    if (!endDate) return `С ${startDate.toLocaleDateString('ru-RU')}`;
    return `${startDate.toLocaleDateString('ru-RU')} - ${endDate.toLocaleDateString('ru-RU')}`;
  };

  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative w-full">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-white dark:bg-[#111] border border-gray-200 dark:border-[#333] text-gray-700 dark:text-gray-200 py-1.5 px-3 rounded-[6px] text-xs font-medium hover:border-gray-400 dark:hover:border-[#555] transition-colors text-left flex justify-between items-center h-[34px]"
      >
        <CalendarIcon size={12} className="shrink-0 mr-2 text-gray-400" />
        <span className={`flex-1 ${!startDate && !endDate ? 'text-gray-400' : ''}`}>{displayText()}</span>
        <RotateCcw
          size={12}
          className="shrink-0 ml-2 text-gray-400 hover:text-red-500 transition-colors"
          onClick={(e) => {
            e.stopPropagation();
            onReset();
          }}
        />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-[#111] border border-gray-200 dark:border-[#333] rounded-lg shadow-lg p-3 z-50">
            <div className="space-y-2">
              <div>
                <label className="text-xs text-gray-500 block mb-1">От</label>
                <input
                  type="date"
                  value={formatDate(startDate)}
                  onChange={handleStartChange}
                  className="w-full bg-white dark:bg-[#0A0A0A] border border-gray-200 dark:border-[#333] rounded px-2 py-1.5 text-xs text-gray-700 dark:text-gray-200"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">До</label>
                <input
                  type="date"
                  value={formatDate(endDate)}
                  onChange={handleEndChange}
                  className="w-full bg-white dark:bg-[#0A0A0A] border border-gray-200 dark:border-[#333] rounded px-2 py-1.5 text-xs text-gray-700 dark:text-gray-200"
                />
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="w-full bg-blue-500 hover:bg-blue-600 text-white rounded px-3 py-1.5 text-xs font-bold transition-colors"
              >
                Применить
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

// Desktop Date Range Picker
const DesktopDateRangePicker = ({ startDate, endDate, onChange, onReset }) => (
  <div className="flex items-center bg-white dark:bg-[#111] border border-gray-200 dark:border-[#333] rounded-[6px] px-2 py-0.5 shadow-sm h-[34px] flex-1">
    <CalendarIcon size={12} className="text-gray-400 mr-2 shrink-0" />
    <div className="relative flex-1">
      <DatePicker
        selectsRange={true}
        startDate={startDate}
        endDate={endDate}
        onChange={onChange}
        dateFormat="dd.MM.yyyy"
        placeholderText="Период"
        className="bg-transparent text-xs font-medium dark:text-white outline-none w-full cursor-pointer text-center"
        popperPlacement="bottom-end"
      />
    </div>
    <button onClick={onReset} className="ml-2 p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-gray-400 transition-colors">
      <RotateCcw size={12} />
    </button>
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

  const [filters, setFilters] = useState({ manager: '', product: '', type: '', source: 'all', showMobileFilters: false });
  // Сортировка по умолчанию по Евро
  const [sortConfig, setSortConfig] = useState({ key: 'salesSumEUR', direction: 'desc' });
  const [expandedId, setExpandedId] = useState(null);

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

          // Фильтруем трафик по источнику
          let num = 0;
          if (typeof val === 'object') {
            if (filters.source === 'all') {
              num = val.all || 0;
            } else {
              num = val[filters.source] || 0;
            }
          } else {
            num = Number(val) || 0;
          }
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
      <div className="sticky top-0 z-20 bg-[#F5F5F5] dark:bg-[#0A0A0A] -mx-3 px-2 md:px-6 py-2 md:py-3 border-b border-transparent transition-colors duration-200">

        {/* Заголовок */}
        <div className="flex items-center gap-2 mb-3">
          <h2 className="text-lg font-bold dark:text-white tracking-tight flex items-center gap-2 truncate min-w-0">
            <Globe size={18} className="text-blue-500 shrink-0" />
            <span className="truncate">География продаж</span>
          </h2>
        </div>

        {/* Все фильтры - wrapper только для мобильных */}
        <div className="mx-auto max-w-[90%] md:max-w-none">
          <div className="flex flex-col md:flex-row md:flex-wrap items-stretch md:items-center gap-2 md:justify-between">

            {/* Кнопки источников */}
            <div className="flex bg-gray-200 dark:bg-[#1A1A1A] p-0.5 rounded-[6px] h-[34px] items-center w-full md:w-auto justify-center">
              <button onClick={() => setFilters(prev => ({ ...prev, source: 'all' }))} className={`px-2.5 h-full rounded-[4px] text-[10px] font-bold transition-all whitespace-nowrap ${filters.source === 'all' ? 'bg-white dark:bg-[#333] text-black dark:text-white shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}>Все</button>
              <button onClick={() => setFilters(prev => ({ ...prev, source: 'direct' }))} className={`px-2 h-full rounded-[4px] text-[10px] font-bold transition-all flex items-center gap-1 whitespace-nowrap ${filters.source === 'direct' ? 'bg-white dark:bg-[#333] text-blue-600 dark:text-blue-400 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}><MessageCircle size={10} />Direct</button>
              <button onClick={() => setFilters(prev => ({ ...prev, source: 'comments' }))} className={`px-2 h-full rounded-[4px] text-[10px] font-bold transition-all flex items-center gap-1 whitespace-nowrap ${filters.source === 'comments' ? 'bg-white dark:bg-[#333] text-orange-600 dark:text-orange-400 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}><MessageSquare size={10} />Comm</button>
              <button onClick={() => setFilters(prev => ({ ...prev, source: 'whatsapp' }))} className={`px-2 h-full rounded-[4px] text-[10px] font-bold transition-all flex items-center gap-1 whitespace-nowrap ${filters.source === 'whatsapp' ? 'bg-white dark:bg-[#333] text-green-600 dark:text-green-400 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}><Phone size={10} />WP</button>
            </div>

            {/* Фильтры */}
            <div className="flex flex-col md:flex-row md:flex-wrap items-stretch md:items-center gap-2 w-full md:w-auto">

              {/* MOBILE - Collapsible Filters Menu */}
              <div className="md:hidden w-full space-y-2">
                <button
                  onClick={() => setFilters(prev => ({ ...prev, showMobileFilters: !prev.showMobileFilters }))}
                  className="w-full bg-white dark:bg-[#111] border border-gray-200 dark:border-[#333] text-gray-700 dark:text-gray-200 py-1.5 px-3 rounded-[6px] text-xs font-medium hover:border-gray-400 dark:hover:border-[#555] transition-colors text-left flex justify-between items-center h-[34px]"
                >
                  <span className="flex items-center gap-2">
                    <Filter size={12} />
                    <span>Фильтры</span>
                  </span>
                  <span className="text-[10px] text-gray-400">
                    {(filters.manager || filters.product || filters.type) && '●'}
                  </span>
                </button>

                {filters.showMobileFilters && (
                  <div className="space-y-2 p-3 bg-white dark:bg-[#111] border border-gray-200 dark:border-[#333] rounded-lg">
                    {!isRestrictedUser && <DenseSelect label="Менеджер" value={filters.manager} options={uniqueValues.managers} onChange={(val) => setFilters(p => ({ ...p, manager: val }))} />}
                    <DenseSelect label="Продукт" value={filters.product} options={uniqueValues.products} onChange={(val) => setFilters(p => ({ ...p, product: val }))} />
                    <DenseSelect label="Тип" value={filters.type} options={uniqueValues.types} onChange={(val) => setFilters(p => ({ ...p, type: val }))} />

                    <MobileDateRangePicker
                      startDate={startDate}
                      endDate={endDate}
                      onChange={(update) => setDateRange(update)}
                      onReset={resetDateRange}
                    />

                    <button
                      onClick={resetFilters}
                      disabled={!hasActiveFilters}
                      className={`w-full p-2 bg-red-500/10 text-red-500 rounded-[6px] hover:bg-red-500/20 text-xs font-bold transition-opacity ${hasActiveFilters ? 'opacity-100' : 'opacity-50 cursor-not-allowed'}`}
                    >
                      Сбросить фильтры
                    </button>
                  </div>
                )}
              </div>

              {/* DESKTOP - Inline Filters */}
              <div className="hidden md:contents">
                {!isRestrictedUser && (<DenseSelect label="Менеджер" value={filters.manager} options={uniqueValues.managers} onChange={(val) => setFilters(p => ({ ...p, manager: val }))} />)}
                <DenseSelect label="Продукт" value={filters.product} options={uniqueValues.products} onChange={(val) => setFilters(p => ({ ...p, product: val }))} />
                <DenseSelect label="Тип" value={filters.type} options={uniqueValues.types} onChange={(val) => setFilters(p => ({ ...p, type: val }))} />

                {/* Desktop Calendar + Reset */}
                <div className="flex items-center gap-2">
                  <DesktopDateRangePicker
                    startDate={startDate}
                    endDate={endDate}
                    onChange={(update) => setDateRange(update)}
                    onReset={resetDateRange}
                  />

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
          </div>
        </div>
      </div>

      {/* TABLE */}
      <div className="bg-white dark:bg-[#111] border border-gray-200 dark:border-[#333] rounded-lg overflow-hidden shadow-sm w-full min-w-0">
        {/* Desktop Table */}
        <div className="hidden md:block overflow-x-auto w-full min-w-0">
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

        {/* Mobile Cards */}
        <div className="md:hidden space-y-2 p-3">
          {geoStats.length === 0 ? (
            <div className="text-center py-6 text-xs text-gray-500">Нет данных</div>
          ) : (
            geoStats.map((geo) => {
              const isExpanded = expandedId === geo.code;
              let crColorClass = 'text-gray-500';
              if (geo.cr >= 8) crColorClass = 'text-emerald-500';
              else if (geo.cr >= 4) crColorClass = 'text-amber-500';
              else crColorClass = 'text-red-500';

              return (
                <div key={geo.code} className="border border-gray-200 dark:border-[#333] rounded-lg p-3 bg-white dark:bg-[#111] transition-all">
                  <div className="flex justify-between items-center">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded bg-gray-100 dark:bg-[#222] flex items-center justify-center text-xs font-bold text-gray-500 dark:text-[#AAA] border border-gray-200 dark:border-[#333]">
                          {geo.code}
                        </div>
                        <div>
                          <div className="font-bold text-gray-900 dark:text-white">{geo.code}</div>
                          <div className={`text-sm font-bold ${crColorClass}`}>
                            CR: {geo.cr}%
                          </div>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : geo.code)}
                      className="px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded-md text-xs font-bold transition-colors"
                    >
                      {isExpanded ? 'Скрыть' : 'Подробнее'}
                    </button>
                  </div>

                  {isExpanded && (
                    <div className="mt-3 pt-3 border-t border-gray-200 dark:border-[#333] space-y-2 text-sm animate-in fade-in slide-in-from-top-2 duration-200">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Трафик:</span>
                        <span className="font-mono">{geo.traffic}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Оплат (шт):</span>
                        <span className="font-bold">{geo.salesCount}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Сумма (Local):</span>
                        <span className="font-mono font-bold">{geo.salesSumLocal.toLocaleString('ru-RU', { maximumFractionDigits: 0 })} loc</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Сумма (EUR):</span>
                        <span className="font-mono font-bold text-gray-900 dark:text-white">€ {geo.salesSumEUR.toLocaleString('ru-RU', { maximumFractionDigits: 2 })}</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default GeoPage;