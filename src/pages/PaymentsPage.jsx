import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useAppStore } from '../store/appStore';
import {
  Filter, ChevronLeft, ChevronRight, Calendar as CalendarIcon,
  XCircle, RotateCcw,
  LayoutDashboard, MessageCircle, MessageSquare, Phone, X, Trash2, Pencil
} from 'lucide-react';
import PaymentsTable from '../components/PaymentsTable';
import { SearchModal, SearchButton } from '../components/ui/SearchInput';
import AstroLoadingStatus from '../components/ui/AstroLoadingStatus';
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { extractUTCDate, getKyivDateString } from '../utils/kyivTime';

// --- КОМПОНЕНТЫ ---
import { DenseSelect } from '../components/ui/FilterSelect';

const TRANSACTIONS_LOADING_STEPS = [
  'Загружаем справочники',
  'Загружаем оплаты',
  'Собираем транзакции',
  'Готовим таблицу',
];

const getLastWeekRange = () => {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - 7);
  return [start, end];
};

// Custom Desktop Date Range Picker
const CustomDateRangePicker = ({ startDate, endDate, onChange, onReset }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [viewDate, setViewDate] = useState(startDate || new Date());
  const [selecting, setSelecting] = useState('start');
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0 });
  const triggerRef = React.useRef(null);

  const DAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
  const MONTHS = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
    'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];

  const formatDate = (date) => {
    if (!date) return '';
    return `${String(date.getDate()).padStart(2, '0')}.${String(date.getMonth() + 1).padStart(2, '0')}.${date.getFullYear()}`;
  };

  const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year, month) => { const day = new Date(year, month, 1).getDay(); return day === 0 ? 6 : day - 1; };
  const isSameDay = (d1, d2) => d1 && d2 && d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth() && d1.getDate() === d2.getDate();
  const isInRange = (date) => startDate && endDate && date >= startDate && date <= endDate;
  const isToday = (date) => isSameDay(date, new Date());

  const openCalendar = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setDropdownPos({ top: rect.bottom + 8, left: rect.right - 220 });
    }
    setIsOpen(true);
    setSelecting('start');
  };

  const handleDayClick = (day) => {
    const clickedDate = new Date(viewDate.getFullYear(), viewDate.getMonth(), day);
    if (selecting === 'start') { onChange([clickedDate, null]); setSelecting('end'); }
    else { clickedDate < startDate ? onChange([clickedDate, startDate]) : onChange([startDate, clickedDate]); setSelecting('start'); setIsOpen(false); }
  };

  const setYesterday = () => { const y = new Date(); y.setDate(y.getDate() - 1); onChange([y, y]); setIsOpen(false); };
  const setToday = () => { onChange([new Date(), new Date()]); setIsOpen(false); };
  const setLastWeek = () => {
    const today = new Date(); const dayOfWeek = today.getDay();
    const thisMonday = new Date(today); thisMonday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
    const lastMonday = new Date(thisMonday); lastMonday.setDate(thisMonday.getDate() - 7);
    const lastSunday = new Date(lastMonday); lastSunday.setDate(lastMonday.getDate() + 6);
    onChange([lastMonday, lastSunday]); setIsOpen(false);
  };
  const setCurrentWeek = () => {
    const today = new Date(); const dayOfWeek = today.getDay();
    const monday = new Date(today); monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
    const sunday = new Date(monday); sunday.setDate(monday.getDate() + 6);
    onChange([monday, sunday]); setIsOpen(false);
  };
  const setLastMonth = () => { const t = new Date(); onChange([new Date(t.getFullYear(), t.getMonth() - 1, 1), new Date(t.getFullYear(), t.getMonth(), 0)]); setIsOpen(false); };
  const setCurrentMonth = () => { const t = new Date(); onChange([new Date(t.getFullYear(), t.getMonth(), 1), new Date(t.getFullYear(), t.getMonth() + 1, 0)]); setIsOpen(false); };

  const prevMonth = () => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
  const nextMonth = () => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);

  const displayText = () => {
    if (startDate && endDate) return `${formatDate(startDate)} - ${formatDate(endDate)}`;
    if (startDate) return `${formatDate(startDate)} - ...`;
    return 'Период';
  };

  return (
    <div className="relative flex-1 hidden md:block">
      <div ref={triggerRef} onClick={openCalendar} className="flex items-center bg-white dark:bg-[#111] border border-gray-200 dark:border-[#333] rounded-[6px] px-2 py-0.5 shadow-sm h-[34px] cursor-pointer hover:border-gray-400 dark:hover:border-[#555] transition-colors w-full">
        <CalendarIcon size={12} className="text-gray-400 mr-2 shrink-0" />
        <span className={`flex-1 text-xs font-medium text-center ${startDate ? 'text-gray-900 dark:text-white' : 'text-gray-400'}`}>{displayText()}</span>
        <button onClick={(e) => { e.stopPropagation(); onReset(); }} className="ml-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"><X size={12} /></button>
      </div>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-[100]" onClick={() => setIsOpen(false)} />
          <div className="fixed bg-white dark:bg-[#111] border border-gray-200 dark:border-[#333] rounded-xl shadow-xl z-[101] p-2.5 w-[220px]" style={{ top: dropdownPos.top, left: dropdownPos.left }}>
            <div className="space-y-1 mb-2">
              <div className="flex gap-1">
                <button onClick={setYesterday} className="flex-1 text-[10px] font-medium py-1 px-1 rounded-md bg-gray-100 dark:bg-[#222] text-gray-600 dark:text-gray-300 hover:bg-blue-100 dark:hover:bg-blue-900/30 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Вчера</button>
                <button onClick={setToday} className="flex-1 text-[10px] font-medium py-1 px-1 rounded-md bg-gray-100 dark:bg-[#222] text-gray-600 dark:text-gray-300 hover:bg-blue-100 dark:hover:bg-blue-900/30 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Сегодня</button>
              </div>
              <div className="flex gap-1">
                <button onClick={setLastWeek} className="flex-1 text-[10px] font-medium py-1 px-1 rounded-md bg-gray-100 dark:bg-[#222] text-gray-600 dark:text-gray-300 hover:bg-blue-100 dark:hover:bg-blue-900/30 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Пр. нед.</button>
                <button onClick={setCurrentWeek} className="flex-1 text-[10px] font-medium py-1 px-1 rounded-md bg-gray-100 dark:bg-[#222] text-gray-600 dark:text-gray-300 hover:bg-blue-100 dark:hover:bg-blue-900/30 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Тек. нед.</button>
              </div>
              <div className="flex gap-1">
                <button onClick={setLastMonth} className="flex-1 text-[10px] font-medium py-1 px-1 rounded-md bg-gray-100 dark:bg-[#222] text-gray-600 dark:text-gray-300 hover:bg-blue-100 dark:hover:bg-blue-900/30 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Пр. мес.</button>
                <button onClick={setCurrentMonth} className="flex-1 text-[10px] font-medium py-1 px-1 rounded-md bg-gray-100 dark:bg-[#222] text-gray-600 dark:text-gray-300 hover:bg-blue-100 dark:hover:bg-blue-900/30 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Тек. мес.</button>
              </div>
            </div>
            <div className="flex items-center justify-between mb-2">
              <button onClick={prevMonth} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-[#222] text-gray-500 dark:text-gray-400 transition-colors"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg></button>
              <span className="text-xs font-bold text-gray-900 dark:text-white">{MONTHS[month]} {year}</span>
              <button onClick={nextMonth} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-[#222] text-gray-500 dark:text-gray-400 transition-colors"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg></button>
            </div>
            <div className="grid grid-cols-7 gap-0.5 mb-0.5">{DAYS.map(d => <div key={d} className="text-[9px] font-bold text-gray-400 dark:text-gray-500 text-center py-0.5">{d}</div>)}</div>
            <div className="grid grid-cols-7 gap-0.5">
              {Array.from({ length: firstDay }).map((_, i) => <div key={`empty-${i}`} className="w-7 h-7" />)}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const date = new Date(year, month, day);
                const isStart = isSameDay(date, startDate);
                const isEnd = isSameDay(date, endDate);
                const inRange = isInRange(date);
                const today = isToday(date);
                let cls = 'w-7 h-7 flex items-center justify-center text-[11px] font-medium rounded cursor-pointer transition-all ';
                if (isStart || isEnd) cls += 'bg-blue-500 text-white font-bold ';
                else if (inRange) cls += 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 ';
                else if (today) cls += 'ring-1 ring-blue-400 text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-[#222] ';
                else cls += 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#222] ';
                return <button key={day} onClick={() => handleDayClick(day)} className={cls}>{day}</button>;
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

// ХЕЛПЕР: Превращает объект Date из календаря в строку "YYYY-MM-DD" в Kyiv timezone
const toYMD = (date) => {
  if (!date) return '';
  return getKyivDateString(date);
};

const PaymentsPage = () => {
  const { payments, user: currentUser, isLoading, paymentsLoaded, fetchAllData, managers, countries, updatePayment, bulkUpdatePayments, bulkDeletePayments, permissions } = useAppStore();

  const [dateRange, setDateRange] = useState(getLastWeekRange());
  const [startDate, endDate] = dateRange;

  const [filters, setFilters] = useState({ manager: [], country: [], product: [], type: [], source: 'all', department: 'all' });
  const [sortField, setSortField] = useState('date');
  const [sortOrder, setSortOrder] = useState('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const itemsPerPage = 30;

  // Bulk selection state
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [showBulkEditModal, setShowBulkEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [bulkEditField, setBulkEditField] = useState('manager_id');
  const [bulkEditValue, setBulkEditValue] = useState('');
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const hasStartedRefreshRef = useRef(false);
  const hasSeenPendingPaymentsRef = useRef(false);
  const pageLoadTimeoutRef = useRef(null);

  // Check if user has edit permission (C-Level always has access OR role has transactions_edit permission)
  const isCLevel = currentUser?.role === 'C-level';
  const canEditTransactions = isCLevel || (permissions?.[currentUser?.role]?.transactions_edit === true);

  useEffect(() => {
    if (!fetchAllData) return;
    hasStartedRefreshRef.current = true;
    hasSeenPendingPaymentsRef.current = false;
    setPageLoading(true);
    clearTimeout(pageLoadTimeoutRef.current);
    pageLoadTimeoutRef.current = setTimeout(() => {
      setPageLoading(false);
    }, 15000);
    fetchAllData(true);

    return () => {
      clearTimeout(pageLoadTimeoutRef.current);
    };
  }, [fetchAllData]);

  useEffect(() => {
    if (!hasStartedRefreshRef.current) return;
    if (!paymentsLoaded) {
      hasSeenPendingPaymentsRef.current = true;
      return;
    }
    if (hasSeenPendingPaymentsRef.current) {
      clearTimeout(pageLoadTimeoutRef.current);
      setPageLoading(false);
    }
  }, [paymentsLoaded]);

  const hasActiveFilters = useMemo(() => {
    return !!(filters.manager.length > 0 || filters.country.length > 0 || filters.product.length > 0 || filters.type.length > 0 || filters.source !== 'all');
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

  const resetFilters = () => {
    setFilters({ manager: [], country: [], product: [], type: [], source: 'all', department: 'all' });
    setDateRange(getLastWeekRange());
    setSearchQuery('');
    setIsSearchOpen(false);
    setSortField('date');
    setSortOrder('desc');
  };

  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  // --- BULK SELECTION HANDLERS ---
  const handleSelectionChange = (id) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const handleSelectAll = (visiblePayments) => {
    const allSelected = visiblePayments.every(p => selectedIds.has(p.id));
    if (allSelected) {
      // Deselect all visible
      setSelectedIds(prev => {
        const newSet = new Set(prev);
        visiblePayments.forEach(p => newSet.delete(p.id));
        return newSet;
      });
    } else {
      // Select all visible
      setSelectedIds(prev => {
        const newSet = new Set(prev);
        visiblePayments.forEach(p => newSet.add(p.id));
        return newSet;
      });
    }
  };

  const clearSelection = () => setSelectedIds(new Set());

  // Bulk edit handler
  const handleBulkEdit = async () => {
    if (!bulkEditValue || selectedIds.size === 0) return;
    setIsBulkProcessing(true);
    const updates = { [bulkEditField]: bulkEditValue };
    const success = await bulkUpdatePayments(Array.from(selectedIds), updates);
    setIsBulkProcessing(false);
    if (success) {
      setShowBulkEditModal(false);
      clearSelection();
      setBulkEditValue('');
    }
  };

  // Bulk delete handler
  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    setIsBulkProcessing(true);
    const success = await bulkDeletePayments(Array.from(selectedIds));
    setIsBulkProcessing(false);
    if (success) {
      setShowDeleteConfirm(false);
      clearSelection();
    }
  };

  // --- 📊 PAYMENT RANKING LOGIC ---
  const paymentRanks = useMemo(() => {
    const ranks = new Map(); // Map<PaymentID, RankNumber>
    const grouped = {};

    payments.forEach(p => {
      const link = p.crm_link ? p.crm_link.trim().toLowerCase() : null;
      if (!link || link === '—') return;
      if (!grouped[link]) grouped[link] = [];
      grouped[link].push(p);
    });

    Object.values(grouped).forEach(userPayments => {
      // Sort by date ascending to determine order
      userPayments.sort((a, b) => new Date(a.transactionDate) - new Date(b.transactionDate));
      userPayments.forEach((p, index) => {
        ranks.set(p.id, index + 1);
      });
    });
    return ranks;
  }, [payments]);

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
        if (filters.manager.length > 0 && !filters.manager.includes(item.manager)) return false;
      }

      // 2. Дата (Строгое сравнение строк в Kyiv timezone)
      if (!item.transactionDate) return false;

      // Извлекаем дату оплаты в Kyiv timezone
      const dbDateStr = extractUTCDate(item.transactionDate);

      // Сравниваем строки лексикографически (работает для формата YYYY-MM-DD)
      if (dbDateStr < startStr || dbDateStr > endStr) return false;

      // 3. Остальные фильтры
      if (filters.country.length > 0 && !filters.country.includes(item.country)) return false;
      if (filters.product.length > 0 && !filters.product.includes(item.product)) return false;
      if (filters.type.length > 0 && !filters.type.includes(item.type)) return false;
      if (filters.source !== 'all' && item.source !== filters.source) return false;

      // Search by contact (crm_link)
      if (searchQuery) {
        const link = item.crm_link ? item.crm_link.toLowerCase() : '';
        if (!link.includes(searchQuery.toLowerCase())) return false;
      }

      // Filter by Department
      if (filters.department !== 'all') {
        if (filters.department === 'sales') {
          if (item.managerRole !== 'Sales' && item.managerRole !== 'SeniorSales') return false;
        } else if (filters.department === 'consultant') {
          if (item.managerRole !== 'Consultant') return false;
        }
      }

      // Status filter
      if (statusFilter !== 'all') {
        if (statusFilter === 'unknown' && item.source !== 'unknown') return false;
        if (statusFilter === 'completed' && item.source === 'unknown') return false;
      }

      return true;
    });

    // Сортировка по выбранному полю
    data.sort((a, b) => {
      let valA, valB;

      if (sortField === 'date') {
        valA = new Date(a.transactionDate);
        valB = new Date(b.transactionDate);
      } else if (sortField === 'amountEUR') {
        valA = a.amountEUR || 0;
        valB = b.amountEUR || 0;
      } else if (sortField === 'amountLocal') {
        valA = a.amountLocal || 0;
        valB = b.amountLocal || 0;
      }

      if (valA < valB) return sortOrder === 'desc' ? 1 : -1;
      if (valA > valB) return sortOrder === 'desc' ? -1 : 1;
      return 0;
    });

    return data;
  }, [payments, filters, startDate, endDate, sortField, sortOrder, isRestrictedUser, currentUser, statusFilter, searchQuery]);

  // Пагинация
  const totalPages = Math.ceil(processedData.length / itemsPerPage);
  const currentData = processedData.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );
  const transactionsReady = paymentsLoaded && !isLoading && !pageLoading;
  const loadingStep = !managers?.length || !countries?.length ? 0 : !paymentsLoaded ? 1 : processedData.length > 0 ? 2 : 3;

  useEffect(() => {
    return () => {
      window.dispatchEvent(new CustomEvent('transactions-header-meta', { detail: null }));
    };
  }, []);

  useEffect(() => {
    window.dispatchEvent(new CustomEvent('transactions-header-meta', {
      detail: {
        count: transactionsReady ? processedData.length : null,
        canEdit: canEditTransactions,
        disabled: !transactionsReady,
        isEditMode,
        onToggleEdit: () => setIsEditMode(prev => !prev)
      }
    }));
  }, [processedData.length, canEditTransactions, transactionsReady, isEditMode]);

  const goToPage = (page) => {
    if (page >= 1 && page <= totalPages) setCurrentPage(page);
  };

  if (pageLoading) {
    return (
      <AstroLoadingStatus
        variant="page"
        title="Загружаем транзакции"
        message="Собираем оплаты, менеджеров и справочники"
        steps={TRANSACTIONS_LOADING_STEPS}
        activeStep={loadingStep}
        className="h-[calc(100vh-80px)] bg-[#F5F5F5] dark:bg-[#0A0A0A]"
      />
    );
  }

  return (
    <div className="animate-in fade-in zoom-in duration-300 pb-4 w-full max-w-full overflow-x-hidden">

      {/* FILTERS */}
      <div className="sticky top-0 z-20 bg-[#F5F5F5] dark:bg-[#0A0A0A] -mx-3 px-2 md:px-6 py-2 lg:py-0 border-b border-transparent transition-colors duration-200">
        <div className="mx-auto max-w-[90%] md:max-w-none w-full">
          {/* Все фильтры в один ряд */}
          <div className="flex flex-wrap items-center gap-2 justify-between">

          {/* Левая часть: Кнопки источников и Департаментов */}
          <div className="flex flex-col md:flex-row gap-2">
            {/* Кнопки источников */}
            <div className="flex bg-gray-200 dark:bg-[#1A1A1A] p-0.5 rounded-[6px] h-[34px] items-center">
              <button onClick={() => setFilters(prev => ({ ...prev, source: 'all' }))} className={`px-2.5 h-full rounded-[4px] text-[10px] font-bold transition-all whitespace-nowrap ${filters.source === 'all' ? 'bg-white dark:bg-[#333] text-black dark:text-white shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}>Все</button>
              <button onClick={() => setFilters(prev => ({ ...prev, source: 'direct' }))} className={`px-2 h-full rounded-[4px] text-[10px] font-bold transition-all flex items-center gap-1 whitespace-nowrap ${filters.source === 'direct' ? 'bg-white dark:bg-[#333] text-blue-600 dark:text-blue-400 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}><MessageCircle size={10} />Direct</button>
              <button onClick={() => setFilters(prev => ({ ...prev, source: 'comments' }))} className={`px-2 h-full rounded-[4px] text-[10px] font-bold transition-all flex items-center gap-1 whitespace-nowrap ${filters.source === 'comments' ? 'bg-white dark:bg-[#333] text-orange-600 dark:text-orange-400 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}><MessageSquare size={10} />Comm</button>
              <button onClick={() => setFilters(prev => ({ ...prev, source: 'whatsapp' }))} className={`px-2 h-full rounded-[4px] text-[10px] font-bold transition-all flex items-center gap-1 whitespace-nowrap ${filters.source === 'whatsapp' ? 'bg-white dark:bg-[#333] text-green-600 dark:text-green-400 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}><Phone size={10} />WP</button>
            </div>

            {/* Кнопки Департаментов */}
            <div className="flex bg-gray-200 dark:bg-[#1A1A1A] p-0.5 rounded-[6px] h-[34px] items-center">
              <button onClick={() => setFilters(prev => ({ ...prev, department: 'all' }))} className={`px-2.5 h-full rounded-[4px] text-[10px] font-bold transition-all whitespace-nowrap ${filters.department === 'all' ? 'bg-white dark:bg-[#333] text-black dark:text-white shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}>Все</button>
              <button onClick={() => setFilters(prev => ({ ...prev, department: 'sales' }))} className={`px-2.5 h-full rounded-[4px] text-[10px] font-bold transition-all whitespace-nowrap ${filters.department === 'sales' ? 'bg-white dark:bg-[#333] text-black dark:text-white shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}>ОП</button>
              <button onClick={() => setFilters(prev => ({ ...prev, department: 'consultant' }))} className={`px-2.5 h-full rounded-[4px] text-[10px] font-bold transition-all whitespace-nowrap ${filters.department === 'consultant' ? 'bg-white dark:bg-[#333] text-black dark:text-white shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}>Конс.</button>
            </div>
          </div>

          {/* Правая часть: Фильтры + Календарь */}
          <div className="flex flex-wrap items-center gap-2">

            {!isRestrictedUser && (<DenseSelect label="Менеджер" value={filters.manager} options={uniqueValues.managers} onChange={(val) => setFilters(p => ({ ...p, manager: val }))} />)}
            <DenseSelect label="Страна" value={filters.country} options={uniqueValues.countries} onChange={(val) => setFilters(p => ({ ...p, country: val }))} />
            <DenseSelect
              label="Продукт"
              value={filters.product}
              options={uniqueValues.products}
              onChange={(val) => setFilters(p => ({ ...p, product: val }))}
              gridCols={2}
              customButtons={[
                {
                  label: 'Без Таро 2-3+',
                  onClick: () => {
                    const allowed = uniqueValues.products.filter(p => !(/Taro\s*[2-9]/.test(p) || /Таро\s*[2-9]/.test(p)));
                    setFilters(prev => ({ ...prev, product: allowed }));
                  }
                },
                {
                  label: 'Натальные',
                  onClick: () => {
                    const natalList = ['Ли1', 'Лич5', 'Общий1', 'Общий5', 'Финансы1', 'Финансы5', 'Дети'];
                    const allowed = uniqueValues.products.filter(p => natalList.includes(p));
                    setFilters(prev => ({ ...prev, product: allowed }));
                  }
                }
              ]}
            />
            <DenseSelect label="Тип" value={filters.type} options={uniqueValues.types} onChange={(val) => setFilters(p => ({ ...p, type: val }))} />

            <CustomDateRangePicker
              startDate={startDate}
              endDate={endDate}
              onChange={(update) => setDateRange(update)}
              onReset={() => setDateRange(getLastWeekRange())}
            />

            {/* Search Button */}
            <SearchButton
              onClick={() => setIsSearchOpen(true)}
              isActive={!!searchQuery}
            />

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
      </div>

      {/* Bulk Actions Toolbar */}
      {isEditMode && selectedIds.size > 0 && (
        <div className="sticky top-[84px] z-10 mt-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg px-4 py-2 mb-3 flex items-center gap-3 shadow-sm animate-in fade-in slide-in-from-top-2 duration-200">
          <span className="text-sm font-bold text-blue-700 dark:text-blue-300">
            Выбрано: {selectedIds.size}
          </span>
          <div className="flex-1" />
          <button
            onClick={() => setShowBulkEditModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 text-white rounded-[6px] text-xs font-bold hover:bg-amber-600 transition-colors"
          >
            <Pencil size={12} />
            Изменить
          </button>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500 text-white rounded-[6px] text-xs font-bold hover:bg-red-600 transition-colors"
          >
            <Trash2 size={12} />
            Удалить
          </button>
          <button
            onClick={clearSelection}
            className="px-3 py-1.5 bg-gray-200 dark:bg-[#333] text-gray-600 dark:text-gray-300 rounded-[6px] text-xs font-bold hover:bg-gray-300 dark:hover:bg-[#444] transition-colors"
          >
            Снять выделение
          </button>
        </div>
      )}

      <div className={`${isEditMode && selectedIds.size > 0 ? '' : 'mt-4'} bg-white dark:bg-[#111] border border-gray-200 dark:border-[#333] rounded-lg shadow-sm overflow-hidden`}>
        <PaymentsTable
          payments={currentData}
          loading={!paymentsLoaded || isLoading}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          paymentRanks={paymentRanks}
          sortField={sortField}
          sortOrder={sortOrder}
          onSort={handleSort}
          isEditMode={isEditMode}
          managers={managers}
          countries={countries}
          onPaymentUpdate={updatePayment}
          selectedIds={selectedIds}
          onSelectionChange={handleSelectionChange}
          onSelectAll={handleSelectAll}
        />
      </div>

      {/* Search Modal */}
      <SearchModal
        isOpen={isSearchOpen}
        value={searchQuery}
        onChange={setSearchQuery}
        onClose={() => setIsSearchOpen(false)}
        placeholder="Поиск по контакту..."
      />

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

      {/* Bulk Edit Modal */}
      {showBulkEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setShowBulkEditModal(false)}>
          <div className="bg-white dark:bg-[#111] border border-gray-200 dark:border-[#333] rounded-xl shadow-2xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
              Массовое редактирование ({selectedIds.size} платежей)
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Поле для изменения
                </label>
                <select
                  value={bulkEditField}
                  onChange={(e) => { setBulkEditField(e.target.value); setBulkEditValue(''); }}
                  className="w-full px-3 py-2 bg-white dark:bg-[#1A1A1A] border border-gray-200 dark:border-[#333] rounded-lg text-sm"
                >
                  <option value="manager_id">Менеджер</option>
                  <option value="country">Страна</option>
                  <option value="product">Продукт</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Новое значение
                </label>
                {bulkEditField === 'manager_id' ? (
                  <select
                    value={bulkEditValue}
                    onChange={(e) => setBulkEditValue(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-[#1A1A1A] border border-gray-200 dark:border-[#333] rounded-lg text-sm"
                  >
                    <option value="">-- Выберите менеджера --</option>
                    {managers.map(m => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={bulkEditValue}
                    onChange={(e) => setBulkEditValue(bulkEditField === 'country' ? e.target.value.toUpperCase() : e.target.value)}
                    placeholder={bulkEditField === 'country' ? 'UA, PL, DE...' : 'Введите продукт...'}
                    maxLength={bulkEditField === 'country' ? 2 : undefined}
                    className="w-full px-3 py-2 bg-white dark:bg-[#1A1A1A] border border-gray-200 dark:border-[#333] rounded-lg text-sm"
                  />
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setShowBulkEditModal(false)}
                className="px-4 py-2 bg-gray-200 dark:bg-[#333] text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-300 dark:hover:bg-[#444] transition-colors"
              >
                Отмена
              </button>
              <button
                onClick={handleBulkEdit}
                disabled={!bulkEditValue || isBulkProcessing}
                className="px-4 py-2 bg-amber-500 text-white rounded-lg text-sm font-bold hover:bg-amber-600 disabled:opacity-50 transition-colors"
              >
                {isBulkProcessing ? 'Сохранение...' : 'Применить'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setShowDeleteConfirm(false)}>
          <div className="bg-white dark:bg-[#111] border border-gray-200 dark:border-[#333] rounded-xl shadow-2xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-red-600 dark:text-red-400 mb-2">
              ⚠️ Подтверждение удаления
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Вы уверены, что хотите удалить <strong>{selectedIds.size}</strong> платежей? Это действие нельзя отменить.
            </p>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 bg-gray-200 dark:bg-[#333] text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-300 dark:hover:bg-[#444] transition-colors"
              >
                Отмена
              </button>
              <button
                onClick={handleBulkDelete}
                disabled={isBulkProcessing}
                className="px-4 py-2 bg-red-500 text-white rounded-lg text-sm font-bold hover:bg-red-600 disabled:opacity-50 transition-colors"
              >
                {isBulkProcessing ? 'Удаление...' : 'Удалить'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentsPage;
