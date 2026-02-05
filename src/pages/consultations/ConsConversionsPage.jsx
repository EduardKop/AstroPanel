import React, { useState, useMemo, useEffect } from 'react';
import { useAppStore } from '../../store/appStore';
import {
    Filter, RotateCcw, X, XCircle, LayoutDashboard,
    TrendingUp, ArrowRight, Layers, Users, Calendar as CalendarIcon, PieChart
} from 'lucide-react';
import "react-datepicker/dist/react-datepicker.css";
import { extractKyivDate, getKyivDateString } from '../../utils/kyivTime';

// --- CONFIG ---
const FLAGS = {
    UA: '🇺🇦', PL: '🇵🇱', IT: '🇮🇹', HR: '🇭🇷',
    BG: '🇧🇬', CZ: '🇨🇿', RO: '🇷🇴', LT: '🇱🇹',
    TR: '🇹🇷', FR: '🇫🇷', PT: '🇵🇹', DE: '🇩🇪',
    US: '🇺🇸', ES: '🇪🇸', SK: '🇸🇰', HU: '🇭🇺',
    KZ: '🇰🇿', UZ: '🇺🇿', MD: '🇲🇩'
};

const getFlag = (code) => FLAGS[code] || '🏳️';

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

const CustomDateRangePicker = ({ startDate, endDate, onChange, onReset }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [viewDate, setViewDate] = useState(startDate || new Date());
    const [selecting, setSelecting] = useState('start');

    const DAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
    const MONTHS = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];

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

    const isSameDay = (d1, d2) => d1 && d2 && d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth() && d1.getDate() === d2.getDate();
    const isInRange = (date) => startDate && endDate && date >= startDate && date <= endDate;
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

    const setPeriod = (days) => {
        const end = new Date();
        const start = new Date();
        start.setDate(end.getDate() - days);
        onChange([start, end]);
        setIsOpen(false);
    };

    const displayText = () => {
        if (startDate && endDate) return `${formatDate(startDate)} - ${formatDate(endDate)}`;
        if (startDate) return `${formatDate(startDate)} - ...`;
        return 'Период';
    };

    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);

    return (
        <div className="relative flex-1">
            <div onClick={() => setIsOpen(!isOpen)} className="flex items-center bg-white dark:bg-[#111] border border-gray-200 dark:border-[#333] rounded-[6px] px-2 py-0.5 shadow-sm h-[34px] cursor-pointer hover:border-gray-400 dark:hover:border-[#555] transition-colors w-full">
                <CalendarIcon size={12} className="text-gray-400 mr-2 shrink-0" />
                <span className={`flex-1 text-xs font-medium text-center ${startDate ? 'text-gray-900 dark:text-white' : 'text-gray-400'}`}>{displayText()}</span>
                <button onClick={(e) => { e.stopPropagation(); onReset(); }} className="ml-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"><X size={12} /></button>
            </div>

            {isOpen && (
                <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
                    <div className="absolute top-full right-0 mt-2 bg-white dark:bg-[#111] border border-gray-200 dark:border-[#333] rounded-xl shadow-xl z-50 p-2.5 w-[220px]">
                        <div className="flex gap-1 mb-2">
                            <button onClick={() => setPeriod(0)} className="flex-1 text-[10px] font-medium py-1 rounded bg-gray-100 dark:bg-[#222]">Сегодня</button>
                            <button onClick={() => setPeriod(7)} className="flex-1 text-[10px] font-medium py-1 rounded bg-gray-100 dark:bg-[#222]">Неделя</button>
                            <button onClick={() => setPeriod(30)} className="flex-1 text-[10px] font-medium py-1 rounded bg-gray-100 dark:bg-[#222]">Месяц</button>
                        </div>
                        <div className="flex items-center justify-between mb-2">
                            <button onClick={() => setViewDate(new Date(year, month - 1))} className="p-1 hover:bg-gray-100 dark:hover:bg-[#222] rounded"><ArrowRight size={14} className="rotate-180" /></button>
                            <span className="text-xs font-bold">{MONTHS[month]} {year}</span>
                            <button onClick={() => setViewDate(new Date(year, month + 1))} className="p-1 hover:bg-gray-100 dark:hover:bg-[#222] rounded"><ArrowRight size={14} /></button>
                        </div>
                        <div className="grid grid-cols-7 gap-0.5 mb-1">{DAYS.map(d => <div key={d} className="text-[9px] text-center text-gray-400">{d}</div>)}</div>
                        <div className="grid grid-cols-7 gap-0.5">
                            {Array.from({ length: firstDay }).map((_, i) => <div key={`empty-${i}`} />)}
                            {Array.from({ length: daysInMonth }).map((_, i) => {
                                const day = i + 1;
                                const date = new Date(year, month, day);
                                const selected = isInRange(date) || isSameDay(date, startDate);
                                const today = isToday(date);
                                return (
                                    <button key={day} onClick={() => handleDayClick(day)} className={`w-7 h-7 flex items-center justify-center text-[10px] rounded ${selected ? 'bg-blue-500 text-white' : today ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600' : 'hover:bg-gray-100 dark:hover:bg-[#222]'}`}>{day}</button>
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
    const [filters, setFilters] = useState({ country: [], department: ['Консультанты'] });

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
            const pDate = extractKyivDate(p.transactionDate);
            if (pDate < startStr || pDate > endStr) return false;
            // Array filter for country
            if (filters.country.length > 0 && !filters.country.includes(p.country)) return false;

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
                // For ranks 2, 3, 4 - apply Department filter
                // Multi-select logic for department
                let matchesRole = false;
                const depts = filters.department;

                // If 'Все' is selected or no dept selected (should not happen if default is set), imply all? 
                // Adjusting logic: 'Все' covers both.
                if (depts.includes('Все') || depts.length === 0) {
                    matchesRole = true;
                } else {
                    if (depts.includes('Консультанты') && p.managerRole === 'Consultant') matchesRole = true;
                    if (depts.includes('Отдел продаж') && (p.managerRole === 'Sales' || p.managerRole === 'SeniorSales')) matchesRole = true;
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
        }).sort((a, b) => b.sales1 - a.sales1);
    }, [payments, paymentRanks, startDate, endDate, filters]);

    const getCRColor = (val) => {
        const num = parseFloat(val);
        if (num >= 20) return 'text-emerald-600 dark:text-emerald-400 font-bold';
        if (num >= 10) return 'text-blue-600 dark:text-blue-400 font-bold';
        return 'text-gray-500 dark:text-gray-400';
    };

    return (
        <div className="pb-10 transition-colors duration-200">
            {/* Header */}
            <div className="sticky top-0 z-20 bg-[#F5F5F5] dark:bg-[#0A0A0A] -mx-4 px-4 py-3 border-b border-transparent mb-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold dark:text-white flex items-center gap-2">
                        <PieChart size={18} className="text-blue-500" />
                        <span>Конверсии (Воронка)</span>
                    </h2>
                </div>

                <div className="flex items-center gap-2 w-full md:w-auto">
                    <DenseSelect
                        label="Отдел"
                        value={filters.department}
                        options={['Все', 'Консультанты', 'Отдел продаж']}
                        onChange={val => setFilters(p => ({ ...p, department: val }))}
                    />
                    <DenseSelect
                        label="ГЕО"
                        value={filters.country}
                        options={uniqueGeos}
                        onChange={val => setFilters(p => ({ ...p, country: val }))}
                    />
                    <div className="flex items-center gap-2">
                        <div className="w-[200px]">
                            <CustomDateRangePicker
                                startDate={startDate}
                                endDate={endDate}
                                onChange={setDateRange}
                                onReset={() => setDateRange(getLastWeekRange())}
                            />
                        </div>
                        <button
                            onClick={() => {
                                setFilters({ country: [], department: ['Консультанты'] });
                                setDateRange(getLastWeekRange());
                            }}
                            className="bg-gray-200 dark:bg-[#1A1A1A] hover:bg-gray-300 dark:hover:bg-[#333] text-gray-500 dark:text-gray-400 p-1.5 rounded-[6px] transition-colors h-[34px] w-[34px] flex items-center justify-center shrink-0"
                            title="Сбросить фильтры"
                        >
                            <X size={14} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Content - Data Table */}
            <div className="bg-white dark:bg-[#111] border border-gray-200 dark:border-[#333] rounded-xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 dark:bg-[#161616] border-b border-gray-200 dark:border-[#333] text-xs uppercase text-gray-500 font-bold">
                            <tr>
                                <th className="px-4 py-3">ГЕО</th>
                                <th className="px-4 py-3 text-center text-blue-600 dark:text-blue-400 border-l border-gray-100 dark:border-[#222]">1-я продажа</th>
                                <th className="px-4 py-3 text-center border-l border-gray-100 dark:border-[#222]">2-я продажа</th>
                                <th className="px-4 py-3 text-center text-gray-400 text-[10px]">% 1 ➔ 2</th>
                                <th className="px-4 py-3 text-center border-l border-gray-100 dark:border-[#222]">3-я продажа</th>
                                <th className="px-4 py-3 text-center text-gray-400 text-[10px]">% 2 ➔ 3</th>
                                <th className="px-4 py-3 text-center border-l border-gray-100 dark:border-[#222]">4-я продажа</th>
                                <th className="px-4 py-3 text-center text-gray-400 text-[10px]">% 3 ➔ 4</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-[#222]">
                            {tableData.length === 0 ? (
                                <tr>
                                    <td colSpan="8" className="px-4 py-8 text-center text-gray-500 text-xs">Нет данных за выбранный период</td>
                                </tr>
                            ) : (
                                tableData.map(row => (
                                    <tr key={row.geo} className="hover:bg-gray-50 dark:hover:bg-[#1A1A1A] transition-colors">
                                        <td className="px-4 py-3 font-bold text-gray-900 dark:text-white">
                                            <span className="mr-2 text-lg">{getFlag(row.geo)}</span>
                                            {row.geo}
                                        </td>

                                        <td className="px-4 py-3 text-center font-bold text-blue-600 dark:text-blue-400 border-l border-gray-50 dark:border-[#222] bg-blue-50/30 dark:bg-blue-900/10">
                                            {row.sales1}
                                        </td>

                                        <td className="px-4 py-3 text-center font-medium border-l border-gray-50 dark:border-[#222]">
                                            {row.sales2}
                                        </td>
                                        <td className={`px-4 py-3 text-center ${getCRColor(row.c1_2)}`}>
                                            {row.sales1 > 0 ? `${row.c1_2}%` : '—'}
                                        </td>

                                        <td className="px-4 py-3 text-center font-medium border-l border-gray-50 dark:border-[#222]">
                                            {row.sales3}
                                        </td>
                                        <td className={`px-4 py-3 text-center ${getCRColor(row.c2_3)}`}>
                                            {row.sales2 > 0 ? `${row.c2_3}%` : '—'}
                                        </td>

                                        <td className="px-4 py-3 text-center font-medium border-l border-gray-50 dark:border-[#222]">
                                            {row.sales4}
                                        </td>
                                        <td className={`px-4 py-3 text-center ${getCRColor(row.c3_4)}`}>
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
