import React, { useState, useMemo, useEffect } from 'react';
import { useAppStore } from '../../store/appStore';
import {
  Filter, RotateCcw, X, PieChart, Info, LayoutDashboard,
  Calendar as CalendarIcon, MessageCircle, MessageSquare, Phone
} from 'lucide-react';
import "react-datepicker/dist/react-datepicker.css";
import { extractUTCDate, getKyivDateString } from '../../utils/kyivTime';

// --- CONFIG ---
const FLAGS = {
  UA: '🇺🇦', PL: '🇵🇱', IT: '🇮🇹', HR: '🇭🇷',
  BG: '🇧🇬', CZ: '🇨🇿', RO: '🇷🇴', LT: '🇱🇹',
  TR: '🇹🇷', FR: '🇫🇷', PT: '🇵🇹', DE: '🇩🇪',
  US: '🇺🇸', ES: '🇪🇸', SK: '🇸🇰', HU: '🇭🇺',
  KZ: '🇰🇿', UZ: '🇺🇿', MD: '🇲🇩', EE: '🇪🇪',
  GR: '🇬🇷', LV: '🇱🇻'
};

const COUNTRY_NAMES = {
  UA: 'Украина', PL: 'Польша', IT: 'Италия', HR: 'Хорватия',
  BG: 'Болгария', CZ: 'Чехия', RO: 'Румыния', LT: 'Литва',
  TR: 'Турция', FR: 'Франция', PT: 'Португалия', DE: 'Германия',
  US: 'США', ES: 'Испания', SK: 'Словакия', HU: 'Венгрия',
  KZ: 'Казахстан', UZ: 'Узбекистан', MD: 'Молдова',
  EE: 'Эстония', GR: 'Греция', LV: 'Латвия'
};

const getFlag = (code) => FLAGS[code] || '🏳️';
const getCountryName = (code) => COUNTRY_NAMES[code] || code;

const toYMD = (date) => {
  if (!date) return '';
  return getKyivDateString(date);
};

const getLastWeekRange = () => {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - 7);
  return [start, end];
};

import { DenseSelect } from '../../components/ui/FilterSelect';

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

// Custom Desktop Date Range Picker (From StatsPage)
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
    <div className="relative flex-1 opacity-100 min-w-[200px]">
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
          <div className="absolute top-full right-0 mt-2 bg-white dark:bg-[#111] border border-gray-200 dark:border-[#333] rounded-xl shadow-xl z-50 p-2.5 w-[240px] animate-in fade-in slide-in-from-top-2 duration-150">

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

