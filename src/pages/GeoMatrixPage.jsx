import React, { useState, useMemo, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import { useAppStore } from '../store/appStore'; // ✅ Стор
import {
    Calendar, Plus, X, Globe, LayoutGrid, AlertCircle, Trash2, Filter,
    ArrowDownWideNarrow, ArrowUpNarrowWide, List, DollarSign, User, Activity, Coins,
    ChevronUp, ChevronDown
} from 'lucide-react';
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { motion, AnimatePresence } from 'framer-motion';

// --- СПРАВОЧНИК ---
const STATIC_GEO_LOOKUP = {
    RO: { name: 'Румыния', emoji: '🇷🇴' },
    BG: { name: 'Болгария', emoji: '🇧🇬' },
    LT: { name: 'Литва', emoji: '🇱🇹' },
    CZ: { name: 'Чехия', emoji: '🇨🇿' },
    IT: { name: 'Италия', emoji: '🇮🇹' },
    PL: { name: 'Польша', emoji: '🇵🇱' },
    UA: { name: 'Украина', emoji: '🇺🇦' },
    HR: { name: 'Хорватия', emoji: '🇭🇷' },
    PT: { name: 'Португалия', emoji: '🇵🇹' },
    MX: { name: 'Мексика', emoji: '🇲🇽' },
    AZ: { name: 'Азербайджан', emoji: '🇦🇿' },
    EE: { name: 'Эстония', emoji: '🇪🇪' },
    FR: { name: 'Франция', emoji: '🇫🇷' },
    LV: { name: 'Латвия', emoji: '🇱🇻' },
    DE: { name: 'Германия', emoji: '🇩🇪' },
    ES: { name: 'Испания', emoji: '🇪🇸' },
    US: { name: 'США', emoji: '🇺🇸' },
    GB: { name: 'Великобритания', emoji: '🇬🇧' },
    KZ: { name: 'Казахстан', emoji: '🇰🇿' },
};


const HEAT_COLORS = [
    'bg-transparent',
    'bg-red-50 dark:bg-red-900/10 text-red-700 dark:text-red-400',
    'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300',
    'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400',
    'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400',
    'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400',
    'bg-lime-100 dark:bg-lime-900/30 text-lime-700 dark:text-lime-400',
    'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
    'bg-emerald-200 dark:bg-emerald-800/40 text-emerald-800 dark:text-emerald-200',
    'bg-emerald-500 dark:bg-emerald-600 text-white font-bold',
];

const getHeatColor = (count) => {
    if (count === 0) return HEAT_COLORS[0];
    if (count >= 9) return HEAT_COLORS[9];
    return HEAT_COLORS[count];
};

const getCurrentMonthRange = () => {
    const date = new Date();
    const start = new Date(date.getFullYear(), date.getMonth(), 1);
    const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
    return [start, end];
};

// --- ВСПОМОГАТЕЛЬНАЯ ФУНКЦИЯ ДЛЯ ЛОКАЛЬНЫХ ДАТ ---
const getLocalDateKey = (date) => {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
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
// Desktop Native Select
// Desktop Native Select with styling matching GeoPage
const DesktopSelect = ({ label, value, options, onChange }) => (
    <div className="relative group w-full sm:w-auto flex-1 sm:flex-none min-w-[100px]">
        <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-full appearance-none bg-white dark:bg-[#111] border border-gray-200 dark:border-[#333] text-gray-700 dark:text-gray-200 py-1.5 pl-2 pr-6 rounded-[6px] text-xs font-medium focus:outline-none focus:border-blue-500 hover:border-gray-400 dark:hover:border-[#555] transition-colors cursor-pointer truncate"
        >
            <option value="">{label}</option>
            {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
        </select>
        <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400"><Filter size={10} /></div>
    </div>
);

// Desktop Date Range Picker
const DesktopDateRangePicker = ({ startDate, endDate, onChange, onReset }) => (
    <div className="flex items-center bg-white dark:bg-[#111] border border-gray-200 dark:border-[#333] rounded-[6px] px-2 py-0.5 shadow-sm h-[34px] flex-1">
        <Calendar size={12} className="text-gray-400 mr-2 shrink-0" />
        <div className="relative flex-1">
            <DatePicker
                selectsRange
                startDate={startDate}
                endDate={endDate}
                onChange={onChange}
                dateFormat="dd.MM.yyyy"
                placeholderText="Период"
                popperClassName="!z-[100]"
                className="bg-transparent text-xs font-medium dark:text-white outline-none w-full cursor-pointer text-center"
                popperPlacement="bottom-end"
            />
        </div>
        <button onClick={onReset} className="ml-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
            <X size={12} />
        </button>
    </div>
);

// Mobile Date Range Picker
const MobileDateRangePicker = ({ startDate, endDate, onChange }) => {
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
        if (!startDate) return `По ${endDate.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' })}`;
        if (!endDate) return `С ${startDate.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' })}`;
        return `${startDate.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' })} - ${endDate.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' })}`;
    };

    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="relative w-full">
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="w-full bg-white dark:bg-[#111] border border-gray-200 dark:border-[#333] text-gray-700 dark:text-gray-200 py-1.5 px-3 rounded-[6px] text-xs font-medium hover:border-gray-400 dark:hover:border-[#555] transition-colors text-left flex justify-between items-center h-[34px]"
            >
                <Calendar size={12} className="shrink-0 mr-2 text-gray-400" />
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

const GeoMatrixPage = () => {
    // ✅ Достаем trafficStats и метод обновления
    const { payments, trafficStats, fetchTrafficStats } = useAppStore();

    const [countriesList, setCountriesList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isDemoMode, setIsDemoMode] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedCell, setSelectedCell] = useState(null);
    const [dateRange, setDateRange] = useState(getCurrentMonthRange());
    const [startDate, endDate] = dateRange;
    const [filters, setFilters] = useState({ product: '', type: '', showMobileFilters: false });
    const [sortOrder, setSortOrder] = useState('default');

    // Загрузка стран (справочник)
    const fetchCountries = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase.from('countries').select('*').order('code', { ascending: true }).range(0, 9999);
            if (error) throw error;
            setCountriesList(data || []);
        } catch (error) { console.error(error); } finally { setLoading(false); }
    };

    useEffect(() => { fetchCountries(); }, []);

    // ✅ Подгружаем трафик при смене дат (для расчета конверсии в модалке)
    useEffect(() => {
        if (fetchTrafficStats) {
            const isoStart = startDate ? new Date(startDate.getTime()).toISOString() : undefined;
            const isoEnd = endDate ? new Date(endDate.getTime()).toISOString() : undefined;
            fetchTrafficStats(isoStart, isoEnd);
        }
    }, [fetchTrafficStats, startDate, endDate]);

    const dateList = useMemo(() => {
        if (!startDate || !endDate) return [];
        const list = [];
        const current = new Date(endDate);
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);

        let d = new Date(start);
        while (d <= current) {
            list.push(new Date(d));
            d.setDate(d.getDate() + 1);
        }
        return list;
    }, [startDate, endDate]);

    const { matrixData, totalsByCountry, totalsByDate, grandTotal } = useMemo(() => {
        const data = {};
        dateList.forEach(date => {
            const dateKey = getLocalDateKey(date);
            data[dateKey] = {};
            countriesList.forEach(country => {
                data[dateKey][country.code] = isDemoMode ? Math.floor(Math.random() * 12) : 0;
            });
        });

        if (!isDemoMode) {
            payments.forEach(p => {
                if (!p.transactionDate) return;
                // Фильтры
                if (filters.product && p.product !== filters.product) return;
                if (filters.type && p.type !== filters.type) return;

                let pDate;
                try {
                    pDate = typeof p.transactionDate === 'string'
                        ? p.transactionDate.split(/[T ]/)[0]
                        : new Date(p.transactionDate).toISOString().split('T')[0];
                } catch (e) { return; }

                const geo = p.country;
                const isTracked = countriesList.some(c => c.code === geo);

                if (data[pDate] && isTracked) {
                    data[pDate][geo] = (data[pDate][geo] || 0) + 1;
                }
            });
        }

        const tCountry = {};
        const tDate = {};
        let total = 0;

        countriesList.forEach(c => tCountry[c.code] = 0);
        dateList.forEach(d => tDate[getLocalDateKey(d)] = 0);

        Object.entries(data).forEach(([dateKey, geos]) => {
            Object.entries(geos).forEach(([geoCode, count]) => {
                tCountry[geoCode] = (tCountry[geoCode] || 0) + count;
                tDate[dateKey] = (tDate[dateKey] || 0) + count;
                total += count;
            });
        });

        return { matrixData: data, totalsByCountry: tCountry, totalsByDate: tDate, grandTotal: total };
    }, [dateList, countriesList, isDemoMode, payments, filters]);

    const sortedCountries = useMemo(() => {
        let sorted = [...countriesList];
        if (sortOrder === 'desc') {
            sorted.sort((a, b) => (totalsByCountry[b.code] || 0) - (totalsByCountry[a.code] || 0));
        } else if (sortOrder === 'asc') {
            sorted.sort((a, b) => (totalsByCountry[a.code] || 0) - (totalsByCountry[b.code] || 0));
        }
        return sorted;
    }, [countriesList, totalsByCountry, sortOrder]);

    const uniqueProducts = useMemo(() => [...new Set(payments.map(p => p.product).filter(Boolean))], [payments]);
    const uniqueTypes = useMemo(() => [...new Set(payments.map(p => p.type).filter(Boolean))], [payments]);

    const resetFilters = () => setFilters({ product: '', type: '' });

    // ✅ ОБНОВЛЕННЫЙ КЛИК ПО ЯЧЕЙКЕ
    const handleCellClick = (countryCode, dateKey, count) => {
        // 1. Фильтруем транзакции для этой ячейки
        const cellTransactions = payments.filter(p => {
            if (!p.transactionDate) return false;
            let pDate;
            try {
                pDate = typeof p.transactionDate === 'string'
                    ? p.transactionDate.split(/[T ]/)[0]
                    : new Date(p.transactionDate).toISOString().split('T')[0];
            } catch (e) { return false; }

            // Важно: Применяем те же фильтры, что и в матрице
            if (filters.product && p.product !== filters.product) return false;
            if (filters.type && p.type !== filters.type) return false;

            return p.country === countryCode && pDate === dateKey;
        });

        const countryInfo = countriesList.find(c => c.code === countryCode);

        // 2. Достаем трафик (заявки) из стора для конкретной ячейки
        let cellTraffic = 0;
        if (trafficStats && trafficStats[countryCode] && trafficStats[countryCode][dateKey]) {
            const val = trafficStats[countryCode][dateKey];
            // val может быть объектом {all, direct} или числом
            cellTraffic = typeof val === 'object' ? (val.all || 0) : (Number(val) || 0);
        }

        setSelectedCell({
            countryCode,
            countryName: countryInfo?.name || countryCode,
            countryEmoji: countryInfo?.emoji,
            dateKey,
            count, // Количество продаж
            traffic: cellTraffic, // Количество заявок
            transactions: cellTransactions
        });
    };

    // --- MOBILE VIEW LOGIC ---
    const mobileStats = useMemo(() => {
        if (loading || !countriesList.length) return null;

        let totalLeads = 0;
        let totalSales = 0;
        let totalRevenue = 0;

        // General Stats Calculation
        countriesList.forEach(country => {
            // Sales & Revenue from payments
            const countrySales = totalsByCountry[country.code] || 0;
            totalSales += countrySales;

            // Calculate Revenue (if 'amount_usd' exists in payments, currently simpler logic used for count)
            // We need to iterate payments again for precise revenue if not tracking it
            if (!isDemoMode) {
                payments.forEach(p => {
                    if (p.country === country.code && p.transactionDate) {
                        // Apply filters
                        if (filters.product && p.product !== filters.product) return;
                        if (filters.type && p.type !== filters.type) return;

                        // Date check
                        let pDate;
                        try {
                            pDate = typeof p.transactionDate === 'string'
                                ? p.transactionDate.split(/[T ]/)[0]
                                : new Date(p.transactionDate).toISOString().split('T')[0];
                        } catch (e) { return; }

                        const dKey = getLocalDateKey(new Date(pDate));
                        if (totalsByDate[dKey] !== undefined) { // Check if date is in range
                            totalRevenue += Number(p.amount_usd || 0);
                        }
                    }
                });
            }

            // Leads from trafficStats
            dateList.forEach(date => {
                const dKey = getLocalDateKey(date);
                if (trafficStats && trafficStats[country.code] && trafficStats[country.code][dKey]) {
                    const val = trafficStats[country.code][dKey];
                    totalLeads += typeof val === 'object' ? (val.all || 0) : (Number(val) || 0);
                }
            });
        });

        const conversion = totalLeads > 0 ? ((totalSales / totalLeads) * 100).toFixed(1) : '0.0';
        const avgCheck = totalSales > 0 ? (totalRevenue / totalSales).toFixed(0) : '0';

        return {
            leads: totalLeads,
            sales: totalSales,
            revenue: totalRevenue.toFixed(0),
            conversion,
            avgCheck
        };
    }, [countriesList, totalsByCountry, payments, trafficStats, dateList, filters, isDemoMode]);


    const [expandedGeo, setExpandedGeo] = useState(null);

    // Mobile Row Component
    const MobileGeoRow = ({ country }) => {
        const isExpanded = expandedGeo === country.code;
        const salesCount = totalsByCountry[country.code] || 0;

        return (
            <div className="bg-white dark:bg-[#111] border border-gray-200 dark:border-[#333] rounded-lg mb-2 overflow-hidden">
                <button
                    onClick={() => setExpandedGeo(isExpanded ? null : country.code)}
                    className="w-full flex items-center justify-between p-3"
                >
                    <div className="flex items-center gap-2">
                        <span className="text-2xl">{country.emoji}</span>
                        <div className="flex flex-col items-start">
                            <span className="text-sm font-bold text-gray-900 dark:text-white">{country.name}</span>
                            <span className="text-[10px] text-gray-400">{country.code}</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="text-right">
                            <div className="text-xs font-bold text-gray-900 dark:text-white">{salesCount}</div>
                            <div className="text-[10px] text-gray-400">прод.</div>
                        </div>
                        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </div>
                </button>

                <AnimatePresence>
                    {isExpanded && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="border-t border-gray-100 dark:border-[#222]"
                        >
                            <div className="p-3 space-y-3 bg-gray-50 dark:bg-[#161616]/50">
                                {dateList.map(date => {
                                    const dateKey = getLocalDateKey(date);
                                    const sales = matrixData[dateKey]?.[country.code] || 0;

                                    // Traffic
                                    let traffic = 0;
                                    if (trafficStats && trafficStats[country.code] && trafficStats[country.code][dateKey]) {
                                        const val = trafficStats[country.code][dateKey];
                                        traffic = typeof val === 'object' ? (val.all || 0) : (Number(val) || 0);
                                    }

                                    // Revenue logic per day (simplified for now, ideally pre-calc)
                                    // ... skipped for performance, focusing on key requested metrics
                                    const conv = traffic > 0 ? ((sales / traffic) * 100).toFixed(0) : 0;

                                    if (sales === 0 && traffic === 0) return null; // Hide empty days? Or show? Spec says "list w dates"

                                    return (
                                        <div key={dateKey} className="bg-white dark:bg-[#111] p-2 rounded border border-gray-100 dark:border-[#333] flex justify-between items-center">
                                            <div className="text-[10px] font-bold text-gray-500">
                                                {date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' })}
                                            </div>
                                            <div className="flex gap-4 text-[10px]">
                                                <div className="flex flex-col items-center">
                                                    <span className="text-gray-400">Лиды</span>
                                                    <span className="font-bold dark:text-gray-200">{traffic}</span>
                                                </div>
                                                <div className="flex flex-col items-center">
                                                    <span className="text-gray-400">Прод</span>
                                                    <span className="font-bold text-green-600 dark:text-green-400">{sales}</span>
                                                </div>
                                                <div className="flex flex-col items-center">
                                                    <span className="text-gray-400">Конв</span>
                                                    <span className="font-bold dark:text-gray-200">{conv}%</span>
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        );
    };

    return (
        <div className="animate-in fade-in zoom-in duration-300 pb-10 min-h-screen">
            <style>{`
        .matrix-cell:hover::after { content: ''; position: absolute; top: -10000px; bottom: -10000px; left: 0; right: 0; background-color: rgba(0, 0, 0, 0.03); z-index: 1; pointer-events: none; }
        .dark .matrix-cell:hover::after { background-color: rgba(255, 255, 255, 0.05); }
        .react-datepicker-popper { z-index: 9999 !important; }
        .cursor-pointer-cell { cursor: pointer; }
      `}</style>

            {/* HEADER */}
            <div className="sticky top-0 z-20 bg-[#F5F5F5] dark:bg-[#0A0A0A] -mx-3 px-2 md:px-6 py-2 md:py-3 border-b border-transparent transition-colors duration-200">
                <div className="flex flex-col gap-3">
                    {/* Title & Demo/GEO buttons */}
                    <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-3">
                        <div>
                            <h2 className="text-lg font-bold dark:text-white flex items-center gap-2">
                                <LayoutGrid size={20} className="text-purple-500" />
                                Матрица ГЕО
                                {isDemoMode && <span className="text-[9px] bg-purple-500 text-white px-1.5 py-0.5 rounded-full uppercase tracking-wider">Demo</span>}
                            </h2>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 w-full xl:w-auto">
                            <button onClick={() => setIsDemoMode(!isDemoMode)} className={`text-[10px] font-bold px-3 py-1.5 rounded-[6px] border transition-all ${isDemoMode ? 'bg-purple-500 border-purple-500 text-white' : 'bg-white dark:bg-[#111] border-gray-200 dark:border-[#333] text-gray-600 dark:text-gray-300 hover:bg-gray-50'}`}>
                                {isDemoMode ? 'Off Demo' : 'On Demo'}
                            </button>

                            <button onClick={() => setIsModalOpen(true)} className="flex items-center gap-1 bg-black dark:bg-white text-white dark:text-black text-[10px] font-bold px-3 py-1.5 rounded-[6px] hover:opacity-80 transition-opacity">
                                <Plus size={12} /> ГЕО
                            </button>
                        </div>
                    </div>

                    {/* Filters Section - wrapper только для мобильных */}
                    <div className="mx-auto max-w-[90%] md:max-w-none w-full">
                        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2 md:justify-between">

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
                                        {(filters.product || filters.type) && '●'}
                                    </span>
                                </button>

                                {filters.showMobileFilters && (
                                    <div className="space-y-2 p-3 bg-white dark:bg-[#111] border border-gray-200 dark:border-[#333] rounded-lg">
                                        <MobileSelect
                                            label="Продукты"
                                            value={filters.product}
                                            options={uniqueProducts}
                                            onChange={(val) => setFilters({ ...filters, product: val })}
                                        />
                                        <MobileSelect
                                            label="Методы"
                                            value={filters.type}
                                            options={uniqueTypes}
                                            onChange={(val) => setFilters({ ...filters, type: val })}
                                        />

                                        <MobileDateRangePicker
                                            startDate={startDate}
                                            endDate={endDate}
                                            onChange={(u) => setDateRange(u)}
                                        />

                                        {(filters.product || filters.type) && (
                                            <button
                                                onClick={resetFilters}
                                                className="w-full p-2 bg-red-500/10 text-red-500 rounded-[6px] hover:bg-red-500/20 text-xs font-bold flex items-center justify-center gap-1"
                                            >
                                                <X size={12} /> Сброс фильтров
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* DESKTOP - Sort button LEFT */}
                            <div className="hidden md:flex items-center gap-2">
                                <div className="flex bg-gray-200 dark:bg-[#1A1A1A] p-0.5 rounded-[6px] h-[34px] items-center">
                                    <button
                                        onClick={() => setSortOrder(prev => prev === 'default' ? 'desc' : prev === 'desc' ? 'asc' : 'default')}
                                        className={`px-2.5 h-full rounded-[4px] text-[10px] font-bold transition-all flex items-center gap-1 whitespace-nowrap ${sortOrder !== 'default' ? 'bg-white dark:bg-[#333] text-blue-600 dark:text-blue-400 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
                                    >
                                        {sortOrder === 'default' && <List size={14} />}
                                        {sortOrder === 'desc' && <ArrowDownWideNarrow size={14} />}
                                        {sortOrder === 'asc' && <ArrowUpNarrowWide size={14} />}
                                        <span>Сорт</span>
                                    </button>
                                </div>
                            </div>

                            {/* DESKTOP - Filters RIGHT */}
                            <div className="hidden md:flex items-center gap-2">
                                <DesktopSelect label="Продукты" value={filters.product} options={uniqueProducts} onChange={(val) => setFilters({ ...filters, product: val })} />
                                <DesktopSelect label="Методы" value={filters.type} options={uniqueTypes} onChange={(val) => setFilters({ ...filters, type: val })} />

                                <div className="flex items-center gap-2">
                                    <DesktopDateRangePicker
                                        startDate={startDate}
                                        endDate={endDate}
                                        onChange={(u) => setDateRange(u)}
                                        onReset={() => setDateRange([null, null])}
                                    />

                                    {(filters.product || filters.type) && (
                                        <button
                                            onClick={resetFilters}
                                            className="bg-gray-200 dark:bg-[#1A1A1A] hover:bg-gray-300 dark:hover:bg-[#333] text-gray-500 dark:text-gray-400 p-1.5 rounded-[6px] transition-colors h-[34px] w-[34px] flex items-center justify-center"
                                            title="Сбросить фильтры"
                                        >
                                            <X size={14} />
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* MOBILE VIEW */}
            <div className="md:hidden space-y-4 px-2 pb-20">
                {/* General Header Stats */}
                {mobileStats && (
                    <div className="grid grid-cols-2 gap-2">
                        <div className="bg-white dark:bg-[#111] border border-gray-200 dark:border-[#333] rounded-lg p-3 shadow-sm">
                            <div className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-1">Лиды</div>
                            <div className="text-xl font-bold dark:text-white">{mobileStats.leads}</div>
                        </div>
                        <div className="bg-white dark:bg-[#111] border border-gray-200 dark:border-[#333] rounded-lg p-3 shadow-sm">
                            <div className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-1">Продажи</div>
                            <div className="text-xl font-bold text-green-600 dark:text-green-400">{mobileStats.sales}</div>
                        </div>
                        <div className="bg-white dark:bg-[#111] border border-gray-200 dark:border-[#333] rounded-lg p-3 shadow-sm">
                            <div className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-1">Конверсия</div>
                            <div className="text-xl font-bold dark:text-white">{mobileStats.conversion}%</div>
                        </div>
                        <div className="bg-white dark:bg-[#111] border border-gray-200 dark:border-[#333] rounded-lg p-3 shadow-sm">
                            <div className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-1">Ср. Чек</div>
                            <div className="text-xl font-bold dark:text-white">${mobileStats.avgCheck}</div>
                        </div>
                    </div>
                )}

                {/* Countries List */}
                <div className="space-y-2">
                    {sortedCountries.map(country => (
                        <MobileGeoRow key={country.code} country={country} />
                    ))}
                </div>
            </div>

            {/* DESKTOP TABLE */}
            <div className="hidden md:block bg-white dark:bg-[#111] border border-gray-200 dark:border-[#333] rounded-lg shadow-sm relative z-0 w-full max-w-[90vw] xl:max-w-[calc(100vw-300px)] overflow-hidden">
                <div className="overflow-x-auto overflow-y-hidden custom-scrollbar">
                    {loading ? (
                        <div className="p-10 text-center text-xs text-gray-400">Загрузка данных...</div>
                    ) : (
                        <table className="min-w-full text-[10px] border-collapse">
                            <thead>
                                <tr>
                                    <th className="w-[120px] min-w-[120px] p-2 bg-gray-50 dark:bg-[#161616] border-b border-r border-gray-200 dark:border-[#333] text-left align-bottom z-20 sticky left-0 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                                        <span className="text-gray-400 font-medium pl-1 text-xs">ГЕО</span>
                                    </th>
                                    {dateList.map(date => (
                                        <th key={getLocalDateKey(date)} className="h-[60px] min-w-[34px] bg-gray-50 dark:bg-[#161616] border-b border-r border-gray-200 dark:border-[#333] p-0 align-bottom group hover:bg-gray-100 dark:hover:bg-[#222] transition-colors relative z-10">
                                            <div className="flex flex-col items-center justify-end pb-2 w-full h-full gap-1">
                                                <span className={`text-[8px] font-bold uppercase px-1 rounded-[2px] mb-1 ${date.getDay() === 0 || date.getDay() === 6 ? 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/10' : 'text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-[#222]'}`}>
                                                    {date.toLocaleDateString('ru-RU', { weekday: 'short' }).toUpperCase()}
                                                </span>
                                                <div className="flex flex-col items-center leading-none">
                                                    <span className="text-[12px] font-bold text-gray-900 dark:text-white">{date.getDate()}</span>
                                                    <div className="w-3 h-px bg-gray-300 dark:bg-[#444] my-0.5"></div>
                                                    <span className="text-[9px] font-medium text-gray-400">{date.getMonth() + 1}</span>
                                                </div>
                                            </div>
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {sortedCountries.map(country => (
                                    <tr key={country.code} className="group hover:bg-gray-50 dark:hover:bg-[#1A1A1A] transition-colors">
                                        <td className="px-3 py-1 border-b border-r border-gray-200 dark:border-[#333] bg-white dark:bg-[#111] group-hover:bg-gray-50 dark:group-hover:bg-[#1A1A1A] sticky left-0 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                                            <div className="flex items-center justify-between h-full w-full">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xl leading-none">{country.emoji}</span>
                                                    <span className="font-bold text-gray-900 dark:text-gray-200 text-xs">{country.code}</span>
                                                </div>
                                                <div className="px-1.5 py-0.5 bg-gray-50 dark:bg-[#222] rounded text-[10px] font-bold text-gray-900 dark:text-white border border-gray-100 dark:border-[#333]">{totalsByCountry[country.code]}</div>
                                            </div>
                                        </td>
                                        {dateList.map(date => {
                                            const dateKey = getLocalDateKey(date);
                                            const count = matrixData[dateKey]?.[country.code] || 0;
                                            return (
                                                <td key={`${country.code}-${dateKey}`} onClick={() => handleCellClick(country.code, dateKey, count)} className="p-0 border-b border-r border-gray-100 dark:border-[#222] text-center relative h-8 matrix-cell cursor-pointer-cell">
                                                    <div className={`w-full h-full flex items-center justify-center transition-all duration-300 text-[11px] font-medium rounded-none relative z-0 ${getHeatColor(count)}`}>
                                                        {count > 0 && <span className="hidden xl:inline">{count}</span>}
                                                        {count > 0 && <span className="xl:hidden w-1.5 h-1.5 bg-black/30 dark:bg-white/30 rounded-full"></span>}
                                                    </div>
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))}
                                <tr className="bg-gray-50 dark:bg-[#161616]">
                                    <td className="px-3 py-1 border-t border-r border-gray-200 dark:border-[#333] bg-gray-100 dark:bg-[#222] sticky left-0 z-20 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                                        <div className="flex items-center justify-between h-full">
                                            <span className="font-black text-gray-900 dark:text-white text-[10px] uppercase tracking-wider">Всего</span>
                                            <span className="text-xs font-black text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2 py-0.5 rounded border border-blue-100 dark:border-blue-900/30">{grandTotal}</span>
                                        </div>
                                    </td>
                                    {dateList.map(date => {
                                        const dateKey = getLocalDateKey(date);
                                        const count = totalsByDate[dateKey] || 0;
                                        return (
                                            <td key={`total-${dateKey}`} className="p-0 border-t border-r border-gray-200 dark:border-[#333] text-center relative h-8 bg-gray-50 dark:bg-[#1c1c1c]">
                                                <div className="w-full h-full flex items-center justify-center text-[10px] font-bold text-gray-700 dark:text-gray-300">{count}</div>
                                            </td>
                                        )
                                    })}
                                </tr>
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            <GeoManagerModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} countriesList={countriesList} onUpdate={fetchCountries} />
            <DrillDownModal selectedCell={selectedCell} onClose={() => setSelectedCell(null)} />
        </div>
    );
};

// --- DRILL DOWN MODAL (ИСПРАВЛЕН) ---
const DrillDownModal = ({ selectedCell, onClose }) => {
    if (!selectedCell) return null;

    // Получаем переданные данные, включая реальный трафик (заявки)
    const { countryCode, countryName, countryEmoji, dateKey, count, traffic, transactions } = selectedCell;

    // Считаем конверсию: Продажи (count) / Заявки (traffic)
    const conversionRate = traffic > 0 ? ((count / traffic) * 100).toFixed(2) : 0;

    // Менеджер
    const managerName = transactions.length > 0 ? (transactions[0].manager || 'Не назначен') : "Не назначен";

    // Суммы
    const totalAmountEUR = transactions.reduce((sum, t) => sum + (Number(t.amountEUR) || 0), 0);
    // ✅ Сумма Local теперь считается по amountLocal
    const totalAmountOriginal = transactions.reduce((sum, t) => sum + (Number(t.amountLocal) || 0), 0);

    const formattedDate = new Date(dateKey).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric', weekday: 'long' });

    const getTimeString = (dateStr) => {
        if (!dateStr) return '--:--';
        try {
            const parts = dateStr.split(/[T ]/);
            if (parts.length > 1) return parts[1].slice(0, 5);
            return '--:--';
        } catch (e) { return '--:--'; }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={onClose}>
            <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }} className="bg-white dark:bg-[#111] w-full max-w-md rounded-xl border border-gray-200 dark:border-[#333] shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
                <div className="p-5 border-b border-gray-100 dark:border-[#222] bg-gray-50/50 dark:bg-[#161616] flex justify-between items-start">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="text-2xl">{countryEmoji}</span>
                            <h3 className="text-lg font-bold dark:text-white">{countryName} ({countryCode})</h3>
                        </div>
                        <p className="text-xs text-gray-500 capitalize font-medium">{formattedDate}</p>
                    </div>
                    <button onClick={onClose} className="p-1.5 hover:bg-gray-200 dark:hover:bg-[#222] rounded-full text-gray-500 transition-colors"><X size={18} /></button>
                </div>
                <div className="p-5 space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                        {/* Конверсия */}
                        <div className="p-3 bg-blue-50 dark:bg-blue-900/10 rounded-lg border border-blue-100 dark:border-blue-900/20">
                            <div className="text-[10px] text-blue-500 uppercase font-bold tracking-wider mb-1 flex items-center gap-1"><Activity size={10} /> Конверсия</div>
                            <div className="text-xl font-black text-gray-900 dark:text-white">{conversionRate}%</div>
                            {/* ✅ Исправлено: продаж / заявок */}
                            <div className="text-[10px] text-gray-400 mt-1">{count} продаж / {traffic} заявок</div>
                        </div>
                        <div className="p-3 bg-purple-50 dark:bg-purple-900/10 rounded-lg border border-purple-100 dark:border-purple-900/20">
                            <div className="text-[10px] text-purple-500 uppercase font-bold tracking-wider mb-1 flex items-center gap-1"><User size={10} /> Менеджер</div>
                            <div className="text-sm font-bold text-gray-900 dark:text-white mt-1 truncate" title={managerName}>{managerName}</div>
                            <div className="text-[10px] text-gray-400 mt-1">Ответственный</div>
                        </div>
                    </div>
                    <div className="p-4 bg-gray-50 dark:bg-[#1A1A1A] rounded-lg border border-gray-100 dark:border-[#222] flex items-center justify-between">
                        <div>
                            <div className="text-[10px] text-gray-400 uppercase font-bold mb-0.5">Сумма (EUR)</div>
                            <div className="text-lg font-bold text-gray-900 dark:text-white">€ {totalAmountEUR.toLocaleString('ru-RU', { maximumFractionDigits: 2 })}</div>
                        </div>
                        <div className="w-px h-8 bg-gray-200 dark:bg-[#333]"></div>
                        <div className="text-right">
                            {/* ✅ Убран знак доллара, добавлена иконка Coins */}
                            <div className="text-[10px] text-gray-400 uppercase font-bold mb-0.5">Сумма (Local)</div>
                            <div className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-1 justify-end">
                                <Coins size={14} className="text-gray-400" /> {totalAmountOriginal.toLocaleString('ru-RU', { maximumFractionDigits: 2 })}
                            </div>
                        </div>
                    </div>
                    {transactions.length > 0 && (
                        <div>
                            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Детализация чеков</div>
                            <div className="max-h-[150px] overflow-y-auto custom-scrollbar space-y-1 pr-1">
                                {transactions.map((t, idx) => (
                                    <div key={t.id || idx} className="flex justify-between items-center p-2 bg-white dark:bg-[#222] border border-gray-100 dark:border-[#333] rounded text-xs">
                                        <span className="font-mono text-gray-500 w-10">{getTimeString(t.transactionDate)}</span>
                                        <span className="font-bold dark:text-white flex-1 truncate px-2">{t.product || 'Не указан'}</span>
                                        <div className="text-right">
                                            <div className="font-mono font-bold">€{Number(t.amountEUR).toFixed(0)}</div>
                                            {/* ✅ Исправлено NaN: выводим число, если есть amountLocal */}
                                            <div className="text-[9px] text-gray-400">
                                                {t.amountLocal ? Number(t.amountLocal).toFixed(0) : '0'} loc
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </motion.div>
        </div>
    );
};

// ... GeoManagerModal без изменений ...
const GeoManagerModal = ({ isOpen, onClose, countriesList, onUpdate }) => {
    const [newGeoCode, setNewGeoCode] = useState('');
    const [activeTab, setActiveTab] = useState('list');
    const [loading, setLoading] = useState(false);
    if (!isOpen) return null;
    const handleAddGeo = async () => {
        if (!newGeoCode) return;
        const lookup = STATIC_GEO_LOOKUP[newGeoCode] || { name: newGeoCode, emoji: '🏳️' };
        setLoading(true);
        try {
            const { error } = await supabase.from('countries').insert([{ code: newGeoCode, name: lookup.name, emoji: lookup.emoji }]);
            if (error) { console.error(error); alert('Ошибка.'); } else { setNewGeoCode(''); await onUpdate(); setActiveTab('list'); }
        } finally { setLoading(false); }
    };
    const handleRemoveGeo = async (code) => {
        if (!window.confirm(`Удалить ${code}?`)) return;
        setLoading(true);
        try {
            const { error } = await supabase.from('countries').delete().eq('code', code);
            if (error) throw error;
            await onUpdate();
        } catch (error) { console.error(error); alert('Ошибка.'); } finally { setLoading(false); }
    };
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white dark:bg-[#111] w-full max-w-sm rounded-xl border border-gray-200 dark:border-[#333] shadow-2xl overflow-hidden">
                <div className="p-4 border-b border-gray-100 dark:border-[#222] flex justify-between items-center bg-gray-50/50 dark:bg-[#161616]">
                    <h3 className="text-sm font-bold dark:text-white flex items-center gap-2"><Globe size={16} className="text-blue-500" /> Управление ГЕО</h3>
                    <button onClick={onClose} className="p-1 hover:bg-gray-200 dark:hover:bg-[#222] rounded-full text-gray-500"><X size={16} /></button>
                </div>
                <div className="p-4">
                    <div className="flex bg-gray-100 dark:bg-[#1A1A1A] p-1 rounded-lg mb-4">
                        <button onClick={() => setActiveTab('list')} className={`flex-1 py-1 text-[10px] font-bold rounded-[5px] transition-all ${activeTab === 'list' ? 'bg-white dark:bg-[#333] shadow-sm text-black dark:text-white' : 'text-gray-500'}`}>Активные ({countriesList.length})</button>
                        <button onClick={() => setActiveTab('add')} className={`flex-1 py-1 text-[10px] font-bold rounded-[5px] transition-all ${activeTab === 'add' ? 'bg-white dark:bg-[#333] shadow-sm text-black dark:text-white' : 'text-gray-500'}`}>Добавить</button>
                    </div>
                    {activeTab === 'list' ? (
                        <div className="space-y-1.5 max-h-[250px] overflow-y-auto custom-scrollbar pr-1 relative">
                            {countriesList.map(country => (
                                <div key={country.code} className="flex items-center justify-between p-2.5 bg-gray-50 dark:bg-[#161616] rounded-lg border border-gray-100 dark:border-[#222] group">
                                    <div className="flex items-center gap-2.5"><span className="text-lg">{country.emoji}</span><div><div className="text-[11px] font-bold dark:text-white">{country.name}</div><div className="text-[9px] text-gray-400 font-mono">{country.code}</div></div></div>
                                    <button onClick={() => handleRemoveGeo(country.code)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-all"><Trash2 size={12} /></button>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="space-y-3">
                            <div><input type="text" value={newGeoCode} onChange={(e) => setNewGeoCode(e.target.value.toUpperCase())} placeholder="Код страны (XX)" maxLength={2} className="w-full bg-gray-50 dark:bg-[#1A1A1A] border border-gray-200 dark:border-[#333] rounded-lg px-3 py-2 text-xs font-mono font-bold outline-none focus:border-blue-500 dark:text-white uppercase" /></div>
                            <button onClick={handleAddGeo} disabled={newGeoCode.length !== 2 || loading} className="w-full py-2 bg-black dark:bg-white text-white dark:text-black rounded-lg font-bold text-[10px] hover:opacity-80 disabled:opacity-50 transition-all">Добавить</button>
                        </div>
                    )}
                </div>
            </motion.div>
        </div>
    );
};

export default GeoMatrixPage;