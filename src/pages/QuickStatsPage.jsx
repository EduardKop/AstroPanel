import React, { useState, useMemo, useEffect } from 'react';
import { useAppStore } from '../store/appStore';
import {
    Filter, RotateCcw, XCircle, LayoutDashboard,
    TrendingUp, TrendingDown, Minus, AlertTriangle, Users2, Calendar as CalendarIcon, MessageCircle, MessageSquare, Phone
} from 'lucide-react';
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

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

// Helper YYYY-MM-DD
const toYMD = (date) => {
    if (!date) return '';
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
};


const QuickStatsPage = () => {
    const { payments, schedules, trafficStats, fetchAllData, fetchTrafficStats, managers } = useAppStore();

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

    useEffect(() => { fetchAllData(); }, [fetchAllData]);

    useEffect(() => {
        // Fetch traffic for the full range covering both periods
        const allDates = [period1Start, period1End, period2Start, period2End].filter(d => d);
        if (allDates.length > 0) {
            const minDate = new Date(Math.min(...allDates.map(d => d.getTime())));
            const maxDate = new Date(Math.max(...allDates.map(d => d.getTime())));
            const isoStart = new Date(minDate.setHours(0, 0, 0, 0)).toISOString();
            const isoEnd = new Date(maxDate.setHours(23, 59, 59, 999)).toISOString();
            fetchTrafficStats(isoStart, isoEnd);
        }
    }, [fetchTrafficStats, period1Start, period1End, period2Start, period2End]);

    const uniqueGeos = useMemo(() => {
        const geos = new Set();
        payments.forEach(p => p.country && geos.add(p.country));
        schedules.forEach(s => {
            if (s.geo_code) s.geo_code.split(',').forEach(g => geos.add(g.trim()));
        });
        if (trafficStats) Object.keys(trafficStats).forEach(g => geos.add(g));
        return Array.from(geos).sort();
    }, [payments, schedules, trafficStats]);

    const geoData = useMemo(() => {
        // Period 1 dates (left column)
        const p1StartStr = period1Start ? toYMD(period1Start) : toYMD(new Date());
        const p1EndStr = period1End ? toYMD(period1End) : p1StartStr;
        // Period 2 dates (right column)
        const p2StartStr = period2Start ? toYMD(period2Start) : toYMD(new Date());
        const p2EndStr = period2End ? toYMD(period2End) : p2StartStr;

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

        return uniqueGeos.map(geo => {
            const getMetrics = (start, end) => {
                let salesCount = 0;
                let transactionCount = 0;
                let trafficCount = 0;

                // Sales
                payments.forEach(p => {
                    const pDate = p.transactionDate.slice(0, 10);
                    if (p.country === geo && pDate >= start && pDate <= end) {
                        if (filters.source !== 'all' && p.source !== filters.source) return;
                        salesCount++;
                    }
                    // Separate transaction count logic if needed differently, but here salesCount IS transaction count
                });

                // Traffic
                if (trafficStats && trafficStats[geo]) {
                    Object.entries(trafficStats[geo]).forEach(([dateStr, val]) => {
                        if (dateStr >= start && dateStr <= end) {
                            if (typeof val === 'object' && val !== null) {
                                if (filters.source === 'all') trafficCount += (val.all || 0);
                                else if (filters.source === 'direct') trafficCount += (val.direct || 0);
                                else if (filters.source === 'comments') trafficCount += (val.comments || 0);
                                else if (filters.source === 'whatsapp') trafficCount += (val.whatsapp || 0);
                            } else {
                                trafficCount += (Number(val) || 0);
                            }
                        }
                    });
                }

                return {
                    sales: salesCount,
                    traffic: trafficCount,
                    conversion: trafficCount > 0 ? (salesCount / trafficCount) * 100 : 0
                };
            };

            // LEFT column = Period 1, RIGHT column = Period 2
            const current = getMetrics(p1StartStr, p1EndStr);  // Period 1 (left column)
            const previous = getMetrics(p2StartStr, p2EndStr);  // Period 2 (right column)

            // Add dates for UI display
            current.startDate = period1Start;
            current.endDate = period1End;
            previous.startDate = period2Start;
            previous.endDate = period2End;

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
    }, [uniqueGeos, period1Start, period1End, period2Start, period2End, filters, payments, schedules, trafficStats, managers]);

    const resetPeriods = () => {
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        setPeriod1([yesterday, yesterday]);
        setPeriod2([today, today]);
    };

    // --- RENDER HELPERS ---
    const MetricItem = ({ label, current, previous, isPercent }) => {
        const diff = current - previous;
        const diffPercent = previous !== 0 ? ((diff / previous) * 100).toFixed(1) : (current > 0 ? '100.0' : '0.0');
        const isPositive = diff > 0;
        const isNegative = diff < 0;
        const isZero = diff === 0;

        let badgeClass = 'text-gray-400 bg-gray-100 dark:bg-gray-800';
        if (isPositive) badgeClass = 'text-emerald-600 bg-emerald-500/10 dark:text-emerald-400';
        if (isNegative) badgeClass = 'text-rose-600 bg-rose-500/10 dark:text-rose-400';

        const fmt = (val) => isPercent ? `${val.toFixed(2)}%` : val.toLocaleString();

        return (
            <>
                {/* Label */}
                <div className="text-xs font-medium text-gray-500 dark:text-gray-400 py-2 border-b border-gray-100 dark:border-[#222]">
                    {label}
                </div>

                {/* Current Value */}
                <div className="text-center font-bold text-gray-900 dark:text-white py-2 border-b border-gray-100 dark:border-[#222]">
                    {fmt(current)}
                </div>

                {/* Diff */}
                <div className="flex justify-center py-2 border-b border-gray-100 dark:border-[#222]">
                    <div className={`px-1.5 py-0.5 rounded text-[10px] font-bold inline-flex items-center gap-0.5 ${badgeClass}`}>
                        {diff > 0 ? '+' : ''}{diffPercent}%
                    </div>
                </div>

                {/* Past Value */}
                <div className="text-center font-medium text-gray-400 py-2 border-b border-gray-100 dark:border-[#222]">
                    {fmt(previous)}
                </div>
            </>
        );
    };

    return (
        <div className="pb-10 w-full max-w-full overflow-x-hidden">
            {/* HEADER */}
            <div className="sticky top-0 z-20 bg-[#F5F5F5] dark:bg-[#0A0A0A] -mx-3 px-3 md:-mx-6 md:px-6 py-3 border-b border-transparent flex flex-col gap-3">
                <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold dark:text-white tracking-tight flex items-center gap-2 truncate">
                        <TrendingUp size={18} className="text-blue-600 dark:text-blue-500" />
                        <span>Сравнительный анализ</span>
                    </h2>
                </div>

                <div className="flex flex-wrap items-end gap-4">
                    <div className="flex bg-gray-200 dark:bg-[#1A1A1A] p-0.5 rounded-[6px] h-[34px] items-center">
                        <button onClick={() => setFilters(p => ({ ...p, source: 'all' }))} className={`px-2.5 h-full rounded-[4px] text-[10px] font-bold transition-all ${filters.source === 'all' ? 'bg-white dark:bg-[#333] text-black dark:text-white shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}>Все</button>
                        <button onClick={() => setFilters(p => ({ ...p, source: 'direct' }))} className={`px-2 h-full rounded-[4px] text-[10px] font-bold transition-all flex items-center gap-1 ${filters.source === 'direct' ? 'bg-white dark:bg-[#333] text-blue-600 dark:text-blue-400 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}><MessageCircle size={10} />Direct</button>
                        <button onClick={() => setFilters(p => ({ ...p, source: 'comments' }))} className={`px-2 h-full rounded-[4px] text-[10px] font-bold transition-all flex items-center gap-1 ${filters.source === 'comments' ? 'bg-white dark:bg-[#333] text-orange-600 dark:text-orange-400 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}><MessageSquare size={10} />Comm</button>
                        <button onClick={() => setFilters(p => ({ ...p, source: 'whatsapp' }))} className={`px-2 h-full rounded-[4px] text-[10px] font-bold transition-all flex items-center gap-1 ${filters.source === 'whatsapp' ? 'bg-white dark:bg-[#333] text-green-600 dark:text-green-400 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}><Phone size={10} />WP</button>
                    </div>

                    <div className="flex-1" /> {/* Spacer */}

                    {/* PERIODS CONTAINER - centered together */}
                    <div className="flex items-end gap-4">
                        {/* PERIOD 1 */}
                        <div className="flex flex-col items-center gap-1">
                            <span className="text-[9px] font-medium text-blue-600 dark:text-blue-400 uppercase tracking-wide">Первый период</span>
                            <div className="flex items-center gap-1 bg-blue-50 dark:bg-blue-900/20 px-3 py-1.5 rounded-lg border border-blue-200 dark:border-blue-800">
                                <CalendarIcon size={12} className="text-blue-500 shrink-0" />
                                <DatePicker
                                    selectsRange={true}
                                    startDate={period1Start}
                                    endDate={period1End}
                                    onChange={(update) => setPeriod1(update)}
                                    dateFormat="dd.MM"
                                    className="bg-transparent text-[11px] font-medium text-blue-700 dark:text-blue-300 outline-none w-[85px] cursor-pointer text-center"
                                    popperPlacement="bottom-start"
                                    portalId="root"
                                />
                            </div>
                        </div>

                        {/* PERIOD 2 */}
                        <div className="flex flex-col items-center gap-1">
                            <span className="text-[9px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Второй период</span>
                            <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700">
                                <CalendarIcon size={12} className="text-gray-400 shrink-0" />
                                <DatePicker
                                    selectsRange={true}
                                    startDate={period2Start}
                                    endDate={period2End}
                                    onChange={(update) => setPeriod2(update)}
                                    dateFormat="dd.MM"
                                    className="bg-transparent text-[11px] font-medium text-gray-600 dark:text-gray-300 outline-none w-[85px] cursor-pointer text-center"
                                    popperPlacement="bottom-end"
                                    portalId="root"
                                />
                            </div>
                        </div>

                        <button onClick={resetPeriods} className="text-gray-400 hover:text-blue-500 mb-1"><RotateCcw size={14} /></button>
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
                </table>
            </div>

            {/* GEO CARDS GRID */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
                {geoData.map(geo => (
                    <div key={geo.geo} className="bg-white dark:bg-[#111] border border-gray-200 dark:border-[#333] rounded-xl p-4 shadow-sm hover:border-blue-400 dark:hover:border-blue-700 transition-colors">
                        {/* Header */}
                        <div className="flex items-center gap-2 mb-4">
                            <span className="text-2xl">{geo.flag}</span>
                            <h3 className="font-bold text-lg leading-none text-gray-900 dark:text-white">{geo.geo}</h3>
                        </div>

                        {/* CONTENT GRID */}
                        {/* Columns: Label | Current | Diff | Past */}
                        <div className="grid grid-cols-[80px_minmax(0,1fr)_60px_minmax(0,1fr)] gap-y-0 text-xs items-center">

                            {/* HEADERS ROW */}
                            <div className="pb-2"></div> {/* Label placeholder */}

                            {/* Current Header (Period 1) */}
                            <div className="flex flex-col items-center pb-2 px-0.5 overflow-hidden">
                                <div className="text-[10px] text-blue-600 dark:text-blue-400 font-bold mb-1">
                                    {geo.current.startDate && geo.current.endDate && geo.current.startDate.getTime() !== geo.current.endDate.getTime()
                                        ? `${toDateStr(geo.current.startDate)} - ${toDateStr(geo.current.endDate)}`
                                        : (geo.current.startDate ? toDateStr(geo.current.startDate) : 'П1')}
                                </div>
                                {geo.currentManagerName && geo.currentManagerName !== '—' ? (
                                    <div className="flex items-center justify-center gap-1.5 px-2 py-1 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 text-[10px] font-bold w-full max-w-full" title={geo.currentManagerName}>
                                        <Users2 size={10} className="shrink-0" />
                                        <span className="truncate">{geo.currentManagerName}</span>
                                    </div>
                                ) : (
                                    <span className="text-gray-300">—</span>
                                )}
                            </div>

                            <div className="pb-2"></div> {/* Diff placeholder */}

                            {/* Past Header (Period 2) */}
                            <div className="flex flex-col items-center pb-2 px-0.5 overflow-hidden">
                                <div className="text-[10px] text-gray-500 font-bold mb-1">
                                    {geo.previous.startDate && geo.previous.endDate && geo.previous.startDate.getTime() !== geo.previous.endDate.getTime()
                                        ? `${toDateStr(geo.previous.startDate)} - ${toDateStr(geo.previous.endDate)}`
                                        : (geo.previous.startDate ? toDateStr(geo.previous.startDate) : 'П2')}
                                </div>
                                {geo.previousManagerName && geo.previousManagerName !== '—' ? (
                                    <div className="flex items-center justify-center gap-1.5 px-2 py-1 rounded-full bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 text-[10px] font-bold w-full max-w-full" title={geo.previousManagerName}>
                                        <Users2 size={10} className="shrink-0" />
                                        <span className="truncate">{geo.previousManagerName}</span>
                                    </div>
                                ) : (
                                    <span className="text-gray-300">—</span>
                                )}
                            </div>

                            {/* ROW DIVIDER */}
                            <div className="col-span-4 h-px bg-gray-100 dark:bg-[#222] mb-0" />

                            {/* METRIC ROWS */}
                            <MetricItem
                                label="Продажи"
                                current={geo.current.sales}
                                previous={geo.previous.sales}
                            />
                            <MetricItem
                                label="Трафик"
                                current={geo.current.traffic}
                                previous={geo.previous.traffic}
                            />
                            <MetricItem
                                label="Конверсия"
                                current={geo.current.conversion}
                                previous={geo.previous.conversion}
                                isPercent
                            />

                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default QuickStatsPage;
