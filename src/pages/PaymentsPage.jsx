import React, { useState, useMemo, useEffect } from 'react';
import { useAppStore } from '../store/appStore';
import {
  Filter, ChevronLeft, ChevronRight, Calendar as CalendarIcon,
  XCircle, RotateCcw, ArrowUpDown, LayoutList,
  LayoutDashboard, MessageCircle, MessageSquare, Phone, X
} from 'lucide-react';
import PaymentsTable from '../components/PaymentsTable';
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

// ХЕЛПЕР: Превращает объект Date из календаря в строку "YYYY-MM-DD"
const toYMD = (date) => {
  if (!date) return '';
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const PaymentsPage = () => {
  const { payments, user: currentUser, isLoading, fetchAllData } = useAppStore();

  const [dateRange, setDateRange] = useState(getLastWeekRange());
  const [startDate, endDate] = dateRange;

  const [filters, setFilters] = useState({ manager: '', country: '', product: '', type: '', source: 'all' });
  const [sortOrder, setSortOrder] = useState('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 30;

  // Авто-обновление при маунте для получения свежих данных
  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  const hasActiveFilters = useMemo(() => {
    return !!(filters.manager || filters.country || filters.product || filters.type || filters.source !== 'all');
  }, [filters]);

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

  const resetFilters = () => setFilters({ manager: '', country: '', product: '', type: '', source: 'all' });
  const resetDateRange = () => setDateRange(getLastWeekRange());
  const toggleSort = () => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc');

  // --- ЛОГИКА ФИЛЬТРАЦИИ (RAW MODE) ---
  const processedData = useMemo(() => {
    // Превращаем выбранные в календаре даты в строки "2026-01-15"
    const startStr = startDate ? toYMD(startDate) : '0000-00-00';
    const endStr = endDate ? toYMD(endDate) : '9999-99-99';

    let data = payments.filter(item => {
      // 1. Роль
      if (isRestrictedUser) {
        if (item.manager !== currentUser.name) return false;
      } else {
        if (filters.manager && item.manager !== filters.manager) return false;
      }

      // 2. Дата (Строгое сравнение строк)
      if (!item.transactionDate) return false;

      // Берем дату из базы (например "2026-01-15T14:30:00") и отрезаем время -> "2026-01-15"
      const dbDateStr = item.transactionDate.slice(0, 10);

      // Сравниваем строки лексикографически (работает для формата YYYY-MM-DD)
      if (dbDateStr < startStr || dbDateStr > endStr) return false;

      // 3. Остальные фильтры
      if (filters.country && item.country !== filters.country) return false;
      if (filters.product && item.product !== filters.product) return false;
      if (filters.type && item.type !== filters.type) return false;
      if (filters.source !== 'all' && item.source !== filters.source) return false;

      return true;
    });

    // Сортировка по дате
    data.sort((a, b) => {
      const dateA = new Date(a.transactionDate);
      const dateB = new Date(b.transactionDate);
      return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
    });

    return data;
  }, [payments, filters, startDate, endDate, sortOrder, isRestrictedUser, currentUser]);

  // Пагинация
  const totalPages = Math.ceil(processedData.length / itemsPerPage);
  const currentData = processedData.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const goToPage = (page) => {
    if (page >= 1 && page <= totalPages) setCurrentPage(page);
  };

  return (
    <div className="animate-in fade-in zoom-in duration-300 pb-10 w-full max-w-full overflow-x-hidden">

      {/* HEADER + FILTERS */}
      <div className="sticky top-0 z-20 bg-[#F5F5F5] dark:bg-[#0A0A0A] -mx-3 px-3 md:-mx-6 md:px-6 py-3 border-b border-transparent transition-colors duration-200 flex flex-col gap-3">

        {/* Заголовок */}
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-bold dark:text-white tracking-tight flex items-center gap-2 truncate min-w-0">
            <LayoutList size={20} className="text-blue-500 shrink-0" />
            <span className="truncate">Список оплат</span>
          </h2>
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-gray-200 dark:bg-[#1A1A1A] text-gray-500 dark:text-gray-400">
            {processedData.length}
          </span>
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

          {/* Правая часть: Фильтры + Календарь + Sort */}
          <div className="flex flex-wrap items-center gap-2">

            {/* Sort Toggle */}
            <button
              onClick={toggleSort}
              className="h-[34px] px-3 bg-white dark:bg-[#111] border border-gray-200 dark:border-[#333] rounded-[6px] text-xs font-medium dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-[#1A1A1A] transition-colors flex items-center gap-2"
            >
              <ArrowUpDown size={12} className={sortOrder === 'asc' ? 'rotate-180' : ''} />
              <span className="hidden sm:inline">{sortOrder === 'desc' ? 'Сначала новые' : 'Сначала старые'}</span>
            </button>

            {!isRestrictedUser && (<DenseSelect label="Менеджер" value={filters.manager} options={uniqueValues.managers} onChange={(val) => setFilters(p => ({ ...p, manager: val }))} />)}
            <DenseSelect label="Страна" value={filters.country} options={uniqueValues.countries} onChange={(val) => setFilters(p => ({ ...p, country: val }))} />
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
              <button onClick={resetDateRange} className="ml-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                <X size={12} />
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

      <div className="bg-white dark:bg-[#111] border border-gray-200 dark:border-[#333] rounded-lg shadow-sm overflow-hidden">
        <PaymentsTable payments={currentData} loading={isLoading} />
      </div>

      {totalPages > 1 && (
        <div className="flex justify-center mt-6 gap-2">
          <button
            onClick={() => goToPage(currentPage - 1)}
            disabled={currentPage === 1}
            className="p-2 rounded bg-white dark:bg-[#111] border border-gray-200 dark:border-[#333] disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-[#222]"
          >
            <ChevronLeft size={16} />
          </button>

          <span className="flex items-center px-4 font-bold text-sm bg-white dark:bg-[#111] border border-gray-200 dark:border-[#333] rounded">
            {currentPage} / {totalPages}
          </span>

          <button
            onClick={() => goToPage(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="p-2 rounded bg-white dark:bg-[#111] border border-gray-200 dark:border-[#333] disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-[#222]"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  );
};

export default PaymentsPage;