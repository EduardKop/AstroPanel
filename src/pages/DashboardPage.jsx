import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useAppStore } from '../store/appStore';
import { supabase } from '../services/supabaseClient';
import {
  Filter, RotateCcw, XCircle, X,
  Users, DollarSign, Percent, CreditCard, LayoutDashboard,
  Activity, Trophy, Globe, Layers, MessageCircle, MessageSquare, Phone, Calendar as CalendarIcon
} from 'lucide-react';
import { AreaChart, Area, XAxis, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import AstroLoadingStatus from '../components/ui/AstroLoadingStatus';
import { ActivityRail } from '../components/activity/ActivityUI';
import { buildTimelineFromPayload, formatCoverageLabel, formatTimelineDuration } from '../utils/activityTimeline';

import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

import { extractUTCDate, formatUTCDate, formatUTCTime, getKyivDateString } from '../utils/kyivTime';

// --- КОНФИГУРАЦИЯ ---
const TIMEZONE = 'Europe/Kyiv';
const NOVALUMEN_API_OFFSET = 2;

const FLAGS = {
  UA: '🇺🇦', PL: '🇵🇱', IT: '🇮🇹', HR: '🇭🇷',
  BG: '🇧🇬', CZ: '🇨🇿', RO: '🇷🇴', LT: '🇱🇹',
  TR: '🇹🇷', FR: '🇫🇷', PT: '🇵🇹', DE: '🇩🇪',
  US: '🇺🇸', ES: '🇪🇸', SK: '🇸🇰', HU: '🇭🇺',
  KZ: '🇰🇿', UZ: '🇺🇿', MD: '🇲🇩'
};
const getFlag = (code) => FLAGS[code] || '🏳️';

const CURRENCY_MAP = {
  UA: 'UAH', RO: 'RON', PL: 'PLN', CZ: 'CZK', HU: 'HUF',
  DE: 'EUR', FR: 'EUR', IT: 'EUR', ES: 'EUR', NL: 'EUR',
  AT: 'EUR', BE: 'EUR', PT: 'EUR', FI: 'EUR', SK: 'EUR',
  LV: 'EUR', LT: 'EUR', EE: 'EUR', SI: 'EUR', GR: 'EUR',
  BG: 'BGN', HR: 'HRK', RS: 'RSD', KZ: 'KZT', UZ: 'UZS', MD: 'MDL',
  GB: 'GBP', CH: 'CHF', SE: 'SEK', NO: 'NOK', DK: 'DKK',
};
const getCurrencyCode = (country) => CURRENCY_MAP[country] || '';

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
  if (t.includes('stripe')) return 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20';
  if (t.includes('paypal')) return 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20';
  return 'bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/20';
};

const formatPaymentType = (type) => {
  if (!type) return 'Other';
  const upper = type.toUpperCase();
  if (upper === 'ПРЯМЫЕ РЕКВИЗИТЫ') return 'РЕКВИЗИТЫ';
  return upper;
};

