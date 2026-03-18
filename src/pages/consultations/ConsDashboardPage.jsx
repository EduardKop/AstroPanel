import React, { useState, useMemo, useEffect } from 'react';
import { useAppStore } from '../../store/appStore';
import {
  Filter, RotateCcw, XCircle, X,
  Users, DollarSign, Percent, CreditCard, LayoutDashboard,
  Activity, Trophy, Globe, Layers, MessageCircle, MessageSquare, Phone, Calendar as CalendarIcon
} from 'lucide-react';
import { AreaChart, Area, XAxis, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';

import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { extractUTCDate, getKyivDateString } from '../../utils/kyivTime';

// --- КОНФИГУРАЦИЯ ---
const TIMEZONE = 'Europe/Kyiv';

const FLAGS = {
  UA: '🇺🇦', PL: '🇵🇱', IT: '🇮🇹', HR: '🇭🇷',
  BG: '🇧🇬', CZ: '🇨🇿', RO: '🇷🇴', LT: '🇱🇹',
  TR: '🇹🇷', FR: '🇫🇷', PT: '🇵🇹', DE: '🇩🇪',
  US: '🇺🇸', ES: '🇪🇸', SK: '🇸🇰', HU: '🇭🇺',
  KZ: '🇰🇿', UZ: '🇺🇿', MD: '🇲🇩'
};
const getFlag = (code) => FLAGS[code] || '🏳️';

const getCRColor = (val) => {
  const num = parseFloat(val);
  if (num >= 10) return 'text-emerald-600 dark:text-emerald-400';
  if (num >= 5) return 'text-amber-600 dark:text-amber-400';
  return 'text-rose-600 dark:text-rose-400';
};

const getPaymentBadgeStyle = (type) => {
  const t = (type || '').toLowerCase();
  if (t.includes('lava')) return 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20';
  if (t.includes('jet') || t.includes('fex')) return 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20';
  if (t.includes('iban')) return 'bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20';
  if (t.includes('req') || t.includes('рек') || t.includes('прям')) return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20';
  return 'bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/20';
};

const getRankEmoji = (index) => {
  if (index === 0) return '🥇';
  if (index === 1) return '🥈';
  if (index === 2) return '🥉';
  return <span className="text-gray-400 text-[10px] font-mono">#{index + 1}</span>;
}

const getLastWeekRange = () => {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - 7);
  return [start, end];
};

// ХЕЛПЕР ДЛЯ ВРЕМЕНИ (Kyiv timezone)
const toYMD = (date) => {
  if (!date) return '';
  return getKyivDateString(date);
};

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
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown */}
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