const ConsConversionsPage = () => {
  const { user, payments, fetchAllData } = useAppStore();
  const [dateRange, setDateRange] = useState(getLastWeekRange());
  const [startDate, endDate] = dateRange;
    const [filters, setFilters] = useState({
        department: 'consultant',
        showMobileFilters: false
    });

  const COUNTRY_NAMES = {
    'AE': 'ОАЭ', 'AU': 'Австралия', 'AT': 'Австрия', 'AZ': 'Азербайджан', 'AL': 'Албания', 'DZ': 'Алжир', 'AO': 'Ангола', 'AR': 'Аргентина', 'AM': 'Армения', 'AF': 'Афганистан', 'BD': 'Бангладеш', 'BY': 'Беларусь', 'BE': 'Бельгия', 'BG': 'Болгария', 'BA': 'Босния и Герцеговина', 'BR': 'Бразилия', 'GB': 'Великобритания', 'HU': 'Венгрия', 'VE': 'Венесуэла', 'VN': 'Вьетнам', 'GA': 'Габон', 'GH': 'Гана', 'GT': 'Гватемала', 'GN': 'Гвинея', 'DE': 'Германия', 'GR': 'Греция', 'GE': 'Грузия', 'DK': 'Дания', 'DO': 'Доминиканская Республика', 'EG': 'Египет', 'ZM': 'Замбия', 'ZW': 'Зимбабве', 'IL': 'Израиль', 'IN': 'Индия', 'ID': 'Индонезия', 'JO': 'Иордания', 'IQ': 'Ирак', 'IR': 'Иран', 'IE': 'Ирландия', 'ES': 'Испания', 'IT': 'Италия', 'YE': 'Йемен', 'KZ': 'Казахстан', 'KH': 'Камбоджа', 'CM': 'Камерун', 'CA': 'Канада', 'QA': 'Катар', 'KE': 'Кения', 'CY': 'Кипр', 'KG': 'Кыргызстан', 'CN': 'Китай', 'CO': 'Колумбия', 'CD': 'Конго (ДРК)', 'KP': 'КНДР', 'KR': 'Южная Корея', 'CR': 'Коста-Рика', 'CI': 'Кот-д\'Ивуар', 'CU': 'Куба', 'KW': 'Кувейт', 'LA': 'Лаос', 'LV': 'Латвия', 'LB': 'Ливан', 'LY': 'Ливия', 'LT': 'Литва', 'LU': 'Люксембург', 'MG': 'Мадагаскар', 'MY': 'Малайзия', 'ML': 'Мали', 'MA': 'Марокко', 'MX': 'Мексика', 'MZ': 'Мозамбик', 'MD': 'Молдова', 'MN': 'Монголия', 'MM': 'Мьянма', 'NA': 'Намибия', 'NP': 'Непал', 'NL': 'Нидерланды', 'NE': 'Нигер', 'NG': 'Нигерия', 'NZ': 'Новая Зеландия', 'NO': 'Норвегия', 'OM': 'Оман', 'PK': 'Пакистан', 'PA': 'Панама', 'PY': 'Парагвай', 'PE': 'Перу', 'PL': 'Польша', 'PT': 'Португалия', 'RU': 'Россия', 'RO': 'Румыния', 'SA': 'Саудовская Аравия', 'SN': 'Сенегал', 'RS': 'Сербия', 'SG': 'Сингапур', 'SY': 'Сирия', 'SK': 'Словакия', 'SI': 'Словения', 'SO': 'Сомали', 'SD': 'Судан', 'US': 'США', 'TH': 'Таиланд', 'TZ': 'Танзания', 'TG': 'Того', 'TN': 'Тунис', 'TR': 'Турция', 'UG': 'Уганда', 'UZ': 'Узбекистан', 'UA': 'Украина', 'UY': 'Уругвай', 'PH': 'Филиппины', 'FI': 'Финляндия', 'FR': 'Франция', 'HR': 'Хорватия', 'CZ': 'Чехия', 'CL': 'Чили', 'CH': 'Швейцария', 'SE': 'Швеция', 'LK': 'Шри-Ланка', 'EC': 'Эквадор', 'EE': 'Эстония', 'ET': 'Эфиопия', 'ZA': 'ЮАР', 'JM': 'Ямайка', 'JP': 'Япония'
  };

  useEffect(() => { fetchAllData(); }, [fetchAllData]);

  const uniqueGeos = useMemo(() => {
    const allGeos = [...new Set(payments.map(p => p.country).filter(Boolean))].sort();
    if (!user || ['Admin', 'C-level', 'SeniorSales'].includes(user.role)) {
      return allGeos;
    }
    const userGeos = user.geo || [];
    return allGeos.filter(g => userGeos.includes(g));
  }, [payments, user]);

  // 1. GLOBAL RANKING LOGIC
  // Group ALL payments by user (crm_link) to determine the absolute rank of each payment
  const paymentRanks = useMemo(() => {
    const ranks = new Map(); // Map<PaymentID, RankNumber>
    const grouped = {};

    payments.forEach(p => {
      const link = p.crm_link ? p.crm_link.trim().toLowerCase() : null;
      if (!link || link === '—') return; // Skip if no link
      if (!grouped[link]) grouped[link] = [];
      grouped[link].push(p);
    });

    Object.values(grouped).forEach(userPayments => {
      // Sort by date ascending to find 1st, 2nd, 3rd...
      userPayments.sort((a, b) => new Date(a.transactionDate) - new Date(b.transactionDate));
      userPayments.forEach((p, index) => {
        ranks.set(p.id, index + 1);
      });
    });
    return ranks;
  }, [payments]);

  // 2. FILTER & AGGREGATE
  const tableData = useMemo(() => {
    const startStr = startDate ? toYMD(startDate) : '0000-00-00';
    const endStr = endDate ? toYMD(endDate) : '9999-99-99';

    // Filter payments for the CURRENT VIEW
    const filtered = payments.filter(p => {
      const pDate = extractUTCDate(p.transactionDate);
      if (pDate < startStr || pDate > endStr) return false;

      // 🔥 GEO RESTRICTION
      if (user && !['Admin', 'C-level', 'SeniorSales'].includes(user.role)) {
        const userGeos = user.geo || [];
        if (!p.country || !userGeos.includes(p.country)) return false;
      }

      return true;
    });

    // Group by GEO
    const statsByGeo = {};

    filtered.forEach(p => {
      const geo = p.country || 'Unknown';
      if (!statsByGeo[geo]) statsByGeo[geo] = { geo, sales1: 0, sales2: 0, sales3: 0, sales4: 0 };

      const rank = paymentRanks.get(p.id);
      if (!rank) return; // Should not happen for valid linked payments

      if (rank === 1) {
        statsByGeo[geo].sales1++;
      } else {
        // String-based department match (from new UI buttons)
        const dept = filters.department;
        let matchesRole = false;

        if (dept === 'all') {
          matchesRole = true;
        } else if (dept === 'consultant' && p.managerRole === 'Consultant') {
          matchesRole = true;
        } else if (dept === 'sales' && (p.managerRole === 'Sales' || p.managerRole === 'SeniorSales')) {
          matchesRole = true;
        }

        if (matchesRole) {
          if (rank === 2) statsByGeo[geo].sales2++;
          else if (rank === 3) statsByGeo[geo].sales3++;
          else if (rank === 4) statsByGeo[geo].sales4++;
        }
      }
    });

    // Calculate conversions and array format
    return Object.values(statsByGeo).map(item => {
      const c1_2 = item.sales1 > 0 ? ((item.sales2 / item.sales1) * 100).toFixed(1) : '0.0';
      const c2_3 = item.sales2 > 0 ? ((item.sales3 / item.sales2) * 100).toFixed(1) : '0.0';
      const c3_4 = item.sales3 > 0 ? ((item.sales4 / item.sales3) * 100).toFixed(1) : '0.0';

      return {
        ...item,
        c1_2,
        c2_3,
        c3_4
      };
    }).sort((a, b) => parseFloat(b.c1_2) - parseFloat(a.c1_2)); // SORT BY CONVERSION 2 descending
  }, [payments, paymentRanks, startDate, endDate, filters]);
    // Graph Data
    const funnelStats = useMemo(() => {
        let sales1 = 0, sales2 = 0, sales3 = 0, sales4 = 0;
        tableData.forEach(row => {
            sales1 += row.sales1;
            sales2 += row.sales2;
            sales3 += row.sales3;
            sales4 += row.sales4;
        });

        const c1_2 = sales1 > 0 ? ((sales2 / sales1) * 100).toFixed(1) : '0.0';
        const c2_3 = sales2 > 0 ? ((sales3 / sales2) * 100).toFixed(1) : '0.0';
        const c3_4 = sales3 > 0 ? ((sales4 / sales3) * 100).toFixed(1) : '0.0';

        return { sales1, sales2, sales3, sales4, c1_2, c2_3, c3_4 };
    }, [tableData]);

    const getCRBgColor = (valStr) => {
        if (valStr === '—' || valStr === '0.0' || valStr === 0) return 'bg-gray-50/50 dark:bg-[#1A1A1A] text-gray-400';
        const num = parseFloat(valStr);
        if (num >= 20) return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400 font-bold';
        if (num >= 10) return 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400 font-medium';
        return 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400 opacity-90';
    };

    const resetFilters = () => {
        setFilters({ department: 'consultant', showMobileFilters: false });
        setDateRange(getLastWeekRange());
    };

    return (
        <div className="pb-10 transition-colors duration-200">
            {/* Header & Filters */}
            <div className="sticky top-0 z-30 bg-[#F5F5F5] dark:bg-[#0A0A0A] -mx-4 px-4 py-3 border-b border-gray-200 dark:border-[#333] mb-6 flex flex-col gap-4 shadow-sm">
                
                {/* Top Row: Title & Department Selector */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                            <PieChart size={18} className="text-blue-500" />
                        </div>
                        <span>Конверсии Воронки</span>
                    </h2>

                    <div className="flex bg-gray-100 dark:bg-[#1A1A1A] p-1 rounded-[8px] border border-gray-200 dark:border-[#333]">
                        <button onClick={() => setFilters(prev => ({ ...prev, department: 'all' }))} className={`px-4 py-1.5 rounded-[6px] text-xs font-bold transition-all ${filters.department === 'all' ? 'bg-white dark:bg-[#2A2A2A] text-blue-600 dark:text-blue-400 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}>Все отделы</button>
                        <button onClick={() => setFilters(prev => ({ ...prev, department: 'consultant' }))} className={`px-4 py-1.5 rounded-[6px] text-xs font-bold transition-all ${filters.department === 'consultant' ? 'bg-white dark:bg-[#2A2A2A] text-blue-600 dark:text-blue-400 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}>Консультанты</button>
                        <button onClick={() => setFilters(prev => ({ ...prev, department: 'sales' }))} className={`px-4 py-1.5 rounded-[6px] text-xs font-bold transition-all ${filters.department === 'sales' ? 'bg-white dark:bg-[#2A2A2A] text-blue-600 dark:text-blue-400 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}>Отдел Продаж</button>
                    </div>
                </div>

                {/* Bottom Row: Date Filter */}
                <div className="flex flex-col md:flex-row md:items-center justify-end gap-3 bg-white dark:bg-[#111] p-2 rounded-xl border border-gray-200 dark:border-[#333]">
                    <div className="flex items-center gap-2 w-full md:w-auto shrink-0 justify-end">
                         <div className="w-full md:w-[220px]">
                            <CustomDateRangePicker startDate={startDate} endDate={endDate} onChange={setDateRange} onReset={() => setDateRange(getLastWeekRange())} />
                        </div>
                        <button onClick={resetFilters} className="bg-red-50 hover:bg-red-100 dark:bg-red-900/10 dark:hover:bg-red-900/20 text-red-500 dark:text-red-400 p-2 rounded-[6px] transition-colors shrink-0 border border-red-100 dark:border-red-900/30" title="Сбросить все">
                            <RotateCcw size={16} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Funnel Pipeline Widget */}
            <div className="mb-6 bg-white dark:bg-[#111] border border-gray-200 dark:border-[#333] rounded-xl p-6 shadow-sm w-full overflow-x-auto">
                <div className="flex flex-col md:flex-row items-center justify-between min-w-[600px] gap-2 md:gap-4 lg:px-8">
                    
                    {/* Step 1 */}
                    <div className="flex flex-col items-center justify-center flex-1 relative min-w-[80px]">
                        <span className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-2">1-я оплата</span>
                        <div className="w-16 h-16 rounded-full bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-400 dark:border-blue-500/50 flex items-center justify-center z-10 shadow-sm">
                            <span className="text-xl font-black text-blue-600 dark:text-blue-400">{funnelStats.sales1}</span>
                        </div>
                    </div>

                    {/* Funnel 1->2 */}
                    <div className="flex flex-col items-center flex-1 min-w-[60px] relative w-full pt-6">
                        <div className="absolute top-1/2 left-0 right-0 h-1 bg-gradient-to-r from-blue-400 to-emerald-400 dark:from-blue-600/50 dark:to-emerald-600/50 -translate-y-1/2 rounded-full hidden md:block" />
                        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${getCRBgColor(funnelStats.c1_2)} border border-transparent dark:border-[#333] z-10 shadow-sm`}>
                            {funnelStats.c1_2}%
                        </span>
                    </div>

                    {/* Step 2 */}
                    <div className="flex flex-col items-center justify-center flex-1 relative min-w-[80px]">
                        <span className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-2">2-я оплата</span>
                        <div className="w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-900/20 border-2 border-emerald-400 dark:border-emerald-500/50 flex items-center justify-center z-10 shadow-sm">
                            <span className="text-xl font-black text-emerald-600 dark:text-emerald-400">{funnelStats.sales2}</span>
                        </div>
                    </div>

                    {/* Funnel 2->3 */}
                    <div className="flex flex-col items-center flex-1 min-w-[60px] relative w-full pt-6">
                         <div className="absolute top-1/2 left-0 right-0 h-1 bg-gradient-to-r from-emerald-400 to-amber-400 dark:from-emerald-600/50 dark:to-amber-600/50 -translate-y-1/2 rounded-full hidden md:block" />
                        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${getCRBgColor(funnelStats.c2_3)} border border-transparent dark:border-[#333] z-10 shadow-sm`}>
                            {funnelStats.c2_3}%
                        </span>
                    </div>

                    {/* Step 3 */}
                    <div className="flex flex-col items-center justify-center flex-1 relative min-w-[80px]">
                        <span className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-2">3-я оплата</span>
                        <div className="w-16 h-16 rounded-full bg-amber-50 dark:bg-amber-900/20 border-2 border-amber-400 dark:border-amber-500/50 flex items-center justify-center z-10 shadow-sm">
                            <span className="text-xl font-black text-amber-600 dark:text-amber-400">{funnelStats.sales3}</span>
                        </div>
                    </div>

                    {/* Funnel 3->4 */}
                    <div className="flex flex-col items-center flex-1 min-w-[60px] relative w-full pt-6">
                         <div className="absolute top-1/2 left-0 right-0 h-1 bg-gradient-to-r from-amber-400 to-purple-400 dark:from-amber-600/50 dark:to-purple-600/50 -translate-y-1/2 rounded-full hidden md:block" />
                        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${getCRBgColor(funnelStats.c3_4)} border border-transparent dark:border-[#333] z-10 shadow-sm`}>
                            {funnelStats.c3_4}%
                        </span>
                    </div>

                    {/* Step 4 */}
                    <div className="flex flex-col items-center justify-center flex-1 relative min-w-[80px]">
                        <span className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-2">4-я оплата</span>
                        <div className="w-16 h-16 rounded-full bg-purple-50 dark:bg-purple-900/20 border-2 border-purple-400 dark:border-purple-500/50 flex items-center justify-center z-10 shadow-sm">
                            <span className="text-xl font-black text-purple-600 dark:text-purple-400">{funnelStats.sales4}</span>
                        </div>
                    </div>

                </div>
            </div>
      {/* Content - Data Table */}
      <div className="bg-white dark:bg-[#111] border border-gray-200 dark:border-[#333] rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-[10px] sm:text-xs text-left">
            <thead className="bg-gray-50 dark:bg-[#161616] border-b border-gray-200 dark:border-[#333] text-[10px] uppercase text-gray-500 font-bold sticky top-0 z-10">
              <tr>
                <th className="px-2 py-1.5">ГЕО</th>
                <th className="px-2 py-1.5 text-center text-blue-600 dark:text-blue-400 border-l border-gray-100 dark:border-[#222]">
                  <div className="group relative cursor-help flex justify-center items-center">
                    1-я
                    <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-1 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-900 text-white text-[10px] px-2 py-1 rounded whitespace-nowrap pointer-events-none">
                      Кол-во 1-х оплат
                    </div>
                  </div>
                </th>
                <th className="px-2 py-1.5 text-center border-l border-gray-100 dark:border-[#222]">
                  <div className="group relative cursor-help flex justify-center items-center">
                    2-я
                    <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-1 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-900 text-white text-[10px] px-2 py-1 rounded whitespace-nowrap pointer-events-none">
                      Кол-во 2-х оплат
                    </div>
                  </div>
                </th>
                <th className="px-2 py-1.5 text-center text-gray-400 text-[10px] w-[60px]">
                  <div className="group relative cursor-help flex justify-center items-center">
                    % 1 ➔ 2
                    <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-1 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-900 text-white text-[10px] px-2 py-1 rounded whitespace-nowrap pointer-events-none z-20">
                      Конверсия: 2-я из 1-й (Зеленый={'>'}20%, Оранжевый=10-20%)
                    </div>
                  </div>
                </th>
                <th className="px-2 py-1.5 text-center border-l border-gray-100 dark:border-[#222]">
                  <div className="group relative cursor-help flex justify-center items-center">
                    3-я
                    <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-1 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-900 text-white text-[10px] px-2 py-1 rounded whitespace-nowrap pointer-events-none">
                      Кол-во 3-х оплат
                    </div>
                  </div>
                </th>
                <th className="px-2 py-1.5 text-center text-gray-400 text-[10px] w-[60px]">
                  <div className="group relative cursor-help flex justify-center items-center">
                    % 2 ➔ 3
                    <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-1 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-900 text-white text-[10px] px-2 py-1 rounded whitespace-nowrap pointer-events-none z-20">
                      Конверсия: 3-я из 2-й
                    </div>
                  </div>
                </th>
                <th className="px-2 py-1.5 text-center border-l border-gray-100 dark:border-[#222]">
                  <div className="group relative cursor-help flex justify-center items-center">
                    4-я
                    <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-1 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-900 text-white text-[10px] px-2 py-1 rounded whitespace-nowrap pointer-events-none z-20">
                      Кол-во 4-х (и далее) оплат
                    </div>
                  </div>
                </th>
                <th className="px-2 py-1.5 text-center text-gray-400 text-[10px] w-[60px]">
                  <div className="group relative cursor-help flex justify-center items-center">
                    % 3 ➔ 4
                    <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-1 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-900 text-white text-[10px] px-2 py-1 rounded whitespace-nowrap pointer-events-none z-20">
                      Конверсия: 4-я из 3-й
                    </div>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-[#222]">
              {tableData.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-4 py-8 text-center text-gray-500 text-xs">Нет данных за выбранный период</td>
                </tr>
              ) : (
                tableData.map(row => (
                  <tr key={row.geo} className="hover:bg-gray-50 dark:hover:bg-[#1A1A1A] transition-colors text-xs border-b border-gray-100 dark:border-[#222] last:border-0">
                    <td className="px-2 py-1.5 font-bold text-gray-900 dark:text-white opacity-90 truncate max-w-[120px]">
                      <span className="mr-2 text-sm">{getFlag(row.geo)}</span>
                      {getCountryName(row.geo)}
                    </td>

                    <td className="px-2 py-1.5 text-center font-bold text-blue-600 dark:text-blue-400 border-l border-gray-50 dark:border-[#222] bg-blue-50/10 dark:bg-blue-900/10">
                      {row.sales1}
                    </td>

                    <td className="px-2 py-1.5 text-center font-medium border-l border-gray-50 dark:border-[#222]">
                      {row.sales2}
                    </td>
                    <td className={`px-2 py-1.5 text-center text-[11px] ${getCRBgColor(row.c1_2)}`}>
                      {row.sales1 > 0 ? `${row.c1_2}%` : '—'}
                    </td>

                    <td className="px-2 py-1.5 text-center font-medium border-l border-gray-50 dark:border-[#222]">
                      {row.sales3}
                    </td>
                    <td className={`px-2 py-1.5 text-center text-[11px] ${getCRBgColor(row.c2_3)}`}>
                      {row.sales2 > 0 ? `${row.c2_3}%` : '—'}
                    </td>

                    <td className="px-2 py-1.5 text-center font-medium border-l border-gray-50 dark:border-[#222]">
                      {row.sales4}
                    </td>
                    <td className={`px-2 py-1.5 text-center text-[11px] ${getCRBgColor(row.c3_4)}`}>
                      {row.sales3 > 0 ? `${row.c3_4}%` : '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ConsConversionsPage;
