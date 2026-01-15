import React, { useState, useMemo } from 'react';
import { useAppStore } from '../store/appStore';
import { 
  Filter, ChevronLeft, ChevronRight, Calendar as CalendarIcon, 
  XCircle, RotateCcw, ArrowUpDown, LayoutList 
} from 'lucide-react';
import PaymentsTable from '../components/PaymentsTable';
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

// --- КОМПОНЕНТЫ ---
const DenseSelect = ({ label, value, options, onChange }) => (
  <div className="relative group w-full sm:w-auto flex-1 sm:flex-none min-w-[120px]">
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

// ХЕЛПЕР: Превращает объект Date из календаря в строку "YYYY-MM-DD"
const toYMD = (date) => {
  if (!date) return '';
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const PaymentsPage = () => {
  const { payments, user: currentUser, isLoading } = useAppStore();

  const [dateRange, setDateRange] = useState(getLastWeekRange());
  const [startDate, endDate] = dateRange;

  const [filters, setFilters] = useState({ manager: '', country: '', product: '', type: '' });
  const [sortOrder, setSortOrder] = useState('desc'); 
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 30;

  const hasActiveFilters = useMemo(() => {
    return !!(filters.manager || filters.country || filters.product || filters.type);
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

      return true;
    });

    // Сортировка (тоже строковая, так надежнее)
    data.sort((a, b) => {
      const valA = a.transactionDate || '';
      const valB = b.transactionDate || '';
      return sortOrder === 'desc' ? valB.localeCompare(valA) : valA.localeCompare(valB);
    });

    return data;
  }, [payments, startDate, endDate, filters, sortOrder, isRestrictedUser, currentUser]);

  const totalPages = Math.ceil(processedData.length / itemsPerPage);
  const paginatedData = processedData.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const resetFilters = () => {
    setFilters({ manager: '', country: '', product: '', type: '' });
    setCurrentPage(1);
  };

  return (
    <div className="animate-in fade-in zoom-in duration-300 pb-10 w-full max-w-full overflow-x-hidden">
      
      {/* HEADER & FILTERS */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between mb-4 gap-3">
        
        {/* Заголовок */}
        <div>
          <h2 className="text-lg font-bold dark:text-white tracking-tight flex items-center gap-2">
             <LayoutList size={18} className="text-blue-500" /> Список оплат
          </h2>
          <p className="text-gray-500 dark:text-gray-400 text-[10px] mt-0.5">
            Показано {paginatedData.length} из {processedData.length} записей
          </p>
        </div>
        
        {/* Правая часть: Фильтры */}
        <div className="flex flex-wrap items-center gap-2 w-full xl:w-auto xl:justify-end">
            
            <button 
              onClick={toggleSort} 
              className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-[#111] border border-gray-200 dark:border-[#333] rounded-[6px] text-[10px] font-bold hover:bg-gray-50 dark:hover:bg-[#1A1A1A] transition-colors text-gray-700 dark:text-gray-200 h-[34px]"
            >
                <ArrowUpDown size={12} />
                {sortOrder === 'desc' ? 'Сначала новые' : 'Сначала старые'}
            </button>

            <div className="flex items-center bg-white dark:bg-[#111] border border-gray-200 dark:border-[#333] rounded-[6px] px-2 py-0.5 shadow-sm w-full sm:w-auto min-w-[200px] justify-between h-[34px]">
               <div className="flex items-center flex-1 min-w-0 w-full">
                 <CalendarIcon size={12} className="text-gray-400 mr-2 shrink-0" />
                 <DatePicker
                    selectsRange={true} startDate={startDate} endDate={endDate} onChange={(update) => setDateRange(update)}
                    dateFormat="dd.MM.yyyy" placeholderText="Период"
                    className="bg-transparent text-xs font-medium dark:text-white outline-none w-full cursor-pointer text-center min-w-0"
                    popperPlacement="bottom-end"
                 />
               </div>
            </div>
            <button onClick={resetDateRange} className="hidden sm:block text-gray-400 hover:text-black dark:hover:text-white p-1"><RotateCcw size={14}/></button>

            <div className="flex flex-wrap sm:flex-nowrap gap-2 w-full sm:w-auto">
              {!isRestrictedUser && (
                <DenseSelect label="Менеджер" value={filters.manager} options={uniqueValues.managers} onChange={(val) => { setFilters(prev => ({ ...prev, manager: val })); setCurrentPage(1); }} />
              )}
              <DenseSelect label="ГЕО" value={filters.country} options={uniqueValues.countries} onChange={(val) => { setFilters(prev => ({ ...prev, country: val })); setCurrentPage(1); }} />
              <DenseSelect label="Продукт" value={filters.product} options={uniqueValues.products} onChange={(val) => { setFilters(prev => ({ ...prev, product: val })); setCurrentPage(1); }} />
              <DenseSelect label="Тип" value={filters.type} options={uniqueValues.types} onChange={(val) => { setFilters(prev => ({ ...prev, type: val })); setCurrentPage(1); }} />
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

      {/* Таблица */}
      <PaymentsTable payments={paginatedData} loading={isLoading} />

      {/* Пагинация */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-4 mt-6 pb-6">
          <button 
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))} 
            disabled={currentPage === 1} 
            className="p-2 rounded-[6px] border border-gray-200 dark:border-[#333] hover:bg-gray-100 dark:hover:bg-[#1A1A1A] disabled:opacity-30 disabled:cursor-not-allowed text-gray-600 dark:text-gray-300 transition-colors"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
            Страница <span className="text-gray-900 dark:text-white font-bold">{currentPage}</span> из {totalPages}
          </span>
          <button 
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} 
            disabled={currentPage === totalPages} 
            className="p-2 rounded-[6px] border border-gray-200 dark:border-[#333] hover:bg-gray-100 dark:hover:bg-[#1A1A1A] disabled:opacity-30 disabled:cursor-not-allowed text-gray-600 dark:text-gray-300 transition-colors"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  );
};

export default PaymentsPage;