// Custom Desktop Date Range Picker
const CustomDateRangePicker = ({ startDate, endDate, onChange, onReset }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [viewDate, setViewDate] = useState(startDate || new Date());
  const [selecting, setSelecting] = useState('start');

  const DAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
  const MONTHS = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
    'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];

  const formatDate = (date) => {
    if (!date) return '';
    const d = String(date.getDate()).padStart(2, '0');
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const y = date.getFullYear();
    return `${d}.${m}.${y}`;
  };

  const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year, month) => {
    const day = new Date(year, month, 1).getDay();
    return day === 0 ? 6 : day - 1;
  };

  const isSameDay = (d1, d2) => {
    if (!d1 || !d2) return false;
    return d1.getFullYear() === d2.getFullYear() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getDate() === d2.getDate();
  };

  const isInRange = (date) => {
    if (!startDate || !endDate) return false;
    return date >= startDate && date <= endDate;
  };

  const isToday = (date) => isSameDay(date, new Date());

  const handleDayClick = (day) => {
    const clickedDate = new Date(viewDate.getFullYear(), viewDate.getMonth(), day);
    if (selecting === 'start') {
      onChange([clickedDate, null]);
      setSelecting('end');
    } else {
      if (clickedDate < startDate) {
        onChange([clickedDate, startDate]);
      } else {
        onChange([startDate, clickedDate]);
      }
      setSelecting('start');
      setIsOpen(false);
    }
  };
  // Quick presets
  const setYesterday = () => { const y = new Date(); y.setDate(y.getDate() - 1); onChange([y, y]); setIsOpen(false); };
  const setToday = () => { onChange([new Date(), new Date()]); setIsOpen(false); };
  const setLastWeek = () => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const thisMonday = new Date(today);
    thisMonday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
    const lastMonday = new Date(thisMonday);
    lastMonday.setDate(thisMonday.getDate() - 7);
    const lastSunday = new Date(lastMonday);
    lastSunday.setDate(lastMonday.getDate() + 6);
    onChange([lastMonday, lastSunday]);
    setIsOpen(false);
  };
  const setCurrentWeek = () => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const monday = new Date(today);
    monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    onChange([monday, sunday]);
    setIsOpen(false);
  };
  const setLastMonth = () => {
    const today = new Date();
    onChange([new Date(today.getFullYear(), today.getMonth() - 1, 1), new Date(today.getFullYear(), today.getMonth(), 0)]);
    setIsOpen(false);
  };
  const setCurrentMonth = () => {
    const today = new Date();
    onChange([new Date(today.getFullYear(), today.getMonth(), 1), new Date(today.getFullYear(), today.getMonth() + 1, 0)]);
    setIsOpen(false);
  };

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
    <div className="relative flex-1">
      {/* Trigger Button */}
      <div
        onClick={() => { setIsOpen(!isOpen); setSelecting('start'); }}
        className="flex items-center bg-white dark:bg-[#111] border border-gray-200 dark:border-[#333] rounded-[6px] px-2 py-0.5 shadow-sm h-[34px] cursor-pointer hover:border-gray-400 dark:hover:border-[#555] transition-colors w-full"
      >
        <CalendarIcon size={12} className="text-gray-400 mr-2 shrink-0" />
        <span className={`flex-1 text-xs font-medium text-center ${startDate ? 'text-gray-900 dark:text-white' : 'text-gray-400'}`}>
          {displayText()}
        </span>
        <button
          onClick={(e) => { e.stopPropagation(); onReset(); }}
          className="ml-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
        >
          <X size={12} />
        </button>
      </div>

      {/* Dropdown Calendar */}
      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute top-full right-0 mt-2 bg-white dark:bg-[#111] border border-gray-200 dark:border-[#333] rounded-xl shadow-xl z-50 p-2.5 w-[220px] animate-in fade-in slide-in-from-top-2 duration-150">

            {/* Quick Presets */}
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

            {/* Month Navigation */}
            <div className="flex items-center justify-between mb-2">
              <button onClick={prevMonth} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-[#222] text-gray-500 dark:text-gray-400 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
              </button>
              <span className="text-xs font-bold text-gray-900 dark:text-white">
                {MONTHS[month]} {year}
              </span>
              <button onClick={nextMonth} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-[#222] text-gray-500 dark:text-gray-400 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg>
              </button>
            </div>

            {/* Weekday Headers */}
            <div className="grid grid-cols-7 gap-0.5 mb-0.5">
              {DAYS.map(d => (
                <div key={d} className="text-[9px] font-bold text-gray-400 dark:text-gray-500 text-center py-0.5">
                  {d}
                </div>
              ))}
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-0.5">
              {Array.from({ length: firstDay }).map((_, i) => (
                <div key={`empty-${i}`} className="w-7 h-7" />
              ))}

              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const date = new Date(year, month, day);
                const isStart = isSameDay(date, startDate);
                const isEnd = isSameDay(date, endDate);
                const inRange = isInRange(date);
                const today = isToday(date);

                let dayClass = 'w-7 h-7 flex items-center justify-center text-[11px] font-medium rounded cursor-pointer transition-all ';

                if (isStart || isEnd) {
                  dayClass += 'bg-blue-500 text-white font-bold ';
                } else if (inRange) {
                  dayClass += 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 ';
                } else if (today) {
                  dayClass += 'ring-1 ring-blue-400 text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-[#222] ';
                } else {
                  dayClass += 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#222] ';
                }

                return (
                  <button key={day} onClick={() => handleDayClick(day)} className={dayClass}>
                    {day}
                  </button>
                );
              })}
            </div>

          </div>
        </>
      )}
    </div>
  );
};

