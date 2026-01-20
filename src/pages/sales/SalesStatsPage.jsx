import React, { useState, useMemo, useEffect } from 'react';
import { useAppStore } from '../../store/appStore';
import { ResponsiveSunburst } from '@nivo/sunburst';
import { ResponsivePie } from '@nivo/pie';

import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { Calendar as CalendarIcon, BarChart2, PieChart, RotateCcw, Maximize2, X, Filter, LayoutDashboard, MessageCircle, MessageSquare, Phone } from 'lucide-react';
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

const THEME_COLORS = [
  { main: '#6366F1', gradient: ['#6366F1', '#818CF8'] }, // Indigo
  { main: '#EC4899', gradient: ['#EC4899', '#F472B6'] }, // Pink
  { main: '#10B981', gradient: ['#10B981', '#34D399'] }, // Emerald
  { main: '#F59E0B', gradient: ['#F59E0B', '#FBBF24'] }, // Amber
  { main: '#8B5CF6', gradient: ['#8B5CF6', '#A78BFA'] }, // Violet
  { main: '#06B6D4', gradient: ['#06B6D4', '#22D3EE'] }, // Cyan
  { main: '#EF4444', gradient: ['#EF4444', '#F87171'] }, // Red
  { main: '#F97316', gradient: ['#F97316', '#FB923C'] }, // Orange
  { main: '#14B8A6', gradient: ['#14B8A6', '#2DD4BF'] }, // Teal
  { main: '#84CC16', gradient: ['#84CC16', '#A3E635'] }, // Lime
  { main: '#3B82F6', gradient: ['#3B82F6', '#60A5FA'] }, // Blue
  { main: '#D946EF', gradient: ['#D946EF', '#E879F9'] }, // Fuchsia
  { main: '#F43F5E', gradient: ['#F43F5E', '#FB7185'] }, // Rose
  { main: '#0EA5E9', gradient: ['#0EA5E9', '#38BDF8'] }, // Sky
  { main: '#22C55E', gradient: ['#22C55E', '#4ADE80'] }, // Green
  { main: '#EAB308', gradient: ['#EAB308', '#FACC15'] }, // Yellow
  { main: '#A855F7', gradient: ['#A855F7', '#C084FC'] }, // Purple
  { main: '#64748B', gradient: ['#64748B', '#94A3B8'] }, // Slate
  { main: '#78716C', gradient: ['#78716C', '#A8A29E'] }, // Stone
  { main: '#FBBF24', gradient: ['#FBBF24', '#FDE68A'] }, // Amber Light
];

const getLastWeekRange = () => {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - 7);
  return [start, end];
};

const getCurrentMonthRange = () => {
  const date = new Date();
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  return [start, end];
};

