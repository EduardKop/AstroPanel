import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../services/supabaseClient';
import { Wallet, ChevronLeft, ChevronRight, Calendar, RefreshCw } from 'lucide-react';
import { useAppStore } from '../store/appStore';
import ProjectBadge from '../components/geo/ProjectBadge';

// --- Helpers ---
const MONTHS_RU = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь',
];
const MONTHS_RU_SHORT = ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];

const getCurrentMonthState = () => {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() };
};

const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();

// Month picker popover
const MonthPicker = ({ year, month, onChange }) => {
  const [open, setOpen] = useState(false);
  const [pickerYear, setPickerYear] = useState(year);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const selectMonth = (m) => {
    onChange({ year: pickerYear, month: m });
    setOpen(false);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => { setPickerYear(year); setOpen(!open); }}
        className="flex items-center gap-2 bg-white dark:bg-[#111] border border-gray-200 dark:border-[#333] rounded-[8px] px-3 h-[36px] text-sm font-semibold text-gray-900 dark:text-white hover:border-gray-400 dark:hover:border-[#555] transition-colors shadow-sm"
      >
        <Calendar size={14} className="text-gray-400" />
        {MONTHS_RU[month]} {year}
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 z-50 bg-white dark:bg-[#111] border border-gray-200 dark:border-[#333] rounded-xl shadow-xl p-3 w-[220px]">
          {/* Year navigation */}
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={() => setPickerYear(y => y - 1)}
              className="p-1 rounded hover:bg-gray-100 dark:hover:bg-[#222] text-gray-500 transition-colors"
            >
              <ChevronLeft size={14} />
            </button>
            <span className="text-sm font-bold text-gray-900 dark:text-white">{pickerYear}</span>
            <button
              onClick={() => setPickerYear(y => y + 1)}
              className="p-1 rounded hover:bg-gray-100 dark:hover:bg-[#222] text-gray-500 transition-colors"
            >
              <ChevronRight size={14} />
            </button>
          </div>

          {/* Month grid */}
          <div className="grid grid-cols-3 gap-1">
            {MONTHS_RU_SHORT.map((m, i) => {
              const isActive = pickerYear === year && i === month;
              return (
                <button
                  key={m}
                  onClick={() => selectMonth(i)}
                  className={`py-1.5 rounded-[6px] text-xs font-semibold transition-colors ${
                    isActive
                      ? 'bg-blue-500 text-white'
                      : 'hover:bg-gray-100 dark:hover:bg-[#222] text-gray-700 dark:text-gray-300'
                  }`}
                >
                  {m}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

const PAYMENT_COLORS = [
    'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
    'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400',
    'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400',
    'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400',
    'bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-400',
    'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-400',
    'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400',
    'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400',
    'bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400',
    'bg-fuchsia-100 dark:bg-fuchsia-900/30 text-fuchsia-700 dark:text-fuchsia-400',
];

const getPaymentColor = (type) => {
    if (!type) return 'bg-gray-100 dark:bg-gray-800 text-gray-500';
    let hash = 0;
    for (let i = 0; i < type.length; i++) {
        hash = type.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % PAYMENT_COLORS.length;
    return PAYMENT_COLORS[index];
};

const PaymentStatsModal = ({ data, onClose, title }) => {
    if (!data) return null;
    
    // Sort counts descending
    const sortedCounts = Object.entries(data.counts).sort((a, b) => b[1] - a[1]);

    return (
        <div 
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={onClose}
        >
            <div 
                className="bg-white dark:bg-[#111] border border-gray-200 dark:border-[#333] rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in duration-200"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-[#222]">
                    <h3 className="text-sm font-bold text-gray-900 dark:text-white">{title}</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                    </button>
                </div>
                <div className="p-4 space-y-3 max-h-[60vh] overflow-y-auto">
                    {sortedCounts.map(([type, count]) => {
                        const pct = Math.round((count / data.total) * 100);
                        return (
                            <div key={type} className="flex flex-col gap-1.5">
                                <div className="flex items-center justify-between text-xs">
                                    <span className="font-semibold text-gray-700 dark:text-gray-300">{type}</span>
                                    <span className="text-gray-500 font-mono">{count} из {data.total} <span className="font-bold text-gray-700 dark:text-gray-300 ml-1">({pct}%)</span></span>
                                </div>
                                <div className="h-1.5 w-full bg-gray-100 dark:bg-[#222] rounded-full overflow-hidden">
                                    <div className={`h-full rounded-full ${getPaymentColor(type).split(' ')[0]}`} style={{ width: `${pct}%` }} />
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

// --- Main Page ---
const PaymentMethodsPage = () => {
  const [{ year, month }, setYearMonth] = useState(getCurrentMonthState);
  const [countries, setCountries] = useState([]);
  const [payments, setPayments] = useState([]);
  const [countriesLoading, setCountriesLoading] = useState(true);
  const [paymentsLoading, setPaymentsLoading] = useState(true);
  const [loadedCount, setLoadedCount] = useState(0);
  const [modalData, setModalData] = useState(null);
  const { projects, isInitialized } = useAppStore();

  const loading = countriesLoading || paymentsLoading || !isInitialized;

  useEffect(() => {
    const fetchCountries = async () => {
      try {
        setCountriesLoading(true);
        const { data } = await supabase
          .from('countries')
          .select('code, name, emoji, project_id, is_active')
          .order('code', { ascending: true })
          .range(0, 9999);
        setCountries(data || []);
      } catch (e) {
        console.error(e);
      } finally {
        setCountriesLoading(false);
      }
    };
    fetchCountries();
  }, []);

  useEffect(() => {
    const fetchPayments = async () => {
      try {
        setPaymentsLoading(true);
        setLoadedCount(0);
        
        // Expand fetching boundaries slightly to catch delayed transactions securely
        const fetchStart = new Date(Date.UTC(year, month, -5, 0, 0, 0)).toISOString();
        const fetchEnd = new Date(Date.UTC(year, month + 1, 5, 0, 0, 0)).toISOString();

        let allData = [];
        let from = 0;
        const step = 1000;

        while (true) {
            const { data, error } = await supabase
              .from('payments')
              .select('payment_type, country, transaction_date, created_at')
              .gte('created_at', fetchStart)
              .lt('created_at', fetchEnd)
              .order('created_at', { ascending: false })
              .range(from, from + step - 1);
              
            if (error) throw error;
            if (data) {
                allData = [...allData, ...data];
                setLoadedCount(allData.length);
                if (data.length < step) break;
            } else {
                break;
            }
            from += step;
        }

        // Strict local filtering for the actual selected month
        const filteredData = allData.filter(p => {
             const rawDate = p.transaction_date || p.created_at;
             if (!rawDate) return false;
             const d = new Date(rawDate);
             return d.getUTCFullYear() === year && d.getUTCMonth() === month;
        });

        setPayments(filteredData);
      } catch (err) {
        console.error('Error fetching payments:', err);
      } finally {
        setPaymentsLoading(false);
      }
    };
    fetchPayments();
  }, [year, month]);

  const aggregatedPayments = useMemo(() => {
      const data = {}; 

      payments.forEach(p => {
          const rawDate = p.transaction_date || p.created_at;
          if (!p.country || !rawDate || !p.payment_type) return;
          const country = p.country;
          const date = new Date(rawDate);
          const day = date.getUTCDate();
          const type = p.payment_type;

          if (!data[country]) {
              data[country] = { days: {}, total: { counts: {}, total: 0 } };
          }
          
          if (!data[country].days[day]) {
              data[country].days[day] = { counts: {}, total: 0 };
          }

          // increment day
          data[country].days[day].counts[type] = (data[country].days[day].counts[type] || 0) + 1;
          data[country].days[day].total += 1;

          // increment total
          data[country].total.counts[type] = (data[country].total.counts[type] || 0) + 1;
          data[country].total.total += 1;
      });

      // calculate topType for each day and total
      Object.keys(data).forEach(country => {
          Object.keys(data[country].days).forEach(day => {
              const dayData = data[country].days[day];
              let topType = null;
              let topCount = -1;
              Object.entries(dayData.counts).forEach(([type, count]) => {
                  if (count > topCount) {
                      topType = type;
                      topCount = count;
                  }
              });
              dayData.topType = topType;
              dayData.topPercent = dayData.total > 0 ? Math.round((topCount / dayData.total) * 100) : 0;
          });

          const totalData = data[country].total;
          let topType = null;
          let topCount = -1;
          Object.entries(totalData.counts).forEach(([type, count]) => {
              if (count > topCount) {
                  topType = type;
                  topCount = count;
              }
          });
          totalData.topType = topType;
          totalData.topPercent = totalData.total > 0 ? Math.round((topCount / totalData.total) * 100) : 0;
      });

      return data;
  }, [payments]);

  const sortedGeos = useMemo(() => {
      let filtered = countries;
      return filtered.sort((a, b) => {
          if (a.is_active !== b.is_active) return a.is_active ? -1 : 1;
          
          const pA = projects.find(p => p.id === a.project_id)?.name || '';
          const pB = projects.find(p => p.id === b.project_id)?.name || '';
          const pALower = pA.toLowerCase();
          const pBLower = pB.toLowerCase();
          
          const isAstroA = pALower.includes('astrology') || pALower.includes('астро');
          const isAstroB = pBLower.includes('astrology') || pBLower.includes('астро');
          
          if (isAstroA && !isAstroB) return -1;
          if (!isAstroA && isAstroB) return 1;

          if (pA !== pB) return pA.localeCompare(pB);

          return a.name.localeCompare(b.name);
      });
  }, [countries, projects]);

  const daysInMonth = useMemo(() => getDaysInMonth(year, month), [year, month]);
  const dayNumbers = useMemo(() => Array.from({ length: daysInMonth }, (_, i) => i + 1), [daysInMonth]);

  const today = new Date();
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;
  const todayDay = today.getDate();

  const prevMonth = () => setYearMonth(({ year: y, month: m }) => m === 0 ? { year: y - 1, month: 11 } : { year: y, month: m - 1 });
  const nextMonth = () => setYearMonth(({ year: y, month: m }) => m === 11 ? { year: y + 1, month: 0 } : { year: y, month: m + 1 });

  const tableScrollRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const updateScrollState = useCallback(() => {
      const el = tableScrollRef.current;
      if (!el) return;
      setCanScrollLeft(el.scrollLeft > 0);
      setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
  }, []);

  const scrollTable = useCallback((dir) => {
      const el = tableScrollRef.current;
      if (!el) return;
      el.scrollBy({ left: dir * 300, behavior: 'smooth' });
  }, []);

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Sticky header */}
      <div className="sticky top-0 z-20 bg-[#F5F5F5] dark:bg-[#0A0A0A] -mx-3 md:-mx-6 px-3 md:px-6 py-3 border-b border-gray-200 dark:border-[#222]">
        <div className="flex items-center justify-between gap-4">
          {/* Title */}
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2 tracking-tight">
              <Wallet size={20} className="text-blue-500" />
              Методы оплаты
            </h2>
          </div>

          {/* Navigation Controls */}
          <div className="flex items-center gap-2">

            {/* Month navigation */}
            <button
              onClick={prevMonth}
              className="w-8 h-8 flex items-center justify-center rounded-[6px] bg-white dark:bg-[#111] border border-gray-200 dark:border-[#333] hover:border-gray-400 dark:hover:border-[#555] text-gray-500 dark:text-gray-400 transition-colors shadow-sm"
            >
              <ChevronLeft size={14} />
            </button>

            <MonthPicker year={year} month={month} onChange={setYearMonth} />

            <button
              onClick={nextMonth}
              className="w-8 h-8 flex items-center justify-center rounded-[6px] bg-white dark:bg-[#111] border border-gray-200 dark:border-[#333] hover:border-gray-400 dark:hover:border-[#555] text-gray-500 dark:text-gray-400 transition-colors shadow-sm"
            >
              <ChevronRight size={14} />
            </button>

            {(!isCurrentMonth) && (
              <button
                onClick={() => setYearMonth(getCurrentMonthState())}
                className="h-8 px-3 text-xs font-semibold rounded-[6px] bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-500/20 transition-colors"
              >
                Сегодня
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Table container */}
      <div 
        ref={tableScrollRef}
        onScroll={updateScrollState}
        className="flex-1 overflow-auto mt-4 rounded-xl border border-gray-200 dark:border-[#222] bg-white dark:bg-[#111] shadow-sm"
      >
        {loading ? (
            <div className="flex flex-col items-center justify-center py-20 bg-transparent w-full h-full">
                <RefreshCw size={28} className="text-blue-500 animate-spin mb-3" />
                <p className="text-gray-500 dark:text-gray-400 font-medium text-sm">
                    {loadedCount > 0 ? `Загрузка... Подгружено: ${loadedCount}` : "Загрузка данных..."}
                </p>
            </div>
        ) : (
          <div className="w-full h-full overflow-hidden relative">
            <div className="w-full h-full overflow-x-auto overflow-y-auto pb-10">
              <table className="min-w-full border-collapse text-[10px]" style={{ minWidth: `${120 + daysInMonth * 65 + 54}px` }}>
            <thead>
              <tr>
                {/* GEO column header */}
                <th className="w-[120px] min-w-[120px] p-2 bg-gray-50 dark:bg-[#161616] border-b border-r border-gray-200 dark:border-[#333] text-left align-bottom z-20 sticky left-0 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                  <div className="flex flex-col justify-end h-full w-full gap-2 pb-0.5">
                    <div className="flex items-center justify-between w-full">
                        <span className="text-gray-400 font-bold pl-1 text-xs uppercase tracking-wider">ГЕО</span>
                        <div className="flex items-center gap-0.5">
                            <button
                                onClick={() => scrollTable(-1)}
                                disabled={!canScrollLeft}
                                className={`w-5 h-5 flex items-center justify-center rounded-[4px] border transition-all duration-150 ${
                                    canScrollLeft
                                        ? 'border-gray-200 dark:border-[#444] bg-white dark:bg-[#222] text-gray-600 dark:text-gray-300 hover:border-gray-400 dark:hover:border-[#666] hover:text-gray-900 dark:hover:text-white cursor-pointer shadow-sm'
                                        : 'border-transparent bg-transparent text-gray-300 dark:text-[#333] cursor-default'
                                }`}
                                title="Влево"
                            >
                                <ChevronLeft size={12} strokeWidth={3} />
                            </button>
                            <button
                                onClick={() => scrollTable(1)}
                                disabled={!canScrollRight}
                                className={`w-5 h-5 flex items-center justify-center rounded-[4px] border transition-all duration-150 ${
                                    canScrollRight
                                        ? 'border-gray-200 dark:border-[#444] bg-white dark:bg-[#222] text-gray-600 dark:text-gray-300 hover:border-gray-400 dark:hover:border-[#666] hover:text-gray-900 dark:hover:text-white cursor-pointer shadow-sm'
                                        : 'border-transparent bg-transparent text-gray-300 dark:text-[#333] cursor-default'
                                }`}
                                title="Вправо"
                            >
                                <ChevronRight size={12} strokeWidth={3} />
                            </button>
                        </div>
                    </div>
                  </div>
                </th>

                {/* Day columns */}
                {dayNumbers.map(day => {
                  const isToday = isCurrentMonth && day === todayDay;
                  const colDate = new Date(year, month, day);
                  const isWeekend = colDate.getDay() === 0 || colDate.getDay() === 6;

                  return (
                    <th
                      key={day}
                      className={`h-[60px] w-[65px] min-w-[65px] bg-gray-50 dark:bg-[#161616] border-b border-r border-gray-200 dark:border-[#333] p-0 align-bottom group hover:bg-gray-100 dark:hover:bg-[#222] transition-colors relative z-10 last:border-r-0 ${isToday ? 'bg-blue-50/20 dark:bg-blue-900/10' : ''}`}
                    >
                      <div className="flex flex-col items-center justify-end pb-2 w-full h-full gap-1">
                        <span className={`text-[8px] font-bold uppercase px-1 rounded-[2px] mb-1 ${isWeekend ? 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/10' : 'text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-[#222]'}`}>
                          {colDate.toLocaleDateString('ru-RU', { weekday: 'short' }).toUpperCase()}
                        </span>
                        <div className="flex flex-col items-center leading-none">
                          <span className={`${isToday ? 'text-blue-600 dark:text-blue-400' : 'text-gray-900 dark:text-white'} text-[12px] font-bold`}>{colDate.getDate()}</span>
                          <div className={`w-3 h-px my-0.5 ${isToday ? 'bg-blue-300 dark:bg-blue-700' : 'bg-gray-300 dark:bg-[#444]'}`}></div>
                          <span className={`${isToday ? 'text-blue-500/80 dark:text-blue-400/80' : 'text-gray-400'} text-[9px] font-medium`}>{colDate.getMonth() + 1}</span>
                        </div>
                      </div>
                    </th>
                  );
                })}

                {/* Total column */}
                <th className="p-2 bg-blue-50/50 dark:bg-[#1a1a1a] border-b border-l-2 border-gray-200 dark:border-[#333] text-center align-bottom sticky right-0 z-20 shadow-[-4px_0_8px_-2px_rgba(0,0,0,0.1)] min-w-[54px] w-[65px]">
                  <span className="flex flex-col items-center justify-end pb-[2px] h-full w-full">
                     <span className="text-gray-500 dark:text-gray-400 font-bold text-[10px] uppercase tracking-wider">ИТОГ</span>
                  </span>
                </th>
              </tr>
            </thead>

            <tbody>
              {sortedGeos.map((country, rowIdx) => {
                const project = projects.find(p => p.id === country.project_id);
                const projName = project?.name?.toLowerCase() || '';

                let rowBgClass = rowIdx % 2 === 0
                  ? 'bg-white dark:bg-[#111]'
                  : 'bg-gray-50/60 dark:bg-[#0d0d0d]';

                if (projName.includes('органика') || projName.includes('organic')) {
                    rowBgClass = 'bg-amber-50/30 dark:bg-amber-900/10';
                } else if (projName.includes('таро') || projName.includes('taro')) {
                    rowBgClass = 'bg-fuchsia-50/40 dark:bg-fuchsia-900/10';
                }

                const hoverClass = country.is_active !== false ? 'group-hover:bg-gray-100 dark:group-hover:bg-[#1A1A1A]' : 'group-hover:bg-red-50/50 dark:group-hover:bg-red-900/10';
                const inactiveOverlay = country.is_active === false ? 'opacity-60 bg-red-50/20 dark:bg-red-900/5 text-gray-500' : '';

                const prevGeo = rowIdx > 0 ? sortedGeos[rowIdx - 1] : null;
                const prevProject = prevGeo ? projects.find(p => p.id === prevGeo.project_id) : null;
                const isNewProjectGroup = rowIdx > 0 && prevGeo.is_active === country.is_active && project?.name !== prevProject?.name;

                const trBorder = isNewProjectGroup ? 'border-t-[3px] border-t-gray-200 dark:border-t-[#333]' : 'border-b border-gray-100 dark:border-[#1e1e1e] last:border-b-0';

                return (
                  <tr key={country.code} className={`${rowBgClass} ${inactiveOverlay} ${hoverClass} transition-colors group ${trBorder}`}>
                    {/* GEO label */}
                    <td className={`sticky left-0 z-10 ${rowBgClass} ${inactiveOverlay} ${hoverClass} border-r border-gray-200 dark:border-[#222] px-3 py-2`}>
                      <div className="flex items-center gap-2">
                        <span className="text-base leading-none shrink-0">{country.emoji}</span>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[12px] font-semibold text-gray-800 dark:text-gray-200 truncate">{country.name}</span>
                            <span className="text-[9px] font-mono text-gray-400 uppercase">{country.code}</span>
                          </div>
                          <div className="mt-0.5 flex items-center gap-1.5 w-max">
                            {project && (
                                <ProjectBadge project={project} size="xs" />
                            )}
                            {country.is_active === false && (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded-[4px] text-[9px] font-bold bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 whitespace-nowrap shrink-0">
                                    Откл.
                                </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Day cells */}
                    {dayNumbers.map(day => {
                      const isToday = isCurrentMonth && day === todayDay;
                      const dayData = aggregatedPayments[country.code]?.days?.[day];

                      return (
                        <td
                          key={day}
                          onClick={() => dayData && setModalData({ data: dayData, title: `${country.name} (${day} ${MONTHS_RU[month]})` })}
                          className={`px-1 py-1 text-center border-r border-gray-100 dark:border-[#1e1e1e] last:border-r-0 h-[42px] transition-colors ${
                            isToday ? 'bg-blue-50/40 dark:bg-blue-900/10' : ''
                          } ${dayData ? 'cursor-pointer hover:bg-gray-100 dark:hover:bg-[#222]' : ''}`}
                        >
                          {dayData ? (
                              <div className="flex flex-col items-center justify-center overflow-hidden w-full px-0.5">
                                  <span className={`inline-flex items-center px-1.5 py-0.5 rounded-[4px] text-[10px] font-bold truncate max-w-full w-fit justify-center ${getPaymentColor(dayData.topType)}`} title={dayData.topType}>
                                      {dayData.topType === 'Прямые реквизиты' ? 'Прямые' : dayData.topType}
                                  </span>
                              </div>
                          ) : (
                              <span className="text-gray-300 dark:text-gray-700 text-[11px]">—</span>
                          )}
                        </td>
                      );
                    })}

                    {/* Total cell */}
                    {(() => {
                        const totalData = aggregatedPayments[country.code]?.total;
                        return (
                            <td 
                                onClick={() => totalData && setModalData({ data: totalData, title: `${country.name} (Итог за месяц)` })}
                                className={`sticky right-0 z-10 bg-blue-50/10 dark:bg-[#141414] border-l-2 border-gray-200 dark:border-[#333] shadow-[-4px_0_8px_-2px_rgba(0,0,0,0.1)] text-center px-1 py-1 h-[42px] transition-colors ${totalData ? 'cursor-pointer hover:bg-gray-100 dark:hover:bg-[#1d1d1d]' : ''}`}
                            >
                                {totalData ? (
                                    <div className="flex flex-col items-center justify-center gap-0.5 w-full">
                                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded-[4px] text-[10px] font-bold truncate max-w-full w-fit justify-center ${getPaymentColor(totalData.topType)}`} title={totalData.topType}>
                                            {totalData.topType === 'Прямые реквизиты' ? 'Прямые' : totalData.topType}
                                        </span>
                                        <span className="text-[10px] font-mono font-bold text-gray-400 dark:text-gray-500">{totalData.topPercent}%</span>
                                    </div>
                                ) : (
                                    <span className="text-[11px] font-bold text-gray-300 dark:text-gray-700">—</span>
                                )}
                            </td>
                        );
                    })()}
                  </tr>
                );
              })}

              {/* Totals row */}
              <tr className="bg-blue-50/50 dark:bg-[rgba(255,255,255,0.02)] border-t-2 border-gray-200 dark:border-[#333]">
                <td className="sticky left-0 z-10 bg-gray-50 dark:bg-[#0d0d0d] border-r border-gray-200 dark:border-[#222] px-4 py-2 text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Итого
                </td>
                {dayNumbers.map(day => {
                  const isToday = isCurrentMonth && day === todayDay;
                  return (
                    <td
                      key={day}
                      className={`text-center text-[11px] font-bold text-gray-300 dark:text-gray-600 border-r border-gray-100 dark:border-[#1e1e1e] last:border-r-0 ${
                        isToday ? 'bg-blue-50/40 dark:bg-blue-900/10' : ''
                      }`}
                    >
                      —
                    </td>
                  );
                })}
                <td className="sticky right-0 z-10 bg-blue-50/30 dark:bg-[#1a1a1a] border-l-2 border-gray-200 dark:border-[#333] shadow-[-4px_0_8px_-2px_rgba(0,0,0,0.1)] text-center px-2 py-2 text-[11px] font-bold text-gray-300 dark:text-gray-700">
                  —
                </td>
              </tr>
            </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {modalData && (
          <PaymentStatsModal 
              data={modalData.data} 
              title={modalData.title} 
              onClose={() => setModalData(null)} 
          />
      )}
    </div>
  );
};

export default PaymentMethodsPage;
