import React, { useCallback, useDeferredValue, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useAppStore } from '../store/appStore';
import { supabase } from '../services/supabaseClient';
import {
  Filter,
  Users, TrendingUp, Globe,
  Calendar as CalendarIcon,
  Copy, Search, X, Download,
  RotateCcw, RefreshCw, List
} from 'lucide-react';

import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { extractUTCDate } from '../utils/kyivTime';
import { showToast } from '../utils/toastEvents';

// --- КОМПОНЕНТЫ ---
import ProjectBadge from '../components/geo/ProjectBadge';
import { DenseSelect } from '../components/ui/FilterSelect';


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
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0 });
  const triggerRef = React.useRef(null);

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

  const openCalendar = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setDropdownPos({
        top: rect.bottom + 8,
        left: rect.right - 220
      });
    }
    setIsOpen(true);
    setSelecting('start');
  };

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
        ref={triggerRef}
        onClick={openCalendar}
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
          <div className="fixed inset-0 z-[100]" onClick={() => setIsOpen(false)} />
          <div
            className="fixed bg-white dark:bg-[#111] border border-gray-200 dark:border-[#333] rounded-xl shadow-xl z-[101] p-2.5 w-[220px]"
            style={{ top: dropdownPos.top, left: dropdownPos.left }}
          >

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

const getLastWeekRange = () => {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - 7);
  return [start, end];
};

