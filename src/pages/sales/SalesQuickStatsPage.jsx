import React, { useState, useMemo, useEffect } from 'react';
import { useAppStore } from '../../store/appStore';
import {
    Filter, RotateCcw, X, XCircle, LayoutDashboard,
    TrendingUp, TrendingDown, Minus, AlertTriangle, Users2, Calendar as CalendarIcon, MessageCircle, MessageSquare, Phone, Clock
} from 'lucide-react';
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { extractUTCDate, getKyivDateString } from '../../utils/kyivTime';

// --- CONFIG ---
const FLAGS = {
    UA: '🇺🇦', PL: '🇵🇱', IT: '🇮🇹', HR: '🇭🇷',
    BG: '🇧🇬', CZ: '🇨🇿', RO: '🇷🇴', LT: '🇱🇹',
    TR: '🇹🇷', FR: '🇫🇷', PT: '🇵🇹', DE: '🇩🇪',
    US: '🇺🇸', ES: '🇪🇸', SK: '🇸🇰', HU: '🇭🇺',
    KZ: '🇰🇿', UZ: '🇺🇿', MD: '🇲🇩'
};

const getFlag = (code) => FLAGS[code] || '🏳️';

// Helper to format date dd.mm
const toDateStr = (date) => {
    if (!date) return '';
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${d}.${m}`;
};

// Helper YYYY-MM-DD (Kyiv timezone)
const toYMD = (date) => {
    if (!date) return '';
    return getKyivDateString(date);
};



// Source Filter Buttons (Reusable)
const SourceFilterButtons = ({ filters, setFilters }) => (
    <div className="flex bg-gray-200 dark:bg-[#1A1A1A] p-0.5 rounded-[6px] h-[34px] items-center w-full md:w-auto justify-center">
        <button onClick={() => setFilters(p => ({ ...p, source: 'all' }))} className={`px-2.5 h-full rounded-[4px] text-[10px] font-bold transition-all flex-1 md:flex-none ${filters.source === 'all' ? 'bg-white dark:bg-[#333] text-black dark:text-white shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}>Все</button>
        <button onClick={() => setFilters(p => ({ ...p, source: 'direct' }))} className={`px-2 h-full rounded-[4px] text-[10px] font-bold transition-all flex items-center justify-center gap-1 flex-1 md:flex-none ${filters.source === 'direct' ? 'bg-white dark:bg-[#333] text-blue-600 dark:text-blue-400 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}><MessageCircle size={10} />Direct</button>
        <button onClick={() => setFilters(p => ({ ...p, source: 'comments' }))} className={`px-2 h-full rounded-[4px] text-[10px] font-bold transition-all flex items-center justify-center gap-1 flex-1 md:flex-none ${filters.source === 'comments' ? 'bg-white dark:bg-[#333] text-orange-600 dark:text-orange-400 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}><MessageSquare size={10} />Comm</button>
        <button onClick={() => setFilters(p => ({ ...p, source: 'whatsapp' }))} className={`px-2 h-full rounded-[4px] text-[10px] font-bold transition-all flex items-center justify-center gap-1 flex-1 md:flex-none ${filters.source === 'whatsapp' ? 'bg-white dark:bg-[#333] text-green-600 dark:text-green-400 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}><Phone size={10} />WP</button>
    </div>
);

// Mobile Date Range Picker
const MobileDateRangePicker = ({ startDate, endDate, onChange, label }) => {
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
        if (!startDate && !endDate) return 'Выберите период';
        if (!startDate) return `По ${endDate.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' })}`;
        if (!endDate) return `С ${startDate.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' })}`;
        return `${startDate.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' })} - ${endDate.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' })}`;
    };

    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="relative w-full">
            {label && <div className="text-[10px] text-gray-500 mb-1 font-medium bg-gray-50 dark:bg-gray-800 px-2 py-0.5 rounded w-max">{label}</div>}
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="w-full bg-white dark:bg-[#111] border border-gray-200 dark:border-[#333] text-gray-700 dark:text-gray-200 py-1.5 px-3 rounded-[6px] text-xs font-medium hover:border-gray-400 dark:hover:border-[#555] transition-colors text-left flex justify-between items-center h-[34px]"
            >
                <CalendarIcon size={12} className="shrink-0 mr-2 text-gray-400" />
                <span className={`flex-1 ${!startDate && !endDate ? 'text-gray-400' : ''}`}>{displayText()}</span>
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

// Custom Period Picker (Desktop) with fixed positioning
const CustomPeriodPicker = ({ startDate, endDate, onChange, label, variant = 'primary' }) => {
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
        return `${d}.${m}`;
    };

    const openCalendar = () => {
        if (triggerRef.current) {
            const rect = triggerRef.current.getBoundingClientRect();
            setDropdownPos({ top: rect.bottom + 8, left: Math.max(8, rect.left - 100) });
        }
        setIsOpen(true);
        setSelecting('start');
    };

    const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
    const getFirstDayOfMonth = (year, month) => {
        const day = new Date(year, month, 1).getDay();
        return day === 0 ? 6 : day - 1;
    };

    const isSameDay = (d1, d2) => {
        if (!d1 || !d2) return false;
        return d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth() && d1.getDate() === d2.getDate();
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
            if (clickedDate < startDate) onChange([clickedDate, startDate]);
            else onChange([startDate, clickedDate]);
            setSelecting('start');
            setIsOpen(false);
        }
    };

    const setYesterday = () => { const y = new Date(); y.setDate(y.getDate() - 1); onChange([y, y]); setIsOpen(false); };
    const setTodayFunc = () => { const t = new Date(); onChange([t, t]); setIsOpen(false); };
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
    const setThisWeek = () => {
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
        const firstDay = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const lastDay = new Date(today.getFullYear(), today.getMonth(), 0);
        onChange([firstDay, lastDay]);
        setIsOpen(false);
    };
    const setThisMonth = () => {
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
        return '—';
    };

    const isPrimary = variant === 'primary';
    const bgClass = isPrimary ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800' : 'bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-700';
    const textClass = isPrimary ? 'text-blue-700 dark:text-blue-300' : 'text-gray-600 dark:text-gray-300';
    const iconClass = isPrimary ? 'text-blue-500' : 'text-gray-400';
    const labelClass = isPrimary ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400';

    return (
        <div className="flex flex-col items-center gap-1">
            <span className={`text-[9px] font-medium uppercase tracking-wide ${labelClass}`}>{label}</span>
            <div ref={triggerRef} onClick={openCalendar} className={`flex items-center gap-1 px-3 py-1.5 rounded-lg border cursor-pointer hover:opacity-80 transition-opacity ${bgClass}`}>
                <CalendarIcon size={12} className={`shrink-0 ${iconClass}`} />
                <span className={`text-[11px] font-medium ${textClass}`}>{displayText()}</span>
            </div>

            {isOpen && (
                <>
                    <div className="fixed inset-0 z-[100]" onClick={() => setIsOpen(false)} />
                    <div className="fixed bg-white dark:bg-[#111] border border-gray-200 dark:border-[#333] rounded-xl shadow-xl z-[101] p-2.5 w-[220px]" style={{ top: dropdownPos.top, left: dropdownPos.left }}>
                        <div className="space-y-1 mb-2">
                            <div className="flex gap-1">
                                <button onClick={setYesterday} className="flex-1 text-[10px] font-medium py-1 px-1 rounded-md bg-gray-100 dark:bg-[#222] text-gray-600 dark:text-gray-300 hover:bg-blue-100 dark:hover:bg-blue-900/30 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Вчера</button>
                                <button onClick={setTodayFunc} className="flex-1 text-[10px] font-medium py-1 px-1 rounded-md bg-gray-100 dark:bg-[#222] text-gray-600 dark:text-gray-300 hover:bg-blue-100 dark:hover:bg-blue-900/30 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Сегодня</button>
                            </div>
                            <div className="flex gap-1">
                                <button onClick={setLastWeek} className="flex-1 text-[10px] font-medium py-1 px-1 rounded-md bg-gray-100 dark:bg-[#222] text-gray-600 dark:text-gray-300 hover:bg-blue-100 dark:hover:bg-blue-900/30 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Пр. нед.</button>
                                <button onClick={setThisWeek} className="flex-1 text-[10px] font-medium py-1 px-1 rounded-md bg-gray-100 dark:bg-[#222] text-gray-600 dark:text-gray-300 hover:bg-blue-100 dark:hover:bg-blue-900/30 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Тек. нед.</button>
                            </div>
                            <div className="flex gap-1">
                                <button onClick={setLastMonth} className="flex-1 text-[10px] font-medium py-1 px-1 rounded-md bg-gray-100 dark:bg-[#222] text-gray-600 dark:text-gray-300 hover:bg-blue-100 dark:hover:bg-blue-900/30 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Пр. мес.</button>
                                <button onClick={setThisMonth} className="flex-1 text-[10px] font-medium py-1 px-1 rounded-md bg-gray-100 dark:bg-[#222] text-gray-600 dark:text-gray-300 hover:bg-blue-100 dark:hover:bg-blue-900/30 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Тек. мес.</button>
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
                                let dayClass = 'w-7 h-7 flex items-center justify-center text-[11px] font-medium rounded cursor-pointer transition-all ';
                                if (isStart || isEnd) dayClass += 'bg-blue-500 text-white font-bold ';
                                else if (inRange) dayClass += 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 ';
                                else if (today) dayClass += 'ring-1 ring-blue-400 text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-[#222] ';
                                else dayClass += 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#222] ';
                                return <button key={day} onClick={() => handleDayClick(day)} className={dayClass}>{day}</button>;
                            })}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

const SalesQuickStatsPage = () => {
    const {
        user,
        salesStats,
        trafficStats,
        fetchSalesStats,
        fetchTrafficStats,
        fetchSalesStatsTimeComparison,
        fetchTrafficStatsTimeComparison,
        managers,
        schedules,
        fetchReferenceData
    } = useAppStore();

    // Period 1 (left column)
    const [period1, setPeriod1] = useState(() => {
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        return [yesterday, yesterday];  // Default: yesterday
    });
    const [period1Start, period1End] = period1;

    // Admin check for manager filter
    const isAdmin = useAppStore(state => state.user && ['Admin', 'C-level', 'SeniorSales'].includes(state.user.role));

    // Period 2 (right column)
    const [period2, setPeriod2] = useState(() => {
        const today = new Date();
        return [today, today];  // Default: today
    });
    const [period2Start, period2End] = period2;

    const [filters, setFilters] = useState({ source: 'all' });
    const [showMobileFilters, setShowMobileFilters] = useState(false);

    // TABS: 'general' | 'time'
    const [activeTab, setActiveTab] = useState('general');

    // TIME COMPARISON STATE
    // Period 2 is ALWAYS Today (00:00 - Now UTC)
    // Period 1 is Selectable Date (00:00 - Same Time as Now UTC)
    const [timeComparisonDate, setTimeComparisonDate] = useState(() => {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        return yesterday;
    });

    // Initial load - fetch managers for names (lightweight)
    useEffect(() => {
        // Use lightweight fetch instead of heavy fetchAllData
        if (managers.length === 0) fetchReferenceData();
    }, []);

    // FETCH LOGIC
    useEffect(() => {
        if (activeTab === 'general') {
            // ORIGINAL LOGIC (Full Days)
            const allDates = [period1Start, period1End, period2Start, period2End].filter(d => d);
            if (allDates.length > 0) {
                const minDate = new Date(Math.min(...allDates.map(d => d.getTime())));
                const maxDate = new Date(Math.max(...allDates.map(d => d.getTime())));

                const isoStart = new Date(minDate.setHours(0, 0, 0, 0)).toISOString();
                const isoEnd = new Date(maxDate.setHours(23, 59, 59, 999)).toISOString();

                fetchTrafficStats(isoStart, isoEnd);
                fetchSalesStats(isoStart, isoEnd);
            }
        } else {
            // TIME COMPARISON LOGIC (Partial Days based on Current UTC Time)
            const now = new Date();
            const todayStart = new Date(now);
            todayStart.setHours(0, 0, 0, 0);

            // Period 2: Today 00:00 - Now
            const p2StartIso = todayStart.toISOString();
            const p2EndIso = now.toISOString();

            // Period 1: SelectedDate 00:00 - SelectedDate + (Now - TodayStart)
            if (timeComparisonDate) {
                const p1Start = new Date(timeComparisonDate);
                p1Start.setHours(0, 0, 0, 0);

                const timeDiff = now.getTime() - todayStart.getTime();
                const p1End = new Date(p1Start.getTime() + timeDiff);

                const p1StartIso = p1Start.toISOString();
                const p1EndIso = p1End.toISOString();

                fetchTrafficStatsTimeComparison(p1StartIso, p1EndIso, p2StartIso, p2EndIso);
                fetchSalesStatsTimeComparison(p1StartIso, p1EndIso, p2StartIso, p2EndIso);
            }
        }
    }, [activeTab, timeComparisonDate, period1Start, period1End, period2Start, period2End, fetchSalesStats, fetchTrafficStats, fetchSalesStatsTimeComparison, fetchTrafficStatsTimeComparison]);

    const uniqueGeos = useMemo(() => {
        const geos = new Set();
        // Extract from stats instead of payments
        // Extract from stats (salesStats is a map: { Country: { Date: { ... } } })
        if (salesStats) Object.keys(salesStats).forEach(country => geos.add(country));
        // Keep schedules check if needed
        schedules.forEach(s => {
            if (s.geo_code) s.geo_code.split(',').forEach(g => geos.add(g.trim()));
        });
        if (trafficStats) Object.keys(trafficStats).forEach(g => geos.add(g));
        return Array.from(geos).sort();
    }, [salesStats, schedules, trafficStats]);

    // ✅ Filter GEOs based on User's assigned GEOs
    const filteredGeos = useMemo(() => {
        if (!user || ['Admin', 'C-level', 'SeniorSales'].includes(user.role)) {
            return uniqueGeos;
        }
        const userGeos = user.geo || [];
        return uniqueGeos.filter(g => userGeos.includes(g));
    }, [uniqueGeos, user]);

    const geoData = useMemo(() => {
        // Determine Dates based on Tab
        let p1StartStr, p1EndStr, p2StartStr, p2EndStr;

        if (activeTab === 'general') {
            p1StartStr = period1Start ? toYMD(period1Start) : toYMD(new Date());
            p1EndStr = period1End ? toYMD(period1End) : p1StartStr;
            p2StartStr = period2Start ? toYMD(period2Start) : toYMD(new Date());
            p2EndStr = period2End ? toYMD(period2End) : p2StartStr;
        } else {
            // TIME MODE:
            // P1 is timeComparisonDate
            p1StartStr = timeComparisonDate ? toYMD(timeComparisonDate) : toYMD(new Date());
            p1EndStr = p1StartStr;
            // P2 is Today
            p2StartStr = toYMD(new Date());
            p2EndStr = p2StartStr;
        }

        const managerMap = managers.reduce((acc, m) => ({ ...acc, [m.id]: m.name }), {});
        // Create a set of visible manager IDs
        const visibleManagerIds = new Set(managers.filter(m => m.show_in_schedule !== false).map(m => m.id));

        const getScheduledManagers = (sDateStart, sDateEnd, sGeo) => {
            const foundIds = new Set();
            schedules.forEach(s => {
                // Check if manager is visible and matches criteria
                if (s.date >= sDateStart && s.date <= sDateEnd && s.geo_code && s.geo_code.includes(sGeo)) {
                    if (visibleManagerIds.has(s.manager_id)) {
                        foundIds.add(s.manager_id);
                    }
                }
            });
            const names = Array.from(foundIds).map(id => managerMap[id] || 'Unknown');
            if (names.length === 0) return '—';
            if (names.length > 1) return names.join(' / ');
            return names[0];
        };

        // Helper to shorten name: "First Last" -> "First L."
        const formatManagerName = (fullName) => {
            if (!fullName || fullName === 'Unknown' || fullName === '—') return fullName;
            return fullName.split(' / ').map(name => {
                const parts = name.trim().split(/\s+/);
                if (parts.length < 2) return name;
                return `${parts[0]} ${parts[1][0]}.`;
            }).join(' / ');
        };

        return filteredGeos.map(geo => {
            // Helper to aggregate stats for a range of dates
            const aggregate = (startStr, endStr) => {
                let sales = 0;
                let traffic = 0;

                // Simple date iteration
                let curr = new Date(startStr);
                const end = new Date(endStr);

                while (curr <= end) {
                    const dStr = toYMD(curr);

                    // Sum Sales
                    if (salesStats && salesStats[geo] && salesStats[geo][dStr]) {
                        const s = salesStats[geo][dStr];
                        if (filters.source === 'all') sales += s.all;
                        else if (filters.source === 'whatsapp') sales += s.whatsapp;
                        else if (filters.source === 'comments') sales += s.comments;
                        else if (filters.source === 'direct') sales += s.direct;
                        else if (filters.source === 'unknown') sales += s.unknown || 0;
                    }

                    // Sum Traffic
                    if (trafficStats && trafficStats[geo] && trafficStats[geo][dStr]) {
                        const t = trafficStats[geo][dStr];
                        if (filters.source === 'all') traffic += t.all;
                        else if (filters.source === 'whatsapp') traffic += t.whatsapp;
                        else if (filters.source === 'comments') traffic += t.comments;
                        else if (filters.source === 'direct') traffic += t.direct;
                    }

                    curr.setDate(curr.getDate() + 1);
                }
                return { sales, traffic, conversion: traffic > 0 ? (sales / traffic) * 100 : 0 };
            };

            // LEFT column = Period 1, RIGHT column = Period 2
            const current = aggregate(p1StartStr, p1EndStr);  // Period 1 (left column)
            const previous = aggregate(p2StartStr, p2EndStr);  // Period 2 (right column)

            // Add dates for UI display
            if (activeTab === 'general') {
                current.startDate = period1Start;
                current.endDate = period1End;
                previous.startDate = period2Start;
                previous.endDate = period2End;
            } else {
                current.startDate = timeComparisonDate;
                current.endDate = timeComparisonDate;
                previous.startDate = new Date();
                previous.endDate = new Date();
            }

            const currentManagerName = formatManagerName(getScheduledManagers(p1StartStr, p1EndStr, geo));
            const previousManagerName = formatManagerName(getScheduledManagers(p2StartStr, p2EndStr, geo));

            return {
                geo,
                flag: getFlag(geo),
                currentManagerName,
                previousManagerName,
                current,
                previous
            };
        });
    }, [filteredGeos, period1Start, period1End, period2Start, period2End, activeTab, timeComparisonDate, filters, salesStats, schedules, trafficStats, managers]);

    // ✅ Calculate Totals
    const totalStats = useMemo(() => {
        const stats = {
            current: { traffic: 0, sales: 0, conversion: 0 },
            previous: { traffic: 0, sales: 0, conversion: 0 },
            trafficDiff: 0,
            salesDiff: 0,
            convDiff: 0
        };

        geoData.forEach(geo => {
            stats.current.traffic += geo.current.traffic;
            stats.current.sales += geo.current.sales;
            stats.previous.traffic += geo.previous.traffic;
            stats.previous.sales += geo.previous.sales;
        });

        // Calc weighted average conversion
        stats.current.conversion = stats.current.traffic > 0 ? (stats.current.sales / stats.current.traffic) * 100 : 0;
        stats.previous.conversion = stats.previous.traffic > 0 ? (stats.previous.sales / stats.previous.traffic) * 100 : 0;

        // Calc diffs
        stats.trafficDiff = stats.previous.traffic - stats.current.traffic;
        stats.salesDiff = stats.previous.sales - stats.current.sales;
        stats.convDiff = stats.previous.conversion - stats.current.conversion;

        return stats;
    }, [geoData]);

    const resetPeriods = () => {
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        setPeriod1([yesterday, yesterday]);
        setPeriod2([today, today]);
        setTimeComparisonDate(yesterday); // Reset time comparison date too
        setFilters(p => ({ ...p, source: 'all' }));
        setShowMobileFilters(false);
    };



    return (
        <div className="pb-10 w-full max-w-full overflow-x-hidden">
            {/* HEADER */}
            <div className="sticky top-0 z-20 bg-[#F5F5F5] dark:bg-[#0A0A0A] -mx-3 px-3 md:-mx-6 md:px-6 py-3 border-b border-transparent flex flex-col gap-3">

                {/* ROW 1: Title & Tabs */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                        <TrendingUp size={18} className="text-blue-600 dark:text-blue-500" />
                        <h2 className="text-lg font-bold dark:text-white tracking-tight">Сравнительный анализ</h2>
                    </div>

                    {/* TABS */}
                    <div className="flex bg-gray-200 dark:bg-[#222] p-1 rounded-lg">
                        <button
                            onClick={() => setActiveTab('general')}
                            className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${activeTab === 'general' ? 'bg-white dark:bg-[#333] text-black dark:text-white shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
                        >
                            Общие
                        </button>
                        <button
                            onClick={() => setActiveTab('time')}
                            className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all flex items-center gap-2 ${activeTab === 'time' ? 'bg-white dark:bg-[#333] text-black dark:text-white shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
                        >
                            <Clock size={12} />
                            По времени (Сегодня)
                        </button>
                    </div>
                </div>

                {/* ROW 2: Filters */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">

                    {/* LEFT SIDE: Source Buttons (Desktop & Mobile Wrapper) */}
                    <div className="w-full md:w-auto">

                        {/* MOBILE ONLY: Source Buttons + Filter Toggle + Menu */}
                        <div className="md:hidden space-y-2 w-full">
                            <SourceFilterButtons filters={filters} setFilters={setFilters} />

                            <button
                                onClick={() => setShowMobileFilters(!showMobileFilters)}
                                className="w-full bg-white dark:bg-[#111] border border-gray-200 dark:border-[#333] text-gray-700 dark:text-gray-200 py-1.5 px-3 rounded-[6px] text-xs font-medium hover:border-gray-400 dark:hover:border-[#555] transition-colors text-left flex justify-between items-center h-[34px]"
                            >
                                <span className="flex items-center gap-2">
                                    <Filter size={12} />
                                    <span>Периоды</span>
                                </span>
                            </button>

                            {/* MOBILE COLLAPSIBLE FILTERS - DATES ONLY */}
                            {showMobileFilters && (
                                <div className="mt-2 space-y-3 p-3 bg-white dark:bg-[#111] border border-gray-200 dark:border-[#333] rounded-lg animate-in fade-in slide-in-from-top-2 duration-200">
                                    {activeTab === 'general' ? (
                                        <>
                                            <MobileDateRangePicker
                                                label="Первый период"
                                                startDate={period1Start}
                                                endDate={period1End}
                                                onChange={setPeriod1}
                                            />
                                            <MobileDateRangePicker
                                                label="Второй период"
                                                startDate={period2Start}
                                                endDate={period2End}
                                                onChange={setPeriod2}
                                            />
                                        </>
                                    ) : (
                                        <>
                                            <MobileDateRangePicker
                                                label="Дата для сравнения"
                                                startDate={timeComparisonDate}
                                                endDate={timeComparisonDate}
                                                onChange={(update) => setTimeComparisonDate(update[0])}
                                                singleDate
                                            />
                                            <div className="flex flex-col gap-1 opacity-60 cursor-not-allowed">
                                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Текущая дата</span>
                                                <div className="h-[34px] px-3 py-1.5 bg-gray-100 dark:bg-[#222] border border-gray-200 dark:border-[#333] rounded-[6px] text-xs font-bold flex items-center gap-2 text-gray-500">
                                                    <CalendarIcon size={12} />
                                                    {toDateStr(new Date())} (Сейчас)
                                                </div>
                                            </div>
                                        </>
                                    )}

                                    <button
                                        onClick={resetPeriods}
                                        className="w-full p-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-[6px] hover:bg-red-100 dark:hover:bg-red-900/30 text-xs font-bold flex items-center justify-center gap-2 border border-red-100 dark:border-red-900/30"
                                    >
                                        <X size={14} /> Сбросить всё
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* DESKTOP SOURCE BUTTONS */}
                        <div className="hidden md:block">
                            <SourceFilterButtons filters={filters} setFilters={setFilters} />
                        </div>
                    </div>

                    {/* RIGHT SIDE: DESKTOP DATE PICKERS */}
                    <div className="hidden md:flex items-end gap-4">
                        {activeTab === 'general' ? (
                            <>
                                {/* PERIOD 1 */}
                                <CustomPeriodPicker
                                    startDate={period1Start}
                                    endDate={period1End}
                                    onChange={(update) => setPeriod1(update)}
                                    label="Первый период"
                                    variant="primary"
                                />

                                {/* PERIOD 2 */}
                                <CustomPeriodPicker
                                    startDate={period2Start}
                                    endDate={period2End}
                                    onChange={(update) => setPeriod2(update)}
                                    label="Второй период"
                                    variant="secondary"
                                />
                            </>
                        ) : (
                            <>
                                {/* Time Comparison Controls */}
                                <div className="flex flex-col gap-1">
                                    <span className="text-[9px] font-medium uppercase tracking-wide text-blue-600 dark:text-blue-400">Дата для сравнения</span>
                                    <CustomPeriodPicker
                                        startDate={timeComparisonDate}
                                        endDate={timeComparisonDate}
                                        onChange={(update) => setTimeComparisonDate(update[0])}
                                        label="Выберите дату"
                                        variant="primary"
                                        singleDate
                                    />
                                </div>

                                <div className="flex flex-col gap-1 opacity-60 cursor-not-allowed">
                                    <span className="text-[9px] font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">Текущая дата</span>
                                    <div className="h-[34px] px-3 py-1.5 bg-gray-100 dark:bg-[#222] border border-gray-200 dark:border-[#333] rounded-[6px] text-xs font-bold flex items-center gap-2 text-gray-500">
                                        <CalendarIcon size={12} className="shrink-0 text-gray-400" />
                                        {toDateStr(new Date())} (Сейчас)
                                    </div>
                                </div>
                            </>
                        )}
                        <button
                            onClick={resetPeriods}
                            className="bg-gray-200 dark:bg-[#1A1A1A] hover:bg-gray-300 dark:hover:bg-[#333] text-gray-500 dark:text-gray-400 p-1.5 rounded-[6px] transition-colors h-[34px] w-[34px] flex items-center justify-center mb-1"
                            title="Сбросить периоды"
                        >
                            <X size={14} />
                        </button>
                    </div>

                </div>
            </div>

            {/* SUMMARY TABLE */}
            <div className="mt-4 overflow-x-auto rounded-xl border border-gray-200 dark:border-[#333] bg-white dark:bg-[#111]">
                <table className="w-full text-xs">
                    <thead>
                        <tr className="border-b border-gray-200 dark:border-[#333]">
                            <th rowSpan={2} className="px-3 py-2 text-left font-bold text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-[#0A0A0A] sticky left-0 z-10">GEO</th>
                            <th colSpan={5} className="px-3 py-2 text-center font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 border-l border-gray-200 dark:border-[#333]">
                                П1: {period1Start && period1End && period1Start.getTime() !== period1End.getTime()
                                    ? `${toDateStr(period1Start)} - ${toDateStr(period1End)}`
                                    : (period1Start ? toDateStr(period1Start) : '—')}
                            </th>
                            <th colSpan={10} className="px-3 py-2 text-center font-bold text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 border-l border-gray-200 dark:border-[#333]">
                                П2: {period2Start && period2End && period2Start.getTime() !== period2End.getTime()
                                    ? `${toDateStr(period2Start)} - ${toDateStr(period2End)}`
                                    : (period2Start ? toDateStr(period2Start) : '—')}
                                <span className="text-[9px] font-normal ml-1 opacity-70">(vs П1)</span>
                            </th>
                        </tr>
                        <tr className="border-b border-gray-200 dark:border-[#333] text-[10px]">
                            {/* Period 1 columns */}
                            <th className="px-2 py-1.5 text-center font-medium text-gray-500 dark:text-gray-400 border-l border-gray-200 dark:border-[#333]">Лиды</th>
                            <th className="px-2 py-1.5 text-center font-medium text-gray-500 dark:text-gray-400">Продажи</th>
                            <th className="px-2 py-1.5 text-center font-medium text-gray-500 dark:text-gray-400">Конв%</th>
                            <th className="px-2 py-1.5 text-center font-medium text-gray-500 dark:text-gray-400">Ср.чек</th>
                            <th className="px-2 py-1.5 text-center font-medium text-gray-500 dark:text-gray-400">Чек</th>
                            {/* Period 2 columns with diff */}
                            <th className="px-2 py-1.5 text-center font-medium text-gray-500 dark:text-gray-400 border-l border-gray-200 dark:border-[#333]">Лиды</th>
                            <th className="px-1 py-1.5 text-center font-medium text-gray-400 dark:text-gray-500 text-[8px]">±</th>
                            <th className="px-2 py-1.5 text-center font-medium text-gray-500 dark:text-gray-400">Продажи</th>
                            <th className="px-1 py-1.5 text-center font-medium text-gray-400 dark:text-gray-500 text-[8px]">±</th>
                            <th className="px-2 py-1.5 text-center font-medium text-gray-500 dark:text-gray-400">Конв%</th>
                            <th className="px-1 py-1.5 text-center font-medium text-gray-400 dark:text-gray-500 text-[8px]">±</th>
                            <th className="px-2 py-1.5 text-center font-medium text-gray-500 dark:text-gray-400">Ср.чек</th>
                            <th className="px-1 py-1.5 text-center font-medium text-gray-400 dark:text-gray-500 text-[8px]">±</th>
                            <th className="px-2 py-1.5 text-center font-medium text-gray-500 dark:text-gray-400">Чек</th>
                            <th className="px-1 py-1.5 text-center font-medium text-gray-400 dark:text-gray-500 text-[8px]">±</th>
                        </tr>
                    </thead>
                    <tbody>
                        {geoData.map((geo, idx) => {
                            // Calculate diffs
                            const trafficDiff = geo.previous.traffic - geo.current.traffic;
                            const salesDiff = geo.previous.sales - geo.current.sales;
                            const convDiff = geo.previous.conversion - geo.current.conversion;

                            const getDiffClass = (diff) => {
                                if (diff > 0) return 'text-emerald-600 dark:text-emerald-400';
                                if (diff < 0) return 'text-rose-600 dark:text-rose-400';
                                return 'text-gray-400';
                            };

                            const formatDiff = (diff, isPercent = false) => {
                                if (diff === 0) return '—';
                                const sign = diff > 0 ? '+' : '';
                                return isPercent ? `${sign}${diff.toFixed(1)}` : `${sign}${diff}`;
                            };

                            return (
                                <tr key={geo.geo} className={`border-b border-gray-100 dark:border-[#222] hover:bg-gray-50 dark:hover:bg-[#1A1A1A] ${idx % 2 === 0 ? '' : 'bg-gray-50/50 dark:bg-[#0A0A0A]'}`}>
                                    <td className="px-3 py-2 font-bold text-gray-900 dark:text-white sticky left-0 bg-inherit z-10">
                                        <span className="mr-1">{geo.flag}</span>
                                        {geo.geo}
                                    </td>
                                    {/* Period 1 data */}
                                    <td className="px-2 py-2 text-center text-blue-600 dark:text-blue-400 font-medium border-l border-gray-100 dark:border-[#222]">{geo.current.traffic}</td>
                                    <td className="px-2 py-2 text-center text-blue-600 dark:text-blue-400 font-bold">{geo.current.sales}</td>
                                    <td className="px-2 py-2 text-center text-blue-600 dark:text-blue-400">{geo.current.conversion.toFixed(1)}%</td>
                                    <td className="px-2 py-2 text-center text-gray-400">—</td>
                                    <td className="px-2 py-2 text-center text-gray-400">—</td>
                                    {/* Period 2 data with diffs */}
                                    <td className="px-2 py-2 text-center text-gray-600 dark:text-gray-300 font-medium border-l border-gray-100 dark:border-[#222]">{geo.previous.traffic}</td>
                                    <td className={`px-1 py-2 text-center text-[10px] font-bold ${getDiffClass(trafficDiff)}`}>{formatDiff(trafficDiff)}</td>
                                    <td className="px-2 py-2 text-center text-gray-600 dark:text-gray-300 font-bold">{geo.previous.sales}</td>
                                    <td className={`px-1 py-2 text-center text-[10px] font-bold ${getDiffClass(salesDiff)}`}>{formatDiff(salesDiff)}</td>
                                    <td className="px-2 py-2 text-center text-gray-600 dark:text-gray-300">{geo.previous.conversion.toFixed(1)}%</td>
                                    <td className={`px-1 py-2 text-center text-[10px] font-bold ${getDiffClass(convDiff)}`}>{formatDiff(convDiff, true)}</td>
                                    <td className="px-2 py-2 text-center text-gray-400">—</td>
                                    <td className="px-1 py-2 text-center text-gray-400 text-[10px]">—</td>
                                    <td className="px-2 py-2 text-center text-gray-400">—</td>
                                    <td className="px-1 py-2 text-center text-gray-400 text-[10px]">—</td>
                                </tr>
                            );
                        })}
                    </tbody>
                    {/* TOTAL FOOTER */}
                    <tfoot className="bg-gray-100 dark:bg-[#1A1A1A] font-bold text-xs sticky bottom-0 z-10 border-t-2 border-gray-200 dark:border-[#333]">
                        <tr>
                            <td className="px-3 py-3 text-gray-900 dark:text-white">ВСЕГО</td>
                            {/* Period 1 Total */}
                            <td className="px-2 py-3 text-center text-blue-700 dark:text-blue-300 border-l border-gray-200 dark:border-[#333]">{totalStats.current.traffic}</td>
                            <td className="px-2 py-3 text-center text-blue-700 dark:text-blue-300">{totalStats.current.sales}</td>
                            <td className="px-2 py-3 text-center text-blue-700 dark:text-blue-300">{totalStats.current.conversion.toFixed(1)}%</td>
                            <td className="px-2 py-3 text-center text-gray-400">—</td>
                            <td className="px-2 py-3 text-center text-gray-400">—</td>
                            {/* Period 2 Total */}
                            <td className="px-2 py-3 text-center text-gray-700 dark:text-gray-300 border-l border-gray-200 dark:border-[#333]">{totalStats.previous.traffic}</td>
                            <td className={`px-1 py-3 text-center text-[10px] ${totalStats.trafficDiff > 0 ? 'text-emerald-600' : totalStats.trafficDiff < 0 ? 'text-rose-600' : 'text-gray-400'}`}>
                                {totalStats.trafficDiff > 0 ? '+' : ''}{totalStats.trafficDiff}
                            </td>
                            <td className="px-2 py-3 text-center text-gray-700 dark:text-gray-300">{totalStats.previous.sales}</td>
                            <td className={`px-1 py-3 text-center text-[10px] ${totalStats.salesDiff > 0 ? 'text-emerald-600' : totalStats.salesDiff < 0 ? 'text-rose-600' : 'text-gray-400'}`}>
                                {totalStats.salesDiff > 0 ? '+' : ''}{totalStats.salesDiff}
                            </td>
                            <td className="px-2 py-3 text-center text-gray-700 dark:text-gray-300">{totalStats.previous.conversion.toFixed(1)}%</td>
                            <td className={`px-1 py-3 text-center text-[10px] ${totalStats.convDiff > 0 ? 'text-emerald-600' : totalStats.convDiff < 0 ? 'text-rose-600' : 'text-gray-400'}`}>
                                {totalStats.convDiff > 0 ? '+' : ''}{totalStats.convDiff.toFixed(1)}
                            </td>
                            <td className="px-2 py-3 text-center text-gray-400">—</td>
                            <td className="px-1 py-3 text-center text-gray-400 text-[10px]">—</td>
                            <td className="px-2 py-3 text-center text-gray-400">—</td>
                            <td className="px-1 py-3 text-center text-gray-400 text-[10px]">—</td>
                        </tr>
                    </tfoot>
                </table>
            </div>


        </div>
    );
};

export default SalesQuickStatsPage;
