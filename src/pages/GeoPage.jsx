import React, { useDeferredValue, useEffect, useMemo, useState } from 'react';
import { useAppStore } from '../store/appStore';
import { supabase } from '../services/supabaseClient';
import {
  Filter,
  Users, TrendingUp, Globe,
  Calendar as CalendarIcon,
  Search, X,
  RotateCcw, RefreshCw
} from 'lucide-react';

import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { extractUTCDate } from '../utils/kyivTime';

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

const GeoPage = () => {
  const { trafficStats, fetchTrafficStats, user: currentUser, countries, projects, isLoading } = useAppStore();

  const [dateRange, setDateRange] = useState(getLastWeekRange());
  const [startDate, endDate] = dateRange;
  const [activeProjectFilter, setActiveProjectFilter] = useState(null);
  const [geoSortMode, setGeoSortMode] = useState('cr_desc');
  const [geoQuery, setGeoQuery] = useState('');

  const [filters, setFilters] = useState(createDefaultFilters);
  const deferredGeoQuery = useDeferredValue(geoQuery.trim().toLowerCase());

  const [localPayments, setLocalPayments] = useState([]);
  const [localLoading, setLocalLoading] = useState(true);

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

  useEffect(() => {
    if (fetchTrafficStats) {
      if (!startDate || !endDate) return;

      // UTC: toYMD уже возвращает YYYY-MM-DD в UTC
      const startStr = toYMD(startDate);
      const endStr = toYMD(endDate);

      const isoStart = `${startStr}T00:00:00.000Z`;
      const isoEnd = `${endStr}T23:59:59.999Z`;

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
    const managersByGeo = {}; // { geoCode: { managerName: { direct:0, comments:0, whatsapp:0, total:0 } } }

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
      if (!managersByGeo[code][mgr]) managersByGeo[code][mgr] = { direct: 0, comments: 0, whatsapp: 0, total: 0 };
      managersByGeo[code][mgr].total += 1;
      if (src === 'comments' || src === 'comment') managersByGeo[code][mgr].comments += 1;
      else if (src === 'whatsapp') managersByGeo[code][mgr].whatsapp += 1;
      else managersByGeo[code][mgr].direct += 1;
    });

    // 5. Трафик из trafficStats
    const trafficByGeo = {};
    (countries || []).forEach(c => {
      trafficByGeo[c.code] = { direct: 0, comments: 0, all: 0 };
    });
    if (trafficStats) {
      Object.entries(trafficStats).forEach(([code, dates]) => {
        if (!validCodes.has(code)) return;
        if (!trafficByGeo[code]) trafficByGeo[code] = { direct: 0, comments: 0, all: 0 };
        Object.entries(dates).forEach(([dateStr, val]) => {
          if (dateStr < startStr || dateStr > endStr) return;
          if (typeof val === 'object') {
            trafficByGeo[code].direct += val.direct || 0;
            trafficByGeo[code].comments += val.comments || 0;
            trafficByGeo[code].all += val.all || 0;
          } else {
            const num = Number(val) || 0;
            trafficByGeo[code].direct += num;
            trafficByGeo[code].all += num;
          }
        });
      });
    }

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
  }, [localPayments, trafficStats, startDate, endDate, filters, isRestrictedUser, currentUser, countries, projects, activeProjectFilter, geoSortMode, deferredGeoQuery]);

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
          <h2 className="text-lg font-bold dark:text-white tracking-tight flex items-center gap-2 pr-4 shrink-0">
            <Globe size={18} className="text-blue-500 shrink-0" />
            <span className="truncate">География</span>
          </h2>

          <div className="flex bg-gray-200 dark:bg-[#1A1A1A] p-0.5 rounded-[8px] h-[32px] items-center shrink-0 w-full md:w-auto">
            <button onClick={() => setGeoSortMode('traffic_desc')} className={`flex-1 px-3 h-full rounded-[6px] text-[11px] font-bold transition-all whitespace-nowrap ${geoSortMode === 'traffic_desc' ? 'bg-white dark:bg-[#333] text-black dark:text-white shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}>По объему лидов</button>
            <button onClick={() => setGeoSortMode('cr_desc')} className={`flex-1 px-3 h-full rounded-[6px] text-[11px] font-bold transition-all whitespace-nowrap ${geoSortMode === 'cr_desc' ? 'bg-white dark:bg-[#333] text-emerald-600 dark:text-emerald-400 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}>Лучший CR</button>
            <button onClick={() => setGeoSortMode('cr_asc')} className={`flex-1 px-3 h-full rounded-[6px] text-[11px] font-bold transition-all whitespace-nowrap ${geoSortMode === 'cr_asc' ? 'bg-white dark:bg-[#333] text-rose-600 dark:text-rose-400 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}>Худший CR</button>
          </div>
        </div>

        {/* Все фильтры - wrapper только для мобильных */}
        <div className="mx-auto max-w-[90%] md:max-w-none">
          <div className="flex flex-col md:flex-row md:flex-wrap items-stretch md:items-center gap-2 md:justify-between">

            {/* ГРУППА КНОПОК СЛЕВА */}
            <div className="flex flex-col md:flex-row gap-2 w-full md:w-auto">
              {/* Поиск GEO */}
              <div className="flex h-[34px] w-full md:w-[220px] items-center gap-2 rounded-[6px] bg-gray-200 px-3 dark:bg-[#1A1A1A] border border-transparent focus-within:border-gray-300 dark:focus-within:border-[#333]">
                <Search size={12} className="shrink-0 text-gray-400" />
                <input
                  type="text"
                  value={geoQuery}
                  onChange={(e) => setGeoQuery(e.target.value)}
                  placeholder="Поиск по GEO"
                  aria-label="Поиск по GEO"
                  className="w-full bg-transparent text-[11px] font-medium text-gray-700 outline-none placeholder:text-gray-500 dark:text-gray-200"
                />
                {geoQuery ? (
                  <button
                    type="button"
                    onClick={() => setGeoQuery('')}
                    className="shrink-0 text-gray-400 transition-colors hover:text-gray-600 dark:hover:text-gray-200"
                    title="Очистить поиск"
                  >
                    <X size={12} />
                  </button>
                ) : null}
              </div>

              {/* Кнопки Департаментов */}
              <div className="flex bg-gray-200 dark:bg-[#1A1A1A] p-0.5 rounded-[6px] h-[34px] items-center w-full md:w-auto justify-center">
                <button onClick={() => setFilters(prev => ({ ...prev, department: 'all' }))} className={`px-2.5 h-full rounded-[4px] text-[10px] font-bold transition-all whitespace-nowrap ${filters.department === 'all' ? 'bg-white dark:bg-[#333] text-black dark:text-white shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}>Все</button>
                <button onClick={() => setFilters(prev => ({ ...prev, department: 'sales' }))} className={`px-2.5 h-full rounded-[4px] text-[10px] font-bold transition-all whitespace-nowrap ${filters.department === 'sales' ? 'bg-white dark:bg-[#333] text-black dark:text-white shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}>ОП</button>
                <button onClick={() => setFilters(prev => ({ ...prev, department: 'consultant' }))} className={`px-2.5 h-full rounded-[4px] text-[10px] font-bold transition-all whitespace-nowrap ${filters.department === 'consultant' ? 'bg-white dark:bg-[#333] text-black dark:text-white shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}>Конс.</button>
                <button onClick={() => setFilters(prev => ({ ...prev, department: 'taro' }))} className={`px-2.5 h-full rounded-[4px] text-[10px] font-bold transition-all whitespace-nowrap ${filters.department === 'taro' ? 'bg-white dark:bg-[#333] text-purple-600 dark:text-purple-400 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}>Таро</button>
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
                      onClick={resetFilters}
                      disabled={!hasActiveFilters}
                      className={`w-full p-2 bg-red-500/10 text-red-500 rounded-[6px] hover:bg-red-500/20 text-xs font-bold transition-opacity ${hasActiveFilters ? 'opacity-100' : 'opacity-50 cursor-not-allowed'}`}
                    >
                      Сбросить фильтры
                    </button>
                  </div>
                )}
              </div>

              <div className="hidden md:flex md:w-[240px]">
                <CustomDateRangePicker
                  startDate={startDate}
                  endDate={endDate}
                  onChange={(update) => setDateRange(update)}
                  onReset={resetDateRange}
                />
              </div>

            </div>
          </div>
        </div>
      </div>

      {/* HORIZONTAL CARDS LIST */}
      <div className="mt-4 space-y-2">
        {geoStats.length === 0 ? (
          <div className="text-center py-12 text-gray-400 text-sm bg-white dark:bg-[#111] rounded-xl border border-gray-200 dark:border-[#2a2a2a]">Нет данных за выбранный период</div>
        ) : (
          geoStats.map((geo) => {
            const countryDef = countries?.find(c => c.code === geo.code) || { name: geo.code, emoji: '🏳️' };
            const project = (projects || []).find(p => p.id === geo.project_id);
            const projName = project?.name?.toLowerCase() || '';

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
              <div key={geo.code} className={`bg-white dark:bg-[#111] rounded-xl border ${cardBorder} shadow-sm overflow-hidden`}>
                <div className="flex items-stretch divide-x divide-gray-100 dark:divide-[#1e1e1e]">

                  {/* LEFT: Geo identity */}
                  <div className="flex items-center gap-3 px-4 py-3 w-[210px] shrink-0">
                    <span className="text-3xl leading-none">{countryDef.emoji}</span>
                    <div className="min-w-0">
                      <div className="font-bold text-sm text-gray-900 dark:text-white truncate">
                        {countryDef.name || geo.code}
                      </div>
                      <div className="mt-1 flex items-center gap-2 min-w-0">
                        <span className="text-[10px] font-mono uppercase text-gray-400 shrink-0">
                          {geo.code}
                        </span>
                        {project ? <ProjectBadge project={project} size="xs" /> : null}
                      </div>
                    </div>
                  </div>

                  {/* CENTER: Source breakdown */}
                  <div className="grid flex-[1.2] min-w-0 grid-cols-2 lg:grid-cols-4 divide-x divide-gray-100 dark:divide-[#1e1e1e]">
                    {srcCols.map((col) => (
                      <div key={col.key} className="flex h-full min-w-0 flex-col justify-center px-3 py-3">
                        <div className="mb-2">
                          <span className={`inline-flex items-center rounded-full px-2 py-1 text-[10px] font-bold ${col.color} ${col.bgLabel}`}>
                            {col.label}
                          </span>
                        </div>

                        <div className="flex items-stretch h-full">
                          <div className="flex flex-1 flex-col justify-center pr-3 border-r border-gray-100 dark:border-[#222] min-w-[80px]">
                            <div className="flex flex-col mb-3">
                              <span className={`text-[17px] font-black leading-none ${col.traffic > 0 ? 'text-blue-500 dark:text-blue-400' : 'text-gray-300 dark:text-gray-600'}`}>
                                {col.traffic > 0 ? col.traffic.toLocaleString() : '—'}
                              </span>
                              <span className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter mt-1">
                                заявок
                              </span>
                            </div>

                            <div className="flex flex-col">
                              <span className={`text-[17px] font-black leading-none ${col.sales > 0 ? 'text-gray-900 dark:text-white' : 'text-gray-300 dark:text-gray-700'}`}>
                                {col.sales > 0 ? col.sales : '—'}
                              </span>
                              <span className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter mt-1">
                                продаж
                              </span>
                            </div>
                          </div>

                          <div className="flex flex-col items-center justify-center w-[60px] shrink-0 pl-2">
                            <span className={`text-[15px] font-black ${crClass(col.cr)}`}>
                              {col.cr > 0 ? `${col.cr}%` : '—'}
                            </span>
                            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter mt-1">
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
                      <div className="px-4 py-2.5 text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider border-b border-gray-100 dark:border-[#222] flex items-center shrink-0 bg-gray-50 dark:bg-[#111]">
                        <div className="flex items-center gap-1.5"><Users size={12} /><span>Менеджеры ({geo.managers.length})</span></div>
                      </div>
                      
                      {/* Managers List */}
                      <div className="flex-1 overflow-y-auto max-h-[160px] custom-scrollbar">
                        {geo.managers.map(([name, stats], idx) => {
                          const crDirect = geo.traffic.direct > 0 ? ((stats.direct / Math.max(geo.traffic.direct, 1)) * 100).toFixed(1) : 0;
                          const crComments = geo.traffic.comments > 0 ? ((stats.comments / Math.max(geo.traffic.comments, 1)) * 100).toFixed(1) : 0;
                          const crAll = geo.traffic.all > 0 ? ((stats.total / Math.max(geo.traffic.all, 1)) * 100).toFixed(1) : 0;
                          const rowBg = idx % 2 === 0 ? 'bg-transparent' : 'bg-gray-50/70 dark:bg-[#141414]';

                          return (
                            <div key={name} className={`flex flex-col px-4 py-3 hover:bg-gray-50 dark:hover:bg-[#1a1a1a] transition-colors border-b border-gray-100 dark:border-[#222] last:border-0 ${rowBg}`}>
                               <div className="flex items-center gap-2 mb-2">
                                  <span className="text-[12px] font-bold text-gray-900 dark:text-gray-200 truncate" title={name}>{name}</span>
                               </div>
                               <div className="grid grid-cols-4 gap-3">
                                  
                                  {/* Direct Stack */}
                                  <div className="flex items-stretch pr-2 border-r border-gray-100 dark:border-[#333]">
                                     <div className="flex flex-col flex-1 min-w-0">
                                         <div className="flex flex-col mb-1.5">
                                           <span className="text-[12px] font-bold text-gray-700 dark:text-gray-400 leading-none">{geo.traffic.direct || 0}</span>
                                           <span className="text-[8px] text-gray-400 uppercase tracking-tighter">заявок</span>
                                         </div>
                                         <div className="flex flex-col">
                                           <span className="text-[12px] font-black text-gray-900 dark:text-gray-200 leading-none">{stats.direct}</span>
                                           <span className="text-[8px] text-gray-400 uppercase tracking-tighter">продаж</span>
                                         </div>
                                     </div>
                                     <div className="flex items-center justify-center pl-2 border-l border-gray-50 dark:border-[#222]">
                                         <span className={`text-[10px] font-black ${crClass(parseFloat(crDirect))}`}>{crDirect > 0 ? `${crDirect}%` : '—'}</span>
                                     </div>
                                  </div>

                                  {/* Comments Stack */}
                                  <div className="flex items-stretch pr-2 border-r border-gray-100 dark:border-[#333]">
                                     <div className="flex flex-col flex-1 min-w-0">
                                         <div className="flex flex-col mb-1.5">
                                           <span className="text-[12px] font-bold text-gray-700 dark:text-gray-400 leading-none">{geo.traffic.comments || 0}</span>
                                           <span className="text-[8px] text-gray-400 uppercase tracking-tighter">заявок</span>
                                         </div>
                                         <div className="flex flex-col">
                                           <span className="text-[12px] font-black text-gray-900 dark:text-gray-200 leading-none">{stats.comments}</span>
                                           <span className="text-[8px] text-gray-400 uppercase tracking-tighter">продаж</span>
                                         </div>
                                     </div>
                                     <div className="flex items-center justify-center pl-2 border-l border-gray-50 dark:border-[#222]">
                                         <span className={`text-[10px] font-black ${crClass(parseFloat(crComments))}`}>{crComments > 0 ? `${crComments}%` : '—'}</span>
                                     </div>
                                  </div>

                                  {/* WhatsApp Stack */}
                                  <div className="flex items-stretch pr-2 border-r border-gray-100 dark:border-[#333]">
                                     <div className="flex flex-col flex-1 min-w-0">
                                         <div className="flex flex-col mb-1.5">
                                           <span className="text-[12px] font-bold text-gray-400 leading-none">—</span>
                                           <span className="text-[8px] text-gray-400 uppercase tracking-tighter">заявок</span>
                                         </div>
                                         <div className="flex flex-col">
                                           <span className="text-[12px] font-black text-gray-900 dark:text-gray-200 leading-none">{stats.whatsapp}</span>
                                           <span className="text-[8px] text-gray-400 uppercase tracking-tighter">продаж</span>
                                         </div>
                                     </div>
                                     <div className="flex items-center justify-center pl-2 border-l border-gray-50 dark:border-[#222]">
                                         <span className={`text-[10px] font-black text-gray-400`}>—</span>
                                     </div>
                                  </div>

                                  {/* Total Stack */}
                                  <div className="flex items-stretch">
                                     <div className="flex flex-col flex-1 min-w-0">
                                         <div className="flex flex-col mb-1.5">
                                           <span className="text-[13px] font-black text-gray-900 dark:text-white leading-none">{geo.traffic.all || 0}</span>
                                           <span className="text-[8px] text-gray-500 font-bold uppercase tracking-tighter">заявок</span>
                                         </div>
                                         <div className="flex flex-col">
                                           <span className="text-[13px] font-black text-blue-600 dark:text-blue-400 leading-none">{stats.total}</span>
                                           <span className="text-[8px] text-gray-500 font-bold uppercase tracking-tighter">продаж</span>
                                         </div>
                                     </div>
                                     <div className="flex items-center justify-center pl-2 border-l border-gray-300 dark:border-[#444]">
                                         <span className={`text-[11px] font-black ${crClass(parseFloat(crAll))}`}>{crAll > 0 ? `${crAll}%` : '—'}</span>
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
    </div>
  );
};

export default GeoPage;