const getRoleTag = (role) => {
  if (!role) return null;
  const map = {
    'Sales':      { label: 'Sales',   cls: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20' },
    'SeniorSales':{ label: 'Sr.Sales',cls: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20' },
    'SalesTaro':  { label: 'Taro',    cls: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20' },
    'SalesTaroNew':{ label: 'Taro',   cls: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20' },
    'Consultant': { label: 'Cons.',   cls: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' },
    'Retention':  { label: 'Ret.',    cls: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20' },
    'TeamLead':   { label: 'TL',      cls: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20' },
  };
  const r = map[role] || { label: role, cls: 'bg-gray-500/10 text-gray-500 border-gray-500/20' };
  return <span className={`px-1 py-px rounded text-[8px] font-bold border whitespace-nowrap ${r.cls}`}>{r.label}</span>;
};

const getInitials = (name = '') => {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  return parts.slice(0, 2).map(part => part[0]).join('').toUpperCase();
};

const ManagerAvatar = ({ manager, name, className = '' }) => {
  const displayName = manager?.name || name || 'Менеджер';
  const avatarUrl = manager?.avatar_url;

  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={displayName}
        className={`h-6 w-6 shrink-0 rounded-full object-cover ring-1 ring-gray-200 dark:ring-white/10 ${className}`}
        loading="lazy"
        decoding="async"
      />
    );
  }

  return (
    <span
      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gray-100 text-[9px] font-black text-gray-500 ring-1 ring-gray-200 dark:bg-[#202228] dark:text-gray-300 dark:ring-white/10 ${className}`}
      title={displayName}
    >
      {getInitials(displayName)}
    </span>
  );
};

const ManagerNameButton = ({ manager, name, role, onClick, compact = false }) => {
  const displayName = manager?.name || name || 'Не назначен';
  const parts = String(displayName).trim().split(/\s+/).filter(Boolean);
  const firstName = parts[0] || displayName;
  const restName = parts.slice(1).join(' ');

  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        onClick?.();
      }}
      className={`group inline-flex max-w-full items-center gap-1.5 rounded-md border border-transparent text-left leading-none transition-all hover:border-sky-400/30 hover:bg-sky-500/10 focus:outline-none focus:ring-2 focus:ring-sky-400/40 ${compact ? 'px-1 py-0' : 'px-1 py-0'}`}
      title="Открыть карточку менеджера"
    >
      <ManagerAvatar
        manager={manager}
        name={displayName}
        className={`${compact ? 'h-5 w-5 text-[8px]' : 'h-5 w-5 text-[8px]'} transition-all group-hover:ring-sky-300/70 group-hover:shadow-[0_0_14px_rgba(56,189,248,0.25)]`}
      />
      <span className="min-w-0 font-medium">
        <span className="text-gray-700 transition-colors group-hover:text-sky-600 dark:text-gray-300 dark:group-hover:text-sky-200">
          {firstName}
        </span>
        {restName && (
          <span className="ml-1 text-gray-700 transition-colors group-hover:text-emerald-600 dark:text-gray-300 dark:group-hover:text-emerald-200">
            {restName}
          </span>
        )}
      </span>
      {role ? <span className="shrink-0">{getRoleTag(role)}</span> : null}
    </button>
  );
};

const buildApiBoundary = (dateValue, endOfDay = false) => `${dateValue}T${endOfDay ? '23:59:59' : '00:00:00'}-00:00`;
const buildLocalBoundary = (dateValue, endOfDay = false) => `${dateValue}T${endOfDay ? '23:59:59' : '00:00:00'}`;

const formatMoney = (value) => Number(value || 0).toLocaleString('ru-RU', {
  maximumFractionDigits: 2,
});

const normalizeGeoList = (geo) => {
  if (!geo) return [];
  if (Array.isArray(geo)) return geo.filter(Boolean);
  return String(geo).split(',').map(item => item.trim()).filter(Boolean);
};

const getDateRangeDays = (startDate, endDate) => {
  if (!startDate || !endDate) return [];
  const start = new Date(startDate);
  const end = new Date(endDate);
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);

  const days = [];
  const cursor = new Date(start);
  while (cursor <= end && days.length < 62) {
    days.push(toYMD(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return days;
};

const getRankEmoji = (index) => {
  if (index === 0) return '🥇';
  if (index === 1) return '🥈';
  if (index === 2) return '🥉';
  return <span className="text-gray-400 text-[10px] font-mono">#{index + 1}</span>;
}

const getTodayRange = () => {
  const end = new Date();
  const start = new Date();
  // Начало текущей недели (Понедельник)
  const day = start.getDay(); // 0=вс, 1=пн, ...
  const diff = day === 0 ? -6 : 1 - day; // если воскресенье — берем 6 дней назад
  start.setDate(start.getDate() + diff);
  return [start, end];
};

// ХЕЛПЕР ДЛЯ ВРЕМЕНИ (Kyiv Timezone)
// Используем Kyiv timezone для picker отображения
const toYMD = (date) => {
  if (!date) return '';
  // ✅ FIX: Формируем YYYY-MM-DD из компонентов даты (как выбрал юзер в календаре)
  // Это совпадет с ключами created_at (UTC) из appStore
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

import { DenseSelect } from '../components/ui/FilterSelect';

const DASHBOARD_LOADING_STEPS = [
  'Загружаем справочники',
  'Загружаем оплаты',
  'Считаем трафик',
  'Готовим обзор',
];

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

const ManagerInsightModal = ({ target, onClose, payments, startDate, endDate, countries, getCountryName }) => {
  const manager = target?.manager || null;
  const managerName = manager?.name || target?.name || 'Менеджер';
  const managerRole = manager?.role || target?.role || null;
  const managerId = manager?.id || target?.managerId || null;
  const activityDate = target?.payment?.transactionDate
    ? extractUTCDate(target.payment.transactionDate)
    : toYMD(endDate || new Date());
  const [activityState, setActivityState] = useState({
    loading: true,
    error: null,
    data: null,
  });

  const assignedGeos = useMemo(() => {
    return normalizeGeoList(manager?.geo).map(code => {
      const normalizedCode = String(code).toUpperCase();
      const country = countries?.find?.(item => item.code === normalizedCode);
      return {
        code: normalizedCode,
        label: country ? `${country.emoji || getFlag(normalizedCode)} ${country.name}` : `${getFlag(normalizedCode)} ${normalizedCode}`,
      };
    });
  }, [countries, manager?.geo]);

  const managerPayments = useMemo(() => {
    const startStr = startDate ? toYMD(startDate) : '0000-00-00';
    const endStr = endDate ? toYMD(endDate) : '9999-99-99';

    return (payments || [])
      .filter(payment => {
        const sameManager = managerId
          ? String(payment.managerId || payment.manager_id || '') === String(managerId)
          : payment.manager === managerName;
        if (!sameManager || !payment.transactionDate) return false;

        const paymentDate = extractUTCDate(payment.transactionDate);
        return paymentDate >= startStr && paymentDate <= endStr;
      })
      .sort((a, b) => new Date(a.transactionDate) - new Date(b.transactionDate));
  }, [endDate, managerId, managerName, payments, startDate]);

  const insight = useMemo(() => {
    const dailyMap = {};
    const methodMap = {};
    const geoMap = {};
    let totalEur = 0;

    managerPayments.forEach(payment => {
      const dateKey = extractUTCDate(payment.transactionDate);
      const eur = Number(payment.amountEUR || payment.amount_eur || 0);
      const method = payment.type || payment.payment_type || 'Other';
      const countryCode = payment.country || '—';

      totalEur += eur;

      if (!dailyMap[dateKey]) {
        dailyMap[dateKey] = {
          date: dateKey,
          label: dateKey.slice(5).replace('-', '.'),
          count: 0,
          eur: 0,
        };
      }
      dailyMap[dateKey].count += 1;
      dailyMap[dateKey].eur += eur;

      if (!methodMap[method]) methodMap[method] = { method, count: 0, eur: 0 };
      methodMap[method].count += 1;
      methodMap[method].eur += eur;

      if (!geoMap[countryCode]) geoMap[countryCode] = { country: countryCode, count: 0, eur: 0 };
      geoMap[countryCode].count += 1;
      geoMap[countryCode].eur += eur;
    });

    const days = getDateRangeDays(startDate, endDate);
    const dailySales = days.length > 0
      ? days.map(dateKey => dailyMap[dateKey] || {
          date: dateKey,
          label: dateKey.slice(5).replace('-', '.'),
          count: 0,
          eur: 0,
        })
      : Object.values(dailyMap);

    const methods = Object.values(methodMap)
      .sort((a, b) => b.count - a.count || b.eur - a.eur)
      .slice(0, 5);

    const geos = Object.values(geoMap)
      .sort((a, b) => b.eur - a.eur || b.count - a.count)
      .slice(0, 6);

    return {
      dailySales,
      methods,
      geos,
      totalEur,
      count: managerPayments.length,
      avgCheck: managerPayments.length > 0 ? totalEur / managerPayments.length : 0,
      topDay: dailySales.reduce((best, item) => item.eur > (best?.eur || 0) ? item : best, null),
      maxMethodCount: Math.max(1, ...methods.map(item => item.count)),
      maxGeoEur: Math.max(1, ...geos.map(item => item.eur)),
    };
  }, [endDate, managerPayments, startDate]);

  useEffect(() => {
    let cancelled = false;

    const loadActivity = async () => {
      const telegramId = manager?.telegram_id || target?.telegram_id;
      setActivityState({ loading: true, error: null, data: null });

      if (!telegramId) {
        setActivityState({
          loading: false,
          error: 'У менеджера не указан Telegram ID для Novalumen',
          data: null,
        });
        return;
      }

      try {
        const fromDt = buildApiBoundary(activityDate, false);
        const toDt = buildApiBoundary(activityDate, true);
        const localStart = buildLocalBoundary(activityDate, false);
        const localEnd = buildLocalBoundary(activityDate, true);

        const statsResult = await supabase.functions.invoke('novalumen-statistics', {
          body: { fromDt, toDt, offset: NOVALUMEN_API_OFFSET },
        });

        if (statsResult.error || statsResult.data?.error) {
          throw new Error(statsResult.error?.message || statsResult.data?.error || 'Статистика Novalumen недоступна');
        }

        const rawStats = Array.isArray(statsResult.data?.data)
          ? statsResult.data.data
          : Array.isArray(statsResult.data?.data?.data)
            ? statsResult.data.data.data
            : [];
        const managerStat = rawStats.find(item => String(item.telegram_id) === String(telegramId));

        if (!managerStat?.user_id) {
          throw new Error('Менеджер не найден в статистике Novalumen');
        }

        const timelineResult = await supabase.functions.invoke('novalumen-sent-messages', {
          body: {
            fromDt,
            toDt,
            offset: NOVALUMEN_API_OFFSET,
            userIds: [managerStat.user_id],
          },
        });

        if (timelineResult.error || timelineResult.data?.error) {
          throw new Error(timelineResult.error?.message || timelineResult.data?.error || 'Таймлайн Novalumen недоступен');
        }

        const results = timelineResult.data?.results || {};
        const userKey = String(managerStat.user_id);
        const hasTimelinePayload = Object.prototype.hasOwnProperty.call(results, userKey);
        const timelineData = hasTimelinePayload
          ? buildTimelineFromPayload(results[userKey] || [], localStart, localEnd, 2)
          : null;

        if (!cancelled) {
          setActivityState({
            loading: false,
            error: null,
            data: {
              status: hasTimelinePayload ? 'ready' : 'unavailable',
              totalMessages: Number(managerStat.total_messages_count) || timelineData?.messageCount || 0,
              activeDurationMs: timelineData?.activeDurationMs || 0,
              coveragePct: timelineData?.coveragePct || 0,
              segments: timelineData?.segments || [],
            },
          });
        }
      } catch (error) {
        if (!cancelled) {
          setActivityState({
            loading: false,
            error: error instanceof Error ? error.message : 'Не удалось загрузить активность',
            data: null,
          });
        }
      }
    };

    loadActivity();
    return () => {
      cancelled = true;
    };
  }, [activityDate, manager?.telegram_id, target?.telegram_id]);

  if (!target) return null;

  const rangeLabel = startDate && endDate
    ? `${startDate.toLocaleDateString('ru-RU')} - ${endDate.toLocaleDateString('ru-RU')}`
    : 'выбранный период';

  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center bg-black/70 p-3 backdrop-blur-sm"
      onMouseDown={onClose}
    >
      <div
        className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-2xl border border-white/10 bg-white shadow-2xl dark:bg-[#0B0D12] custom-scrollbar"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-white/95 px-5 py-4 backdrop-blur dark:border-white/10 dark:bg-[#0B0D12]/95">
          <div className="flex min-w-0 items-center gap-3">
            <ManagerAvatar manager={manager} name={managerName} className="h-12 w-12 text-sm" />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="truncate text-lg font-black text-gray-950 dark:text-white">{managerName}</h3>
                {getRoleTag(managerRole)}
              </div>
              <p className="mt-1 text-xs font-medium text-gray-500 dark:text-gray-400">
                Карточка менеджера за {rangeLabel}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:hover:bg-white/10 dark:hover:text-white"
          >
            <X size={18} />
          </button>
        </div>

        <div className="grid gap-4 p-4 lg:grid-cols-[1.25fr_0.75fr]">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 dark:border-white/10 dark:bg-white/[0.03]">
                <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Продажи</div>
                <div className="mt-1 text-2xl font-black text-gray-950 dark:text-white">{insight.count}</div>
              </div>
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 dark:border-white/10 dark:bg-white/[0.03]">
                <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Оборот</div>
                <div className="mt-1 text-2xl font-black text-emerald-600 dark:text-emerald-300">€{formatMoney(insight.totalEur)}</div>
              </div>
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 dark:border-white/10 dark:bg-white/[0.03]">
                <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Средний чек</div>
                <div className="mt-1 text-2xl font-black text-gray-950 dark:text-white">€{formatMoney(insight.avgCheck)}</div>
              </div>
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 dark:border-white/10 dark:bg-white/[0.03]">
                <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Лучший день</div>
                <div className="mt-1 text-lg font-black text-sky-600 dark:text-sky-300">
                  {insight.topDay?.count ? `${insight.topDay.label} · ${insight.topDay.count}` : '—'}
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-white/10 dark:bg-white/[0.03]">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h4 className="flex items-center gap-2 text-sm font-black text-gray-900 dark:text-white">
                  <Activity size={15} className="text-blue-500" />
                  Дейли продажи
                </h4>
                <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">EUR</span>
              </div>
              <div className="h-44 min-w-0">
                {insight.dailySales.some(item => item.count > 0) ? (
                  <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
                    <AreaChart data={insight.dailySales}>
                      <defs>
                        <linearGradient id="managerSalesGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#38BDF8" stopOpacity={0.45} />
                          <stop offset="95%" stopColor="#38BDF8" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748B' }} />
                      <RechartsTooltip
                        contentStyle={{ backgroundColor: '#111827', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, color: '#fff', fontSize: 11 }}
                        formatter={(value, name) => name === 'eur' ? [`€${formatMoney(value)}`, 'Оборот'] : [value, 'Продажи']}
                      />
                      <Area type="monotone" dataKey="eur" stroke="#38BDF8" strokeWidth={2} fill="url(#managerSalesGradient)" />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center text-xs font-bold text-gray-400">Нет продаж за период</div>
                )}
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-white/10 dark:bg-white/[0.03]">
              <h4 className="mb-3 flex items-center gap-2 text-sm font-black text-gray-900 dark:text-white">
                <CreditCard size={15} className="text-violet-500" />
                Частые платежки
              </h4>
              <div className="space-y-2">
                {insight.methods.length > 0 ? insight.methods.map(method => (
                  <div key={method.method} className="space-y-1">
                    <div className="flex items-center justify-between gap-3 text-xs">
                      <span className={`max-w-[220px] truncate rounded border px-2 py-0.5 text-[10px] font-bold ${getPaymentBadgeStyle(method.method)}`}>
                        {formatPaymentType(method.method)}
                      </span>
                      <span className="font-bold text-gray-700 dark:text-gray-200">{method.count} · €{formatMoney(method.eur)}</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-gray-100 dark:bg-white/10">
                      <div className="h-full rounded-full bg-violet-400" style={{ width: `${(method.count / insight.maxMethodCount) * 100}%` }} />
                    </div>
                  </div>
                )) : (
                  <div className="py-4 text-center text-xs font-bold text-gray-400">Нет данных по платежкам</div>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-white/10 dark:bg-white/[0.03]">
              <h4 className="mb-3 flex items-center gap-2 text-sm font-black text-gray-900 dark:text-white">
                <Globe size={15} className="text-emerald-500" />
                ГЕО менеджера
              </h4>
              <div className="mb-4 flex flex-wrap gap-1.5">
                {assignedGeos.length > 0 ? assignedGeos.map(geo => (
                  <span key={geo.code} className="rounded-md border border-emerald-400/25 bg-emerald-500/10 px-2 py-1 text-[10px] font-bold text-emerald-700 dark:text-emerald-200">
                    {geo.label}
                  </span>
                )) : (
                  <span className="text-xs font-bold text-gray-400">ГЕО не указано</span>
                )}
              </div>

              <div className="space-y-2">
                {insight.geos.length > 0 ? insight.geos.map(geo => (
                  <div key={geo.country} className="space-y-1">
                    <div className="flex items-center justify-between gap-3 text-xs">
                      <span className="font-bold text-gray-700 dark:text-gray-200">
                        {getFlag(geo.country)} {getCountryName(geo.country)}
                      </span>
                      <span className="font-bold text-gray-500 dark:text-gray-400">{geo.count} · €{formatMoney(geo.eur)}</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-gray-100 dark:bg-white/10">
                      <div className="h-full rounded-full bg-emerald-400" style={{ width: `${(geo.eur / insight.maxGeoEur) * 100}%` }} />
                    </div>
                  </div>
                )) : (
                  <div className="py-4 text-center text-xs font-bold text-gray-400">Нет продаж по ГЕО</div>
                )}
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-white/10 dark:bg-white/[0.03]">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h4 className="flex items-center gap-2 text-sm font-black text-gray-900 dark:text-white">
                  <MessageSquare size={15} className="text-rose-500" />
                  Активность
                </h4>
                <span className="text-[10px] font-bold text-gray-400">{activityDate}</span>
              </div>

              {activityState.loading ? (
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-white/10 dark:bg-black/20">
                  <AstroLoadingStatus
                    variant="inline"
                    title="Загружаем активность"
                    steps={['Сверяем менеджера', 'Получаем SMS', 'Строим таймлайн']}
                    activeStep={1}
                  />
                </div>
              ) : activityState.error ? (
                <div className="rounded-lg border border-amber-400/20 bg-amber-500/10 p-3 text-xs font-bold text-amber-700 dark:text-amber-200">
                  {activityState.error}
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-lg bg-gray-50 p-3 dark:bg-black/20">
                      <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400">SMS</div>
                      <div className="mt-1 text-xl font-black text-gray-950 dark:text-white">{activityState.data?.totalMessages || 0}</div>
                    </div>
                    <div className="rounded-lg bg-gray-50 p-3 dark:bg-black/20">
                      <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Время</div>
                      <div className="mt-1 text-sm font-black text-emerald-600 dark:text-emerald-300">
                        {formatTimelineDuration(activityState.data?.activeDurationMs || 0)}
                      </div>
                    </div>
                  </div>
                  <ActivityRail
                    segments={activityState.data?.segments || []}
                    status={activityState.data?.status || 'unavailable'}
                    startLabel="00:00"
                    endLabel="23:59"
                  />
                  <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                    {formatCoverageLabel(activityState.data?.coveragePct || 0)}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const DashboardPage = () => {
  const { payments, user: currentUser, isLoading, paymentsLoaded, trafficStats, fetchTrafficStats, fetchAllData, countries, managers, channelsMap, isInitialized } = useAppStore();
  const getCountryName = (code) => countries?.find?.(c => c.code === code)?.name || code;

  const [dateRange, setDateRange] = useState(getTodayRange());
  const [startDate, endDate] = dateRange;

  const [filters, setFilters] = useState(() => {
    const savedSource = localStorage.getItem('dash_source_filter');
    const savedDept = localStorage.getItem('dash_dept_filter_v2');
    return {
      manager: [],
      country: [],
      product: [],
      type: [],
      source: savedSource || 'all',
      department: savedDept ? JSON.parse(savedDept) : [], // [] = Все
      showMobileFilters: false
    };
  });
  const [expandedId, setExpandedId] = useState(null);
  const [activeFilling, setActiveFilling] = useState([]); // [{manager_name, manager_role, started_at}]
  const [managerModalTarget, setManagerModalTarget] = useState(null);
  const [summaryColumnHeight, setSummaryColumnHeight] = useState(null);
  const summaryColumnRef = useRef(null);
  const dashboardFetchRequestedRef = useRef(false);

  useEffect(() => {
    const node = summaryColumnRef.current;
    if (!node) return undefined;

    const updateHeight = () => {
      setSummaryColumnHeight(Math.ceil(node.getBoundingClientRect().height));
    };

    updateHeight();

    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', updateHeight);
      return () => window.removeEventListener('resize', updateHeight);
    }

    const observer = new ResizeObserver(updateHeight);
    observer.observe(node);
    window.addEventListener('resize', updateHeight);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateHeight);
    };
  }, []);

  // Subscribe to payment-form-presence channel
  useEffect(() => {
    const channel = supabase.channel('payment-form-presence');
    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const fillers = Object.values(state).flat();
        setActiveFilling(fillers);
      })
      .on('presence', { event: 'join' }, ({ newPresences }) => {
        setActiveFilling(prev => {
          const ids = new Set(prev.map(p => p.manager_id));
          const toAdd = newPresences.filter(p => !ids.has(p.manager_id));
          return [...prev, ...toAdd];
        });
      })
      .on('presence', { event: 'leave' }, ({ leftPresences }) => {
        const leftIds = new Set(leftPresences.map(p => p.manager_id));
        setActiveFilling(prev => prev.filter(p => !leftIds.has(p.manager_id)));
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  // ⚡ Real-time: instantly prepend new payment via Broadcast
  useEffect(() => {
    const channel = supabase
      .channel('dashboard-new-payments')
      .on('broadcast', { event: 'new_payment_added' }, (payload) => {
        const formatted = payload.payload;
        if (!formatted || !formatted.id) return;
        
        // Prepend into store
        useAppStore.setState(state => {
          // Avoid duplicates
          if (state.payments.some(p => p.id === formatted.id)) return state;
          
          return {
            payments: [formatted, ...state.payments],
            stats: { ...state.stats, totalEur: Number(state.stats?.totalEur || 0) + formatted.amountEUR, count: (state.stats?.count || 0) + 1 }
          };
        });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const hasActiveFilters = useMemo(() => {
    return !!(filters.manager.length || filters.country.length || filters.product.length || filters.type.length || filters.source !== 'all');
  }, [filters]);

  // Save filters to LocalStorage
  useEffect(() => {
    localStorage.setItem('dash_source_filter', filters.source);
    localStorage.setItem('dash_dept_filter_v2', JSON.stringify(filters.department));
  }, [filters.source, filters.department]);

  // 🔄 ПРИНУДИТЕЛЬНОЕ ОБНОВЛЕНИЕ ДАННЫХ ПРИ МОНТИРОВАНИИ
  useEffect(() => {
    if (!fetchAllData) return;

    if (paymentsLoaded && isInitialized) {
      dashboardFetchRequestedRef.current = false;
      return;
    }

    if (isLoading || dashboardFetchRequestedRef.current) return;

    dashboardFetchRequestedRef.current = true;
    fetchAllData();
  }, [fetchAllData, isInitialized, isLoading, paymentsLoaded]);

  useEffect(() => {
    if (fetchTrafficStats && channelsMap && Object.keys(channelsMap).length > 0) {
      const start = startDate ? new Date(startDate) : null;
      const end = endDate ? new Date(endDate) : null;
      if (start) start.setHours(0, 0, 0, 0);
      if (end) end.setHours(23, 59, 59, 999);
      const isoStart = start ? start.toISOString() : undefined;
      const isoEnd = end ? end.toISOString() : undefined;
      fetchTrafficStats(isoStart, isoEnd);
    }
  }, [fetchTrafficStats, startDate, endDate, channelsMap]);

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

  const managerLookup = useMemo(() => {
    const byId = new Map();
    const byName = new Map();

    (managers || []).forEach((manager) => {
      if (manager.id) byId.set(String(manager.id), manager);
      if (manager.name) byName.set(manager.name, manager);
    });

    return { byId, byName };
  }, [managers]);

  const getManagerProfile = (managerId, managerName) => {
    if (managerId && managerLookup.byId.has(String(managerId))) {
      return managerLookup.byId.get(String(managerId));
    }
    return managerLookup.byName.get(managerName) || null;
  };

  const openManagerModal = (managerProfile, fallback = {}) => {
    setManagerModalTarget({
      manager: managerProfile,
      name: managerProfile?.name || fallback.name,
      role: managerProfile?.role || fallback.role,
      managerId: managerProfile?.id || fallback.managerId,
      telegram_id: managerProfile?.telegram_id || fallback.telegram_id,
      payment: fallback.payment || null,
    });
  };

  // 1. GLOBAL RANKING LOGIC (from global payments)
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
      // Sort by date ascending
      userPayments.sort((a, b) => new Date(a.transactionDate) - new Date(b.transactionDate));
      userPayments.forEach((p, index) => {
        ranks.set(p.id, index + 1);
      });
    });
    return ranks;
  }, [payments]);

  // 🔥 RAW ФИЛЬТРАЦИЯ
  const filteredData = useMemo(() => {
    const startStr = startDate ? toYMD(startDate) : '0000-00-00';
    const endStr = endDate ? toYMD(endDate) : '9999-99-99';

    let data = payments.filter(item => {
      if (!item.transactionDate) return false;
      // Извлекаем дату оплаты в Kyiv timezone
      const dbDateStr = extractUTCDate(item.transactionDate);

      if (dbDateStr < startStr || dbDateStr > endStr) return false;

      if (filters.manager.length > 0) {
        if (isRestrictedUser) {
          if (item.manager !== currentUser.name) return false;
        } else {
          if (!filters.manager.includes(item.manager)) return false;
        }
      } else {
        if (isRestrictedUser && item.manager !== currentUser.name) return false;
      }


      if (filters.country.length > 0 && !filters.country.includes(item.country)) return false;
      if (filters.product.length > 0 && !filters.product.includes(item.product)) return false;
      if (filters.type.length > 0 && !filters.type.includes(item.type)) return false;

      // Фильтр по источнику
      if (filters.source !== 'all') {
        if (item.source !== filters.source) return false;
      }

      // Фильтр по отделу (мультиселект, [] = все)
      if (filters.department.length > 0) {
        const matchesDept = filters.department.some(dept => {
          if (dept === 'sales') return item.managerRole === 'Sales' || item.managerRole === 'SeniorSales';
          if (dept === 'consultant') return item.managerRole === 'Consultant';
          if (dept === 'taro') return item.managerRole === 'SalesTaro' || item.managerRole === 'SalesTaroNew';
          return false;
        });
        if (!matchesDept) return false;
      }

      return true;
    });

    return data.sort((a, b) => new Date(b.transactionDate) - new Date(a.transactionDate));
  }, [payments, startDate, endDate, filters, isRestrictedUser, currentUser]);

  const stats = useMemo(() => {
    const totalEur = filteredData.reduce((sum, item) => sum + (item.amountEUR || 0), 0);
    const count = filteredData.length;
    let traffic = 0;

    // New metrics
    let uniqueSales = 0;
    let repeatSales = 0;
    const activeManagersSet = new Set();

    // Count ranks and managers from filtered Data
    filteredData.forEach(p => {
      if (p.manager) activeManagersSet.add(p.manager);

      // Use Global Rank
      const rank = paymentRanks.get(p.id);
      if (rank === 1 || rank === undefined) uniqueSales++; // undefined = нет crm_link → считаем уникальной
      if (rank >= 2) repeatSales++;
    });

    if (trafficStats && Object.keys(trafficStats).length > 0) {
      const startStr = startDate ? toYMD(startDate) : '0000-00-00';
      const endStr = endDate ? toYMD(endDate) : '9999-99-99';

      const countTrafficForGeo = (geo) => {
        const geoData = trafficStats[geo];
        if (!geoData) return 0;
        let sum = 0;
        Object.entries(geoData).forEach(([dateStr, val]) => {
          if (dateStr < startStr || dateStr > endStr) return;

          if (typeof val === 'object' && val !== null) {
            if (filters.source === 'all') sum += (val.all || 0);
            else if (filters.source === 'direct') sum += (val.direct || 0);
            else if (filters.source === 'comments') sum += (val.comments || 0);
            else if (filters.source === 'whatsapp') sum += (val.whatsapp || 0);
          } else {
            sum += (Number(val) || 0);
          }
        });
        return sum;
      };

      if (filters.country && filters.country.length > 0) {
        // If multiple countries selected, sum them up
        traffic = filters.country.reduce((acc, c) => acc + countTrafficForGeo(c), 0);
      } else {
        traffic = Object.keys(trafficStats).reduce((acc, geo) => acc + countTrafficForGeo(geo), 0);
      }
    }

    const conversion = traffic > 0 ? ((count / traffic) * 100).toFixed(2) : "0.00";
    // Conversion from Traffic to Unique
    const conversionUnique = traffic > 0 ? ((uniqueSales / traffic) * 100).toFixed(2) : "0.00";
    const avgCheck = count > 0 ? (totalEur / count).toFixed(2) : "0";

    return {
      traffic,
      conversion,
      totalEur: totalEur.toFixed(2),
      count,
      uniqueSales,
      repeatSales,
      conversionUnique,
      avgCheck,
      activeManagers: activeManagersSet.size
    };
  }, [filteredData, trafficStats, filters, startDate, endDate, paymentRanks]);

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

  // ✅ CONSULTANT STATS — always by role, ignores source filter
  const consultantStats = useMemo(() => {
    const startStr = startDate ? toYMD(startDate) : '0000-00-00';
    const endStr = endDate ? toYMD(endDate) : '9999-99-99';

    const consultPayments = payments.filter(item => {
      if (!item.transactionDate) return false;
      if (item.managerRole !== 'Consultant') return false;
      const dbDateStr = extractUTCDate(item.transactionDate);
      if (dbDateStr < startStr || dbDateStr > endStr) return false;
      if (filters.country.length > 0 && !filters.country.includes(item.country)) return false;
      if (filters.manager.length > 0 && !filters.manager.includes(item.manager)) return false;
      if (isRestrictedUser && item.manager !== currentUser?.name) return false;
      return true;
    });

    const totalEur = consultPayments.reduce((s, p) => s + (p.amountEUR || 0), 0);
    const activeMgrs = new Set(consultPayments.map(p => p.manager));
    return {
      sales: consultPayments.length,
      depositSum: totalEur.toFixed(2),
      activeMgrs: activeMgrs.size,
      avgCheck: consultPayments.length > 0 ? (totalEur / consultPayments.length).toFixed(2) : '0.00',
    };
  }, [payments, startDate, endDate, filters.country, filters.manager, isRestrictedUser, currentUser]);

  // --- STATIC EMPLOYEE COUNTS ---
  const employeeCounts = useMemo(() => {
    const allManagers = useAppStore.getState().managers || [];
    const salesCount = allManagers.filter(m => ['Sales', 'SeniorSales', 'SalesTaro', 'SalesTaroNew'].includes(m.role)).length;
    const consCount = allManagers.filter(m => m.role === 'Consultant').length;
    const totalCount = allManagers.filter(m => ['Sales', 'Consultant', 'SeniorSales', 'SalesTaro', 'SalesTaroNew'].includes(m.role)).length;
    return { sales: salesCount, consultants: consCount, total: totalCount };
  }, [useAppStore.getState().managers]);

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
    return Object.entries(statsByName).map(([name, data]) => ({ name, ...data })).sort((a, b) => b.sum - a.sum).slice(0, 50);
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
      let realTraffic = 0;
      if (trafficStats && trafficStats[code]) {
        const startStr = startDate ? toYMD(startDate) : '0000-00-00';
        const endStr = endDate ? toYMD(endDate) : '9999-99-99';

        Object.entries(trafficStats[code]).forEach(([dateStr, val]) => {
          if (dateStr < startStr || dateStr > endStr) return;
          if (typeof val === 'object' && val !== null) {
            if (filters.source === 'all') realTraffic += (val.all || 0);
            else if (filters.source === 'direct') realTraffic += (val.direct || 0);
            else if (filters.source === 'comments') realTraffic += (val.comments || 0);
          } else {
            realTraffic += (Number(val) || 0);
          }
        });
      }

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
    }).sort((a, b) => b.salesSum - a.salesSum).slice(0, 50);
  }, [filteredData, trafficStats, startDate, endDate, filters.source]);

  const paymentMethodStats = useMemo(() => {
    const statsByType = {};
    let totalSum = 0;

    filteredData.forEach((payment) => {
      const type = payment.type || 'Other';
      const amountEUR = Number(payment.amountEUR || 0);

      if (!statsByType[type]) {
        statsByType[type] = { type, count: 0, sum: 0 };
      }

      statsByType[type].count += 1;
      statsByType[type].sum += amountEUR;
      totalSum += amountEUR;
    });

    const items = Object.values(statsByType)
      .map((item) => ({
        ...item,
        avgCheck: item.count > 0 ? item.sum / item.count : 0,
        share: filteredData.length > 0 ? (item.count / filteredData.length) * 100 : 0,
      }))
      .sort((a, b) => b.sum - a.sum || b.count - a.count);

    return {
      items,
      totalCount: filteredData.length,
      totalSum,
      maxSum: Math.max(1, ...items.map((item) => item.sum)),
    };
  }, [filteredData]);

  const resetDateRange = () => setDateRange(getTodayRange());
  const resetFilters = () => {
    setFilters({ manager: [], country: [], product: [], type: [], source: 'all', department: [] });
    setDateRange(getTodayRange());
  };

  const dashboardLoadingStep = useMemo(() => {
    if (!managers?.length || !countries?.length || !channelsMap || Object.keys(channelsMap).length === 0) return 0;
    if (!paymentsLoaded) return 1;
    if (!trafficStats || Object.keys(trafficStats).length === 0) return 2;
    return 3;
  }, [managers, countries, channelsMap, paymentsLoaded, trafficStats]);

  if (isLoading || !paymentsLoaded) {
    return (
      <AstroLoadingStatus
        variant="page"
        title="Загружаем обзор"
        message="Получаем оплаты, трафик и справочники для общего дашборда"
        steps={DASHBOARD_LOADING_STEPS}
        activeStep={dashboardLoadingStep}
        className="h-[calc(100vh-80px)] bg-[#F5F5F5] dark:bg-[#0A0A0A]"
      />
    );
  }

  return (
    <div className="pb-10 transition-colors duration-200 w-full max-w-full overflow-x-hidden">

      {/* HEADER + FILTERS */}
      <div className="sticky top-0 z-20 bg-[#F5F5F5] dark:bg-[#0A0A0A] -mx-3 px-2 md:px-6 py-2 lg:py-0 border-b border-transparent transition-colors duration-200">

        {/* Заголовок */}
        <div className="flex items-center justify-center md:justify-start gap-2 mb-3 lg:hidden">
          <h2 className="text-base md:text-lg font-bold dark:text-white tracking-tight flex items-center gap-2 text-center md:text-left min-w-0">
            <LayoutDashboard size={16} className="text-blue-600 dark:text-blue-500 shrink-0 md:w-5 md:h-5" />
            <span>Обзор</span>
          </h2>
        </div>



        {/* Все фильтры */}
        <div className="w-full md:w-auto mx-auto max-w-[90%] md:max-w-none">
          <div className="flex flex-col md:flex-row md:flex-wrap items-stretch md:items-center gap-2 md:justify-between">

            {/* ГРУППА КНОПОК СЛЕВА */}
            <div className="flex flex-col md:flex-row gap-2 w-full md:w-auto">
              {/* Кнопки источников */}
              <div className="flex bg-gray-200 dark:bg-[#1A1A1A] p-0.5 rounded-[6px] h-[34px] items-center w-full md:w-auto justify-center">
                <button onClick={() => setFilters(prev => ({ ...prev, source: 'all' }))} className={`px-2.5 h-full rounded-[4px] text-[10px] font-bold transition-all whitespace-nowrap ${filters.source === 'all' ? 'bg-white dark:bg-[#333] text-black dark:text-white shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}>Все</button>
                <button onClick={() => setFilters(prev => ({ ...prev, source: 'direct' }))} className={`px-2 h-full rounded-[4px] text-[10px] font-bold transition-all flex items-center gap-1 whitespace-nowrap ${filters.source === 'direct' ? 'bg-white dark:bg-[#333] text-blue-600 dark:text-blue-400 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}><MessageCircle size={10} />Direct</button>
                <button onClick={() => setFilters(prev => ({ ...prev, source: 'comments' }))} className={`px-2 h-full rounded-[4px] text-[10px] font-bold transition-all flex items-center gap-1 whitespace-nowrap ${filters.source === 'comments' ? 'bg-white dark:bg-[#333] text-orange-600 dark:text-orange-400 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}><MessageSquare size={10} />Comm</button>
                <button onClick={() => setFilters(prev => ({ ...prev, source: 'whatsapp' }))} className={`px-2 h-full rounded-[4px] text-[10px] font-bold transition-all flex items-center gap-1 whitespace-nowrap ${filters.source === 'whatsapp' ? 'bg-white dark:bg-[#333] text-green-600 dark:text-green-400 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}><Phone size={10} />WP</button>
              </div>

              {/* Кнопки Департаментов */}
              <div className="flex bg-gray-200 dark:bg-[#1A1A1A] p-0.5 rounded-[6px] h-[34px] items-center w-full md:w-auto justify-center">
                <button onClick={() => setFilters(prev => ({ ...prev, department: [] }))} className={`px-2.5 h-full rounded-[4px] text-[10px] font-bold transition-all whitespace-nowrap ${filters.department.length === 0 ? 'bg-white dark:bg-[#333] text-black dark:text-white shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}>Все</button>
                <button onClick={() => setFilters(prev => ({ ...prev, department: prev.department.includes('sales') ? prev.department.filter(d => d !== 'sales') : [...prev.department, 'sales'] }))} className={`px-2.5 h-full rounded-[4px] text-[10px] font-bold transition-all whitespace-nowrap ${filters.department.includes('sales') ? 'bg-white dark:bg-[#333] text-black dark:text-white shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}>ОП</button>
                <button onClick={() => setFilters(prev => ({ ...prev, department: prev.department.includes('consultant') ? prev.department.filter(d => d !== 'consultant') : [...prev.department, 'consultant'] }))} className={`px-2.5 h-full rounded-[4px] text-[10px] font-bold transition-all whitespace-nowrap ${filters.department.includes('consultant') ? 'bg-white dark:bg-[#333] text-black dark:text-white shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}>Конс.</button>
                <button onClick={() => setFilters(prev => ({ ...prev, department: prev.department.includes('taro') ? prev.department.filter(d => d !== 'taro') : [...prev.department, 'taro'] }))} className={`px-2.5 h-full rounded-[4px] text-[10px] font-bold transition-all whitespace-nowrap ${filters.department.includes('taro') ? 'bg-white dark:bg-[#333] text-purple-600 dark:text-purple-400 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}>Таро</button>
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
                    {hasActiveFilters && '●'}
                  </span>
                </button>

                {filters.showMobileFilters && (
                  <div className="space-y-2 p-3 bg-white dark:bg-[#111] border border-gray-200 dark:border-[#333] rounded-lg">
                    {!isRestrictedUser && <DenseSelect label="Менеджер" value={filters.manager} options={uniqueValues.managers} onChange={(val) => setFilters(p => ({ ...p, manager: val }))} />}
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

      <div className="flex flex-col lg:flex-row items-start gap-3 md:gap-4 mb-6 mt-4 w-full min-w-0">

        {/* --- LEFT COLUMN: LIVE FEED (Последние операции) --- */}
        <div
          className="flex-1 lg:w-[55%] w-full flex flex-col min-w-0 order-2 lg:order-2"
          style={{
            '--dashboard-summary-height': summaryColumnHeight ? `${summaryColumnHeight}px` : 'calc(100vh - 140px)',
          }}
        >
          <div className="bg-white dark:bg-[#111] border border-gray-200 dark:border-[#333] rounded-xl overflow-hidden shadow-sm flex flex-col h-[900px] lg:h-[var(--dashboard-summary-height)] transition-colors duration-200">
            <div className="px-4 py-3 border-b border-gray-200 dark:border-[#333] flex items-center gap-3 bg-gray-50/50 dark:bg-[#161616] shrink-0">
              <span className="relative flex h-2 w-2 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-xs font-bold uppercase tracking-widest text-gray-600 dark:text-gray-400">Транзакции</span>
              <span className="hidden md:inline text-[10px] text-gray-400 dark:text-gray-600">· real-time</span>
            </div>
            
            {/* Desktop Table (Scrollable within container) */}
            <div className="hidden md:block overflow-auto flex-1 custom-scrollbar w-full min-w-0 bg-white dark:bg-[#111]">
              <table className="w-full text-left text-xs text-gray-600 dark:text-[#888] whitespace-nowrap relative">
                <thead className="bg-gray-50 dark:bg-[#161616] font-medium border-b border-gray-200 dark:border-[#333] sticky top-0 z-10 shadow-sm">
                  <tr>
                    <th className="px-4 py-2">Дата (UTC)</th>
                    <th className="px-4 py-2">Менеджер</th>
                    <th className="px-4 py-2">ГЕО</th>
                    <th className="px-4 py-2 w-[90px]">Метод</th>
                    <th className="px-4 py-2">Сумма (Loc)</th>
                    <th className="px-4 py-2">Сумма (EUR)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-[#222]">
                  {isLoading ? (
                    <tr><td colSpan="8" className="px-4 py-6 text-center text-xs">Загрузка...</td></tr>
                  ) : (
                    <>
                      {/* 🟡 FILLING ROWS — managers currently opening AddPaymentModal */}
                      {activeFilling.map((f) => {
                        const managerProfile = getManagerProfile(f.manager_id, f.manager_name);
                        return (
                          <tr key={`filling-${f.manager_id}`} className="bg-amber-50 dark:bg-amber-900/10 border-l-2 border-amber-400 animate-pulse-subtle">
                            <td className="px-4 py-2 font-mono">
                              <div className="flex items-center gap-2">
                                <span className="text-gray-400 text-[10px]">
                                  {new Date(f.started_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-2">
                              <ManagerNameButton
                                manager={managerProfile}
                                name={f.manager_name}
                                role={f.manager_role}
                                onClick={() => openManagerModal(managerProfile, {
                                  name: f.manager_name,
                                  role: f.manager_role,
                                  managerId: f.manager_id,
                                })}
                              />
                            </td>
                            <td className="px-4 py-2">
                              <span className="text-gray-300 dark:text-gray-600 text-[10px]">—</span>
                            </td>
                            <td className="px-4 py-2" colSpan="3">
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-amber-400/20 border border-amber-400/40 text-amber-600 dark:text-amber-400 text-[10px] font-bold uppercase tracking-widest">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping inline-block"></span>
                                Заполнение...
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                      {/* Normal rows */}
                      {filteredData.slice(0, 100).map((p) => {
                        const managerProfile = getManagerProfile(p.managerId, p.manager);
                        return (
                          <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-[#1A1A1A] transition-colors">
                            <td className="px-4 py-2 font-mono flex items-center gap-2 h-[41px]">
                              <span className="text-gray-500">
                                {formatUTCDate(p.transactionDate).slice(0, 5)}
                              </span>
                              <span className="bg-gray-100 dark:bg-[#222] text-gray-800 dark:text-gray-300 px-1.5 py-0.5 rounded text-[10px] font-bold border border-gray-200 dark:border-[#333]">
                                {formatUTCTime(p.transactionDate)}
                              </span>
                            </td>
                            <td className="px-4 py-2">
                              <ManagerNameButton
                                manager={managerProfile}
                                name={p.manager}
                                role={p.managerRole}
                                onClick={() => openManagerModal(managerProfile, {
                                  name: p.manager,
                                  role: p.managerRole,
                                  managerId: p.managerId,
                                  payment: p,
                                })}
                              />
                            </td>
                            <td className="px-4 py-2">
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-gray-100 dark:bg-[#222] border border-gray-200 dark:border-[#333] text-[10px] font-bold text-gray-600 dark:text-gray-300">
                                {getFlag(p.country)} {getCountryName(p.country)}
                              </span>
                            </td>
                            <td className="px-4 py-2 w-[90px]">
                              <span
                                className={`inline-block w-full max-w-[90px] px-2 py-0.5 rounded text-[10px] font-bold border truncate align-bottom text-center ${getPaymentBadgeStyle(p.type)}`}
                                title={formatPaymentType(p.type)}
                              >
                                {formatPaymentType(p.type)}
                              </span>
                            </td>
                            <td className="px-4 py-2 font-bold text-gray-700 dark:text-gray-300">
                              {p.amountLocal ? p.amountLocal.toLocaleString() : '-'}
                              {p.amountLocal && p.country && (
                                <span className="ml-1 text-[10px] font-normal text-gray-400">{getCurrencyCode(p.country)}</span>
                              )}
                            </td>
                            <td className="px-4 py-2 font-mono font-bold text-gray-900 dark:text-white">
                              {p.amountEUR}
                              <span className="ml-1 text-[10px] font-normal text-gray-400">EUR</span>
                            </td>
                          </tr>
                        );
                      })}
                      {!isLoading && filteredData.length === 0 && (
                        <tr><td colSpan="6" className="px-4 py-6 text-center text-xs">Нет данных</td></tr>
                      )}
                    </>
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards (Scrollable within container) */}
            <div className="md:hidden overflow-y-auto flex-1 custom-scrollbar p-3 space-y-2 bg-gray-50 dark:bg-[#0F0F11]">
              {isLoading ? (
                <div className="text-center py-6 text-xs text-gray-500">Загрузка...</div>
              ) : filteredData.length === 0 ? (
                <div className="text-center py-6 text-xs text-gray-500">Нет данных</div>
              ) : (
                filteredData.slice(0, 50).map((p) => {
                  const isExpanded = expandedId === p.id;
                  const managerProfile = getManagerProfile(p.managerId, p.manager);
                  return (
                    <div key={p.id} className="border border-gray-200 dark:border-[#333] rounded-lg p-3 bg-white dark:bg-[#111] transition-all">
                      <div className="flex justify-between items-center">
                        <div className="flex-1">
                          <div className="font-bold text-lg text-gray-900 dark:text-white">€{p.amountEUR}</div>
                          <div className="text-xs text-gray-500 mt-1 flex items-center gap-1.5">
                            <span>{formatUTCDate(p.transactionDate).slice(0, 5)}</span>
                            <span className="bg-gray-100 dark:bg-[#222] text-gray-800 dark:text-gray-300 px-1.5 py-0.5 rounded text-[10px] font-bold border border-gray-200 dark:border-[#333]">
                              {formatUTCTime(p.transactionDate)}
                            </span>
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
                            <span className="text-xs">{formatUTCDate(p.transactionDate)}</span>
                          </div>
                          <div className="flex justify-between items-center gap-3">
                            <span className="text-gray-500">Менеджер:</span>
                            <ManagerNameButton
                              manager={managerProfile}
                              name={p.manager}
                              role={p.managerRole}
                              compact
                              onClick={() => openManagerModal(managerProfile, {
                                name: p.manager,
                                role: p.managerRole,
                                managerId: p.managerId,
                                payment: p,
                              })}
                            />
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-gray-500">ГЕО:</span>
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-gray-100 dark:bg-[#222] border border-gray-200 dark:border-[#333] text-xs font-bold">
                              {getFlag(p.country)} {getCountryName(p.country)}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-gray-500">Метод:</span>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getPaymentBadgeStyle(p.type)}`}>
                              {formatPaymentType(p.type)}
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
        </div>

        {/* --- RIGHT COLUMN: METRICS & LEADERBOARDS --- */}
        <div ref={summaryColumnRef} className="w-full lg:w-[45%] lg:min-w-[420px] shrink-0 flex flex-col gap-3 md:gap-4 order-1 lg:order-1 min-w-0">

          {/* 1. КЛЮЧЕВЫЕ МЕТРИКИ */}
          <div className="flex flex-col relative group rounded-xl overflow-hidden border border-gray-200 dark:border-[#333] shadow-sm bg-white dark:bg-[#0F0F11] transition-colors duration-200 min-w-0 w-full shrink-0">
            <div className="absolute inset-0 bg-white dark:bg-[#0F0F11] transition-colors duration-200"></div>
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-purple-500/5 pointer-events-none"></div>
            <div className="relative z-10 flex flex-col h-full p-4 md:p-5 overflow-hidden">
              <div className="mb-4 flex items-center justify-between min-w-0">
                <h3 className="text-sm font-bold text-gray-900 dark:text-white tracking-wide flex items-center gap-2 truncate">
                  <Activity size={16} className="text-blue-500 shrink-0" /> Ключевые метрики
                </h3>
              </div>
              
              <div className="grid grid-cols-2 gap-px bg-gray-100 dark:bg-[#222] border border-gray-100 dark:border-[#222] rounded-lg overflow-hidden mb-4 transition-colors duration-200 w-full">
                <TechStatItem icon={Users} label="Трафик" value={stats.traffic} />
                <TechStatItem icon={CreditCard} label="Продажи" value={stats.count} />
                <TechStatItem icon={Percent} label="Конверсия" value={`${stats.conversion}%`} valueColor={getCRColor(stats.conversion)} />
                <TechStatItem icon={Trophy} label="Уникальные" value={stats.uniqueSales} highlight />
                <TechStatItem icon={Layers} label="Повторные" value={stats.repeatSales} />
                <TechStatItem icon={Activity} label="Конв. (Уник)" value={`${stats.conversionUnique}%`} valueColor={getCRColor(stats.conversionUnique)} />
                <TechStatItem icon={DollarSign} label="Оборот" value={`€${Number(stats.totalEur).toLocaleString()}`} highlight />
                <TechStatItem icon={DollarSign} label="Средний чек" value={`€${Number(stats.avgCheck).toLocaleString()}`} />
              </div>

              <div className="flex-1 min-h-[100px] w-full min-w-0">
                <div className="text-[10px] font-bold text-gray-400 uppercase mb-2 truncate">Динамика продаж</div>
                <div className="h-24 w-full min-w-0 overflow-hidden">
                  <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
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

          {/* 2. LEADERBOARDS */}
          <div className="flex flex-col gap-3 md:gap-4 flex-1 min-w-0">
            {/* Top Managers */}
            <div className="bg-white dark:bg-[#111] border border-gray-200 dark:border-[#333] rounded-xl overflow-hidden flex-1 shadow-sm transition-colors duration-200 min-w-0">
              <div className="px-4 py-3 border-b border-gray-200 dark:border-[#333] flex justify-between items-center bg-gray-50/50 dark:bg-[#161616]">
                <div className="flex items-center gap-2 min-w-0">
                  <Trophy size={14} className="text-amber-500 shrink-0" />
                  <span className="text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-400 truncate">Топ менеджеры</span>
                </div>
              </div>
              <div className="p-2 space-y-1 max-h-[160px] overflow-y-auto custom-scrollbar">
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
              <div className="p-2 space-y-1 max-h-[160px] overflow-y-auto custom-scrollbar">
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

            {/* Payment Methods */}
            <div className="bg-white dark:bg-[#111] border border-gray-200 dark:border-[#333] rounded-xl overflow-hidden flex-1 shadow-sm transition-colors duration-200 min-w-0">
              <div className="px-4 py-3 border-b border-gray-200 dark:border-[#333] flex justify-between items-center bg-gray-50/50 dark:bg-[#161616]">
                <div className="flex items-center gap-2 min-w-0">
                  <CreditCard size={14} className="text-violet-500 shrink-0" />
                  <span className="text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-400 truncate">Платежки за период</span>
                </div>
                <div className="hidden sm:flex items-center gap-2 text-[10px] font-bold text-gray-400">
                  <span>{paymentMethodStats.totalCount} оплат</span>
                  <span className="text-gray-300 dark:text-[#333]">·</span>
                  <span>€{paymentMethodStats.totalSum.toFixed(0)}</span>
                </div>
              </div>
              <div className="p-2 space-y-1 max-h-[190px] overflow-y-auto custom-scrollbar">
                {paymentMethodStats.items.map((method) => (
                  <div key={method.type} className="rounded-[6px] bg-gray-50 dark:bg-[#1A1A1A] border border-gray-100 dark:border-[#222] px-3 py-2 hover:border-gray-300 dark:hover:border-[#444] transition-all">
                    <div className="flex items-center justify-between gap-3">
                      <span
                        className={`min-w-0 max-w-[210px] truncate rounded border px-2 py-0.5 text-[10px] font-bold ${getPaymentBadgeStyle(method.type)}`}
                        title={method.type}
                      >
                        {formatPaymentType(method.type)}
                      </span>
                      <div className="flex items-center gap-3 text-right">
                        <span className="text-[10px] text-gray-400 font-medium whitespace-nowrap">{method.count} оплат</span>
                        <span className="text-xs font-mono font-bold text-gray-900 dark:text-white whitespace-nowrap w-[58px]">€{method.sum.toFixed(0)}</span>
                        <span className="text-[10px] font-bold text-violet-500 dark:text-violet-300 w-[38px] text-right">{method.share.toFixed(1)}%</span>
                      </div>
                    </div>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-gray-100 dark:bg-[#2A2A2A]">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-violet-500 to-sky-400"
                        style={{ width: `${Math.max(4, (method.sum / paymentMethodStats.maxSum) * 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
                {paymentMethodStats.items.length === 0 && <div className="text-center py-4 text-xs text-gray-500">Нет данных</div>}
              </div>
            </div>
          </div>

        </div>
      </div>
      {managerModalTarget && (
        <ManagerInsightModal
          target={managerModalTarget}
          onClose={() => setManagerModalTarget(null)}
          payments={payments}
          startDate={startDate}
          endDate={endDate}
          countries={countries}
          getCountryName={getCountryName}
        />
      )}
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

export default DashboardPage;