// ХЕЛПЕР: дата в YYYY-MM-DD по face-value (локальное время, чтобы совпадало с календарем)
const toYMD = (date) => {
  if (!date) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const DEFAULT_DEPARTMENT = 'sales';

const createDefaultFilters = () => ({
  manager: [],
  product: [],
  type: [],
  department: DEFAULT_DEPARTMENT,
  showMobileFilters: false,
});

const getFlagIconUrl = (code) => {
  if (!code || !/^[A-Za-z]{2}$/.test(code)) return '';
  return `https://cdn.jsdelivr.net/npm/flag-icons/flags/4x3/${code.toLowerCase()}.svg`;
};

const CountryFlagIcon = ({ code, emoji, name, className = '', imgClassName = '', fallbackClassName = '' }) => {
  const [hasError, setHasError] = useState(false);
  const src = getFlagIconUrl(code);

  if (!src || hasError) {
    return <span className={`${fallbackClassName} ${className}`}>{emoji || '🏳️'}</span>;
  }

  return (
    <img
      src={src}
      alt={name ? `Флаг ${name}` : `Флаг ${code}`}
      loading="lazy"
      decoding="async"
      onError={() => setHasError(true)}
      className={`${imgClassName} ${className}`}
    />
  );
};

const formatTelegramUsername = (username) => {
  if (!username) return '';
  return `@${String(username).trim().replace(/^@+/, '')}`;
};

const formatExportDate = (date) => {
  if (!date) return '';
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}.${month}.${year}`;
};

const formatExportPeriodLabel = (startDate, endDate) => {
  if (!startDate || !endDate) return 'Период';

  const isSameMonth =
    startDate.getFullYear() === endDate.getFullYear() &&
    startDate.getMonth() === endDate.getMonth();

  const isFullMonth =
    startDate.getDate() === 1 &&
    endDate.getDate() === new Date(endDate.getFullYear(), endDate.getMonth() + 1, 0).getDate();

  if (isSameMonth && isFullMonth) {
    const monthName = startDate.toLocaleString('ru-RU', { month: 'long' });
    return monthName.charAt(0).toUpperCase() + monthName.slice(1);
  }

  return `${formatExportDate(startDate)} - ${formatExportDate(endDate)}`;
};

const escapeCsvCell = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;
const formatExportPercent = (value) => `${Number(value || 0).toFixed(2)}%`;

const getManagerRoleMeta = (role) => {
  switch (role) {
    case 'Sales':
      return { label: 'Отдел Продаж', className: 'bg-blue-500/10 text-blue-500 dark:text-blue-400' };
    case 'SeniorSales':
      return { label: 'Сеньор ОП', className: 'bg-indigo-500/10 text-indigo-500 dark:text-indigo-400' };
    case 'Consultant':
      return { label: 'Конс.', className: 'bg-emerald-500/10 text-emerald-500 dark:text-emerald-400' };
    case 'Retention':
      return { label: 'Retention', className: 'bg-amber-500/10 text-amber-500 dark:text-amber-400' };
    default:
      return role ? { label: role, className: 'bg-gray-500/10 text-gray-500 dark:text-gray-400' } : null;
  }
};

// ─── Product Funnel Diagram ───────────────────────────────────────────────────
const extractNickname = (crm_link) => {
  if (!crm_link) return null;
  return crm_link.replace(/^https?:\/\/[^/]+\//, '').replace(/^@/, '').trim() || null;
};

const FunnelSalesModal = ({ payments, title, mgrMap, countries: countriesList, onClose }) => {
  const [copiedId, setCopiedId] = useState(null);
  if (!payments) return null;

  const copyNick = (id, nick) => {
    if (!nick) return;
    navigator.clipboard?.writeText(nick).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1500);
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div
        className="relative bg-[#0d0d0d] border border-[#222] rounded-2xl shadow-2xl w-full max-w-5xl mx-4 max-h-[82vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#1a1a1a] shrink-0">
          <div>
            <div className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mb-0.5">Продажи</div>
            <div className="text-[14px] font-black text-white">{title}</div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg bg-[#1a1a1a] hover:bg-[#252525] text-gray-400 hover:text-white transition-colors"
          >
            <svg width="11" height="11" viewBox="0 0 11 11" fill="none"><path d="M1.5 1.5L9.5 9.5M9.5 1.5L1.5 9.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
          </button>
        </div>

        {/* Table */}
        <div className="overflow-y-auto flex-1">
          <table className="w-full">
            <thead className="sticky top-0 bg-[#0d0d0d] border-b border-[#1a1a1a]">
              <tr className="text-gray-600 font-bold uppercase tracking-wider text-[9px]">
                <th className="px-3 py-2 text-left w-7">#</th>
                <th className="px-3 py-2 text-left">Дата</th>
                <th className="px-3 py-2 text-left">Менеджер</th>
                <th className="px-3 py-2 text-left">Роль</th>
                <th className="px-3 py-2 text-left">ГЕО</th>
                <th className="px-3 py-2 text-right">€</th>
                <th className="px-3 py-2 text-left">Тип</th>
                <th className="px-3 py-2 text-center">Покупка</th>
                <th className="px-3 py-2 text-left">Никнейм</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p, i) => {
                const mgr = mgrMap?.[p.manager_id];
                const cDef = countriesList?.find(c => c.code === p.country);
                const roleMeta = getManagerRoleMeta(mgr?.role);
                const nick = extractNickname(p.crm_link);
                const copied = copiedId === (p.id || i);
                return (
                  <tr key={p.id || i} className="border-b border-[#111] hover:bg-[#111] transition-colors">
                    <td className="px-3 py-1.5 text-[10px] text-gray-600">{i + 1}</td>
                    <td className="px-3 py-1.5 text-[11px] text-gray-400 whitespace-nowrap">{p.transaction_date?.slice(0, 10) || '—'}</td>
                    <td className="px-3 py-1.5 text-[11px] text-gray-200 whitespace-nowrap max-w-[140px] truncate">{mgr?.name || '—'}</td>
                    <td className="px-3 py-1.5">
                      {roleMeta
                        ? <span className={`inline-block px-1.5 py-0.5 rounded-md text-[9px] font-bold whitespace-nowrap ${roleMeta.className}`}>{roleMeta.label}</span>
                        : <span className="text-[10px] text-gray-600">—</span>
                      }
                    </td>
                    <td className="px-3 py-1.5 text-[11px] whitespace-nowrap">
                      {cDef?.emoji && <span className="mr-1">{cDef.emoji}</span>}
                      <span className="text-gray-300">{p.country || '—'}</span>
                    </td>
                    <td className="px-3 py-1.5 text-[11px] text-right font-bold text-emerald-400 whitespace-nowrap">
                      {p.amount_eur ? `€${Number(p.amount_eur).toFixed(0)}` : '—'}
                    </td>
                    <td className="px-3 py-1.5 text-[11px] text-gray-500 whitespace-nowrap">{p.payment_type || '—'}</td>
                    <td className="px-3 py-1.5 text-[11px] text-center">
                      <span className="inline-block px-1.5 py-0.5 rounded-md bg-blue-500/15 text-blue-400 font-bold text-[10px]">#{p.purchaseNum}</span>
                    </td>
                    <td className="px-3 py-1.5">
                      {nick ? (
                        <button
                          onClick={(e) => { e.stopPropagation(); copyNick(p.id || i, nick); }}
                          className="flex items-center gap-1 group"
                          title="Копировать никнейм"
                        >
                          <span className={`text-[11px] font-mono transition-colors ${copied ? 'text-emerald-400' : 'text-gray-500 group-hover:text-gray-200'}`}>
                            {nick.slice(0, 22)}
                          </span>
                          {copied
                            ? <svg width="10" height="10" viewBox="0 0 10 10" fill="none" className="text-emerald-400 shrink-0"><path d="M1.5 5L4 7.5L8.5 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                            : <svg width="10" height="10" viewBox="0 0 10 10" fill="none" className="text-gray-700 group-hover:text-gray-400 shrink-0 transition-colors"><rect x="1" y="3" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.2"/><path d="M3 3V2a1 1 0 011-1h3a1 1 0 011 1v5a1 1 0 01-1 1H7" stroke="currentColor" strokeWidth="1.2"/></svg>
                          }
                        </button>
                      ) : <span className="text-[10px] text-gray-600">—</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {payments.length === 0 && (
            <div className="text-center py-12 text-gray-600 text-[12px]">Нет данных</div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-2 border-t border-[#1a1a1a] shrink-0">
          <span className="text-[10px] text-gray-600">{payments.length} записей</span>
        </div>
      </div>
    </div>
  );
};

const FunnelNodeCard = React.forwardRef(({ rank, name, count, cr, nextCount, selected, onClick, onCountClick, style, className }, ref) => (
  <div
    ref={ref}
    onClick={onClick}
    style={style}
    className={`absolute flex items-stretch bg-white dark:bg-[#111] rounded-lg border transition-all select-none overflow-hidden ${
      selected
        ? 'border-blue-400 shadow-md ring-1 ring-blue-400/20'
        : 'border-gray-200 dark:border-[#2a2a2a]'
    } ${onClick ? 'cursor-pointer hover:border-blue-300 dark:hover:border-blue-700' : ''} ${className || ''}`}
  >
    <div className="shrink-0 w-6 flex items-center justify-center bg-blue-50 dark:bg-blue-500/10 border-r border-gray-200 dark:border-[#2a2a2a]">
      <span className="text-[10px] font-black text-blue-500 dark:text-blue-400">{rank}</span>
    </div>
    <div className="flex-1 min-w-0 px-2.5 py-2 text-[12px] font-semibold text-gray-900 dark:text-white truncate flex items-center">{name}</div>
    {cr != null && (
      <>
        <div className="shrink-0 w-px self-stretch bg-gray-100 dark:bg-[#222]" />
        <div className="shrink-0 px-2 py-2 text-[11px] font-bold text-blue-500 dark:text-blue-400 whitespace-nowrap flex items-center">{cr}%</div>
      </>
    )}
    <div className="shrink-0 w-px self-stretch bg-gray-100 dark:bg-[#222]" />
    <div
      className={`shrink-0 px-2.5 py-2 text-[15px] font-black text-gray-800 dark:text-white flex items-center ${onCountClick ? 'cursor-pointer hover:text-blue-500 dark:hover:text-blue-400 transition-colors' : ''}`}
      onClick={onCountClick ? (e) => { e.stopPropagation(); onCountClick(); } : undefined}
    >{count}</div>
    {nextCount != null && (
      <>
        <div className="shrink-0 w-px self-stretch bg-gray-100 dark:bg-[#222]" />
        <div className={`shrink-0 flex items-center gap-1 px-2 ${nextCount > 0 ? 'text-blue-500 dark:text-blue-400' : 'text-gray-300 dark:text-[#555]'}`}>
          <span className="text-[10px] font-bold leading-none">{nextCount}</span>
          <svg width="7" height="10" viewBox="0 0 7 10" fill="none">
            <path d="M1.5 1.5L5.5 5L1.5 8.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      </>
    )}
  </div>
));

const CR_THRESHOLDS = [
  { min: 25, label: 'Отлично', className: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' },
  { min: 15, label: 'Хорошо', className: 'bg-blue-500/20 text-blue-400 border-blue-500/40' },
  { min: 8,  label: 'Средне', className: 'bg-amber-500/20 text-amber-400 border-amber-500/40' },
  { min: 0,  label: 'Низко',  className: 'bg-gray-500/10 text-gray-500 border-gray-500/20' },
];
const crMeta = (cr) => CR_THRESHOLDS.find(t => cr >= t.min) || CR_THRESHOLDS[CR_THRESHOLDS.length - 1];

const ProductConversionSummary = ({ stats }) => {
  const [sortBy, setSortBy] = useState('topCR'); // 'topCR' | 'count'

  const rows = useMemo(() => {
    if (!stats) return [];
    const { stage1, transNM } = stats;
    const trans0 = transNM?.[0] || {};
    return Object.entries(stage1)
      .sort(([, a], [, b]) => b - a)
      .map(([prod, total]) => {
        const nexts = Object.entries(trans0[prod] || {})
          .map(([nextProd, cnt]) => ({
            prod: nextProd,
            count: cnt,
            cr: total > 0 ? (cnt / total) * 100 : 0,
          }))
          .sort((a, b) => sortBy === 'topCR' ? b.cr - a.cr : b.count - a.count);
        const totalConverted = nexts.reduce((s, n) => s + n.count, 0);
        const overallCR = total > 0 ? (totalConverted / total) * 100 : 0;
        return { prod, total, nexts, totalConverted, overallCR };
      })
      .filter(r => r.nexts.length > 0);
  }, [stats, sortBy]);

  if (!rows.length) return <div className="text-center py-12 text-gray-400 text-sm">Нет данных</div>;

  return (
    <div>
      {/* Sort controls */}
      <div className="flex items-center gap-2 mb-4">
        <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Сортировка:</span>
        {[{ id: 'topCR', label: 'По CR%' }, { id: 'count', label: 'По кол-ву' }].map(opt => (
          <button
            key={opt.id}
            onClick={() => setSortBy(opt.id)}
            className={`px-3 py-1 rounded text-[11px] font-bold border transition-colors ${
              sortBy === opt.id ? 'bg-blue-500 border-blue-500 text-white' : 'border-gray-700 text-gray-400 hover:border-blue-500 hover:text-blue-400'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Grid of source products */}
      <div className="flex flex-col gap-3">
        {rows.map(({ prod, total, nexts, totalConverted, overallCR }) => {
          const topNext = nexts[0];
          const meta = crMeta(overallCR);
          return (
            <div key={prod} className="bg-[#0d0d0d] border border-[#1e1e1e] rounded-xl overflow-hidden">
              {/* Header row */}
              <div className="flex items-center gap-4 px-4 py-2.5 border-b border-[#1a1a1a]">
                <div className="flex-1 flex items-center gap-3">
                  <span className="text-[13px] font-black text-white">{prod}</span>
                  <span className="text-[11px] text-gray-500">{total} покупок</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-gray-500">конверсия в 2-й:</span>
                  <span className={`text-[12px] font-black px-2 py-0.5 rounded border ${meta.className}`}>
                    {overallCR.toFixed(1)}%
                  </span>
                  <span className="text-[10px] text-gray-600">({totalConverted} чел.)</span>
                </div>
              </div>

              {/* Next products bar */}
              <div className="px-4 py-3 flex flex-wrap gap-2 items-center">
                {nexts.slice(0, 8).map((n, i) => {
                  const nm = crMeta(n.cr);
                  const isTop = i === 0;
                  return (
                    <div
                      key={n.prod}
                      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border transition-all ${
                        isTop
                          ? 'bg-emerald-500/10 border-emerald-500/40'
                          : 'bg-[#151515] border-[#252525]'
                      }`}
                    >
                      {isTop && (
                        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" className="text-emerald-400 shrink-0">
                          <path d="M5 1L6.2 3.8L9 4.1L7 6.1L7.6 9L5 7.5L2.4 9L3 6.1L1 4.1L3.8 3.8Z" fill="currentColor"/>
                        </svg>
                      )}
                      <span className={`text-[11px] font-semibold ${isTop ? 'text-emerald-300' : 'text-gray-300'}`}>{n.prod}</span>
                      <span className={`text-[11px] font-black px-1.5 py-0.5 rounded border text-[10px] ${nm.className}`}>
                        {n.cr.toFixed(1)}%
                      </span>
                      <span className="text-[10px] text-gray-600">{n.count}</span>
                    </div>
                  );
                })}
                {nexts.length > 8 && (
                  <span className="text-[10px] text-gray-600">+{nexts.length - 8} ещё</span>
                )}
              </div>

              {/* Visual CR bar */}
              {nexts.length > 1 && (
                <div className="px-4 pb-3 flex gap-0.5">
                  {nexts.slice(0, 10).map((n, i) => {
                    const widthPct = totalConverted > 0 ? (n.count / totalConverted) * 100 : 0;
                    const colors = ['bg-emerald-500', 'bg-blue-500', 'bg-amber-500', 'bg-orange-500', 'bg-purple-500', 'bg-pink-500', 'bg-cyan-500', 'bg-red-500', 'bg-lime-500', 'bg-indigo-500'];
                    return (
                      <div
                        key={n.prod}
                        className={`h-1.5 rounded-full ${colors[i % colors.length]} opacity-60`}
                        style={{ width: `${widthPct}%`, minWidth: widthPct > 0 ? 4 : 0 }}
                        title={`${n.prod}: ${n.cr.toFixed(1)}%`}
                      />
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

const ProductFunnelDiagram = ({ stage1Entries, transNM, byCustomer, mgrMap, countries: countriesList }) => {
  const containerRef = useRef(null);
  const scrollbarRef = useRef(null);
  const nodeRefs = useRef({});
  const [selectedPath, setSelectedPath] = useState([]); // selectedPath[i] = selected prod in column i
  const [svgData, setSvgData] = useState({ paths: [], labels: [], w: 0, h: 0 });
  const [modalData, setModalData] = useState(null);
  const isSyncingRef = useRef(false);

  const NODE_W = 230;
  const NODE_H = 38;
  const ROW_GAP = 10;
  const COL_SPACE = 130;

  const columns = useMemo(() => {
    let rankCounter = 1;
    const cols = [];

    // col0: first-purchase products with path-independent nextCount
    const col0Next = {};
    if (byCustomer) {
      Object.values(byCustomer).forEach(purchases => {
        const p0 = purchases[0]?.product;
        if (p0 && purchases[1]?.product) col0Next[p0] = (col0Next[p0] || 0) + 1;
      });
    }
    cols.push((stage1Entries || []).map(([p, c]) => ({
      prod: p, count: c, nextCount: col0Next[p] || 0, rank: rankCounter++,
    })));

    if (!byCustomer || selectedPath.length === 0) return cols;

    // Walk byCustomer with path filtering — each depth filters down eligible customers
    // so counts are always path-conditional (matching the exact upstream selection)
    let eligible = Object.values(byCustomer);
    for (let depth = 0; depth < selectedPath.length; depth++) {
      const selProd = selectedPath[depth];
      if (!selProd) break;

      eligible = eligible.filter(purchases => purchases[depth]?.product === selProd);

      const nextCounts = {};  // count at depth+1
      const nextNext = {};    // of those, how many also have depth+2

      eligible.forEach(purchases => {
        const p = purchases[depth + 1]?.product;
        if (!p) return;
        nextCounts[p] = (nextCounts[p] || 0) + 1;
        if (purchases[depth + 2]?.product) nextNext[p] = (nextNext[p] || 0) + 1;
      });

      const entries = Object.entries(nextCounts).sort(([, a], [, b]) => b - a);
      cols.push(entries.map(([p, c]) => ({
        prod: p, count: c, nextCount: nextNext[p] || 0, rank: rankCounter++,
      })));
    }

    return cols;
  }, [stage1Entries, selectedPath, byCustomer]);

  const handleSelect = (colIdx, prod) => {
    setSelectedPath(prev => {
      if (prev[colIdx] === prod) return prev.slice(0, colIdx); // deselect collapses from here
      return [...prev.slice(0, colIdx), prod];
    });
  };

  const getParentCount = useCallback((colIdx, cols, selPath) => {
    if (colIdx === 0) return null;
    const parentProd = selPath[colIdx - 1];
    return cols[colIdx - 1]?.find(n => n.prod === parentProd)?.count || 1;
  }, []);

  const maxNodes = Math.max(...columns.map(c => c.length), 1);
  const containerH = maxNodes * NODE_H + Math.max(0, maxNodes - 1) * ROW_GAP + 80;
  const totalContentW = columns.length * (NODE_W + COL_SPACE);

  const colLayouts = columns.map((col, colIdx) => {
    const startY = 0;
    return {
      colIdx,
      x: colIdx * (NODE_W + COL_SPACE),
      nodes: col.map((node, i) => ({ ...node, y: startY + i * (NODE_H + ROW_GAP) })),
    };
  });

  const calcSvg = useCallback((cols, selPath) => {
    if (!containerRef.current) return;
    const cR = containerRef.current.getBoundingClientRect();
    const scrollLeft = containerRef.current.scrollLeft;
    const scrollTop = containerRef.current.scrollTop;
    const paths = [];
    const labels = [];

    cols.forEach((col, colIdx) => {
      if (colIdx === 0) return;
      const parentProd = selPath[colIdx - 1];
      if (!parentProd) return;
      const parentRef = nodeRefs.current[`${colIdx - 1}:${parentProd}`];
      if (!parentRef) return;
      const pR = parentRef.getBoundingClientRect();
      const pRx = pR.right - cR.left + scrollLeft;
      const pCy = (pR.top + pR.bottom) / 2 - cR.top + scrollTop;
      const parentCount = getParentCount(colIdx, cols, selPath);

      col.forEach(({ prod, count }) => {
        const nRef = nodeRefs.current[`${colIdx}:${prod}`];
        if (!nRef) return;
        const nR = nRef.getBoundingClientRect();
        const nLx = nR.left - cR.left + scrollLeft;
        const nCy = (nR.top + nR.bottom) / 2 - cR.top + scrollTop;
        const midX = (pRx + nLx) / 2;
        paths.push({ key: `p${colIdx}:${prod}`, d: `M ${pRx} ${pCy} C ${midX} ${pCy}, ${midX} ${nCy}, ${nLx} ${nCy}` });
        const cr = parentCount > 0 ? ((count / parentCount) * 100).toFixed(1) : '0.0';
        labels.push({ key: `l${colIdx}:${prod}`, x: midX, y: (pCy + nCy) / 2, text: `${cr}%` });
      });
    });

    setSvgData({
      paths,
      labels,
      w: containerRef.current.scrollWidth,
      h: containerRef.current.scrollHeight,
    });
  }, [getParentCount]);

  useLayoutEffect(() => {
    const t = setTimeout(() => calcSvg(columns, selectedPath), 30);
    return () => clearTimeout(t);
  }, [columns, selectedPath, calcSvg]);

  const handleContainerScroll = () => {
    if (isSyncingRef.current) return;
    isSyncingRef.current = true;
    if (scrollbarRef.current && containerRef.current) {
      scrollbarRef.current.scrollLeft = containerRef.current.scrollLeft;
    }
    calcSvg(columns, selectedPath);
    isSyncingRef.current = false;
  };

  const handleScrollbarScroll = () => {
    if (isSyncingRef.current) return;
    isSyncingRef.current = true;
    if (containerRef.current && scrollbarRef.current) {
      containerRef.current.scrollLeft = scrollbarRef.current.scrollLeft;
      calcSvg(columns, selectedPath);
    }
    isSyncingRef.current = false;
  };

  const scroll = (dir) => {
    const el = containerRef.current;
    if (!el) return;
    el.scrollLeft += dir * 360;
    if (scrollbarRef.current) scrollbarRef.current.scrollLeft = el.scrollLeft;
    calcSvg(columns, selectedPath);
  };

  return (
    <div>
      {/* Top scrollbar + arrow buttons */}
      <div className="flex items-center gap-2 mb-2">
        <div
          ref={scrollbarRef}
          onScroll={handleScrollbarScroll}
          className="flex-1 overflow-x-scroll"
          style={{ height: 14 }}
        >
          <div style={{ width: totalContentW, height: 1 }} />
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => scroll(-1)}
            className="w-9 h-9 flex items-center justify-center rounded-lg border border-gray-200 dark:border-[#2a2a2a] bg-white dark:bg-[#111] hover:border-blue-400 dark:hover:border-blue-600 text-gray-400 hover:text-blue-500 transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 3L6 8L10 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
          <button
            onClick={() => scroll(1)}
            className="w-9 h-9 flex items-center justify-center rounded-lg border border-gray-200 dark:border-[#2a2a2a] bg-white dark:bg-[#111] hover:border-blue-400 dark:hover:border-blue-600 text-gray-400 hover:text-blue-500 transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M6 3L10 8L6 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
        </div>
      </div>

      {/* Main diagram */}
      <div
        ref={containerRef}
        onScroll={handleContainerScroll}
        className="relative overflow-x-auto pb-6 pt-4"
        style={{ minHeight: containerH + 24 }}
      >
        <svg
          className="absolute inset-0 pointer-events-none"
          width={svgData.w || '100%'}
          height={svgData.h || '100%'}
          style={{ overflow: 'visible' }}
        >
          <defs>
            <marker id="funnel-arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
              <path d="M0,0 L0,6 L6,3 z" fill="#6b7280" />
            </marker>
          </defs>
          {svgData.paths.map(p => (
            <path key={p.key} d={p.d} fill="none" stroke="#6b7280" strokeWidth={1.5} markerEnd="url(#funnel-arrow)" />
          ))}
          {svgData.labels.map(l => (
            <g key={l.key}>
              <circle cx={l.x} cy={l.y} r={13} fill="#1a1a1a" stroke="#374151" strokeWidth={1} />
              <text x={l.x} y={l.y + 4} textAnchor="middle" style={{ fontSize: 10, fontWeight: 800, fill: '#9ca3af', fontFamily: 'inherit' }}>
                {l.text}
              </text>
            </g>
          ))}
        </svg>

        {colLayouts.map(({ colIdx, x, nodes }) =>
          nodes.map(({ prod, count, nextCount: nxt, rank, y }) => {
            const isSelected = selectedPath[colIdx] === prod;
            const parentCount = getParentCount(colIdx, columns, selectedPath);
            const crVal = colIdx === 0 ? null : (parentCount > 0 ? ((count / parentCount) * 100).toFixed(1) : '0.0');

            const handleCountClick = byCustomer ? () => {
              const results = [];
              Object.values(byCustomer).forEach(purchases => {
                // match the full selected path up to this column
                for (let i = 0; i < colIdx; i++) {
                  if (purchases[i]?.product !== selectedPath[i]) return;
                }
                if (purchases[colIdx]?.product !== prod) return;
                const p = purchases[colIdx];
                if (p) results.push({ ...p, purchaseNum: colIdx + 1 });
              });
              results.sort((a, b) => new Date(b.transaction_date) - new Date(a.transaction_date));
              setModalData({ payments: results, title: `${prod} — ${colIdx + 1}-я покупка` });
            } : undefined;

            return (
              <FunnelNodeCard
                key={`${colIdx}:${prod}`}
                ref={el => { nodeRefs.current[`${colIdx}:${prod}`] = el; }}
                rank={rank}
                name={prod}
                count={count}
                cr={crVal}
                nextCount={nxt}
                selected={isSelected}
                onClick={() => handleSelect(colIdx, prod)}
                onCountClick={handleCountClick}
                style={{ left: x, top: y, width: NODE_W }}
              />
            );
          })
        )}

        <div style={{ height: containerH, width: totalContentW }} />
      </div>

      {modalData && (
        <FunnelSalesModal
          payments={modalData.payments}
          title={modalData.title}
          mgrMap={mgrMap}
          countries={countriesList}
          onClose={() => setModalData(null)}
        />
      )}
    </div>
  );
};

const GeoPage = () => {
  const { trafficStats, fetchTrafficStats, user: currentUser, countries, projects, isLoading, managers, schedules } = useAppStore();

  const [dateRange, setDateRange] = useState(getLastWeekRange());
  const [startDate, endDate] = dateRange;
  const [activeProjectFilter, setActiveProjectFilter] = useState(null);
  const [geoSortMode, setGeoSortMode] = useState('cr_desc');
  const [geoQuery, setGeoQuery] = useState('');

  const [filters, setFilters] = useState(createDefaultFilters);
  const deferredGeoQuery = useDeferredValue(geoQuery.trim().toLowerCase());

  const [viewMode, setViewMode] = useState('list'); // 'list' | 'matrix' | 'products'
  const [productsSubView, setProductsSubView] = useState('funnel'); // 'funnel' | 'summary'

  const [localPayments, setLocalPayments] = useState([]);
  const [localLoading, setLocalLoading] = useState(true);

  const [funnelPayments, setFunnelPayments] = useState([]);
  const [funnelLoading, setFunnelLoading] = useState(false);
  const [funnelGeo, setFunnelGeo] = useState('');
  const [funnelStage1, setFunnelStage1] = useState(null);
  const [funnelStage2, setFunnelStage2] = useState(null);
  const funnelFetchedRef = React.useRef(false);

  const fetchLocalPayments = async (fromDate, toDate) => {
    try {
      setLocalLoading(true);

      // Границы по face-value дат календаря (YYYY-MM-DD)
      const startYMD = toYMD(fromDate);
      const endYMD = toYMD(toDate);
      const startISO = `${startYMD}T00:00:00.000Z`;
      const endISO = `${endYMD}T23:59:59.999Z`;

      // Шаг 1: Менеджеры
      const mgrsRes = await supabase.from('managers').select('id, name, role, telegram_username');
      const mgrMap = {};
      (mgrsRes.data || []).forEach(m => {
        mgrMap[m.id] = { name: m.name, role: m.role, telegram_username: m.telegram_username };
      });

      // Шаг 2: Платежи из таблицы payments (БЕЗ JOIN — точные данные, без дубликатов)
      let allPayments = [];
      let offset = 0;
      while (true) {
        const { data: page, error } = await supabase
          .from('payments')
          .select('id, transaction_date, status, product, payment_type, manager_id, country, amount_eur, amount_local, crm_link')
          .gte('transaction_date', startISO)
          .lte('transaction_date', endISO)
          .range(offset, offset + 999);
        if (error || !page || page.length === 0) break;
        allPayments = allPayments.concat(page);
        if (page.length < 1000) break;
        offset += 1000;
      }

      // Шаг 3: Получаем derived_source из вьюхи отдельно (только id + derived_source)
      // Берём первое вхождение по каждому id чтобы избежать дублей JOIN
      const sourceMap = {}; // payment_id -> derived_source
      let srcOffset = 0;
      const seenIds = new Set();
      while (true) {
        const { data: srcPage, error } = await supabase
          .from('enriched_payments_view')
          .select('id, derived_source')
          .gte('transaction_date', startISO)
          .lte('transaction_date', endISO)
          .range(srcOffset, srcOffset + 999);
        if (error || !srcPage || srcPage.length === 0) break;
        srcPage.forEach(row => {
          if (row.id && !seenIds.has(row.id)) {
            seenIds.add(row.id);
            let src = (row.derived_source || 'direct').toLowerCase();
            if (!src || src === 'unknown') src = 'direct';
            sourceMap[row.id] = src;
          }
        });
        if (srcPage.length < 1000) break;
        srcOffset += 1000;
      }

      // Шаг 4: Нормализация
      const normalized = allPayments.map(p => ({
        ...p,
        transactionDate: p.transaction_date,
        amountEUR: Number(p.amount_eur) || 0,
        amountLocal: Number(p.amount_local) || 0,
        manager: mgrMap[p.manager_id]?.name || 'Не назначен',
        managerId: p.manager_id,
        type: p.payment_type || 'Other',
        status: p.status || 'pending',
        source: sourceMap[p.id] || 'direct',
        managerRole: mgrMap[p.manager_id]?.role || null,
        managerTelegram: mgrMap[p.manager_id]?.telegram_username || null,
      }));

      setLocalPayments(normalized);
    } catch (e) {
      console.error('fetchLocalPayments error:', e);
    } finally {
      setLocalLoading(false);
    }
  };

  useEffect(() => {
    if (startDate && endDate) {
      fetchLocalPayments(startDate, endDate);
    }
  }, [startDate?.toISOString(), endDate?.toISOString()]);

  const fetchFunnelPayments = async () => {
    if (funnelFetchedRef.current) return;
    funnelFetchedRef.current = true;
    setFunnelLoading(true);
    try {
      let all = [];
      let offset = 0;
      while (true) {
        const { data, error } = await supabase
          .from('payments')
          .select('id, transaction_date, product, country, crm_link, amount_eur, manager_id, payment_type')
          .eq('status', 'completed')
          .not('crm_link', 'is', null)
          .neq('crm_link', '')
          .order('transaction_date', { ascending: true })
          .range(offset, offset + 999);
        if (error || !data?.length) break;
        all = [...all, ...data];
        if (data.length < 1000) break;
        offset += 1000;
      }
      setFunnelPayments(all);
    } catch (e) {
      console.error('fetchFunnelPayments error:', e);
    } finally {
      setFunnelLoading(false);
    }
  };

  useEffect(() => {
    if (viewMode === 'products') fetchFunnelPayments();
  }, [viewMode]);


  const hasActiveFilters = useMemo(() => {
    return !!(
      filters.manager.length > 0 ||
      filters.product.length > 0 ||
      filters.type.length > 0 ||
      filters.department !== DEFAULT_DEPARTMENT ||
      geoQuery.trim().length > 0
    );
  }, [filters, geoQuery]);

  const resetFilters = () => {
    setFilters(createDefaultFilters());
    setGeoQuery('');
    setDateRange(getLastWeekRange());
    setActiveProjectFilter(null);
  };
  const resetDateRange = () => setDateRange(getLastWeekRange());

  const handleCopyTelegram = async (username) => {
    const formatted = formatTelegramUsername(username);
    if (!formatted) return;
    if (typeof navigator === 'undefined' || !navigator.clipboard?.writeText) {
      showToast('Копирование недоступно в этом браузере', 'error');
      return;
    }

    try {
      await navigator.clipboard.writeText(formatted);
      showToast(`${formatted} скопирован`, 'success');
    } catch (error) {
      console.error('Failed to copy telegram username:', error);
      showToast('Не удалось скопировать никнейм', 'error');
    }
  };

  useEffect(() => {
    if (fetchTrafficStats) {
      if (!startDate || !endDate) return;

      const startClone = new Date(startDate);
      startClone.setHours(0, 0, 0, 0);
      const isoStart = startClone.toISOString();
      
      const endClone = new Date(endDate);
      endClone.setHours(23, 59, 59, 999);
      const isoEnd = endClone.toISOString();

      fetchTrafficStats(isoStart, isoEnd);
    }
  }, [fetchTrafficStats, startDate, endDate]);

  const uniqueValues = useMemo(() => ({
    managers: [...new Set(localPayments.map(p => p.manager).filter(Boolean))].sort(),
    products: [...new Set(localPayments.map(p => p.product).filter(Boolean))].sort(),
    types: [...new Set(localPayments.map(p => p.type).filter(Boolean))].sort()
  }), [localPayments]);

  const isRestrictedUser = useMemo(() => {
    if (!currentUser) return false;
    return ['Sales', 'Retention', 'Consultant'].includes(currentUser.role);
  }, [currentUser]);

  const shiftDatesMap = useMemo(() => {
    if (!schedules || !managers) return new Map();
    const map = new Map();
    const nameMap = new Map();
    managers.forEach(m => nameMap.set(m.id, m.name));

    schedules.forEach(s => {
      const name = nameMap.get(s.manager_id);
      if (!name) return;
      if (!map.has(name)) map.set(name, new Map());
      
      const managerDates = map.get(name);
      const existing = managerDates.get(s.date) || [];
      let geos = s.geo_code ? (Array.isArray(s.geo_code) ? s.geo_code : s.geo_code.split(',').map(g => g.trim().toUpperCase())) : [];
      managerDates.set(s.date, [...new Set([...existing, ...geos])]);
    });
    return map;
  }, [schedules, managers]);

  // Основная логика: агрегация Direct / Comm / Total
  const geoStats = useMemo(() => {
    const startStr = startDate ? toYMD(startDate) : '0000-00-00';
    const endStr = endDate ? toYMD(endDate) : '9999-99-99';

    // 2. Фильтрация платежей
    const filteredPayments = localPayments.filter(item => {
      if (item.status !== 'completed') return false;
      const dbDateStr = extractUTCDate(item.transactionDate);
      if (dbDateStr < startStr || dbDateStr > endStr) return false;
      if (isRestrictedUser) {
        if (item.manager !== currentUser.name) return false;
      } else {
        if (filters.manager.length > 0 && !filters.manager.includes(item.manager)) return false;
      }
      if (filters.product.length > 0 && !filters.product.includes(item.product)) return false;
      if (filters.type.length > 0 && !filters.type.includes(item.type)) return false;
      // Фильтр источника применяем только к трафику, продажи считаем всегда
      if (filters.department !== 'all') {
        if (filters.department === 'sales') {
          if (item.managerRole !== 'Sales' && item.managerRole !== 'SeniorSales') return false;
        } else if (filters.department === 'consultant') {
          if (item.managerRole !== 'Consultant') return false;
        } else if (filters.department === 'taro') {
          if (!/(?:Taro|Таро)\s*[2-9]/.test(item.product)) return false;
        }
      }
      return true;
    });

    // 3. Только коды из БД стран (без Other/Unknown)
    const countryMetaByCode = new Map((countries || []).map((country) => [country.code, country]));
    const validCodes = new Set(countryMetaByCode.keys());

    // Начальная карта
    const statsByGeo = {};
    (countries || []).forEach(c => {
      statsByGeo[c.code] = {
        project_id: c.project_id,
        sales: { direct: 0, comments: 0, all: 0 },
      };
    });

    // 4. Агрегация продаж по источнику
    const managersByGeo = {}; // { geoCode: { managerName: { direct:0, comments:0, whatsapp:0, total:0, role:null, telegram_username:null } } }

    filteredPayments.forEach(p => {
      const code = p.country || null;
      if (!code || !validCodes.has(code)) return;
      const src = (p.source || 'direct').toLowerCase();
      statsByGeo[code].sales.all += 1;
      if (src === 'comments' || src === 'comment') {
        statsByGeo[code].sales.comments += 1;
      } else if (src === 'whatsapp') {
        statsByGeo[code].sales.whatsapp = (statsByGeo[code].sales.whatsapp || 0) + 1;
        statsByGeo[code].sales.direct += 1; // whatsapp also goes to direct bucket for display
      } else {
        statsByGeo[code].sales.direct += 1;
      }

      // Track managers
      const mgr = p.manager || 'Не назначен';
      if (!managersByGeo[code]) managersByGeo[code] = {};
      if (!managersByGeo[code][mgr]) {
        managersByGeo[code][mgr] = {
          direct: 0,
          comments: 0,
          whatsapp: 0,
          total: 0,
          role: p.managerRole || null,
          telegram_username: p.managerTelegram || null,
        };
      }
      if (!managersByGeo[code][mgr].role && p.managerRole) managersByGeo[code][mgr].role = p.managerRole;
      if (!managersByGeo[code][mgr].telegram_username && p.managerTelegram) managersByGeo[code][mgr].telegram_username = p.managerTelegram;
      managersByGeo[code][mgr].total += 1;
      if (src === 'comments' || src === 'comment') managersByGeo[code][mgr].comments += 1;
      else if (src === 'whatsapp') managersByGeo[code][mgr].whatsapp += 1;
      else managersByGeo[code][mgr].direct += 1;
    });

    // 5. Трафик из trafficStats
    const trafficByGeo = {};
    (countries || []).forEach(c => {
      trafficByGeo[c.code] = { direct: 0, comments: 0, whatsapp: 0, all: 0 };
    });
    if (trafficStats) {
      Object.entries(trafficStats).forEach(([code, dates]) => {
        if (!validCodes.has(code)) return;
        if (!trafficByGeo[code]) trafficByGeo[code] = { direct: 0, comments: 0, whatsapp: 0, all: 0 };
        Object.entries(dates).forEach(([dateStr, val]) => {
          if (dateStr < startStr || dateStr > endStr) return;
          let direct = 0, comments = 0, whatsapp = 0, all = 0;
          if (typeof val === 'object') {
            direct = val.direct || 0;
            comments = val.comments || 0;
            whatsapp = val.whatsapp || 0;
            all = val.all || 0;
          } else {
            direct = Number(val) || 0;
            all = Number(val) || 0;
          }

          trafficByGeo[code].direct += direct;
          trafficByGeo[code].comments += comments;
          trafficByGeo[code].whatsapp += whatsapp;
          trafficByGeo[code].all += all;

          // Assign traffic to individual managers who worked on this date in this geo
          shiftDatesMap.forEach((datesMap, mgrName) => {
            const workedGeos = datesMap.get(dateStr);
            if (workedGeos && workedGeos.includes(code)) {
              if (!managersByGeo[code]) managersByGeo[code] = {};
              if (!managersByGeo[code][mgrName]) {
                const mObj = managers?.find(m => m.name === mgrName);
                managersByGeo[code][mgrName] = {
                  direct: 0, comments: 0, whatsapp: 0, total: 0,
                  traffic: { direct: 0, comments: 0, whatsapp: 0, all: 0 },
                  role: mObj?.role || null,
                  telegram_username: mObj?.telegram_username || null,
                };
              } else if (!managersByGeo[code][mgrName].traffic) {
                managersByGeo[code][mgrName].traffic = { direct: 0, comments: 0, whatsapp: 0, all: 0 };
              }

              managersByGeo[code][mgrName].traffic.direct += direct;
              managersByGeo[code][mgrName].traffic.comments += comments;
              managersByGeo[code][mgrName].traffic.whatsapp += whatsapp;
              managersByGeo[code][mgrName].traffic.all += all;
            }
          });
        });
      });
    }

    // Initialize traffic object for managers who only had sales but NO traffic recorded from schedule (to avoid undefined errors)
    Object.values(managersByGeo).forEach(mgrMap => {
        Object.values(mgrMap).forEach(mgr => {
            if (!mgr.traffic) mgr.traffic = { direct: 0, comments: 0, whatsapp: 0, all: 0 };
        });
    });

    // 6. Финальный массив с CR
    const baseStats = Object.entries(statsByGeo).map(([code, data]) => {
      const t = trafficByGeo[code] || { direct: 0, comments: 0, whatsapp: 0, all: 0 };
      const s = data.sales;
      const tWA = t.whatsapp || 0;
      const sWA = s.whatsapp || 0;
      // For direct display: subtract whatsapp so direct = true direct only
      const tDirect = t.direct || 0;
      const sDirect = s.direct - sWA; // direct sales excluding whatsapp
      return {
        code,
        project_id: data.project_id,
        traffic: { direct: tDirect, comments: t.comments, whatsapp: tWA, all: t.all },
        sales: { direct: sDirect, comments: s.comments, whatsapp: sWA, all: s.all },
        cr: {
          direct: tDirect > 0 ? parseFloat(((sDirect / tDirect) * 100).toFixed(2)) : 0,
          comments: t.comments > 0 ? parseFloat(((s.comments / t.comments) * 100).toFixed(2)) : 0,
          whatsapp: tWA > 0 ? parseFloat(((sWA / tWA) * 100).toFixed(2)) : 0,
          all: t.all > 0 ? parseFloat(((s.all / t.all) * 100).toFixed(2)) : 0,
        },
        managers: Object.entries(managersByGeo[code] || {}).sort((a, b) => b[1].total - a[1].total),
      };
    });

    // 7. Фильтр по проекту
    let result = baseStats;
    if (activeProjectFilter) {
      result = result.filter(g => g.project_id === activeProjectFilter);
    }
    if (deferredGeoQuery) {
      result = result.filter((geo) => {
        const country = countryMetaByCode.get(geo.code);
        const code = geo.code?.toLowerCase() || '';
        const name = country?.name?.toLowerCase() || '';
        return code.includes(deferredGeoQuery) || name.includes(deferredGeoQuery);
      });
    }

    // 8. Сортировка
    return result.sort((a, b) => {
      // Игнорируем проекты при выборе специфичных метрик
      if (geoSortMode === 'cr_desc') {
        const crA = a.cr.all || 0;
        const crB = b.cr.all || 0;
        if (crA !== crB) return crB - crA;
        return b.traffic.all - a.traffic.all;
      }
      if (geoSortMode === 'cr_asc') {
        const crA = a.cr.all || 0;
        const crB = b.cr.all || 0;
        if (crA !== crB) return crA - crB;
        return b.traffic.all - a.traffic.all;
      }

      // traffic_desc (Обычный режим с проектами)
      const pA = (projects || []).find(p => p.id === a.project_id)?.name || '';
      const pB = (projects || []).find(p => p.id === b.project_id)?.name || '';
      const isAstroA = pA.toLowerCase().includes('astrology') || pA.toLowerCase().includes('астро');
      const isAstroB = pB.toLowerCase().includes('astrology') || pB.toLowerCase().includes('астро');
      if (isAstroA && !isAstroB) return -1;
      if (!isAstroA && isAstroB) return 1;
      if (pA !== pB) return pA.localeCompare(pB);
      return b.traffic.all - a.traffic.all;
    });
  }, [localPayments, trafficStats, startDate, endDate, filters, isRestrictedUser, currentUser, countries, projects, activeProjectFilter, geoSortMode, deferredGeoQuery, shiftDatesMap, managers]);

  // Product-level aggregation
  const productFunnelStats = useMemo(() => {
    if (!funnelPayments.length) return null;

    const filtered = funnelGeo
      ? funnelPayments.filter(p => p.country === funnelGeo)
      : funnelPayments;

    const byCustomer = {};
    filtered.forEach(p => {
      if (!p.crm_link || !p.product) return;
      if (!byCustomer[p.crm_link]) byCustomer[p.crm_link] = [];
      byCustomer[p.crm_link].push(p);
    });

    Object.values(byCustomer).forEach(arr => {
      arr.sort((a, b) => new Date(a.transaction_date) - new Date(b.transaction_date));
    });

    const stage1 = {};
    const stage2 = {};
    const stage3 = {};
    const stage4 = {};
    const stage5 = {};
    // transNM[n][prod] = { nextProd: count } — transition from (n+1)th to (n+2)th purchase
    const transNM = [];

    Object.values(byCustomer).forEach(purchases => {
      const p1 = purchases[0]?.product;
      if (!p1) return;
      stage1[p1] = (stage1[p1] || 0) + 1;
      if (purchases[1]?.product) stage2[purchases[1].product] = (stage2[purchases[1].product] || 0) + 1;
      if (purchases[2]?.product) stage3[purchases[2].product] = (stage3[purchases[2].product] || 0) + 1;
      if (purchases[3]?.product) stage4[purchases[3].product] = (stage4[purchases[3].product] || 0) + 1;
      if (purchases[4]?.product) stage5[purchases[4].product] = (stage5[purchases[4].product] || 0) + 1;
      for (let i = 0; i < purchases.length - 1; i++) {
        const p = purchases[i]?.product;
        const pNext = purchases[i + 1]?.product;
        if (!p || !pNext) continue;
        if (!transNM[i]) transNM[i] = {};
        if (!transNM[i][p]) transNM[i][p] = {};
        transNM[i][p][pNext] = (transNM[i][p][pNext] || 0) + 1;
      }
    });

    const trans12 = transNM[0] || {};
    const trans23 = transNM[1] || {};
    const totalWith1st = Object.values(stage1).reduce((s, v) => s + v, 0);
    const totalWith2nd = Object.values(stage2).reduce((s, v) => s + v, 0);
    const totalWith3rd = Object.values(stage3).reduce((s, v) => s + v, 0);
    const totalWith4th = Object.values(stage4).reduce((s, v) => s + v, 0);
    const totalWith5th = Object.values(stage5).reduce((s, v) => s + v, 0);
    return { stage1, stage2, stage3, stage4, stage5, trans12, trans23, transNM, byCustomer, totalWith1st, totalWith2nd, totalWith3rd, totalWith4th, totalWith5th };
  }, [funnelPayments, funnelGeo]);

  const funnelMgrMap = useMemo(() => {
    const m = {};
    (managers || []).forEach(mgr => { m[mgr.id] = mgr; });
    return m;
  }, [managers]);

  const handleExportGeoTable = () => {
    if (!geoStats.length) {
      showToast('Нет данных для выгрузки', 'error');
      return;
    }

    const periodLabel = formatExportPeriodLabel(startDate, endDate);
    const exportColumns = [
      { label: 'Лиды Direct', getValue: (geo) => geo.traffic.direct || 0 },
      { label: 'Лиды Коммент.', getValue: (geo) => geo.traffic.comments || 0 },
      { label: 'Лиды WhatsApp', getValue: (geo) => geo.traffic.whatsapp || 0 },
      { label: 'Лиды Всего', getValue: (geo) => geo.traffic.all || 0 },
      { label: 'CR Direct', getValue: (geo) => formatExportPercent(geo.cr.direct) },
      { label: 'CR Коммент.', getValue: (geo) => formatExportPercent(geo.cr.comments) },
      { label: 'CR WhatsApp', getValue: (geo) => formatExportPercent(geo.cr.whatsapp) },
      { label: 'CR Всего', getValue: (geo) => formatExportPercent(geo.cr.all) },
    ];
    const csvRows = [
      ['', ...exportColumns.map(() => periodLabel)],
      ['', ...exportColumns.map((column) => column.label)],
      ...geoStats.map((geo) => {
        const countryDef = countries?.find((country) => country.code === geo.code);
        const countryName = countryDef?.name || geo.code;
        return [countryName, ...exportColumns.map((column) => column.getValue(geo))];
      }),
    ];

    const csvContent = [
      'sep=;',
      ...csvRows.map((row) => row.map(escapeCsvCell).join(';')),
    ].join('\r\n');

    const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const filePeriod = `${toYMD(startDate)}_${toYMD(endDate)}`;

    link.href = url;
    link.setAttribute('download', `geo_leads_cr_${filePeriod}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    showToast('Выгрузка готова', 'success');
  };

  const matrixDates = useMemo(() => {
    if (!startDate || !endDate) return [];
    const dates = [];
    let current = new Date(startDate);
    current.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    
    let count = 0;
    while (current <= end && count < 365) {
      const y = current.getFullYear();
      const m = String(current.getMonth() + 1).padStart(2, '0');
      const d = String(current.getDate()).padStart(2, '0');
      dates.push(`${y}-${m}-${d}`);
      current.setDate(current.getDate() + 1);
      count++;
    }
    return dates;
  }, [startDate, endDate]);

  const { matrixData, matrixAverages, hasMatrixData } = useMemo(() => {
    const dates = matrixDates;
    if (!dates.length) return { matrixData: [], matrixAverages: {}, hasMatrixData: false };

    const startStr = startDate ? toYMD(startDate) : '0000-00-00';
    const endStr = endDate ? toYMD(endDate) : '9999-99-99';

    const filteredPayments = localPayments.filter(item => {
      if (item.status !== 'completed') return false;
      const dbDateStr = extractUTCDate(item.transactionDate);
      if (dbDateStr < startStr || dbDateStr > endStr) return false;
      if (isRestrictedUser && item.manager !== currentUser?.name) return false;
      if (!isRestrictedUser && filters.manager.length > 0 && !filters.manager.includes(item.manager)) return false;
      if (filters.product.length > 0 && !filters.product.includes(item.product)) return false;
      if (filters.type.length > 0 && !filters.type.includes(item.type)) return false;
      if (filters.department !== 'all') {
        if (filters.department === 'sales' && item.managerRole !== 'Sales' && item.managerRole !== 'SeniorSales') return false;
        if (filters.department === 'consultant' && item.managerRole !== 'Consultant') return false;
        if (filters.department === 'taro' && !/(?:Taro|Таро)\s*[2-9]/.test(item.product)) return false;
      }
      return true;
    });

    const validCodes = new Set((countries || []).map(c => c.code));
    const statsByGeoDate = {};
    const totalsByDate = {};
    
    dates.forEach(d => {
      totalsByDate[d] = {
        traffic: { direct: 0, whatsapp: 0, comments: 0, all: 0 },
        sales: { direct: 0, whatsapp: 0, comments: 0, all: 0 }
      };
    });

    validCodes.forEach(code => {
      statsByGeoDate[code] = {};
    });

    filteredPayments.forEach(p => {
      const code = p.country;
      const tDate = extractUTCDate(p.transactionDate);
      if (!code || !validCodes.has(code) || !dates.includes(tDate)) return;

      if (!statsByGeoDate[code][tDate]) {
        statsByGeoDate[code][tDate] = { traffic: {direct:0, whatsapp:0, comments:0, all:0}, sales: {direct:0, whatsapp:0, comments:0, all:0} };
      }

      const src = (p.source || 'direct').toLowerCase();
      statsByGeoDate[code][tDate].sales.all += 1;
      totalsByDate[tDate].sales.all += 1;

      if (src === 'comments' || src === 'comment') {
        statsByGeoDate[code][tDate].sales.comments += 1;
        totalsByDate[tDate].sales.comments += 1;
      } else if (src === 'whatsapp') {
        statsByGeoDate[code][tDate].sales.whatsapp += 1;
        statsByGeoDate[code][tDate].sales.direct += 1;
        totalsByDate[tDate].sales.whatsapp += 1;
        totalsByDate[tDate].sales.direct += 1;
      } else {
        statsByGeoDate[code][tDate].sales.direct += 1;
        totalsByDate[tDate].sales.direct += 1;
      }
    });

    if (trafficStats) {
      Object.entries(trafficStats).forEach(([code, dVals]) => {
        if (!validCodes.has(code)) return;
        Object.entries(dVals).forEach(([dateStr, val]) => {
          if (!dates.includes(dateStr)) return;
          if (!statsByGeoDate[code][dateStr]) {
            statsByGeoDate[code][dateStr] = { traffic: {direct:0, whatsapp:0, comments:0, all:0}, sales: {direct:0, whatsapp:0, comments:0, all:0} };
          }
          let direct = 0, comments = 0, whatsapp = 0, all = 0;
          if (typeof val === 'object') {
            direct = val.direct || 0;
            comments = val.comments || 0;
            whatsapp = val.whatsapp || 0;
            all = val.all || 0;
          } else {
             direct = Number(val) || 0;
             all = Number(val) || 0;
          }
          statsByGeoDate[code][dateStr].traffic.direct += direct;
          statsByGeoDate[code][dateStr].traffic.comments += comments;
          statsByGeoDate[code][dateStr].traffic.whatsapp += whatsapp;
          statsByGeoDate[code][dateStr].traffic.all += all;

          totalsByDate[dateStr].traffic.direct += direct;
          totalsByDate[dateStr].traffic.comments += comments;
          totalsByDate[dateStr].traffic.whatsapp += whatsapp;
          totalsByDate[dateStr].traffic.all += all;
        });
      });
    }

    const mData = [];
    validCodes.forEach(code => {
      const dailyData = {};
      let geoHasData = false;
      let totalTraffic = 0;

      dates.forEach(dateStr => {
        const stats = statsByGeoDate[code][dateStr];
        if (!stats) {
          dailyData[dateStr] = { hasData: false };
        } else {
          geoHasData = true;
          const s = stats.sales;
          const t = stats.traffic;
          totalTraffic += t.all;

          const trueDirectSales = s.direct - s.whatsapp;
          
          const crDirect = t.direct > 0 ? (trueDirectSales / t.direct) * 100 : 0;
          const crWhatsapp = t.whatsapp > 0 ? (s.whatsapp / t.whatsapp) * 100 : 0;
          const crComments = t.comments > 0 ? (s.comments / t.comments) * 100 : 0;
          const crTotal = t.all > 0 ? (s.all / t.all) * 100 : 0;

          dailyData[dateStr] = { 
             hasData: true, 
             crDirect, crWhatsapp, crComments, crTotal,
             tAll: t.all, tDirect: t.direct, tWhatsapp: t.whatsapp, tComments: t.comments
          };
        }
      });

      if (geoHasData) {
        mData.push({ code, dailyData, totalTraffic });
      }
    });

    const mAves = {};
    let hasD = false;
    dates.forEach(d => {
      const s = totalsByDate[d].sales;
      const t = totalsByDate[d].traffic;
      const trueDirectSales = s.direct - s.whatsapp;

      const crDirect = t.direct > 0 ? (trueDirectSales / t.direct) * 100 : 0;
      const crWhatsapp = t.whatsapp > 0 ? (s.whatsapp / t.whatsapp) * 100 : 0;
      const crComments = t.comments > 0 ? (s.comments / t.comments) * 100 : 0;
      const crTotal = t.all > 0 ? (s.all / t.all) * 100 : 0;

      if (t.all > 0 || s.all > 0) hasD = true;

      mAves[d] = {
        hasData: t.all > 0 || s.all > 0,
        crDirect, crWhatsapp, crComments, crTotal,
        tAll: t.all, tDirect: t.direct, tWhatsapp: t.whatsapp, tComments: t.comments
      };
    });

    let filteredResult = mData;
    if (deferredGeoQuery) {
      filteredResult = filteredResult.filter((geo) => {
        const country = (countries || []).find(c => c.code === geo.code);
        const ccode = geo.code?.toLowerCase() || '';
        const name = country?.name?.toLowerCase() || '';
        return ccode.includes(deferredGeoQuery) || name.includes(deferredGeoQuery);
      });
    }

    return { 
      matrixData: filteredResult.sort((a, b) => b.totalTraffic - a.totalTraffic), 
      matrixAverages: mAves,
      hasMatrixData: hasD || filteredResult.length > 0
    };
  }, [localPayments, trafficStats, startDate, endDate, filters, isRestrictedUser, currentUser, countries, deferredGeoQuery, matrixDates]);

  const localIsLoading = localLoading || (!localPayments.length && isLoading);

  if (localIsLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-[#111] border border-gray-200 dark:border-[#333] rounded-lg shadow-sm">
        <RefreshCw size={28} className="text-blue-500 animate-spin mb-3" />
        <p className="text-gray-500 dark:text-gray-400 font-medium text-sm">Загрузка данных...</p>
      </div>
    );
  }

  return (
    <div className="pb-10 w-full max-w-full overflow-x-hidden">

      {/* HEADER + FILTERS */}
      <div className="sticky top-0 z-20 bg-[#F5F5F5] dark:bg-[#0A0A0A] -mx-3 px-2 md:px-6 py-2 md:py-3 border-b border-transparent transition-colors duration-200">

        {/* Заголовок */}
        <div className="flex flex-col md:flex-row items-start md:items-center gap-3 mb-4">
          <h2 className="text-base 2xl:text-lg font-bold dark:text-white tracking-tight flex items-center gap-2 pr-4 shrink-0">
            <Globe size={17} className="text-blue-500 shrink-0 2xl:w-[18px] 2xl:h-[18px]" />
            <span className="truncate">Конверсии</span>
          </h2>

          <div className="flex bg-gray-200 dark:bg-[#1A1A1A] p-0.5 rounded-[8px] h-[30px] 2xl:h-[32px] items-center shrink-0 w-full md:w-auto">
            <button onClick={() => setGeoSortMode('traffic_desc')} className={`flex-1 px-2.5 2xl:px-3 h-full rounded-[6px] text-[10px] 2xl:text-[11px] font-bold transition-all whitespace-nowrap ${geoSortMode === 'traffic_desc' ? 'bg-white dark:bg-[#333] text-black dark:text-white shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}>По объему лидов</button>
            <button onClick={() => setGeoSortMode('cr_desc')} className={`flex-1 px-2.5 2xl:px-3 h-full rounded-[6px] text-[10px] 2xl:text-[11px] font-bold transition-all whitespace-nowrap ${geoSortMode === 'cr_desc' ? 'bg-white dark:bg-[#333] text-emerald-600 dark:text-emerald-400 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}>Лучший CR</button>
            <button onClick={() => setGeoSortMode('cr_asc')} className={`flex-1 px-2.5 2xl:px-3 h-full rounded-[6px] text-[10px] 2xl:text-[11px] font-bold transition-all whitespace-nowrap ${geoSortMode === 'cr_asc' ? 'bg-white dark:bg-[#333] text-rose-600 dark:text-rose-400 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}>Худший CR</button>
          </div>
        </div>

        {/* Все фильтры - wrapper только для мобильных */}
        <div className="mx-auto max-w-[90%] md:max-w-none">
          <div className="flex flex-col md:flex-row md:flex-wrap items-stretch md:items-center gap-2 md:justify-between">

            {/* ГРУППА КНОПОК СЛЕВА */}
            <div className="flex flex-col md:flex-row gap-2 w-full md:w-auto">
              {/* Поиск GEO */}
              <div className="flex h-[32px] 2xl:h-[34px] w-full md:w-[190px] 2xl:md:w-[220px] items-center gap-2 rounded-[6px] bg-gray-200 px-2.5 2xl:px-3 dark:bg-[#1A1A1A] border border-transparent focus-within:border-gray-300 dark:focus-within:border-[#333]">
                <Search size={11} className="shrink-0 text-gray-400 2xl:w-[12px] 2xl:h-[12px]" />
                <input
                  type="text"
                  value={geoQuery}
                  onChange={(e) => setGeoQuery(e.target.value)}
                  placeholder="Поиск по GEO"
                  aria-label="Поиск по GEO"
                  className="w-full bg-transparent text-[10px] 2xl:text-[11px] font-medium text-gray-700 outline-none placeholder:text-gray-500 dark:text-gray-200"
                />
                {geoQuery ? (
                  <button
                    type="button"
                    onClick={() => setGeoQuery('')}
                    className="shrink-0 text-gray-400 transition-colors hover:text-gray-600 dark:hover:text-gray-200"
                    title="Очистить поиск"
                  >
                    <X size={11} className="2xl:w-[12px] 2xl:h-[12px]" />
                  </button>
                ) : null}
              </div>

              {/* Кнопки Департаментов */}
              <div className="flex bg-gray-200 dark:bg-[#1A1A1A] p-0.5 rounded-[6px] h-[32px] 2xl:h-[34px] items-center w-full md:w-auto justify-center">
                <button onClick={() => setFilters(prev => ({ ...prev, department: 'all' }))} className={`px-2 2xl:px-2.5 h-full rounded-[4px] text-[9px] 2xl:text-[10px] font-bold transition-all whitespace-nowrap ${filters.department === 'all' ? 'bg-white dark:bg-[#333] text-black dark:text-white shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}>Все</button>
                <button onClick={() => setFilters(prev => ({ ...prev, department: 'sales' }))} className={`px-2 2xl:px-2.5 h-full rounded-[4px] text-[9px] 2xl:text-[10px] font-bold transition-all whitespace-nowrap ${filters.department === 'sales' ? 'bg-white dark:bg-[#333] text-black dark:text-white shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}>ОП</button>
                <button onClick={() => setFilters(prev => ({ ...prev, department: 'consultant' }))} className={`px-2 2xl:px-2.5 h-full rounded-[4px] text-[9px] 2xl:text-[10px] font-bold transition-all whitespace-nowrap ${filters.department === 'consultant' ? 'bg-white dark:bg-[#333] text-black dark:text-white shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}>Конс.</button>
                <button onClick={() => setFilters(prev => ({ ...prev, department: 'taro' }))} className={`px-2 2xl:px-2.5 h-full rounded-[4px] text-[9px] 2xl:text-[10px] font-bold transition-all whitespace-nowrap ${filters.department === 'taro' ? 'bg-white dark:bg-[#333] text-purple-600 dark:text-purple-400 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}>Таро</button>
              </div>
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
                    {(filters.manager.length > 0 || filters.product.length > 0 || filters.type.length > 0 || filters.department !== DEFAULT_DEPARTMENT) && '●'}
                  </span>
                </button>

                {filters.showMobileFilters && (
                  <div className="space-y-2 p-3 bg-white dark:bg-[#111] border border-gray-200 dark:border-[#333] rounded-lg">
                    {!isRestrictedUser && <DenseSelect label="Менеджер" value={filters.manager} options={uniqueValues.managers} onChange={(val) => setFilters(p => ({ ...p, manager: val }))} />}
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
                    <DenseSelect label="Платежки" value={filters.type} options={uniqueValues.types} onChange={(val) => setFilters(p => ({ ...p, type: val }))} />

                    <MobileDateRangePicker
                      startDate={startDate}
                      endDate={endDate}
                      onChange={(update) => setDateRange(update)}
                      onReset={resetDateRange}
                    />

                    <button
                      type="button"
                      onClick={handleExportGeoTable}
                      disabled={!geoStats.length}
                      className={`w-full flex items-center justify-center gap-2 rounded-[6px] px-3 py-2 text-xs font-bold transition-opacity ${
                        geoStats.length
                          ? 'bg-black dark:bg-white text-white dark:text-black hover:opacity-80'
                          : 'bg-gray-200 dark:bg-[#1A1A1A] text-gray-400 cursor-not-allowed'
                      }`}
                    >
                      <Download size={12} />
                      <span>Скачать таблицу</span>
                    </button>

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

              <div className="hidden md:flex md:w-[210px] 2xl:md:w-[240px]">
                <CustomDateRangePicker
                  startDate={startDate}
                  endDate={endDate}
                  onChange={(update) => setDateRange(update)}
                  onReset={resetDateRange}
                />
              </div>

              <button
                type="button"
                onClick={handleExportGeoTable}
                disabled={!geoStats.length}
                className={`hidden md:inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-[6px] text-xs font-bold transition-opacity h-[34px] ${
                  geoStats.length
                    ? 'bg-black dark:bg-white text-white dark:text-black hover:opacity-80'
                    : 'bg-gray-200 dark:bg-[#1A1A1A] text-gray-400 cursor-not-allowed'
                }`}
              >
                <Download size={12} />
                <span>Выгрузка</span>
              </button>

            </div>
          </div>
        </div>
      </div>
      
      {/* VIEW TOGGLES */}
      <div className="mt-4 flex bg-white dark:bg-[#111] p-1 rounded-lg border border-gray-200 dark:border-[#333] w-fit shadow-sm overflow-hidden mb-2">
         <button 
           onClick={() => setViewMode('list')}
           className={`px-4 py-1.5 text-xs font-bold rounded-md transition-colors flex items-center gap-2 ${viewMode === 'list' ? 'bg-blue-500 text-white shadow-sm' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-[#222]'}`}
         >
           <List size={14} /> По ГЕО
         </button>
         <button 
           onClick={() => setViewMode('matrix')}
           className={`px-4 py-1.5 text-xs font-bold rounded-md transition-colors flex items-center gap-2 ${viewMode === 'matrix' ? 'bg-blue-500 text-white shadow-sm' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-[#222]'}`}
         >
           <CalendarIcon size={14} /> Сетка конверсий
         </button>
         <button 
           onClick={() => setViewMode('products')}
           className={`px-4 py-1.5 text-xs font-bold rounded-md transition-colors flex items-center gap-2 ${viewMode === 'products' ? 'bg-blue-500 text-white shadow-sm' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-[#222]'}`}
         >
           По Продуктам
         </button>
      </div>

      {viewMode === 'list' || viewMode === 'matrix' ? (
      <>
      {viewMode === 'list' ? (
      <div className="space-y-2">
        {/* HORIZONTAL CARDS LIST */}
        {geoStats.length === 0 ? (
          <div className="text-center py-12 text-gray-400 text-sm bg-white dark:bg-[#111] rounded-xl border border-gray-200 dark:border-[#2a2a2a]">Нет данных за выбранный период</div>
        ) : (
          geoStats.map((geo) => {
            const countryDef = countries?.find(c => c.code === geo.code) || { name: geo.code, emoji: '🏳️' };
            const project = (projects || []).find(p => p.id === geo.project_id);
            const projName = project?.name?.toLowerCase() || '';
            const flagIconUrl = getFlagIconUrl(geo.code);

            const crClass = (val) => {
              if (val >= 8) return 'text-emerald-500 font-bold';
              if (val >= 3) return 'text-amber-500 font-semibold';
              if (val > 0) return 'text-red-400';
              return 'text-gray-400 dark:text-gray-600';
            };

            let cardBorder = 'border-gray-200 dark:border-[#2a2a2a]';
            if (projName.includes('органик') || projName.includes('organic')) cardBorder = 'border-amber-200 dark:border-amber-900/40';
            else if (projName.includes('таро') || projName.includes('taro')) cardBorder = 'border-fuchsia-200 dark:border-fuchsia-900/40';

            const srcCols = [
              { key: 'direct', label: 'Direct', color: 'text-blue-500', bgLabel: 'bg-blue-500/10', traffic: geo.traffic.direct, sales: geo.sales.direct, cr: geo.cr.direct },
              { key: 'comments', label: 'Коммент.', color: 'text-orange-500', bgLabel: 'bg-orange-500/10', traffic: geo.traffic.comments, sales: geo.sales.comments, cr: geo.cr.comments },
              { key: 'whatsapp', label: 'WhatsApp', color: 'text-green-500', bgLabel: 'bg-green-500/10', traffic: geo.traffic.whatsapp, sales: geo.sales.whatsapp, cr: geo.cr.whatsapp },
              { key: 'all', label: 'Всего', color: 'text-gray-400', bgLabel: 'bg-gray-500/10', traffic: geo.traffic.all, sales: geo.sales.all, cr: geo.cr.all },
            ];

            return (
              <div key={geo.code} className={`bg-white dark:bg-[#111] rounded-lg 2xl:rounded-xl border ${cardBorder} shadow-sm overflow-hidden`}>
                <div className="flex items-stretch divide-x divide-gray-200 dark:divide-[#2a2a2a]">

                  {/* LEFT: Geo identity */}
                  <div className="relative w-[156px] xl:w-[168px] 2xl:w-[210px] shrink-0 overflow-hidden bg-gradient-to-br from-transparent via-transparent to-gray-100/50 dark:to-white/[0.03]">
                    {flagIconUrl ? (
                      <img
                        src={flagIconUrl}
                        alt=""
                        aria-hidden="true"
                        loading="lazy"
                        decoding="async"
                        className="pointer-events-none absolute right-[-16%] top-1/2 h-[125%] w-auto -translate-y-1/2 opacity-[0.08] dark:opacity-[0.06] saturate-[1.15]"
                      />
                    ) : null}
                    <div className="relative z-10 flex items-center gap-2 2xl:gap-3 px-2.5 2xl:px-4 py-2 2xl:py-3 h-full">
                      <div className="flex h-[18px] w-[26px] xl:h-[20px] xl:w-[28px] 2xl:h-[22px] 2xl:w-[32px] shrink-0 items-center justify-center overflow-hidden rounded-[4px] border border-white/20 dark:border-white/10 shadow-sm">
                        <CountryFlagIcon
                          code={geo.code}
                          emoji={countryDef.emoji}
                          name={countryDef.name || geo.code}
                          imgClassName="h-full w-full object-cover"
                          fallbackClassName="text-[18px] xl:text-[20px] 2xl:text-[22px] leading-none"
                        />
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-[12px] xl:text-[13px] 2xl:text-sm text-gray-900 dark:text-white truncate">
                          {countryDef.name || geo.code}
                        </div>
                        <div className="mt-1 flex items-center gap-1.5 2xl:gap-2 min-w-0">
                          <span className="text-[8px] xl:text-[9px] 2xl:text-[10px] font-mono uppercase text-gray-400 shrink-0">
                            {geo.code}
                          </span>
                          {project ? <ProjectBadge project={project} size="xs" /> : null}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* CENTER: Source breakdown */}
                  <div className="grid flex-[1.2] min-w-0 grid-cols-2 lg:grid-cols-4 divide-x divide-gray-200 dark:divide-[#2a2a2a]">
                    {srcCols.map((col) => (
                      <div key={col.key} className={`flex h-full min-w-0 flex-col justify-center px-2 2xl:px-3 py-2 2xl:py-3 ${col.key === 'all' ? 'bg-gray-50/60 dark:bg-[#171717]' : ''}`}>
                        <div className="mb-1 2xl:mb-2 flex justify-center">
                          <span className={`inline-flex items-center rounded-full px-1.5 2xl:px-2 py-0.5 2xl:py-1 text-[8px] xl:text-[9px] 2xl:text-[10px] font-bold ${col.color} ${col.bgLabel}`}>
                            {col.label}
                          </span>
                        </div>

                        <div className="flex items-stretch h-full">
                          <div className="flex flex-1 flex-col items-center justify-center pr-1.5 2xl:pr-3 text-center min-w-[56px] xl:min-w-[64px] 2xl:min-w-[80px]">
                            <div className="flex flex-col items-center mb-2 2xl:mb-3">
                              <span className={`text-[14px] xl:text-[15px] 2xl:text-[17px] font-black leading-none ${col.traffic > 0 ? 'text-blue-500 dark:text-blue-400' : 'text-gray-300 dark:text-gray-600'}`}>
                                {(col.traffic || 0).toLocaleString()}
                              </span>
                              <span className="text-[8px] xl:text-[9px] 2xl:text-[10px] text-gray-400 font-bold uppercase tracking-tighter mt-1">
                                заявок
                              </span>
                            </div>

                            <div className="flex flex-col items-center">
                              <span className={`text-[14px] xl:text-[15px] 2xl:text-[17px] font-black leading-none ${col.sales > 0 ? 'text-gray-900 dark:text-white' : 'text-gray-300 dark:text-gray-700'}`}>
                                {col.sales || 0}
                              </span>
                              <span className="text-[8px] xl:text-[9px] 2xl:text-[10px] text-gray-400 font-bold uppercase tracking-tighter mt-1">
                                продаж
                              </span>
                            </div>
                          </div>

                          <div className="flex flex-col items-center justify-center w-[44px] xl:w-[48px] 2xl:w-[60px] shrink-0 pl-1 2xl:pl-2">
                            <span className={`text-[12px] xl:text-[13px] 2xl:text-[15px] font-black ${crClass(col.cr)}`}>
                              {`${col.cr || 0}%`}
                            </span>
                            <span className="text-[8px] xl:text-[9px] 2xl:text-[10px] text-gray-400 font-bold uppercase tracking-tighter mt-1">
                              CR
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* RIGHT: Managers (now has all remaining space) */}
                  {geo.managers && geo.managers.length > 0 && (
                    <div className="flex-1 min-w-0 bg-white dark:bg-[#0a0a0a] flex flex-col border-l-4 border-gray-50 dark:border-[#141414]">
                      {/* Managers Header Row */}
                      <div className="px-2.5 2xl:px-4 py-1.5 2xl:py-2.5 text-[8px] xl:text-[9px] 2xl:text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider border-b border-gray-100 dark:border-[#222] flex items-center shrink-0 bg-gray-50 dark:bg-[#111]">
                        <div className="flex items-center gap-1 2xl:gap-1.5"><Users size={11} className="2xl:w-[12px] 2xl:h-[12px]" /><span>Менеджеры ({geo.managers.length})</span></div>
                      </div>
                      
                      {/* Managers List */}
                      <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar">
                        {geo.managers.map(([name, stats], idx) => {
                          const tDirect = stats.traffic.direct || 0;
                          const tComments = stats.traffic.comments || 0;
                          const tWA = stats.traffic.whatsapp || 0;
                          const tAll = stats.traffic.all || 0;
                          const crDirect = tDirect > 0 ? ((stats.direct / Math.max(tDirect, 1)) * 100).toFixed(1) : 0;
                          const crComments = tComments > 0 ? ((stats.comments / Math.max(tComments, 1)) * 100).toFixed(1) : 0;
                          const crWA = tWA > 0 ? ((stats.whatsapp / Math.max(tWA, 1)) * 100).toFixed(1) : 0;
                          const crAll = tAll > 0 ? ((stats.total / Math.max(tAll, 1)) * 100).toFixed(1) : 0;
                          const rowBg = idx % 2 === 0 ? 'bg-transparent' : 'bg-gray-50/70 dark:bg-[#141414]';
                          const roleMeta = getManagerRoleMeta(stats.role);
                          const telegramUsername = formatTelegramUsername(stats.telegram_username);

                          return (
                            <div key={name} className={`flex flex-col px-2.5 2xl:px-4 py-2 2xl:py-3 hover:bg-gray-50 dark:hover:bg-[#1a1a1a] transition-colors border-b border-gray-100 dark:border-[#222] last:border-0 ${rowBg}`}>
                               <div className="mb-1 2xl:mb-2 flex min-w-0 items-center gap-1 2xl:gap-2 overflow-hidden whitespace-nowrap">
                                  <span className="min-w-0 truncate text-[10px] xl:text-[11px] 2xl:text-[12px] font-bold text-gray-900 dark:text-gray-200" title={name}>{name}</span>
                                  {roleMeta ? (
                                    <span className={`shrink-0 rounded-full px-1.5 2xl:px-2 py-0.5 text-[8px] 2xl:text-[9px] font-bold ${roleMeta.className}`}>
                                      {roleMeta.label}
                                    </span>
                                  ) : null}
                                  {telegramUsername ? (
                                    <button
                                      type="button"
                                      onClick={() => handleCopyTelegram(telegramUsername)}
                                      className="inline-flex shrink-0 items-center gap-1 rounded-full border border-gray-200 px-1.5 2xl:px-2 py-0.5 text-[8px] 2xl:text-[9px] font-bold text-gray-500 transition-colors hover:border-blue-300 hover:text-blue-500 dark:border-[#333] dark:text-gray-400 dark:hover:border-blue-700 dark:hover:text-blue-400"
                                      title={`Скопировать ${telegramUsername}`}
                                    >
                                      {telegramUsername}
                                      <Copy size={9} />
                                    </button>
                                  ) : null}
                               </div>
                               <div className="grid grid-cols-4 gap-2 2xl:gap-3">
                                  
                                  {/* Direct Stack */}
                                  <div className="flex flex-col pr-1.5 2xl:pr-2 border-r border-gray-100 dark:border-[#333]">
                                     <div className="mb-1 2xl:mb-1.5">
                                       <span className="inline-flex items-center rounded-full bg-blue-500/10 px-1.5 py-0.5 text-[7px] 2xl:text-[8px] font-bold text-blue-500 dark:text-blue-400">Direct</span>
                                     </div>
                                     <div className="flex items-stretch">
                                       <div className="flex flex-col flex-1 min-w-0">
                                           <div className="flex flex-col mb-1 2xl:mb-1.5">
                                             <span className="text-[11px] 2xl:text-[12px] font-bold text-gray-700 dark:text-gray-400 leading-none">{tDirect}</span>
                                             <span className="text-[7px] 2xl:text-[8px] text-gray-400 uppercase tracking-tighter">заявок</span>
                                           </div>
                                           <div className="flex flex-col">
                                             <span className="text-[11px] 2xl:text-[12px] font-black text-gray-900 dark:text-gray-200 leading-none">{stats.direct}</span>
                                             <span className="text-[7px] 2xl:text-[8px] text-gray-400 uppercase tracking-tighter">продаж</span>
                                           </div>
                                       </div>
                                       <div className="flex items-center justify-center pl-1.5 2xl:pl-2 border-l border-gray-50 dark:border-[#222]">
                                           <span className={`text-[9px] 2xl:text-[10px] font-black ${crClass(parseFloat(crDirect))}`}>{`${crDirect || 0}%`}</span>
                                       </div>
                                     </div>
                                  </div>

                                  {/* Comments Stack */}
                                  <div className="flex flex-col pr-1.5 2xl:pr-2 border-r border-gray-100 dark:border-[#333]">
                                     <div className="mb-1 2xl:mb-1.5">
                                       <span className="inline-flex items-center rounded-full bg-orange-500/10 px-1.5 py-0.5 text-[7px] 2xl:text-[8px] font-bold text-orange-500 dark:text-orange-400">Коммент.</span>
                                     </div>
                                     <div className="flex items-stretch">
                                       <div className="flex flex-col flex-1 min-w-0">
                                           <div className="flex flex-col mb-1 2xl:mb-1.5">
                                             <span className="text-[11px] 2xl:text-[12px] font-bold text-gray-700 dark:text-gray-400 leading-none">{tComments}</span>
                                             <span className="text-[7px] 2xl:text-[8px] text-gray-400 uppercase tracking-tighter">заявок</span>
                                           </div>
                                           <div className="flex flex-col">
                                             <span className="text-[11px] 2xl:text-[12px] font-black text-gray-900 dark:text-gray-200 leading-none">{stats.comments}</span>
                                             <span className="text-[7px] 2xl:text-[8px] text-gray-400 uppercase tracking-tighter">продаж</span>
                                           </div>
                                       </div>
                                       <div className="flex items-center justify-center pl-1.5 2xl:pl-2 border-l border-gray-50 dark:border-[#222]">
                                           <span className={`text-[9px] 2xl:text-[10px] font-black ${crClass(parseFloat(crComments))}`}>{`${crComments || 0}%`}</span>
                                       </div>
                                     </div>
                                  </div>

                                  {/* WhatsApp Stack */}
                                  <div className="flex flex-col pr-1.5 2xl:pr-2 border-r border-gray-100 dark:border-[#333]">
                                     <div className="mb-1 2xl:mb-1.5">
                                       <span className="inline-flex items-center rounded-full bg-green-500/10 px-1.5 py-0.5 text-[7px] 2xl:text-[8px] font-bold text-green-500 dark:text-green-400">WhatsApp</span>
                                     </div>
                                     <div className="flex items-stretch">
                                       <div className="flex flex-col flex-1 min-w-0">
                                           <div className="flex flex-col mb-1 2xl:mb-1.5">
                                             <span className="text-[11px] 2xl:text-[12px] font-bold text-gray-400 leading-none">{tWA}</span>
                                             <span className="text-[7px] 2xl:text-[8px] text-gray-400 uppercase tracking-tighter">заявок</span>
                                           </div>
                                           <div className="flex flex-col">
                                             <span className="text-[11px] 2xl:text-[12px] font-black text-gray-900 dark:text-gray-200 leading-none">{stats.whatsapp}</span>
                                             <span className="text-[7px] 2xl:text-[8px] text-gray-400 uppercase tracking-tighter">продаж</span>
                                           </div>
                                       </div>
                                       <div className="flex items-center justify-center pl-1.5 2xl:pl-2 border-l border-gray-50 dark:border-[#222]">
                                           <span className="text-[9px] 2xl:text-[10px] font-black text-gray-400">{crWA}%</span>
                                       </div>
                                     </div>
                                  </div>

                                  {/* Total Stack */}
                                  <div className="flex flex-col">
                                     <div className="mb-1 2xl:mb-1.5">
                                       <span className="inline-flex items-center rounded-full bg-gray-500/10 px-1.5 py-0.5 text-[7px] 2xl:text-[8px] font-bold text-gray-500 dark:text-gray-400">Всего</span>
                                     </div>
                                     <div className="flex items-stretch">
                                       <div className="flex flex-col flex-1 min-w-0">
                                           <div className="flex flex-col mb-1 2xl:mb-1.5">
                                             <span className="text-[12px] 2xl:text-[13px] font-black text-gray-900 dark:text-white leading-none">{tAll}</span>
                                             <span className="text-[7px] 2xl:text-[8px] text-gray-500 font-bold uppercase tracking-tighter">заявок</span>
                                           </div>
                                           <div className="flex flex-col">
                                             <span className="text-[12px] 2xl:text-[13px] font-black text-blue-600 dark:text-blue-400 leading-none">{stats.total}</span>
                                             <span className="text-[7px] 2xl:text-[8px] text-gray-500 font-bold uppercase tracking-tighter">продаж</span>
                                           </div>
                                       </div>
                                       <div className="flex items-center justify-center pl-1.5 2xl:pl-2 border-l border-gray-300 dark:border-[#444]">
                                           <span className={`text-[10px] 2xl:text-[11px] font-black ${crClass(parseFloat(crAll))}`}>{`${crAll || 0}%`}</span>
                                       </div>
                                     </div>
                                  </div>

                               </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
      ) : (
      <div className="w-full bg-white dark:bg-[#111] border border-gray-200 dark:border-[#2a2a2a] rounded-xl shadow-sm overflow-hidden">
        {/* MATRIX VIEW */}
        <div className="w-full overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse min-w-max">
            <thead>
              <tr className="bg-gray-50/80 dark:bg-[#161616] border-b border-gray-200 dark:border-[#2a2a2a]">
                <th className="sticky text-center left-0 z-20 bg-gray-50/80 dark:bg-[#161616] border-r border-gray-200 dark:border-[#2a2a2a] py-2 px-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider backdrop-blur-md">
                  ГЕО
                </th>
                {matrixDates.map(dateStr => {
                  const [y, m, d] = dateStr.split('-');
                  return (
                    <th key={dateStr} className="py-2 px-3 text-center border-r border-gray-200 dark:border-[#2a2a2a] text-[10px] font-bold text-gray-500 uppercase">
                      <div className="flex flex-col items-center">
                        <span className="text-gray-900 dark:text-white mb-0.5">{`${d}.${m}`}</span>
                        <span className="text-[9px] text-gray-400 font-mono tracking-tighter">ОБЩ / D / W / C</span>
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-[#2a2a2a]">
              {matrixData.length === 0 ? (
                <tr>
                   <td colSpan={matrixDates.length + 1} className="py-8 text-center text-gray-400 text-sm">
                     Нет данных за этот период
                   </td>
                </tr>
              ) : (
                matrixData.map(geo => {
                  const countryDef = countries?.find(c => c.code === geo.code) || { name: geo.code, emoji: '🏳️' };
                  return (
                    <tr key={geo.code} className="hover:bg-gray-50/50 dark:hover:bg-[#1A1A1A] transition-colors group">
                      <td className="sticky left-0 z-10 bg-white dark:bg-[#111] group-hover:bg-gray-50/50 dark:group-hover:bg-[#1A1A1A] border-r border-gray-100 dark:border-[#2a2a2a] py-2 px-3 w-[140px]">
                        <div className="flex flex-col gap-1 items-center justify-center h-full">
                           <div className="text-2xl">{countryDef.emoji}</div>
                           <span className="text-[10px] font-bold text-gray-900 dark:text-white text-center leading-tight">{countryDef.name}</span>
                        </div>
                      </td>
                      {matrixDates.map(dateStr => {
                        const cell = geo.dailyData[dateStr];
                        if (!cell || !cell.hasData) {
                          return (
                            <td key={dateStr} className="py-2 px-3 text-center border-r border-gray-100 dark:border-[#2a2a2a]">
                               <span className="text-gray-300 dark:text-gray-700 text-xs">—</span>
                            </td>
                          );
                        }
                        
                        const getCrColor = (val) => {
                          if (val >= 8) return 'text-emerald-500 font-bold';
                          if (val >= 3) return 'text-amber-500 font-semibold';
                          if (val > 0) return 'text-red-400';
                          return 'text-gray-400';
                        };

                        return (
                          <td key={dateStr} className="py-1 px-2 text-center border-r border-gray-100 dark:border-[#2a2a2a] bg-gray-50/30 dark:bg-transparent">
                            <div className="flex flex-col items-center justify-center gap-1">
                               <div className="flex items-center gap-1.5">
                                 <span className={`text-sm ${getCrColor(cell.crTotal)}`}>
                                    {cell.crTotal.toFixed(1)}%
                                 </span>
                                 {cell.tAll > 0 && (
                                   <span className="text-[10px] text-gray-500 font-medium bg-gray-200/50 dark:bg-[#222] px-1 rounded">
                                     T: {cell.tAll}
                                   </span>
                                 )}
                               </div>
                               <div className="flex gap-1.5 text-[9px] font-mono whitespace-nowrap bg-white/50 dark:bg-black/20 px-1 py-0.5 rounded">
                                  <span className={getCrColor(cell.crDirect)} title="Direct">{cell.crDirect.toFixed(1)}</span>
                                  <span className="text-gray-300 dark:text-gray-600">/</span>
                                  <span className={getCrColor(cell.crWhatsapp)} title="WhatsApp">{cell.crWhatsapp.toFixed(1)}</span>
                                  <span className="text-gray-300 dark:text-gray-600">/</span>
                                  <span className={getCrColor(cell.crComments)} title="Comments">{cell.crComments.toFixed(1)}</span>
                               </div>
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  )
                })
              )}
            </tbody>
            {matrixData.length > 0 && (
              <tfoot className="bg-gray-50 dark:bg-[#161616] sticky bottom-0 z-10 border-t-2 border-gray-200 dark:border-[#3a3a3a]">
                <tr>
                  <td className="sticky left-0 z-20 bg-gray-50 dark:bg-[#161616] border-r border-gray-200 dark:border-[#2a2a2a] py-3 px-3 w-[140px]">
                    <div className="flex flex-col gap-1 items-center justify-center">
                       <span className="text-[11px] font-black text-gray-900 dark:text-white uppercase tracking-wider">Итого (СРЕДН.)</span>
                    </div>
                  </td>
                  {matrixDates.map(dateStr => {
                    const cell = matrixAverages[dateStr];
                    if (!cell || !cell.hasData) {
                      return (
                        <td key={`avg-${dateStr}`} className="py-2 px-3 text-center border-r border-gray-200 dark:border-[#2a2a2a]">
                           <span className="text-gray-400 dark:text-gray-600 font-bold">—</span>
                        </td>
                      );
                    }
                    
                    const getCrColor = (val) => {
                      if (val >= 8) return 'text-emerald-500 font-bold';
                      if (val >= 3) return 'text-amber-500 font-semibold';
                      if (val > 0) return 'text-red-400 font-medium';
                      return 'text-gray-500';
                    };

                    return (
                      <td key={`avg-${dateStr}`} className="py-2 px-2 text-center border-r border-gray-200 dark:border-[#2a2a2a] bg-gray-100/50 dark:bg-[#111]/50">
                        <div className="flex flex-col items-center justify-center gap-1.5">
                           <div className="flex items-center gap-1.5">
                             <span className={`text-[15px] ${getCrColor(cell.crTotal)}`}>
                                {cell.crTotal.toFixed(1)}%
                             </span>
                             {cell.tAll > 0 && (
                               <span className="text-[11px] text-gray-500 font-bold bg-white dark:bg-[#333] px-1.5 rounded shadow-sm">
                                 T: {cell.tAll}
                               </span>
                             )}
                           </div>
                           <div className="flex gap-1.5 text-[10px] font-mono whitespace-nowrap bg-white dark:bg-black/40 px-1.5 py-0.5 rounded shadow-sm border border-gray-200 dark:border-[#333]">
                              <span className={getCrColor(cell.crDirect)} title="Direct">{cell.crDirect.toFixed(1)}</span>
                              <span className="text-gray-300 dark:text-gray-600">/</span>
                              <span className={getCrColor(cell.crWhatsapp)} title="WhatsApp">{cell.crWhatsapp.toFixed(1)}</span>
                              <span className="text-gray-300 dark:text-gray-600">/</span>
                              <span className={getCrColor(cell.crComments)} title="Comments">{cell.crComments.toFixed(1)}</span>
                           </div>
                        </div>
                      </td>
                    );
                  })}
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
      )}
      </>
      ) : null}

      {/* PRODUCTS TAB CONTENT */}
      {viewMode === 'products' && (
      <div className="mt-4">

        {/* Sub-tabs */}
        <div className="flex gap-2 mb-5">
          <button
            onClick={() => setProductsSubView('funnel')}
            className={`px-4 py-1.5 rounded-lg text-[12px] font-bold transition-colors border ${
              productsSubView === 'funnel'
                ? 'bg-blue-500 border-blue-500 text-white'
                : 'bg-transparent border-gray-200 dark:border-[#333] text-gray-400 hover:border-blue-400 hover:text-blue-400'
            }`}
          >
            Конверсии по Продуктах
          </button>
          <button
            onClick={() => setProductsSubView('summary')}
            className={`px-4 py-1.5 rounded-lg text-[12px] font-bold transition-colors border ${
              productsSubView === 'summary'
                ? 'bg-blue-500 border-blue-500 text-white'
                : 'bg-transparent border-gray-200 dark:border-[#333] text-gray-400 hover:border-blue-400 hover:text-blue-400'
            }`}
          >
            Сводка конверсий
          </button>
        </div>

        {/* GEO Filter */}
        <div className="mb-5 flex flex-wrap gap-1.5 items-center">
          <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mr-1">ГЕО:</span>
          <button
            onClick={() => setFunnelGeo('')}
            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold transition-colors border ${
              funnelGeo === '' ? 'bg-blue-500 border-blue-500 text-white' : 'bg-white dark:bg-[#111] border-gray-200 dark:border-[#333] text-gray-500 hover:border-blue-400'
            }`}
          >
            Все
          </button>
          {(countries || []).slice().sort((a, b) => (a.code || '').localeCompare(b.code || '')).map(c => (
            <button
              key={c.code}
              onClick={() => setFunnelGeo(c.code === funnelGeo ? '' : c.code)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold transition-colors border ${
                funnelGeo === c.code ? 'bg-blue-500 border-blue-500 text-white' : 'bg-white dark:bg-[#111] border-gray-200 dark:border-[#333] text-gray-500 hover:border-blue-400 dark:hover:border-[#555]'
              }`}
            >
              {c.emoji && <span className="text-[13px] leading-none">{c.emoji}</span>}
              <span>{c.name || c.code}</span>
            </button>
          ))}
        </div>

        {funnelLoading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <RefreshCw size={26} className="text-blue-500 animate-spin mb-3" />
            <p className="text-gray-400 text-sm">Загрузка данных...</p>
          </div>
        ) : !productFunnelStats ? (
          <div className="text-center py-12 text-gray-400 text-sm">Нет данных</div>
        ) : (() => {
          const stage1Entries = Object.entries(productFunnelStats.stage1).sort(([, a], [, b]) => b - a);
          if (!stage1Entries.length) return (
            <div className="text-center py-12 text-gray-400 text-sm">Нет данных</div>
          );

          return (
            <div>
              {productsSubView === 'summary' ? (
                <ProductConversionSummary stats={productFunnelStats} />
              ) : (<>
              {/* Stats chain */}
              {(() => {
                const stages = [
                  { label: '1-я оплата', value: productFunnelStats.totalWith1st, color: 'text-blue-500', border: 'border-blue-500/30' },
                  { label: '2-я оплата', value: productFunnelStats.totalWith2nd, color: 'text-emerald-400', border: 'border-emerald-500/30' },
                  { label: '3-я оплата', value: productFunnelStats.totalWith3rd, color: 'text-amber-400', border: 'border-amber-500/30' },
                  { label: '4-я оплата', value: productFunnelStats.totalWith4th, color: 'text-orange-400', border: 'border-orange-500/30' },
                  { label: '5-я оплата', value: productFunnelStats.totalWith5th, color: 'text-purple-400', border: 'border-purple-500/30' },
                ];
                return (
                  <div className="flex items-center gap-0 mb-6 flex-wrap">
                    {stages.map((s, i) => (
                      <div key={i} className="flex items-center">
                        <div className={`bg-[#111] border ${s.border} rounded-lg px-4 py-2.5 min-w-[90px]`}>
                          <div className="text-[9px] font-bold text-gray-500 uppercase tracking-wider mb-1">{s.label}</div>
                          <div className={`text-[22px] font-black ${s.color} leading-none`}>{s.value}</div>
                          {i > 0 && stages[i - 1].value > 0 && (
                            <div className="text-[10px] font-bold text-gray-500 mt-0.5">
                              {((s.value / stages[i - 1].value) * 100).toFixed(1)}%
                            </div>
                          )}
                        </div>
                        {i < stages.length - 1 && (
                          <div className="flex items-center px-1.5 text-gray-600">
                            <svg width="18" height="12" viewBox="0 0 18 12" fill="none">
                              <path d="M0 6H14M14 6L9 1M14 6L9 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                );
              })()}

              <ProductFunnelDiagram
                stage1Entries={stage1Entries}
                transNM={productFunnelStats.transNM}
                byCustomer={productFunnelStats.byCustomer}
                mgrMap={funnelMgrMap}
                countries={countries}
              />
              </>)}
            </div>
          );
        })()}
      </div>
      )}
    </div>
  );
};

export default GeoPage;
