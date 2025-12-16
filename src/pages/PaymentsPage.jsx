import React, { useState, useMemo } from 'react';
import { 
  Filter, ChevronLeft, ChevronRight, Calendar, 
  XCircle, RotateCcw, ArrowUpDown 
} from 'lucide-react';
import PaymentsTable from '../components/PaymentsTable';
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

// Функция для получения даты "7 дней назад"
const getLastWeekRange = () => {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - 7);
  return [start, end];
};

const SelectFilter = ({ label, value, options, onChange }) => (
  <div className="relative">
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full appearance-none bg-white dark:bg-[#111] border border-gray-300 dark:border-[#333] text-gray-900 dark:text-gray-200 py-2 pl-3 pr-8 rounded-[6px] text-xs font-medium focus:outline-none focus:border-blue-500 hover:border-gray-400 dark:hover:border-[#555] transition-colors cursor-pointer"
    >
      <option value="">{label}: Все</option>
      {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
    </select>
    <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
      <Filter size={12} />
    </div>
  </div>
);

const PaymentsPage = ({ payments = [], currentUser }) => {
  // --- STATE ---
  const [dateRange, setDateRange] = useState(getLastWeekRange());
  const [startDate, endDate] = dateRange;

  const [filters, setFilters] = useState({
    manager: '',
    country: '',
    product: '',
    type: ''
  });

  const [sortOrder, setSortOrder] = useState('desc'); 
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 30;

  // ✅ 1. ПРОВЕРКА РОЛИ
  const isRestrictedUser = useMemo(() => {
    if (!currentUser) return false;
    return ['Sales', 'Retention', 'Consultant'].includes(currentUser.role);
  }, [currentUser]);

  // --- HELPERS ---
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

  // --- ГЛАВНАЯ ЛОГИКА ---
  const processedData = useMemo(() => {
    let data = payments.filter(item => {
      // ✅ 2. ФИЛЬТРАЦИЯ ПО РОЛИ
      if (isRestrictedUser) {
        if (item.manager !== currentUser.name) return false;
      } else {
        // Если админ - проверяем выбранный фильтр
        if (filters.manager && item.manager !== filters.manager) return false;
      }

      if (!item.transactionDate) return false;
      
      const itemDate = new Date(item.transactionDate.replace(' ', 'T'));
      const itemDay = new Date(itemDate);
      itemDay.setHours(0, 0, 0, 0);

      if (startDate) {
        const startDay = new Date(startDate);
        startDay.setHours(0, 0, 0, 0);
        if (itemDay < startDay) return false;
      }
      
      if (endDate) {
        const endDay = new Date(endDate);
        endDay.setHours(0, 0, 0, 0);
        if (itemDay > endDay) return false;
      }

      if (filters.country && item.country !== filters.country) return false;
      if (filters.product && item.product !== filters.product) return false;
      if (filters.type && item.type !== filters.type) return false;

      return true;
    });

    data.sort((a, b) => {
      const dateA = new Date(a.transactionDate.replace(' ', 'T'));
      const dateB = new Date(b.transactionDate.replace(' ', 'T'));
      return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
    });

    return data;
  }, [payments, startDate, endDate, filters, sortOrder, isRestrictedUser, currentUser]);

  // --- ПАГИНАЦИЯ ---
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
    <div className="animate-in fade-in zoom-in duration-300 pb-10">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
        <div>
          <h2 className="text-lg font-bold dark:text-white tracking-tight">Список оплат</h2>
          <p className="text-gray-500 dark:text-gray-400 text-xs mt-0.5">
            Показано {paginatedData.length} из {processedData.length} записей
          </p>
        </div>
        
        <div className="flex gap-2">
            <button 
              onClick={toggleSort} 
              className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-[#111] border border-gray-300 dark:border-[#333] rounded-[6px] text-xs font-medium hover:bg-gray-50 dark:hover:bg-[#1A1A1A] transition-colors text-gray-700 dark:text-gray-200"
            >
                <ArrowUpDown size={14} />
                {sortOrder === 'desc' ? 'Сначала новые' : 'Сначала старые'}
            </button>

            {(filters.manager || filters.country || filters.product || filters.type) && (
            <button 
              onClick={resetFilters} 
              className="flex items-center gap-2 text-xs text-red-500 hover:text-red-400 transition-colors font-medium px-3 py-1.5 bg-red-500/10 rounded-[6px]"
            >
                <XCircle size={14} /> Сбросить
            </button>
            )}
        </div>
      </div>

      {/* Панель фильтров */}
      <div className="bg-white dark:bg-[#111] p-4 rounded-lg border border-gray-200 dark:border-[#333] shadow-sm mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-3">
          
          <div className="lg:col-span-2 flex items-center bg-white dark:bg-[#111] border border-gray-300 dark:border-[#333] rounded-[6px] px-2 py-1">
             <div className="px-2 text-gray-400 pointer-events-none"><Calendar size={14} /></div>
             <div className="relative flex-1">
                <DatePicker
                    selectsRange={true} startDate={startDate} endDate={endDate} onChange={(update) => setDateRange(update)}
                    dateFormat="dd.MM.yyyy" placeholderText="Выберите период"
                    className="bg-transparent text-xs font-medium text-gray-900 dark:text-white outline-none w-full py-1 cursor-pointer text-center"
                    onKeyDown={(e) => e.preventDefault()}
                />
             </div>
             <button onClick={resetDateRange} className="p-1 hover:bg-gray-100 dark:hover:bg-[#222] rounded text-gray-400 transition-colors">
                <RotateCcw size={12} />
             </button>
          </div>

          {/* ✅ 3. СКРЫВАЕМ СЕЛЕКТ МЕНЕДЖЕРА, ЕСЛИ НЕ АДМИН */}
          {!isRestrictedUser && (
            <SelectFilter label="Менеджер" value={filters.manager} options={uniqueValues.managers} onChange={(val) => { setFilters(prev => ({ ...prev, manager: val })); setCurrentPage(1); }} />
          )}

          <SelectFilter label="ГЕО" value={filters.country} options={uniqueValues.countries} onChange={(val) => { setFilters(prev => ({ ...prev, country: val })); setCurrentPage(1); }} />
          <SelectFilter label="Продукт" value={filters.product} options={uniqueValues.products} onChange={(val) => { setFilters(prev => ({ ...prev, product: val })); setCurrentPage(1); }} />
          <SelectFilter label="Тип" value={filters.type} options={uniqueValues.types} onChange={(val) => { setFilters(prev => ({ ...prev, type: val })); setCurrentPage(1); }} />
        </div>
      </div>

      <PaymentsTable payments={paginatedData} loading={false} />

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