const ConsDashboardPage = () => {
  const { payments, user: currentUser, isLoading, trafficStats, fetchTrafficStats, fetchAllData } = useAppStore();

  const [dateRange, setDateRange] = useState(getLastWeekRange());
  const [startDate, endDate] = dateRange;

  const [filters, setFilters] = useState({ manager: '', country: '', product: '', type: '', source: 'all', showMobileFilters: false });
  const [expandedId, setExpandedId] = useState(null);

  const hasActiveFilters = useMemo(() => {
    return !!(filters.manager || filters.country || filters.product || filters.type || filters.source !== 'all');
  }, [filters]);

  // 🔄 ПРИНУДИТЕЛЬНОЕ ОБНОВЛЕНИЕ ДАННЫХ ПРИ МОНТИРОВАНИИ
  useEffect(() => {
    if (fetchAllData) {
      fetchAllData(true); // force update
    }
  }, [fetchAllData]);

  useEffect(() => {
    if (fetchTrafficStats) {
      const isoStart = startDate ? new Date(startDate.setHours(0, 0, 0, 0)).toISOString() : undefined;
      const isoEnd = endDate ? new Date(endDate.setHours(23, 59, 59, 999)).toISOString() : undefined;
      fetchTrafficStats(isoStart, isoEnd);
    }
  }, [fetchTrafficStats, startDate, endDate]);

  const isRestrictedUser = useMemo(() => {
    if (!currentUser) return false;
    const restrictedRoles = ['Sales', 'SalesTaro', 'SalesTaroNew', 'Retention', 'Consultant'];
    return restrictedRoles.includes(currentUser.role);
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

  // 🔥 RAW ФИЛЬТРАЦИЯ
  const filteredData = useMemo(() => {
    const startStr = startDate ? toYMD(startDate) : '0000-00-00';
    const endStr = endDate ? toYMD(endDate) : '9999-99-99';

    let data = payments.filter(item => {
      // 🔥 ФИЛЬТР ПО РОЛИ: Только Consultant
      if (item.managerRole !== 'Consultant') return false;
      if (!item.transactionDate) return false;
      const dbDateStr = extractUTCDate(item.transactionDate);

      if (dbDateStr < startStr || dbDateStr > endStr) return false;

      if (isRestrictedUser) {
        if (item.manager !== currentUser.name) return false;
      } else {
        if (filters.manager && item.manager !== filters.manager) return false;
      }

      if (filters.country && item.country !== filters.country) return false;
      if (filters.product && item.product !== filters.product) return false;
      if (filters.type && item.type !== filters.type) return false;

      // Фильтр по источнику
      if (filters.source !== 'all') {
        if (item.source !== filters.source) return false;
      }

      return true;
    });

    return data.sort((a, b) => new Date(b.transactionDate) - new Date(a.transactionDate));
  }, [payments, startDate, endDate, filters, isRestrictedUser, currentUser]);

  // 🔥 RAW ФИЛЬТРАЦИЯ (SALES DEPT - TRAFFIC SOURCE)
  const salesDeptPayments = useMemo(() => {
    const startStr = startDate ? toYMD(startDate) : '0000-00-00';
    const endStr = endDate ? toYMD(endDate) : '9999-99-99';

    return payments.filter(p => {
      // Role check
      if (p.managerRole !== 'Sales' && p.managerRole !== 'SeniorSales') return false;
      // Date check
      const pDate = extractUTCDate(p.transactionDate);
      if (pDate < startStr || pDate > endStr) return false;
      // Country filter (if applied)
      if (filters.country && p.country !== filters.country) return false;
      // Source filter (if applied)
      if (filters.source !== 'all' && p.source !== filters.source) return false;

      return true;
    });
  }, [payments, startDate, endDate, filters.country, filters.source]);

  const stats = useMemo(() => {
    const totalEur = filteredData.reduce((sum, item) => sum + (item.amountEUR || 0), 0);
    const count = filteredData.length;

    // Traffic = Count of Sales Dept Payments
    const traffic = salesDeptPayments.length;

    const conversion = traffic > 0 ? ((count / traffic) * 100).toFixed(2) : "0.00";
    return { traffic, conversion, totalEur: totalEur.toFixed(2), count };
  }, [filteredData, salesDeptPayments]);

  // ✅ РАСЧЕТ KPI ПО ИСТОЧНИКАМ
  // Direct, Comments, WhatsApp - всегда показывает полные данные
  const kpiData = useMemo(() => {
    let direct = { count: 0, sum: 0, activeMgrs: new Set() };
    let comments = { count: 0, sum: 0, activeMgrs: new Set() };
    let whatsapp = { count: 0, sum: 0, activeMgrs: new Set() };

    filteredData.forEach(item => {
      if (item.source === 'comments') {
        comments.count++;
        comments.sum += (item.amountEUR || 0);
        comments.activeMgrs.add(item.manager);
      } else if (item.source === 'whatsapp') {
        whatsapp.count++;
        whatsapp.sum += (item.amountEUR || 0);
        whatsapp.activeMgrs.add(item.manager);
      } else if (item.source === 'direct') {
        direct.count++;
        direct.sum += (item.amountEUR || 0);
        direct.activeMgrs.add(item.manager);
      }
      // unknown игнорируем в KPI
    });

    return {
      direct: {
        active: direct.activeMgrs.size,
        sales: direct.count,
        depositSum: direct.sum.toFixed(2)
      },
      comments: {
        active: comments.activeMgrs.size,
        sales: comments.count,
        depositSum: comments.sum.toFixed(2)
      },
      whatsapp: {
        active: whatsapp.activeMgrs.size,
        sales: whatsapp.count,
        depositSum: whatsapp.sum.toFixed(2)
      }
    };
  }, [filteredData]);

  const chartData = useMemo(() => {
    const grouped = {};
    filteredData.forEach(item => {
      const dateKey = extractUTCDate(item.transactionDate); // "YYYY-MM-DD" UTC
      if (!grouped[dateKey]) grouped[dateKey] = { date: dateKey, count: 0 };
      grouped[dateKey].count += 1;
    });
    return Object.values(grouped).sort((a, b) => a.date.localeCompare(b.date));
  }, [filteredData]);

  const topManagers = useMemo(() => {
    const statsByName = {};
    filteredData.forEach(p => {
      const name = p.manager || 'Unknown';
      if (!statsByName[name]) statsByName[name] = { count: 0, sum: 0 };
      statsByName[name].count += 1;
      statsByName[name].sum += (p.amountEUR || 0);
    });
    return Object.entries(statsByName).map(([name, data]) => ({ name, ...data })).sort((a, b) => b.sum - a.sum).slice(0, 5);
  }, [filteredData]);

  const topCountries = useMemo(() => {
    const statsByGeo = {};
    filteredData.forEach(p => {
      const code = p.country || 'Unk';
      if (!statsByGeo[code]) statsByGeo[code] = { count: 0, sum: 0 };
      statsByGeo[code].count += 1;
      statsByGeo[code].sum += (p.amountEUR || 0);
    });

    return Object.entries(statsByGeo).map(([code, data]) => {
      // Traffic for this specific country from Sales Dept
      const realTraffic = salesDeptPayments.filter(p => p.country === code).length;

      const cr = realTraffic > 0
        ? ((data.count / realTraffic) * 100).toFixed(1)
        : "0.0";

      return {
        code,
        salesCount: data.count,
        salesSum: data.sum,
        traffic: realTraffic,
        cr: cr
      };
    }).sort((a, b) => b.salesSum - a.salesSum).slice(0, 5);
  }, [filteredData, salesDeptPayments]);

  const resetDateRange = () => setDateRange(getLastWeekRange());
  const resetFilters = () => {
    setFilters({ manager: '', country: '', product: '', type: '', source: 'all' });
    setDateRange(getLastWeekRange());
  };

  return (
    <div className="pb-10 transition-colors duration-200 w-full max-w-full overflow-x-hidden">

      {/* HEADER + FILTERS */}
      <div className="sticky top-0 z-20 bg-[#F5F5F5] dark:bg-[#0A0A0A] -mx-3 px-2 md:px-6 py-2 md:py-3 border-b border-transparent transition-colors duration-200">

        {/* Заголовок */}
        <div className="flex items-center justify-center md:justify-start gap-2 mb-3">
          <h2 className="text-base md:text-lg font-bold dark:text-white tracking-tight flex items-center gap-2 text-center md:text-left min-w-0">
            <LayoutDashboard size={16} className="text-blue-600 dark:text-blue-500 shrink-0 md:w-5 md:h-5" />
            <span>Панель отдела продаж</span>
          </h2>
        </div>



        {/* Все фильтры */}
        <div className="w-full md:w-auto mx-auto max-w-[90%] md:max-w-none">
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
                    {hasActiveFilters && '●'}
                  </span>
                </button>

                {filters.showMobileFilters && (
                  <div className="space-y-2 p-3 bg-white dark:bg-[#111] border border-gray-200 dark:border-[#333] rounded-lg">
                    {!isRestrictedUser && <DenseSelect label="Менеджер" value={filters.manager} options={uniqueValues.managers} onChange={(val) => setFilters(p => ({ ...p, manager: val }))} />}
                    <DenseSelect label="Страна" value={filters.country} options={uniqueValues.countries} onChange={(val) => setFilters(p => ({ ...p, country: val }))} />
                    <DenseSelect label="Продукт" value={filters.product} options={uniqueValues.products} onChange={(val) => setFilters(p => ({ ...p, product: val }))} />
                    <DenseSelect label="Платежки" value={filters.type} options={uniqueValues.types} onChange={(val) => setFilters(p => ({ ...p, type: val }))} />

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
                <DenseSelect label="Страна" value={filters.country} options={uniqueValues.countries} onChange={(val) => setFilters(p => ({ ...p, country: val }))} />
                <DenseSelect label="Продукт" value={filters.product} options={uniqueValues.products} onChange={(val) => setFilters(p => ({ ...p, product: val }))} />
                <DenseSelect label="Платежки" value={filters.type} options={uniqueValues.types} onChange={(val) => setFilters(p => ({ ...p, type: val }))} />

                {/* Календарь + Reset */}
                <div className="flex items-center gap-2 w-full md:w-auto">
                  {/* Desktop Date Picker */}
                  <div className="flex flex-1">
                    <CustomDateRangePicker
                      startDate={startDate}
                      endDate={endDate}
                      onChange={(update) => setDateRange(update)}
                      onReset={resetDateRange}
                    />
                  </div>

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
        </div>
      </div>

      <div className="grid grid-cols-12 gap-3 md:gap-4 mb-6 mt-4 w-full min-w-0">

        {/* 1. ГЛАВНЫЙ БЛОК */}
        <div className="col-span-12 lg:col-span-5 xl:col-span-4 flex flex-col relative group rounded-xl overflow-hidden border border-gray-200 dark:border-[#333] shadow-sm bg-white dark:bg-[#0F0F11] transition-colors duration-200 min-w-0">
          <div className="absolute inset-0 bg-white dark:bg-[#0F0F11] transition-colors duration-200"></div>
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-purple-500/5 pointer-events-none"></div>

          <div className="relative z-10 flex flex-col h-full p-4 md:p-5 overflow-hidden">
            <div className="mb-4 flex items-center justify-between min-w-0">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white tracking-wide flex items-center gap-2 truncate">
                <Activity size={16} className="text-blue-500 shrink-0" /> Ключевые метрики
              </h3>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-2 gap-px bg-gray-100 dark:bg-[#222] border border-gray-100 dark:border-[#222] rounded-lg overflow-hidden mb-4 transition-colors duration-200 w-full">
              <TechStatItem icon={CreditCard} label="Повторные продажи" value={stats.count} />
              <TechStatItem icon={DollarSign} label="Оборот" value={`€${Number(stats.totalEur).toLocaleString()}`} highlight />
              <TechStatItem icon={Users} label="Первые продажи" value={stats.traffic} />
              <TechStatItem icon={Percent} label="Конверсия" value={`${stats.conversion}%`} valueColor={getCRColor(stats.conversion)} />
            </div>

            <div className="flex-1 min-h-[100px] w-full min-w-0">
              <div className="text-[10px] font-bold text-gray-400 uppercase mb-2 truncate">Динамика продаж</div>
              <div className="h-24 w-full min-w-0 overflow-hidden">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="date" hide />
                    <RechartsTooltip contentStyle={{ backgroundColor: '#111', borderColor: '#333', fontSize: '12px', color: '#fff' }} itemStyle={{ color: '#fff' }} cursor={{ stroke: '#555', strokeWidth: 1 }} />
                    <Area type="monotone" dataKey="count" stroke="#3B82F6" fillOpacity={1} fill="url(#colorCount)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>

        {/* 2. KPI CARDS (Only Consultants / Repeat Sales) */}
        <div className="col-span-12 md:col-span-6 lg:col-span-3 xl:col-span-4 flex flex-col gap-3 min-w-0">

          <ProductCard
            title="Консультанты"
            subtitle="Повторные продажи"
            mainValue={(filters.source === 'comments' || filters.source === 'all') ? kpiData.comments.sales : 0}
            mainType="count"
            data={[
              { label: 'Активных менеджеров', val: (filters.source === 'comments' || filters.source === 'all') ? kpiData.comments.active : 0 },
              { label: 'Сумма депозитов', val: (filters.source === 'comments' || filters.source === 'all') ? `€${kpiData.comments.depositSum}` : '€0.00' },
              { label: 'Средний чек', val: (filters.source === 'comments' || filters.source === 'all') ? `€${kpiData.comments.sales > 0 ? (Number(kpiData.comments.depositSum) / kpiData.comments.sales).toFixed(2) : '0.00'}` : '€0.00' }
            ]}
          />

        </div>

        {/* 3. LEADERBOARDS */}
        <div className="col-span-12 md:col-span-6 lg:col-span-4 flex flex-col gap-3 min-w-0">

          {/* Top Managers */}
          <div className="bg-white dark:bg-[#111] border border-gray-200 dark:border-[#333] rounded-xl overflow-hidden flex-1 shadow-sm transition-colors duration-200 min-w-0">
            <div className="px-4 py-3 border-b border-gray-200 dark:border-[#333] flex justify-between items-center bg-gray-50/50 dark:bg-[#161616]">
              <div className="flex items-center gap-2 min-w-0">
                <Trophy size={14} className="text-amber-500 shrink-0" />
                <span className="text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-400 truncate">Топ менеджеры</span>
              </div>
            </div>
            <div className="p-2 space-y-1">
              {topManagers.map((mgr, i) => (
                <div key={mgr.name} className="flex items-center justify-between py-2 px-3 rounded-[6px] bg-gray-50 dark:bg-[#1A1A1A] border border-gray-100 dark:border-[#222] hover:border-gray-300 dark:hover:border-[#444] transition-all group">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-sm w-5 text-center shrink-0 font-bold leading-none">{getRankEmoji(i)}</span>
                    <span className="text-xs font-bold text-gray-800 dark:text-gray-200 truncate leading-none">{mgr.name}</span>
                  </div>
                  <div className="flex items-center gap-3 text-right">
                    <span className="text-[10px] text-gray-400 font-medium whitespace-nowrap">{mgr.count} Lead</span>
                    <span className="text-xs font-mono font-bold text-gray-900 dark:text-white whitespace-nowrap w-[60px]">€{mgr.sum.toFixed(0)}</span>
                  </div>
                </div>
              ))}
              {topManagers.length === 0 && <div className="text-center py-4 text-xs text-gray-500">Нет данных</div>}
            </div>
          </div>

          {/* Top Geo */}
          <div className="bg-white dark:bg-[#111] border border-gray-200 dark:border-[#333] rounded-xl overflow-hidden flex-1 shadow-sm transition-colors duration-200 min-w-0">
            <div className="px-4 py-3 border-b border-gray-200 dark:border-[#333] flex justify-between items-center bg-gray-50/50 dark:bg-[#161616]">
              <div className="flex items-center gap-2 min-w-0">
                <Globe size={14} className="text-blue-500 shrink-0" />
                <span className="text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-400 truncate">Топ ГЕО</span>
              </div>
            </div>
            <div className="p-2 space-y-1">
              {topCountries.map((geo, i) => (
                <div key={geo.code} className="flex items-center justify-between py-2 px-3 rounded-[6px] bg-gray-50 dark:bg-[#1A1A1A] border border-gray-100 dark:border-[#222] hover:border-gray-300 dark:hover:border-[#444] transition-all group">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-sm w-5 text-center shrink-0 font-bold leading-none">{getRankEmoji(i)}</span>
                    <div className="flex items-center gap-1.5 leading-none">
                      <span className="text-base">{getFlag(geo.code)}</span>
                      <span className="text-xs font-bold text-gray-800 dark:text-gray-200">{geo.code}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-right">
                    <span className="text-[10px] text-gray-400 font-medium whitespace-nowrap">{geo.salesCount} Lead</span>
                    <span className="text-xs font-mono font-bold text-gray-900 dark:text-white whitespace-nowrap w-[50px]">€{geo.salesSum.toFixed(0)}</span>
                    <span className={`text-[10px] font-bold w-[35px] text-right ${getCRColor(geo.cr)}`}>{geo.cr}%</span>
                  </div>
                </div>
              ))}
              {topCountries.length === 0 && <div className="text-center py-4 text-xs text-gray-500">Нет данных</div>}
            </div>
          </div>

        </div>
      </div>

      {/* --- BOTTOM TABLE --- */}
      <div className="mt-2 bg-white dark:bg-[#111] border border-gray-200 dark:border-[#333] rounded-xl overflow-hidden shadow-sm transition-colors duration-200 min-w-0 w-full">
        <div className="px-4 py-3 border-b border-gray-200 dark:border-[#333] flex items-center gap-2 bg-gray-50/50 dark:bg-[#161616]">
          <Layers size={14} className="text-gray-400 shrink-0" />
          <span className="text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-400 truncate">Последние операции</span>
        </div>
        {/* Desktop Table */}
        <div className="hidden md:block overflow-x-auto w-full min-w-0">
          <table className="w-full text-left text-xs text-gray-600 dark:text-[#888] whitespace-nowrap">
            <thead className="bg-gray-50 dark:bg-[#161616] font-medium border-b border-gray-200 dark:border-[#333]">
              <tr>
                <th className="px-4 py-2">ID</th>
                <th className="px-4 py-2">Дата (UTC)</th>
                <th className="px-4 py-2">Менеджер</th>
                <th className="px-4 py-2">ГЕО</th>
                <th className="px-4 py-2">Метод</th>
                <th className="px-4 py-2 text-right">Сумма (Loc)</th>
                <th className="px-4 py-2 text-right">Сумма (EUR)</th>
                <th className="px-4 py-2 text-right">Статус</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-[#222]">
              {isLoading ? (
                <tr><td colSpan="8" className="px-4 py-6 text-center text-xs">Загрузка...</td></tr>
              ) : filteredData.slice(0, 10).map((p) => (
                <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-[#1A1A1A] transition-colors">
                  <td className="px-4 py-2 font-mono text-[10px] text-gray-400" title={p.id}>
                    #{p.id.slice(0, 8)}...
                  </td>
                  <td className="px-4 py-2 text-gray-500 font-mono">
                    {p.transactionDate ? p.transactionDate.substring(0, 16).replace('T', ' ') : '-'}
                  </td>
                  <td className="px-4 py-2 font-medium text-gray-700 dark:text-gray-300">
                    {p.manager}
                  </td>
                  <td className="px-4 py-2">
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-gray-100 dark:bg-[#222] border border-gray-200 dark:border-[#333] text-[10px] font-bold text-gray-600 dark:text-gray-300">
                      {getFlag(p.country)} {p.country}
                    </span>
                  </td>
                  <td className="px-4 py-2">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${getPaymentBadgeStyle(p.type)}`}>
                      {p.type || 'Other'}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-right font-bold text-gray-700 dark:text-gray-300">
                    {p.amountLocal ? p.amountLocal.toLocaleString() : '-'}
                  </td>
                  <td className="px-4 py-2 text-right font-mono font-bold text-gray-900 dark:text-white">€{p.amountEUR}</td>
                  <td className="px-4 py-2 text-right">
                    <span className="text-emerald-500 text-[10px] font-bold uppercase">{p.status}</span>
                  </td>
                </tr>
              ))}
              {!isLoading && filteredData.length === 0 && (
                <tr><td colSpan="8" className="px-4 py-6 text-center text-xs">Нет данных</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards */}
        <div className="md:hidden space-y-2 p-3">
          {isLoading ? (
            <div className="text-center py-6 text-xs text-gray-500">Загрузка...</div>
          ) : filteredData.length === 0 ? (
            <div className="text-center py-6 text-xs text-gray-500">Нет данных</div>
          ) : (
            filteredData.slice(0, 10).map((p) => {
              const isExpanded = expandedId === p.id;
              return (
                <div key={p.id} className="border border-gray-200 dark:border-[#333] rounded-lg p-3 bg-white dark:bg-[#111] transition-all">
                  <div className="flex justify-between items-center">
                    <div className="flex-1">
                      <div className="font-bold text-lg text-gray-900 dark:text-white">€{p.amountEUR}</div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        {p.transactionDate ? p.transactionDate.substring(11, 16) : '-'}
                      </div>
                    </div>
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : p.id)}
                      className="px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded-md text-xs font-bold transition-colors"
                    >
                      {isExpanded ? 'Скрыть' : 'Подробнее'}
                    </button>
                  </div>

                  {isExpanded && (
                    <div className="mt-3 pt-3 border-t border-gray-200 dark:border-[#333] space-y-2 text-sm animate-in fade-in slide-in-from-top-2 duration-200">
                      <div className="flex justify-between">
                        <span className="text-gray-500">ID:</span>
                        <span className="font-mono text-xs">#{p.id.slice(0, 8)}...</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Дата:</span>
                        <span className="text-xs">{p.transactionDate?.substring(0, 10)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Менеджер:</span>
                        <span className="font-medium">{p.manager}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-500">ГЕО:</span>
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-gray-100 dark:bg-[#222] border border-gray-200 dark:border-[#333] text-xs font-bold">
                          {getFlag(p.country)} {p.country}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-500">Метод:</span>
                        <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase border ${getPaymentBadgeStyle(p.type)}`}>
                          {p.type || 'Other'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Сумма (Loc):</span>
                        <span className="font-bold">{p.amountLocal?.toLocaleString() || '-'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Статус:</span>
                        <span className="text-emerald-500 text-xs font-bold uppercase">{p.status}</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div >
  );
};

// --- Sub-components ---

const TechStatItem = ({ icon: Icon, label, value, highlight, valueColor }) => (
  <div className="bg-white dark:bg-[#151515] p-3 flex flex-col justify-center transition-colors hover:bg-gray-50 dark:hover:bg-[#1A1A1A] min-w-0 overflow-hidden">
    <div className="flex items-center gap-2 mb-1 text-gray-400 dark:text-gray-500 min-w-0">
      <Icon size={14} className="shrink-0" />
      <span className="text-[10px] font-bold uppercase tracking-wider truncate">{label}</span>
    </div>
    <div className={`text-lg font-mono font-bold leading-none truncate ${valueColor ? valueColor : highlight ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-900 dark:text-white'}`} title={value}>
      {value}
    </div>
  </div>
);

const ProductCard = ({ title, subtitle, mainValue, mainType, data }) => (
  <div className="bg-white dark:bg-[#111] border border-gray-200 dark:border-[#333] rounded-xl p-4 md:p-5 flex flex-col justify-between flex-1 shadow-sm transition-all hover:border-gray-300 dark:hover:border-[#444] min-w-0 overflow-hidden">
    <div className="flex justify-between items-start mb-3 min-w-0">
      <div className="min-w-0 flex-1 mr-2">
        <h4 className="font-bold text-sm text-gray-900 dark:text-white flex items-center gap-2 truncate">
          {title} <span className="text-gray-400 font-normal text-[10px] shrink-0">/ KPI</span>
        </h4>
        <p className="text-[10px] text-gray-500 mt-0.5 truncate">{subtitle}</p>
      </div>
      <span className={`text-xl font-mono font-bold whitespace-nowrap shrink-0 ${getCRColor(mainValue)}`}>
        {mainValue}{mainType === 'percent' ? '%' : ''}
      </span>
    </div>

    <div className="space-y-2 pt-3 border-t border-gray-100 dark:border-[#222] flex-1 w-full">
      {data.map((item, idx) => (
        <div key={idx} className="flex justify-between text-xs items-center min-w-0">
          <span className="text-gray-500 truncate mr-2">{item.label}</span>
          <span className="font-medium text-gray-700 dark:text-gray-300 font-mono whitespace-nowrap shrink-0">{item.val}</span>
        </div>
      ))}
    </div>
  </div>
);

export default ConsDashboardPage;