// ХЕЛПЕР: Дату в YYYY-MM-DD (локально)
const toYMD = (date) => {
  if (!date) return '';
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
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

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute top-full right-0 mt-2 bg-white dark:bg-[#111] border border-gray-200 dark:border-[#333] rounded-xl shadow-xl z-50 p-2.5 w-[220px] animate-in fade-in slide-in-from-top-2 duration-150">

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

            <div className="grid grid-cols-7 gap-0.5 mb-0.5">
              {DAYS.map(d => (
                <div key={d} className="text-[9px] font-bold text-gray-400 dark:text-gray-500 text-center py-0.5">
                  {d}
                </div>
              ))}
            </div>

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

const SalesStatsPage = () => {
  const { payments, user: currentUser, trafficStats, fetchTrafficStats } = useAppStore();
  const [dateRange, setDateRange] = useState(getCurrentMonthRange());
  const [startDate, endDate] = dateRange;
  const [expandedChart, setExpandedChart] = useState(null);
  const [filters, setFilters] = useState({ manager: '', country: '', product: '', type: '', source: 'all', showMobileFilters: false });
  const [isDemo, setIsDemo] = useState(false);

  // --- DEMO DATA GENERATOR ---
  const demoData = useMemo(() => {
    if (!isDemo || !startDate || !endDate) return null;

    const days = [];
    let curr = new Date(startDate);
    const end = new Date(endDate);
    while (curr <= end) {
      days.push(toYMD(curr));
      curr.setDate(curr.getDate() + 1);
    }

    const mockCountries = ['UA', 'RU', 'KZ', 'BY', 'PL', 'DE', 'US', 'TR', 'CZ', 'IT'];
    const mockManagers = ['Alice', 'Bob', 'Charlie', 'David', 'Eva'];
    const mockProducts = ['Start', 'Pro', 'Premium', 'Vip', 'Exclusive'];
    const mockTypes = ['Stripe', 'PayPal', 'Crypto', 'Cash', 'Bank'];

    // 1. Mock Payments
    const mockPayments = [];
    days.forEach(day => {
      // Random sales per day (5-20)
      const count = Math.floor(Math.random() * 15) + 5;
      for (let i = 0; i < count; i++) {
        mockPayments.push({
          transactionDate: `${day}T12:00:00`,
          country: mockCountries[Math.floor(Math.random() * mockCountries.length)],
          manager: mockManagers[Math.floor(Math.random() * mockManagers.length)],
          product: mockProducts[Math.floor(Math.random() * mockProducts.length)],
          type: mockTypes[Math.floor(Math.random() * mockTypes.length)],
          source: ['direct', 'comments', 'whatsapp'][Math.floor(Math.random() * 3)],
          amountEUR: Math.floor(Math.random() * 100) + 20
        });
      }
    });

    // 2. Mock Traffic
    const mockTraffic = {};
    mockCountries.forEach(c => {
      mockTraffic[c] = {};
      days.forEach(day => {
        const direct = Math.floor(Math.random() * 50) + 10;
        const comments = Math.floor(Math.random() * 30) + 5;
        const whatsapp = Math.floor(Math.random() * 20) + 5;
        mockTraffic[c][day] = {
          direct, comments, whatsapp, all: direct + comments + whatsapp
        };
      });
    });

    // 3. Mock Chart Data (Grouped)
    const prepareMock = (key, data) => {
      const grouped = {};
      const allKeys = new Set();
      data.forEach(item => {
        const d = item.transactionDate.slice(0, 10);
        const k = item[key];
        allKeys.add(k);
        if (!grouped[d]) grouped[d] = { date: d };
        if (!grouped[d][k]) grouped[d][k] = 0;
        grouped[d][k]++;
      });
      return {
        chartData: Object.values(grouped).sort((a, b) => a.date.localeCompare(b.date)),
        keys: Array.from(allKeys)
      };
    };

    return {
      payments: mockPayments,
      traffic: mockTraffic,
      geo: prepareMock('country', mockPayments).chartData,
      geoKeys: prepareMock('country', mockPayments).keys,
      manager: prepareMock('manager', mockPayments).chartData,
      managerKeys: prepareMock('manager', mockPayments).keys,
      product: prepareMock('product', mockPayments).chartData,
      productKeys: prepareMock('product', mockPayments).keys,
      type: prepareMock('type', mockPayments).chartData,
      typeKeys: prepareMock('type', mockPayments).keys,
    };
  }, [isDemo, startDate, endDate]);

  const isRestrictedUser = useMemo(() => {
    if (!currentUser) return false;
    return ['Sales', 'Retention', 'Consultant'].includes(currentUser.role);
  }, [currentUser]);

  // --- ЗАГРУЗКА ТРАФИКА ---
  useEffect(() => {
    if (fetchTrafficStats) {
      const isoStart = startDate ? new Date(startDate.setHours(0, 0, 0, 0)).toISOString() : undefined;
      const isoEnd = endDate ? new Date(endDate.setHours(23, 59, 59, 999)).toISOString() : undefined;
      fetchTrafficStats(isoStart, isoEnd);
    }
  }, [startDate, endDate, fetchTrafficStats]);

  const uniqueValues = useMemo(() => {
    const getUnique = (key) => [...new Set(payments.map(p => p[key]).filter(Boolean))].sort();
    return {
      managers: getUnique('manager'),
      countries: getUnique('country'),
      products: getUnique('product'),
      types: getUnique('type')
    };
  }, [payments]);

  // --- ФИЛЬТРАЦИЯ (RAW MODE) ---
  const filteredData = useMemo(() => {
    const startStr = startDate ? toYMD(startDate) : '0000-00-00';
    const endStr = endDate ? toYMD(endDate) : '9999-99-99';

    let data = payments.filter(item => {
      // 🔥 ФИЛЬТР ПО РОЛИ: Только Sales
      if (!['Sales', 'SeniorSales'].includes(item.managerRole)) return false;

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

      if (filters.country && item.country !== filters.country) return false;
      if (filters.product && item.product !== filters.product) return false;
      if (filters.type && item.type !== filters.type) return false;

      if (filters.source !== 'all' && item.source !== filters.source) return false;

      return true;
    });

    // Сортировка (строковая)
    return data.sort((a, b) => (a.transactionDate || '').localeCompare(b.transactionDate || ''));
  }, [payments, startDate, endDate, isRestrictedUser, currentUser, filters]);

  // --- ГРУППИРОВКА ДЛЯ ГРАФИКОВ ---
  const prepareData = (dataKey, sourceData) => {
    const grouped = {};
    const allKeys = new Set();

    sourceData.forEach(item => {
      // Ключ группировки - "YYYY-MM-DD" из базы (без сдвигов времени)
      const dateKey = item.transactionDate.slice(0, 10);
      const key = item[dataKey] || 'Unknown';
      allKeys.add(key);

      if (!grouped[dateKey]) grouped[dateKey] = { date: dateKey };
      if (!grouped[dateKey][key]) grouped[dateKey][key] = 0;
      grouped[dateKey][key] += 1;
    });

    return {
      // Сортируем по дате (строке)
      chartData: Object.values(grouped).sort((a, b) => a.date.localeCompare(b.date)),
      keys: Array.from(allKeys)
    };
  };

  const geoData = useMemo(() => prepareData('country', filteredData), [filteredData]);
  const productData = useMemo(() => prepareData('product', filteredData), [filteredData]);
  const typeData = useMemo(() => prepareData('type', filteredData), [filteredData]);
  const managerData = useMemo(() => prepareData('manager', filteredData), [filteredData]);

  const resetDateRange = () => setDateRange(getCurrentMonthRange());
  const resetFilters = () => {
    setFilters({ manager: '', country: '', product: '', type: '', source: 'all' });
    setDateRange(getCurrentMonthRange());
  };

  return (
    <div className="pb-10 transition-colors duration-200 w-full max-w-full overflow-x-hidden">

      {/* HEADER + FILTERS */}
      <div className="sticky top-0 z-20 bg-[#F5F5F5] dark:bg-[#0A0A0A] -mx-3 px-2 md:px-6 py-2 md:py-3 border-b border-transparent transition-colors duration-200">

        {/* Заголовок */}
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold dark:text-white tracking-tight flex items-center gap-2 truncate min-w-0">
            <LayoutDashboard size={18} className="text-blue-600 dark:text-blue-500 shrink-0" />
            <span className="truncate">Аналитика трендов</span>
          </h2>

          <div className="flex items-center gap-2">
            {/* DEMO BUTTON */}
            <button
              onClick={() => setIsDemo(!isDemo)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${isDemo ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/20' : 'bg-gray-200 dark:bg-[#1A1A1A] text-gray-500 dark:text-gray-400 hover:bg-gray-300 dark:hover:bg-[#333]'}`}
            >
              <RotateCcw size={12} className={isDemo ? 'animate-spin-slow' : ''} />
              Demo
            </button>
          </div>
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
                    {(filters.manager || filters.country || filters.product || filters.type) && '●'}
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
                      className="w-full p-2 bg-red-500/10 text-red-500 rounded-[6px] hover:bg-red-500/20 text-xs font-bold transition-opacity"
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

                {/* Desktop Calendar + Reset */}
                <div className="flex items-center gap-2">
                  <CustomDateRangePicker
                    startDate={startDate}
                    endDate={endDate}
                    onChange={(update) => setDateRange(update)}
                    onReset={resetDateRange}
                  />

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

      {/* NEW CHARTS ROW: SUNBURST + PIE */}
      {/* ROW 1: Product & Type (BARS) */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-6">
        <ChartWidget id="product" title="Популярность Продуктов" subtitle="Сравнение объемов продаж" type="bar" data={isDemo ? demoData.product : productData.chartData} keys={isDemo ? demoData.productKeys : productData.keys} onExpand={() => setExpandedChart('product')} />
        <ChartWidget id="type" title="Методы Оплаты" subtitle="Предпочтения клиентов" type="bar" data={isDemo ? demoData.type : typeData.chartData} keys={isDemo ? demoData.typeKeys : typeData.keys} onExpand={() => setExpandedChart('type')} />
      </div>



      {/* ROW 3: Geo Dynamics (Restored) & Manager (AREAS) */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-6">
        <ChartWidget id="geo" title="Динамика по ГЕО" subtitle="Активность стран по дням" type="area" data={isDemo ? demoData.geo : geoData.chartData} keys={isDemo ? demoData.geoKeys : geoData.keys} onExpand={() => setExpandedChart('country')} />
        <ChartWidget id="manager" title={isRestrictedUser ? "Моя эффективность" : "Вклад Менеджеров"} subtitle="Результативность команды" type="area" data={isDemo ? demoData.manager : managerData.chartData} keys={isDemo ? demoData.managerKeys : managerData.keys} onExpand={() => setExpandedChart('manager')} />
      </div>

      {/* ROW 4: Sunburst & Pie - HIDDEN ON MOBILE */}
      <div className="hidden md:grid grid-cols-1 xl:grid-cols-2 gap-6 mb-6 min-h-[400px] md:min-h-[450px]">
        <GeoComparisonChart
          startDate={startDate}
          endDate={endDate}
          trafficStats={isDemo ? demoData.traffic : trafficStats}
          payments={isDemo ? demoData.payments : filteredData}
          countryFilter={filters.country}
          sourceFilter={filters.source}
        />
        <SourcePieChart
          data={isDemo ? demoData.payments : filteredData}
          isDemo={isDemo}
        />
      </div>

      {expandedChart && (
        <ExpandedChartModal chartKey={expandedChart} rawPayments={isDemo ? demoData.payments : filteredData} onClose={() => setExpandedChart(null)} />
      )}
    </div>
  );
};

// --- НОВЫЙ ГРАФИК: РАСПРЕДЕЛЕНИЕ ИСТОЧНИКОВ (Pie) ---
const SourcePieChart = ({ data, isDemo }) => {
  const chartData = useMemo(() => {
    const map = {};
    data.forEach(p => {
      const s = p.source || 'Direct';
      const key = s.charAt(0).toUpperCase() + s.slice(1);
      if (!map[key]) map[key] = 0;
      map[key]++;
    });

    return Object.keys(map).map(k => ({
      id: k,
      label: k,
      value: map[k]
    })).sort((a, b) => b.value - a.value);
  }, [data]);

  return (
    <div className="bg-white dark:bg-[#111] border border-gray-200 dark:border-[#333] rounded-xl p-6 shadow-sm h-full flex flex-col relative overflow-hidden">
      <h3 className="text-lg font-bold dark:text-white flex items-center gap-2 mb-4 relative z-10">
        Источники Трафика
      </h3>
      <div className="flex-1 min-h-0 relative">
        {chartData.length > 0 ? (
          <ResponsivePie
            data={chartData}
            margin={{ top: 20, right: 80, bottom: 20, left: 80 }}
            innerRadius={0.6}
            padAngle={0.7}
            cornerRadius={3}
            activeOuterRadiusOffset={8}
            borderWidth={1}
            borderColor={{ from: 'color', modifiers: [['darker', 0.2]] }}
            colors={{ scheme: 'nivo' }}
            enableArcLinkLabels={true}
            arcLinkLabelsSkipAngle={10}
            arcLinkLabelsTextColor="#999"
            arcLinkLabelsThickness={2}
            arcLinkLabelsColor={{ from: 'color' }}
            enableArcLabels={true}
            arcLabelsSkipAngle={10}
            arcLabelsTextColor={{ from: 'color', modifiers: [['darker', 2]] }}
            tooltip={({ datum }) => (
              <div className="bg-white/95 dark:bg-[#1e293b]/95 backdrop-blur-md p-2 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 text-xs flex items-center gap-2 z-50">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: datum.color }}></div>
                <span className="font-bold dark:text-gray-100">{datum.id}:</span>
                <span className="text-gray-500 dark:text-gray-400">{datum.value}</span>
              </div>
            )}
          />
        ) : <div className="h-full flex items-center justify-center text-gray-400">Нет данных</div>}

        {/* Center Text */}
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          <div className="text-center">
            <span className="text-3xl font-black dark:text-white block">
              {chartData.reduce((a, c) => a + c.value, 0)}
            </span>
            <span className="text-[10px] text-gray-400 uppercase tracking-widest">Leads</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- НОВЫЙ ГРАФИК: СРАВНЕНИЕ ГЕО (Sunburst) ---
const GeoComparisonChart = ({ startDate, endDate, trafficStats, payments, countryFilter, sourceFilter }) => {
  // 1. Подготовка данных для Sunburst (Иерархия: Root -> Country -> Product)
  const { chartData } = useMemo(() => {
    const countryMap = {};

    payments.forEach(p => {
      const country = p.country || 'Other';
      const product = p.product || 'Unknown';

      if (!countryMap[country]) countryMap[country] = {};
      if (!countryMap[country][product]) countryMap[country][product] = 0;
      countryMap[country][product] += 1;
    });

    const sortedCountries = Object.entries(countryMap).map(([cName, products]) => {
      const total = Object.values(products).reduce((a, b) => a + b, 0);
      return { cName, products, total };
    }).sort((a, b) => b.total - a.total);

    const topN = 15;
    const finalChildren = [];

    // Top Countries
    sortedCountries.slice(0, topN).forEach(({ cName, products }) => {
      const productChildren = Object.entries(products).map(([pName, count]) => ({
        name: pName,
        loc: count
      }));
      finalChildren.push({
        name: cName,
        children: productChildren
      });
    });

    // Others
    if (sortedCountries.length > topN) {
      const otherTotal = sortedCountries.slice(topN).reduce((sum, item) => sum + item.total, 0);
      if (otherTotal > 0) {
        finalChildren.push({
          name: 'Others',
          children: [{ name: 'Various', loc: otherTotal }]
        });
      }
    }

    return { chartData: { name: "root", children: finalChildren } };
  }, [payments]);

  return (
    <div className="bg-white dark:bg-[#111] border border-gray-200 dark:border-[#333] rounded-xl p-6 shadow-sm h-full flex flex-col relative overflow-hidden">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-0 gap-4 relative z-10">
        <div>
          <h3 className="text-lg font-bold dark:text-white flex items-center gap-2">
            Гео Структура (Sunburst)
          </h3>
          <p className="text-xs text-gray-500 mt-1">Иерархия: Страна → Продукты</p>
        </div>
      </div>

      {/* CHART CONTAINER */}
      <div className="flex-1 min-h-0 w-full relative mt-4">
        {(chartData.children && chartData.children.length > 0) ? (
          <ResponsiveSunburst
            data={chartData}
            margin={{ top: 10, right: 10, bottom: 10, left: 10 }}
            id="name"
            value="loc"
            cornerRadius={4}
            borderWidth={2}
            borderColor={{ theme: 'background' }}
            colors={THEME_COLORS.map(c => c.main)}
            // Stronger distinctness for outer ring (Products)
            childColor={{
              from: 'color',
              modifiers: [
                [
                  'brighter',
                  0.6 // Much brighter to stand out from parent Country color
                ],
                [
                  'opacity',
                  0.9
                ]
              ]
            }}
            enableArcLabels={true}
            arcLabel={(d) => d.data.name}
            arcLabelsSkipAngle={8} // Lower threshold to show more labels
            arcLabelsRadiusOffset={0.5} // Center labels better
            arcLabelsTextColor={{
              from: 'color',
              modifiers: [
                [
                  'darker',
                  4 // Maximum contrast for text against bright background
                ]
              ]
            }}
            theme={{
              labels: {
                text: {
                  fontSize: 14, // Larger text
                  fontWeight: 900, // Extra Bold
                  fill: '#000', // Force black text for high contrast on bright segments
                  textShadow: '0px 0px 4px rgba(255,255,255,0.8)' // White glow for readability
                }
              }
            }}
            // Custom Tooltip
            tooltip={({ id, value, color, depth, data, path }) => (
              <div className="bg-white/95 dark:bg-[#1e293b]/95 backdrop-blur-md p-2 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 text-xs flex items-center gap-2 z-50">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }}></div>
                <span className="font-bold dark:text-gray-100">
                  {data.name}
                </span>
                <span className="text-gray-500 dark:text-gray-400">Sales: {value}</span>
              </div>
            )}
          />
        ) : (
          <div className="h-full flex items-center justify-center text-gray-400">Нет данных для отображения</div>
        )}

        {/* CENTER TEXT OVERLAY */}
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          <div className="flex flex-col items-center bg-white/30 dark:bg-black/30 backdrop-blur-[2px] rounded-full p-4 shadow-sm border border-white/20">
            <span className="text-[10px] uppercase tracking-widest text-gray-600 dark:text-gray-300">Total</span>
            <span className="text-2xl font-black dark:text-white">
              {chartData.children ? chartData.children.reduce((a, c) => a + (c.loc || (c.children ? c.children.reduce((acc, k) => acc + k.loc, 0) : 0)), 0) : 0}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

const ExpandedChartModal = ({ chartKey, rawPayments, onClose }) => {
  const [dateRange, setDateRange] = useState(getCurrentMonthRange());
  const [startDate, endDate] = dateRange;

  const filteredData = useMemo(() => {
    const startStr = startDate ? toYMD(startDate) : '0000-00-00';
    const endStr = endDate ? toYMD(endDate) : '9999-99-99';

    let data = rawPayments.filter(item => {
      if (!item.transactionDate) return false;
      const dbDateStr = item.transactionDate.slice(0, 10);
      if (dbDateStr < startStr || dbDateStr > endStr) return false;
      return true;
    });
    return data.sort((a, b) => (a.transactionDate || '').localeCompare(b.transactionDate || ''));
  }, [rawPayments, startDate, endDate]);

  const prepared = useMemo(() => {
    const grouped = {};
    const allKeys = new Set();

    filteredData.forEach(item => {
      const dateKey = item.transactionDate.slice(0, 10);
      const key = item[chartKey] || 'Unknown';
      allKeys.add(key);

      if (!grouped[dateKey]) grouped[dateKey] = { date: dateKey };
      if (!grouped[dateKey][key]) grouped[dateKey][key] = 0;
      grouped[dateKey][key] += 1;
    });

    return {
      chartData: Object.values(grouped).sort((a, b) => a.date.localeCompare(b.date)),
      keys: Array.from(allKeys)
    };
  }, [filteredData, chartKey]);

  const titles = { country: "Детальная аналитика по ГЕО", manager: "Детальная аналитика по Менеджерам", product: "Детальная аналитика по Продуктам", type: "Детальная аналитика по Методам Оплаты" };
  const isBar = chartKey === 'product' || chartKey === 'type';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-[#09090b] w-full max-w-6xl h-[85vh] rounded-2xl border border-gray-200 dark:border-[#333] shadow-2xl flex flex-col overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-[#222]">
          <div>
            <h2 className="text-2xl font-bold dark:text-white flex items-center gap-2">{titles[chartKey]}</h2>
            <p className="text-sm text-gray-500 mt-1">Данные за период: {startDate?.toLocaleDateString()} - {endDate?.toLocaleDateString()}</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center bg-gray-50 dark:bg-[#111] border border-gray-200 dark:border-[#333] rounded-lg px-3 py-2">
              <CalendarIcon size={16} className="text-gray-400 mr-2" />
              <DatePicker selectsRange={true} startDate={startDate} endDate={endDate} onChange={(u) => setDateRange(u)} dateFormat="dd.MM.yyyy" placeholderText="Период" className="bg-transparent text-sm font-medium dark:text-white outline-none w-48 cursor-pointer text-center" />
            </div>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-[#222] rounded-full text-gray-500 transition-colors"><X size={24} /></button>
          </div>
        </div>
        <div className="flex-1 p-6 min-h-0">
          <ResponsiveContainer width="100%" height="100%">
            {isBar ? (
              <BarChart data={prepared.chartData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" opacity={0.1} vertical={false} />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#666', fontSize: 12 }} tickMargin={10} tickFormatter={(str) => new Date(str).toLocaleDateString(undefined, { day: '2-digit', month: '2-digit' })} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#666', fontSize: 12 }} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
                <Legend wrapperStyle={{ paddingTop: '20px' }} />
                {prepared.keys.map((key, index) => <Bar key={key} dataKey={key} fill={THEME_COLORS[index % THEME_COLORS.length].main} radius={[4, 4, 0, 0]} stackId="a" />)}
              </BarChart>
            ) : (
              <AreaChart data={prepared.chartData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                <defs>{prepared.keys.map((key, index) => { const color = THEME_COLORS[index % THEME_COLORS.length]; return (<linearGradient key={key} id={`grad-modal-${key}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={color.main} stopOpacity={0.4} /><stop offset="100%" stopColor={color.main} stopOpacity={0} /></linearGradient>); })}</defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" opacity={0.1} vertical={false} />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#666', fontSize: 12 }} tickMargin={10} tickFormatter={(str) => new Date(str).toLocaleDateString(undefined, { day: '2-digit', month: '2-digit' })} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#666', fontSize: 12 }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ paddingTop: '20px' }} />
                {prepared.keys.map((key, index) => <Area key={key} type="monotone" dataKey={key} stroke={THEME_COLORS[index % THEME_COLORS.length].main} fill={`url(#grad-modal-${key})`} strokeWidth={3} activeDot={{ r: 6 }} />)}
              </AreaChart>
            )}
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};



export default SalesStatsPage;

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    // Calculate total for the percentage
    const total = payload.reduce((sum, entry) => sum + (entry.value || 0), 0);

    return (
      <div className="bg-white/95 dark:bg-[#09090b]/90 backdrop-blur-md border border-gray-200 dark:border-[#333] p-3 rounded-lg shadow-2xl text-xs">
        <p className="font-bold dark:text-white mb-2 font-mono border-b border-gray-200 dark:border-[#333] pb-1">
          {new Date(label).toLocaleDateString(undefined, { day: 'numeric', month: 'long' })}
        </p>
        <div className="space-y-1">
          {payload.map((entry, index) => {
            const percent = total > 0 ? ((entry.value / total) * 100).toFixed(1) : '0.0';
            return (
              <div key={index} className="flex items-center justify-between gap-6">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: entry.color }}></div>
                  <span className="text-gray-600 dark:text-gray-400">{entry.name}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="font-mono text-gray-400 text-[10px]">{percent}%</span>
                  <span className="font-bold dark:text-white font-mono">({entry.value})</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }
  return null;
};


// Helper for ChartWidget (Restored)
const ChartWidget = ({ title, subtitle, data, keys, type, onExpand }) => {
  const hasData = data && data.length > 0;
  return (
    <div className="bg-white dark:bg-[#111] border border-gray-200 dark:border-[#333] rounded-xl p-5 shadow-sm relative overflow-hidden group h-full">
      <div className="mb-6 z-10 relative flex justify-between items-start cursor-pointer" onClick={onExpand} title="Нажмите, чтобы развернуть детальную статистику">
        <div>
          <h3 className="text-sm font-bold dark:text-white flex items-center gap-2 group-hover:text-blue-500 transition-colors">
            {type === 'area' ? <BarChart2 size={14} className="text-blue-500" /> : <PieChart size={14} className="text-pink-500" />}
            {title}
          </h3>
          <p className="text-[10px] text-gray-500 mt-0.5">{subtitle}</p>
        </div>
        <div className="p-1.5 rounded-lg bg-gray-50 dark:bg-[#1A1A1A] text-gray-400 group-hover:text-blue-500 group-hover:bg-blue-50 dark:group-hover:bg-blue-900/20 transition-all"><Maximize2 size={14} /></div>
      </div>
      <div className="h-[300px] w-full text-[10px] relative z-10">
        {!hasData ? (<div className="h-full flex items-center justify-center text-gray-400 text-xs">Нет данных</div>) : (
          <ResponsiveContainer width="100%" height="100%">
            {type === 'area' ? (
              <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>{keys.map((key, index) => { const color = THEME_COLORS[index % THEME_COLORS.length]; return (<linearGradient key={key} id={`grad-${key}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={color.main} stopOpacity={0.4} /><stop offset="100%" stopColor={color.main} stopOpacity={0} /></linearGradient>); })}</defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" opacity={0.1} vertical={false} />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#666', fontSize: 10, fontFamily: 'monospace' }} tickMargin={10} tickFormatter={(str) => new Date(str).toLocaleDateString(undefined, { day: '2-digit', month: '2-digit' })} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#666', fontSize: 10, fontFamily: 'monospace' }} allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#555', strokeWidth: 1, strokeDasharray: '3 3' }} />
                {keys.map((key, index) => <Area key={key} type="monotone" dataKey={key} stroke={THEME_COLORS[index % THEME_COLORS.length].main} fill={`url(#grad-${key})`} strokeWidth={2} isAnimationActive={false} />)}
              </AreaChart>
            ) : (
              <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" opacity={0.1} vertical={false} />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#666', fontSize: 10, fontFamily: 'monospace' }} tickMargin={10} tickFormatter={(str) => new Date(str).toLocaleDateString(undefined, { day: '2-digit', month: '2-digit' })} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#666', fontSize: 10, fontFamily: 'monospace' }} allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
                {keys.map((key, index) => <Bar key={key} dataKey={key} fill={THEME_COLORS[index % THEME_COLORS.length].main} radius={[4, 4, 0, 0]} stackId="a" barSize={20} isAnimationActive={false} />)}
              </BarChart>
            )}
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};