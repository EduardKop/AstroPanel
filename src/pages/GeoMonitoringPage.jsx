import React, { useState, useMemo } from 'react';
import { useAppStore } from '../store/appStore';
import { toggleGeoStatus } from '../services/dataService';
import {
    Globe, Power, PowerOff, Calendar as CalendarIcon, Search,
    TrendingUp, X, Clock, Activity, History, Users
} from 'lucide-react';

// --- HELPER ---
const toYMD = (date) => {
    if (!date) return '';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const formatDateShort = (dateStr) => {
    if (!dateStr) return '—';
    const parts = dateStr.split('-');
    return `${parts[2]}.${parts[1]}.${parts[0]}`;
};

// --- COMPACT DATE RANGE PICKER ---
const DateRangePicker = ({ startDate, endDate, onChange, onReset }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [viewDate, setViewDate] = useState(startDate || new Date());
    const [selecting, setSelecting] = useState('start');

    const DAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
    const MONTHS = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
        'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];

    const fmtDate = (date) => {
        if (!date) return '';
        return `${String(date.getDate()).padStart(2, '0')}.${String(date.getMonth() + 1).padStart(2, '0')}.${date.getFullYear()}`;
    };

    const getDaysInMonth = (y, m) => new Date(y, m + 1, 0).getDate();
    const getFirstDay = (y, m) => { const d = new Date(y, m, 1).getDay(); return d === 0 ? 6 : d - 1; };
    const isSameDay = (d1, d2) => d1 && d2 && d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth() && d1.getDate() === d2.getDate();
    const isInRange = (date) => startDate && endDate && date >= startDate && date <= endDate;
    const isToday = (date) => isSameDay(date, new Date());

    const handleDayClick = (day) => {
        const clicked = new Date(viewDate.getFullYear(), viewDate.getMonth(), day);
        if (selecting === 'start') { onChange([clicked, null]); setSelecting('end'); }
        else { onChange([clicked < startDate ? clicked : startDate, clicked < startDate ? startDate : clicked]); setSelecting('start'); setIsOpen(false); }
    };

    const setToday = () => { onChange([new Date(), new Date()]); setIsOpen(false); };
    const setYesterday = () => { const y = new Date(); y.setDate(y.getDate() - 1); onChange([y, y]); setIsOpen(false); };
    const setCurrentWeek = () => {
        const t = new Date(), dow = t.getDay(), mon = new Date(t); mon.setDate(t.getDate() - (dow === 0 ? 6 : dow - 1));
        const sun = new Date(mon); sun.setDate(mon.getDate() + 6); onChange([mon, sun]); setIsOpen(false);
    };
    const setLastWeek = () => {
        const t = new Date(), dow = t.getDay(), thisMon = new Date(t); thisMon.setDate(t.getDate() - (dow === 0 ? 6 : dow - 1));
        const lastMon = new Date(thisMon); lastMon.setDate(thisMon.getDate() - 7);
        const lastSun = new Date(lastMon); lastSun.setDate(lastMon.getDate() + 6); onChange([lastMon, lastSun]); setIsOpen(false);
    };

    const year = viewDate.getFullYear(), month = viewDate.getMonth();

    return (
        <div className="relative">
            <div onClick={() => { setIsOpen(!isOpen); setSelecting('start'); }}
                className="flex items-center bg-white dark:bg-[#111] border border-gray-200 dark:border-[#333] rounded-[6px] px-2 py-0.5 shadow-sm h-[34px] cursor-pointer hover:border-gray-400 dark:hover:border-[#555] transition-colors">
                <CalendarIcon size={12} className="text-gray-400 mr-2 shrink-0" />
                <span className={`text-xs font-medium ${startDate ? 'text-gray-900 dark:text-white' : 'text-gray-400'}`}>
                    {startDate && endDate ? `${fmtDate(startDate)} — ${fmtDate(endDate)}` : 'Сегодня'}
                </span>
                <button onClick={(e) => { e.stopPropagation(); onReset(); }} className="ml-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                    <X size={12} />
                </button>
            </div>

            {isOpen && (
                <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
                    <div className="absolute top-full right-0 mt-2 bg-white dark:bg-[#111] border border-gray-200 dark:border-[#333] rounded-xl shadow-xl z-50 p-2.5 w-[220px]">
                        <div className="space-y-1 mb-2">
                            <div className="flex gap-1">
                                <button onClick={setYesterday} className="flex-1 text-[10px] font-medium py-1 px-1 rounded-md bg-gray-100 dark:bg-[#222] text-gray-600 dark:text-gray-300 hover:bg-blue-100 dark:hover:bg-blue-900/30 hover:text-blue-600 transition-colors">Вчера</button>
                                <button onClick={setToday} className="flex-1 text-[10px] font-medium py-1 px-1 rounded-md bg-gray-100 dark:bg-[#222] text-gray-600 dark:text-gray-300 hover:bg-blue-100 dark:hover:bg-blue-900/30 hover:text-blue-600 transition-colors">Сегодня</button>
                            </div>
                            <div className="flex gap-1">
                                <button onClick={setLastWeek} className="flex-1 text-[10px] font-medium py-1 px-1 rounded-md bg-gray-100 dark:bg-[#222] text-gray-600 dark:text-gray-300 hover:bg-blue-100 dark:hover:bg-blue-900/30 hover:text-blue-600 transition-colors">Пр. нед.</button>
                                <button onClick={setCurrentWeek} className="flex-1 text-[10px] font-medium py-1 px-1 rounded-md bg-gray-100 dark:bg-[#222] text-gray-600 dark:text-gray-300 hover:bg-blue-100 dark:hover:bg-blue-900/30 hover:text-blue-600 transition-colors">Тек. нед.</button>
                            </div>
                        </div>
                        <div className="flex items-center justify-between mb-2">
                            <button onClick={() => setViewDate(new Date(year, month - 1, 1))} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-[#222] text-gray-500 transition-colors">
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
                            </button>
                            <span className="text-xs font-bold text-gray-900 dark:text-white">{MONTHS[month]} {year}</span>
                            <button onClick={() => setViewDate(new Date(year, month + 1, 1))} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-[#222] text-gray-500 transition-colors">
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg>
                            </button>
                        </div>
                        <div className="grid grid-cols-7 gap-0.5 mb-0.5">
                            {DAYS.map(d => <div key={d} className="text-[9px] font-bold text-gray-400 text-center py-0.5">{d}</div>)}
                        </div>
                        <div className="grid grid-cols-7 gap-0.5">
                            {Array.from({ length: getFirstDay(year, month) }).map((_, i) => <div key={`e-${i}`} className="w-7 h-7" />)}
                            {Array.from({ length: getDaysInMonth(year, month) }).map((_, i) => {
                                const day = i + 1, date = new Date(year, month, day);
                                const isS = isSameDay(date, startDate), isE = isSameDay(date, endDate), inR = isInRange(date), td = isToday(date);
                                let cls = 'w-7 h-7 flex items-center justify-center text-[11px] font-medium rounded cursor-pointer transition-all ';
                                if (isS || isE) cls += 'bg-blue-500 text-white font-bold ';
                                else if (inR) cls += 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 ';
                                else if (td) cls += 'ring-1 ring-blue-400 text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-[#222] ';
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

// --- HISTORY MODAL ---
const HistoryModal = ({ country, onClose }) => {
    const history = Array.isArray(country?.status_history) ? [...country.status_history].reverse() : [];
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-[#111] w-full max-w-md rounded-lg shadow-2xl border border-gray-200 dark:border-[#333] overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100 dark:border-[#222] flex items-center justify-between bg-gray-50 dark:bg-[#161616]">
                    <div className="flex items-center gap-2">
                        <span className="text-xl">{country.emoji}</span>
                        <span className="font-bold text-sm dark:text-white">{country.name}</span>
                        <span className="text-[10px] font-mono text-gray-400">{country.code}</span>
                    </div>
                    <button onClick={onClose} className="p-1.5 hover:bg-gray-100 dark:hover:bg-[#222] rounded transition-colors">
                        <X size={14} className="text-gray-400" />
                    </button>
                </div>
                <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
                    {history.length === 0 ? (
                        <div className="p-6 text-center text-xs text-gray-400">Нет истории изменений</div>
                    ) : (
                        <div className="divide-y divide-gray-100 dark:divide-[#222]">
                            {history.map((entry, idx) => {
                                const isOn = entry.action === 'activated';
                                const d = new Date(entry.at);
                                const dateStr = `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;
                                const timeStr = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
                                return (
                                    <div key={idx} className="grid grid-cols-[auto_1fr_1fr] gap-3 px-4 py-2.5 text-xs items-center hover:bg-gray-50 dark:hover:bg-[#1A1A1A] transition-colors">
                                        <span className={isOn ? 'text-emerald-500' : 'text-red-500'}>
                                            {isOn ? <Power size={12} /> : <PowerOff size={12} />}
                                        </span>
                                        <span className={`font-bold ${isOn ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                                            {isOn ? 'Включено' : 'Отключено'}
                                        </span>
                                        <span className="text-gray-400 text-right text-[10px]">{entry.by} • {dateStr} {timeStr}</span>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};


// ====== MAIN PAGE ======
const GeoMonitoringPage = () => {
    const { countries, trafficStats, channels, user, fetchAllData, managers, schedules } = useAppStore();

    // --- Active Staff per GEO (last 4 shifts from schedules) ---
    const activeStaffByGeo = useMemo(() => {
        if (!schedules || !managers) return {};

        const today = toYMD(new Date());
        const result = {};

        // Build manager lookup
        const mgrMap = {};
        managers.forEach(m => { mgrMap[m.id] = m; });

        // 1. Group schedule entries by GEO
        //    Each schedule entry can have comma-separated geo_codes
        const geoSchedules = {}; // geoCode -> [{date, manager_id}, ...]
        schedules.forEach(s => {
            if (!s.geo_code || !s.date) return;
            const geos = s.geo_code.split(',').map(g => g.trim()).filter(Boolean);
            geos.forEach(geo => {
                if (!geoSchedules[geo]) geoSchedules[geo] = [];
                geoSchedules[geo].push({ date: s.date, manager_id: s.manager_id });
            });
        });

        // 2. For each GEO: take last 4 unique dates (up to today), collect managers
        Object.entries(geoSchedules).forEach(([geoCode, entries]) => {
            // Only past & today shifts
            const pastEntries = entries.filter(e => e.date <= today);

            // Get unique dates sorted desc
            const uniqueDates = [...new Set(pastEntries.map(e => e.date))]
                .sort((a, b) => b.localeCompare(a))
                .slice(0, 4);

            // Collect managers from those dates
            const recentDates = new Set(uniqueDates);
            const managerShiftCount = {}; // manager_id -> count of shifts in last 4 dates

            pastEntries.forEach(e => {
                if (recentDates.has(e.date)) {
                    managerShiftCount[e.manager_id] = (managerShiftCount[e.manager_id] || 0) + 1;
                }
            });

            // Only include managers with 2+ shifts out of last 4 (confirms they're active, not a one-off sub)
            // Exception: if only 1-2 dates exist total, include anyone with 1+ shift
            const minShifts = uniqueDates.length <= 2 ? 1 : 2;

            const staff = [];
            Object.entries(managerShiftCount).forEach(([mgrId, count]) => {
                if (count >= minShifts) {
                    const mgr = mgrMap[mgrId];
                    if (mgr) {
                        staff.push({ id: mgrId, name: mgr.name, role: mgr.role, nick: mgr.telegram_username || '' });
                    }
                }
            });

            // Sort by role priority
            const rolePriority = { SeniorSales: 0, Sales: 1, SalesTaro: 2, Consultant: 3, SeniorSMM: 4, SMM: 5 };
            staff.sort((a, b) => (rolePriority[a.role] ?? 99) - (rolePriority[b.role] ?? 99));

            result[geoCode] = staff;
        });

        return result;
    }, [schedules, managers]);

    const [dateRange, setDateRange] = useState([new Date(), new Date()]);
    const [startDate, endDate] = dateRange;
    const [search, setSearch] = useState('');
    const [historyModal, setHistoryModal] = useState(null);
    const [toggling, setToggling] = useState(null);

    const resetDate = () => setDateRange([new Date(), new Date()]);

    // --- Compute traffic per country ---
    const geoData = useMemo(() => {
        const startStr = startDate ? toYMD(startDate) : toYMD(new Date());
        const endStr = endDate ? toYMD(endDate) : toYMD(new Date());

        return countries.map(country => {
            let trafficCount = 0;
            const geoTraffic = trafficStats[country.code];
            if (geoTraffic) {
                Object.entries(geoTraffic).forEach(([dateStr, val]) => {
                    if (dateStr >= startStr && dateStr <= endStr) {
                        trafficCount += typeof val === 'object' ? (val.all || 0) : (Number(val) || 0);
                    }
                });
            }

            let lastTrafficDate = null;
            if (trafficCount === 0 && geoTraffic) {
                const dates = Object.keys(geoTraffic)
                    .filter(d => { const v = geoTraffic[d]; return (typeof v === 'object' ? (v.all || 0) : (Number(v) || 0)) > 0; })
                    .sort((a, b) => b.localeCompare(a));
                if (dates.length > 0) lastTrafficDate = dates[0];
            }

            const staff = activeStaffByGeo[country.code] || [];

            // Last deactivation date from status_history
            let lastDeactivated = null;
            const history = Array.isArray(country.status_history) ? country.status_history : [];
            for (let i = history.length - 1; i >= 0; i--) {
                if (history[i].action === 'deactivated' && history[i].at) {
                    const d = new Date(history[i].at);
                    lastDeactivated = toYMD(d);
                    break;
                }
            }

            return { ...country, isActive: country.is_active !== false, trafficCount, lastTrafficDate, staff, lastDeactivated };
        });
    }, [countries, trafficStats, channels, startDate, endDate, activeStaffByGeo]);

    // --- Filter & Sort ---
    const sortedGeos = useMemo(() => {
        let filtered = geoData;
        if (search) {
            const q = search.toLowerCase();
            filtered = filtered.filter(g => g.name.toLowerCase().includes(q) || g.code.toLowerCase().includes(q));
        }
        return filtered.sort((a, b) => {
            if (a.isActive !== b.isActive) return a.isActive ? -1 : 1;
            return a.name.localeCompare(b.name);
        });
    }, [geoData, search]);

    // --- Toggle ---
    const handleToggle = async (geo) => {
        setToggling(geo.code);
        try {
            await toggleGeoStatus(geo.code, !geo.isActive, user?.name || 'Unknown');
            await fetchAllData(true);
        } catch (err) { console.error('Toggle error:', err); }
        finally { setToggling(null); }
    };

    // --- Summary ---
    const activeCount = geoData.filter(g => g.isActive).length;
    const inactiveCount = geoData.filter(g => !g.isActive).length;
    const totalTraffic = geoData.reduce((s, g) => s + g.trafficCount, 0);

    return (
        <div className="p-4 max-w-[1600px] mx-auto font-sans text-gray-900 dark:text-gray-100">

            {/* Header */}
            <div className="flex items-center justify-between mb-4 border-b border-gray-200 dark:border-[#333] pb-4">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
                        <Globe size={16} className="text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                        <h1 className="text-lg font-bold leading-tight">ГЕО</h1>
                        <p className="text-xs text-gray-500">
                            Активные: <span className="text-emerald-600 font-bold">{activeCount}</span> · Неактивные: <span className="text-red-500 font-bold">{inactiveCount}</span> · Трафик: <span className="font-bold">{totalTraffic.toLocaleString()}</span>
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <div className="relative">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={12} />
                        <input
                            type="text"
                            placeholder="Поиск..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="bg-white dark:bg-[#111] border border-gray-200 dark:border-[#333] pl-8 pr-3 py-0.5 rounded-[6px] text-xs h-[34px] focus:outline-none focus:border-blue-500 dark:text-white w-36 transition-all"
                        />
                    </div>
                    <DateRangePicker startDate={startDate} endDate={endDate} onChange={setDateRange} onReset={resetDate} />
                </div>
            </div>

            {/* Table */}
            <div className="border border-gray-200 dark:border-[#333] rounded-lg overflow-hidden">
                {/* Table Header */}
                <div className="grid grid-cols-[1.5fr_0.7fr_0.6fr_1fr_0.9fr_1.2fr_1.2fr_1.2fr_auto] gap-3 px-4 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider bg-gray-50 dark:bg-[#161616] border-b border-gray-200 dark:border-[#333]">
                    <span>ГЕО</span>
                    <span>Статус</span>
                    <span>Трафик</span>
                    <span>Трафик был (дата)</span>
                    <span>Отключено (дата)</span>
                    <span>Sales</span>
                    <span>Consultant</span>
                    <span>SMM</span>
                    <span className="text-right">Действия</span>
                </div>

                {/* Rows */}
                <div className="bg-white dark:bg-[#111] divide-y divide-gray-100 dark:divide-[#222]">
                    {sortedGeos.map(geo => {
                        const isToggling = toggling === geo.code;

                        return (
                            <div
                                key={geo.code}
                                className={`grid grid-cols-[1.5fr_0.7fr_0.6fr_1fr_0.9fr_1.2fr_1.2fr_1.2fr_auto] gap-3 px-4 py-2.5 items-center text-xs transition-colors ${geo.isActive
                                    ? 'hover:bg-gray-50 dark:hover:bg-[#1A1A1A]'
                                    : 'opacity-60 hover:opacity-90 hover:bg-red-50/30 dark:hover:bg-red-900/5'
                                    }`}
                            >
                                {/* GEO Name */}
                                <div className="flex items-center gap-2.5 min-w-0">
                                    <span className="text-lg">{geo.emoji}</span>
                                    <div className="min-w-0">
                                        <span className="font-bold text-gray-900 dark:text-white">{geo.name}</span>
                                        <span className="ml-1.5 text-[10px] font-mono text-gray-400">{geo.code}</span>
                                    </div>
                                </div>

                                {/* Status */}
                                <div>
                                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold ${geo.isActive
                                        ? 'bg-emerald-100 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400'
                                        : 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400'
                                        }`}>
                                        {geo.isActive ? <Power size={9} /> : <PowerOff size={9} />}
                                        {geo.isActive ? 'Активно' : 'Не активно'}
                                    </span>
                                </div>

                                {/* Traffic */}
                                <div className="flex items-center gap-1.5">
                                    {geo.trafficCount > 0 ? (
                                        <>
                                            <TrendingUp size={12} className="text-blue-500" />
                                            <span className="font-bold text-blue-600 dark:text-blue-400">{geo.trafficCount.toLocaleString()}</span>
                                        </>
                                    ) : (
                                        <span className="text-gray-400">0</span>
                                    )}
                                </div>

                                {/* Last Traffic Date */}
                                <div className="flex items-center gap-1.5 text-gray-500">
                                    {geo.trafficCount > 0 ? (
                                        <span className="text-[10px] text-gray-400">—</span>
                                    ) : geo.lastTrafficDate ? (
                                        <>
                                            <Clock size={10} className="text-gray-400" />
                                            <span className="text-[10px] font-mono">{formatDateShort(geo.lastTrafficDate)}</span>
                                        </>
                                    ) : (
                                        <span className="text-[10px] text-gray-400">Нет данных</span>
                                    )}
                                </div>

                                {/* Last Deactivation Date */}
                                <div className="flex items-center gap-1.5 text-gray-500">
                                    {geo.lastDeactivated ? (
                                        <>
                                            <PowerOff size={10} className="text-red-400" />
                                            <span className="text-[10px] font-mono">{formatDateShort(geo.lastDeactivated)}</span>
                                        </>
                                    ) : (
                                        <span className="text-[10px] text-gray-400">—</span>
                                    )}
                                </div>

                                {/* Sales */}
                                <div className="flex flex-wrap gap-1 min-w-0">
                                    {geo.staff.filter(s => ['Sales', 'SeniorSales', 'SalesTaro'].includes(s.role)).length > 0 ? (
                                        geo.staff.filter(s => ['Sales', 'SeniorSales', 'SalesTaro'].includes(s.role)).map(s => {
                                            const roleColors = {
                                                SeniorSales: 'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400',
                                                Sales: 'bg-sky-100 dark:bg-sky-900/20 text-sky-700 dark:text-sky-400',
                                                SalesTaro: 'bg-purple-100 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400',
                                            };
                                            const color = roleColors[s.role] || 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400';
                                            const roleShort = { SeniorSales: 'Sr', Sales: 'S', SalesTaro: 'T' };
                                            return (
                                                <span key={s.id} className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${color}`} title={`${s.name} (${s.role})`}>
                                                    <span className="font-bold text-[8px] opacity-60">{roleShort[s.role] || s.role}</span>
                                                    {s.name}
                                                    {s.nick && <span className="text-[9px] opacity-50">@{s.nick.replace('@', '')}</span>}
                                                </span>
                                            );
                                        })
                                    ) : (
                                        <span className="text-[10px] text-gray-400">—</span>
                                    )}
                                </div>

                                {/* Consultant */}
                                <div className="flex flex-wrap gap-1 min-w-0">
                                    {geo.staff.filter(s => s.role === 'Consultant').length > 0 ? (
                                        geo.staff.filter(s => s.role === 'Consultant').map(s => (
                                            <span key={s.id} className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-100 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400" title={s.name}>
                                                {s.name}
                                                {s.nick && <span className="text-[9px] opacity-50">@{s.nick.replace('@', '')}</span>}
                                            </span>
                                        ))
                                    ) : (
                                        <span className="text-[10px] text-gray-400">—</span>
                                    )}
                                </div>

                                {/* SMM */}
                                <div className="flex flex-wrap gap-1 min-w-0">
                                    {geo.staff.filter(s => ['SMM', 'SeniorSMM'].includes(s.role)).length > 0 ? (
                                        geo.staff.filter(s => ['SMM', 'SeniorSMM'].includes(s.role)).map(s => {
                                            const isSenior = s.role === 'SeniorSMM';
                                            return (
                                                <span key={s.id} className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${isSenior ? 'bg-pink-100 dark:bg-pink-900/20 text-pink-700 dark:text-pink-400' : 'bg-rose-100 dark:bg-rose-900/20 text-rose-700 dark:text-rose-400'}`} title={`${s.name} (${s.role})`}>
                                                    {isSenior && <span className="font-bold text-[8px] opacity-60">Sr</span>}
                                                    {s.name}
                                                    {s.nick && <span className="text-[9px] opacity-50">@{s.nick.replace('@', '')}</span>}
                                                </span>
                                            );
                                        })
                                    ) : (
                                        <span className="text-[10px] text-gray-400">—</span>
                                    )}
                                </div>

                                {/* Actions */}
                                <div className="flex items-center gap-1 justify-end">
                                    <button
                                        onClick={() => setHistoryModal(geo)}
                                        className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#333] rounded-md transition-colors"
                                        title="История"
                                    >
                                        <History size={13} />
                                    </button>
                                    <button
                                        onClick={() => handleToggle(geo)}
                                        disabled={isToggling}
                                        className={`p-1.5 rounded-md transition-colors ${geo.isActive
                                            ? 'text-emerald-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20'
                                            : 'text-red-500 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20'
                                            } ${isToggling ? 'animate-pulse cursor-wait' : ''}`}
                                        title={geo.isActive ? 'Отключить' : 'Включить'}
                                    >
                                        {geo.isActive ? <Power size={13} /> : <PowerOff size={13} />}
                                    </button>
                                </div>
                            </div>
                        );
                    })}

                    {sortedGeos.length === 0 && (
                        <div className="p-6 text-center text-xs text-gray-400">Нет ГЕО локаций</div>
                    )}
                </div>
            </div>

            {/* History Modal */}
            {historyModal && <HistoryModal country={historyModal} onClose={() => setHistoryModal(null)} />}
        </div>
    );
};

export default GeoMonitoringPage;
