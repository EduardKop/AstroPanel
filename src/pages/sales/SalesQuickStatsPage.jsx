import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useAppStore } from '../../store/appStore';
import {
    Filter, X,
    Calendar as CalendarIcon, MessageCircle, MessageSquare, Phone, Clock
} from 'lucide-react';
import AstroLoadingStatus from '../../components/ui/AstroLoadingStatus';

const QUICK_STATS_LOADING_STEPS = [
    'Загружаем справочники',
    'Считаем трафик',
    'Собираем продажи',
    'Готовим сравнение',
];

// --- CONFIG ---
const FLAGS = {
    UA: '🇺🇦', PL: '🇵🇱', IT: '🇮🇹', HR: '🇭🇷',
    BG: '🇧🇬', CZ: '🇨🇿', RO: '🇷🇴', LT: '🇱🇹',
    TR: '🇹🇷', FR: '🇫🇷', PT: '🇵🇹', DE: '🇩🇪',
    US: '🇺🇸', ES: '🇪🇸', SK: '🇸🇰', HU: '🇭🇺',
    KZ: '🇰🇿', UZ: '🇺🇿', MD: '🇲🇩'
};

const GEO_NAMES = {
    UA: 'Украина', PL: 'Польша', IT: 'Италия', HR: 'Хорватия',
    BG: 'Болгария', CZ: 'Чехия', RO: 'Румыния', LT: 'Литва',
    TR: 'Турция', FR: 'Франция', PT: 'Португалия', DE: 'Германия',
    US: 'США', ES: 'Испания', SK: 'Словакия', HU: 'Венгрия',
    KZ: 'Казахстан', UZ: 'Узбекистан', MD: 'Молдова',
    AZ: 'Азербайджан', EE: 'Эстония', LV: 'Латвия', MX: 'Мексика',
    EG: 'Египет', BR: 'Бразилия', BE: 'Бельгия', GB: 'Великобритания',
    OTHER: 'Другое', Other: 'Другое'
};

const getFlag = (code) => FLAGS[code] || '🏳️';
const getGeoName = (code) => GEO_NAMES[code] || code;
const isIsoGeoCode = (code) => /^[A-Z]{2}$/.test(String(code || ''));

const getFlagIconUrl = (code) => {
    if (!isIsoGeoCode(code)) return '';
    return `https://cdn.jsdelivr.net/npm/flag-icons/flags/4x3/${String(code).toLowerCase()}.svg`;
};

const isHiddenGeoCode = (code) => {
    const value = String(code || '').trim().toUpperCase();
    return !value
        || value === 'OTHER'
        || value === 'UNKNOWN'
        || value === 'ДРУГОЕ'
        || value.includes('ТАРО')
        || value.includes('ДОП')
        || value.includes('EXTRA');
};

const getProjectShort = (name) => {
    if (!name) return '';
    const n = String(name).toLowerCase();
    if (n.includes('astro') || n.includes('астро')) return 'Ast';
    if (n.includes('taro') || n.includes('таро')) return 'Taro';
    if (n.includes('орган') || n.includes('organ')) return 'Org';
    return String(name).slice(0, 3);
};

const getProjectOrder = (name) => {
    if (!name) return 99;
    const n = String(name).toLowerCase();
    if (n.includes('astro') || n.includes('астро')) return 0;
    if (n.includes('taro') || n.includes('таро')) return 1;
    if (n.includes('орган') || n.includes('organ')) return 2;
    return 3;
};

const getGeoRowClass = (geo, idx) => {
    const projectName = String(geo.project?.name || '').toLowerCase();

    if (geo.isActive === false) {
        return 'bg-red-50/20 hover:bg-red-50/60 dark:bg-red-950/10 dark:hover:bg-red-950/20';
    }
    if (projectName.includes('таро') || projectName.includes('taro')) {
        return 'bg-fuchsia-50/20 hover:bg-fuchsia-50/60 dark:bg-fuchsia-950/10 dark:hover:bg-fuchsia-950/20';
    }
    if (projectName.includes('орган') || projectName.includes('organ')) {
        return 'bg-amber-50/20 hover:bg-amber-50/60 dark:bg-amber-950/10 dark:hover:bg-amber-950/20';
    }
    return idx % 2 === 0 ? 'hover:bg-gray-50 dark:hover:bg-[#1A1A1A]' : 'bg-gray-50/50 hover:bg-gray-100/60 dark:bg-[#0A0A0A] dark:hover:bg-[#1A1A1A]';
};

const getGeoAccentClass = (geo) => {
    const projectName = String(geo.project?.name || '').toLowerCase();
    if (geo.isActive === false) return 'border-l-[3px] border-l-red-400 dark:border-l-red-500';
    if (!geo.project) return '';
    if (projectName.includes('орган') || projectName.includes('organ')) return 'border-l-[3px] border-l-yellow-400 dark:border-l-yellow-500';
    if (projectName.includes('таро') || projectName.includes('taro')) return 'border-l-[3px] border-l-fuchsia-400 dark:border-l-fuchsia-500';
    return 'border-l-[3px] border-l-blue-400 dark:border-l-blue-500';
};

const getProjectTextClass = (geo) => {
    const projectName = String(geo.project?.name || '').toLowerCase();
    if (geo.isActive === false) return 'text-red-400 dark:text-red-500';
    if (projectName.includes('орган') || projectName.includes('organ')) return 'text-yellow-600 dark:text-yellow-400';
    if (projectName.includes('таро') || projectName.includes('taro')) return 'text-fuchsia-500 dark:text-fuchsia-400';
    return 'text-blue-500 dark:text-blue-400';
};

// Helper to format date dd.mm
const toDateStr = (date) => {
    if (!date) return '';
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${d}.${m}`;
};

// Helper YYYY-MM-DD. This page compares by UTC+0 calendar days.
const toYMD = (date) => {
    if (!date) return '';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const getUtcCalendarDate = (offsetDays = 0) => {
    const now = new Date();
    return new Date(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + offsetDays);
};

const getUtcDayStartIso = (date) => {
    if (!date) return '';
    return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0)).toISOString();
};

const getUtcDayEndIso = (date) => {
    if (!date) return '';
    return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999)).toISOString();
};

const getRoleDepartment = (role) => {
    if (role === 'Sales' || role === 'SeniorSales') return 'sales';
    if (role === 'Consultant') return 'consultant';
    if (role === 'SalesTaro' || role === 'SalesTaroNew') return 'taro';
    return null;
};

const matchesDepartment = (role, departments = []) => {
    if (!Array.isArray(departments) || departments.length === 0) return true;
    return departments.includes(getRoleDepartment(role));
};

const normalizeGeoCode = (value, fallback = 'Other') => {
    const raw = String(value || '').trim();
    if (!raw) return fallback;
    if (raw.toLowerCase() === 'other' || raw.toLowerCase() === 'unknown') return fallback;
    return raw.toUpperCase();
};

const splitGeoCodes = (value) => String(value || '')
    .split(',')
    .map(code => normalizeGeoCode(code, ''))
    .filter(Boolean);

const normalizeStatsByGeo = (stats = {}) => {
    const normalized = {};
    Object.entries(stats || {}).forEach(([geo, dates]) => {
        const geoCode = normalizeGeoCode(geo) || 'Other';
        if (!normalized[geoCode]) normalized[geoCode] = {};

        Object.entries(dates || {}).forEach(([dateKey, counts]) => {
            if (!normalized[geoCode][dateKey]) {
                normalized[geoCode][dateKey] = { all: 0, whatsapp: 0, direct: 0, comments: 0, unknown: 0 };
            }

            const target = normalized[geoCode][dateKey];
            Object.entries(counts || {}).forEach(([source, rawCount]) => {
                const count = Number(rawCount) || 0;
                if (target[source] !== undefined) target[source] += count;
                else target.unknown += count;
            });
        });
    });

    return normalized;
};

const getSourceCount = (counts, source) => {
    if (!counts) return 0;
    if (source === 'all') {
        const explicitAll = Number(counts.all);
        if (Number.isFinite(explicitAll) && explicitAll > 0) return explicitAll;
        return ['direct', 'comments', 'whatsapp', 'unknown'].reduce((sum, key) => sum + (Number(counts[key]) || 0), 0);
    }
    return Number(counts[source]) || 0;
};

const forEachYmdInRange = (startStr, endStr, callback) => {
    const parse = (value) => {
        const [year, month, day] = String(value || '').split('-').map(Number);
        if (!year || !month || !day) return null;
        return new Date(Date.UTC(year, month - 1, day));
    };

    const current = parse(startStr);
    const end = parse(endStr);
    if (!current || !end) return;

    while (current <= end) {
        callback(current.toISOString().slice(0, 10));
        current.setUTCDate(current.getUTCDate() + 1);
    }
};

const normalizeUserGeos = (geoValue) => {
    if (Array.isArray(geoValue)) return geoValue.map(code => normalizeGeoCode(code, '')).filter(Boolean);
    return splitGeoCodes(geoValue);
};

const CountryFlagIcon = ({ code, emoji, name, className = '', imgClassName = '', fallbackClassName = '' }) => {
    const [hasError, setHasError] = useState(false);
    const src = getFlagIconUrl(code);

    if (!src || hasError) {
        return <span className={`${fallbackClassName} ${className}`}>{emoji || getFlag(code)}</span>;
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

const QuickStatsGeoCell = ({ geo }) => {
    const project = geo.project;
    const projectShort = getProjectShort(project?.name);

    return (
        <div className="flex h-9 w-full min-w-[170px] items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2">
                <div className="flex h-[18px] w-[27px] shrink-0 items-center justify-center overflow-hidden rounded-[4px] border border-black/10 bg-white dark:border-white/10 dark:bg-white/10">
                    <CountryFlagIcon
                        code={geo.geo}
                        emoji={geo.flag}
                        name={geo.name}
                        imgClassName="h-full w-full object-cover"
                        fallbackClassName="text-[16px] leading-none"
                    />
                </div>

                <div className="flex min-w-0 items-center gap-1.5">
                    <span className={`truncate text-xs font-bold ${geo.isActive === false ? 'text-red-500 dark:text-red-400' : 'text-gray-900 dark:text-gray-200'}`}>
                        {geo.name}
                    </span>
                    {projectShort && (
                        <span className={`shrink-0 text-[8px] font-bold ${getProjectTextClass(geo)}`}>
                            {projectShort}
                        </span>
                    )}
                </div>
            </div>

            <div className="shrink-0 rounded bg-gray-50 px-1.5 py-0.5 font-mono text-[10px] font-bold text-gray-900 dark:bg-[#222] dark:text-white">
                {geo.geo}
            </div>
        </div>
    );
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

const ComparisonModeButtons = ({ activeTab, setActiveTab }) => (
    <div className="flex bg-gray-200 dark:bg-[#1A1A1A] p-0.5 rounded-[6px] h-[34px] items-center w-full sm:w-auto justify-center">
        <button
            onClick={() => setActiveTab('general')}
            className={`px-2.5 h-full rounded-[4px] text-[10px] font-bold transition-all flex-1 sm:flex-none whitespace-nowrap ${activeTab === 'general' ? 'bg-white dark:bg-[#333] text-black dark:text-white shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
        >
            Общие
        </button>
        <button
            onClick={() => setActiveTab('time')}
            className={`px-2.5 h-full rounded-[4px] text-[10px] font-bold transition-all flex items-center justify-center gap-1 flex-1 sm:flex-none whitespace-nowrap ${activeTab === 'time' ? 'bg-white dark:bg-[#333] text-black dark:text-white shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
        >
            <Clock size={10} />
            По времени (Сегодня)
        </button>
    </div>
);

const DepartmentFilterButtons = ({ filters, setFilters }) => {
    const departments = filters.department || [];
    const toggle = (key) => {
        setFilters(prev => {
            const current = prev.department || [];
            return {
                ...prev,
                department: current.includes(key) ? current.filter(item => item !== key) : [...current, key],
            };
        });
    };

    return (
        <div className="flex bg-gray-200 dark:bg-[#1A1A1A] p-0.5 rounded-[6px] h-[34px] items-center w-full sm:w-auto justify-center">
            <button
                onClick={() => setFilters(prev => ({ ...prev, department: [] }))}
                className={`px-2.5 h-full rounded-[4px] text-[10px] font-bold transition-all flex-1 sm:flex-none whitespace-nowrap ${departments.length === 0 ? 'bg-white dark:bg-[#333] text-black dark:text-white shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
            >
                Все
            </button>
            <button
                onClick={() => toggle('sales')}
                className={`px-2.5 h-full rounded-[4px] text-[10px] font-bold transition-all flex-1 sm:flex-none whitespace-nowrap ${departments.includes('sales') ? 'bg-white dark:bg-[#333] text-black dark:text-white shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
            >
                ОП
            </button>
            <button
                onClick={() => toggle('consultant')}
                className={`px-2.5 h-full rounded-[4px] text-[10px] font-bold transition-all flex-1 sm:flex-none whitespace-nowrap ${departments.includes('consultant') ? 'bg-white dark:bg-[#333] text-black dark:text-white shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
            >
                Конс.
            </button>
            <button
                onClick={() => toggle('taro')}
                className={`px-2.5 h-full rounded-[4px] text-[10px] font-bold transition-all flex-1 sm:flex-none whitespace-nowrap ${departments.includes('taro') ? 'bg-white dark:bg-[#333] text-purple-600 dark:text-purple-400 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
            >
                Таро
            </button>
        </div>
    );
};

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
    const [viewDate, setViewDate] = useState(startDate || getUtcCalendarDate());
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

    const isToday = (date) => isSameDay(date, getUtcCalendarDate());

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

    const setYesterday = () => { const y = getUtcCalendarDate(-1); onChange([y, y]); setIsOpen(false); };
    const setTodayFunc = () => { const t = getUtcCalendarDate(); onChange([t, t]); setIsOpen(false); };
    const setLastWeek = () => {
        const today = getUtcCalendarDate();
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
        const today = getUtcCalendarDate();
        const dayOfWeek = today.getDay();
        const monday = new Date(today);
        monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);
        onChange([monday, sunday]);
        setIsOpen(false);
    };
    const setLastMonth = () => {
        const today = getUtcCalendarDate();
        const firstDay = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const lastDay = new Date(today.getFullYear(), today.getMonth(), 0);
        onChange([firstDay, lastDay]);
        setIsOpen(false);
    };
    const setThisMonth = () => {
        const today = getUtcCalendarDate();
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
        countries,
        projects,
        fetchReferenceData
    } = useAppStore();
    const loadSeqRef = useRef(0);
    const [pageLoading, setPageLoading] = useState(true);
    const [loadingStep, setLoadingStep] = useState(0);

    // Period 1 (left column)
    const [period1, setPeriod1] = useState(() => {
        const yesterday = getUtcCalendarDate(-1);
        return [yesterday, yesterday];  // Default: yesterday UTC
    });
    const [period1Start, period1End] = period1;

    // Period 2 (right column)
    const [period2, setPeriod2] = useState(() => {
        const today = getUtcCalendarDate();
        return [today, today];  // Default: today UTC
    });
    const [period2Start, period2End] = period2;

    const [filters, setFilters] = useState({ source: 'all', department: ['sales'] });
    const [showMobileFilters, setShowMobileFilters] = useState(false);

    // TABS: 'general' | 'time'
    const [activeTab, setActiveTab] = useState('time');

    // TIME COMPARISON STATE
    // Period 2 is ALWAYS Today (00:00 - Now UTC)
    // Period 1 is Selectable Date (00:00 - Same Time as Now UTC)
    const [timeComparisonDate, setTimeComparisonDate] = useState(() => {
        return getUtcCalendarDate(-1);
    });

    // FETCH LOGIC
    useEffect(() => {
        const seq = ++loadSeqRef.current;
        const departments = filters.department || [];

        const load = async () => {
            setPageLoading(true);
            setLoadingStep(0);

            try {
                if (managers.length === 0 || schedules.length === 0 || countries.length === 0 || projects.length === 0) {
                    await fetchReferenceData();
                }
                if (seq !== loadSeqRef.current) return;

                setLoadingStep(1);
                if (activeTab === 'general') {
                    const allDates = [period1Start, period1End, period2Start, period2End].filter(Boolean);
                    if (allDates.length === 0) return;

                    const minDate = new Date(Math.min(...allDates.map(d => d.getTime())));
                    const maxDate = new Date(Math.max(...allDates.map(d => d.getTime())));

                    const isoStart = getUtcDayStartIso(minDate);
                    const isoEnd = getUtcDayEndIso(maxDate);

                    await Promise.all([
                        fetchTrafficStats(isoStart, isoEnd),
                        fetchSalesStats(isoStart, isoEnd, departments),
                    ]);
                } else if (timeComparisonDate) {
                    const now = new Date();
                    const todayStart = new Date(Date.UTC(
                        now.getUTCFullYear(),
                        now.getUTCMonth(),
                        now.getUTCDate(),
                        0,
                        0,
                        0,
                        0
                    ));
                    const timeDiff = now.getTime() - todayStart.getTime();
                    const p1Start = new Date(Date.UTC(
                        timeComparisonDate.getFullYear(),
                        timeComparisonDate.getMonth(),
                        timeComparisonDate.getDate(),
                        0,
                        0,
                        0,
                        0
                    ));
                    const p1End = new Date(p1Start.getTime() + timeDiff);

                    await Promise.all([
                        fetchTrafficStatsTimeComparison(p1Start.toISOString(), p1End.toISOString(), todayStart.toISOString(), now.toISOString()),
                        fetchSalesStatsTimeComparison(p1Start.toISOString(), p1End.toISOString(), todayStart.toISOString(), now.toISOString(), departments),
                    ]);
                }

                if (seq !== loadSeqRef.current) return;
                setLoadingStep(3);
            } finally {
                if (seq === loadSeqRef.current) {
                    setPageLoading(false);
                }
            }
        };

        load();
    }, [
        activeTab,
        timeComparisonDate,
        period1Start,
        period1End,
        period2Start,
        period2End,
        filters.department,
        managers.length,
        schedules.length,
        countries.length,
        projects.length,
        fetchReferenceData,
        fetchSalesStats,
        fetchTrafficStats,
        fetchSalesStatsTimeComparison,
        fetchTrafficStatsTimeComparison
    ]);

    const selectedDepartments = filters.department || [];
    const countryLookup = useMemo(() => {
        const map = new Map();
        (countries || []).forEach(country => {
            map.set(normalizeGeoCode(country.code), country);
        });
        return map;
    }, [countries]);
    const projectsById = useMemo(() => {
        const map = new Map();
        (projects || []).forEach(project => {
            map.set(project.id, project);
        });
        return map;
    }, [projects]);

    const normalizedSalesStats = useMemo(() => normalizeStatsByGeo(salesStats), [salesStats]);
    const normalizedTrafficStats = useMemo(() => normalizeStatsByGeo(trafficStats), [trafficStats]);

    const uniqueGeos = useMemo(() => {
        const geos = new Set();
        (countries || []).forEach(country => {
            const code = normalizeGeoCode(country.code, '');
            if (code && isIsoGeoCode(code) && !isHiddenGeoCode(code)) {
                geos.add(code);
            }
        });
        return Array.from(geos);
    }, [countries]);

    // ✅ Filter GEOs based on User's assigned GEOs
    const filteredGeos = useMemo(() => {
        if (!user || ['Admin', 'C-level', 'SeniorSales'].includes(user.role)) {
            return uniqueGeos;
        }
        const userGeos = normalizeUserGeos(user.geo);
        return uniqueGeos.filter(g => userGeos.includes(g));
    }, [uniqueGeos, user]);

    const geoData = useMemo(() => {
        // Determine Dates based on Tab
        let p1StartStr, p1EndStr, p2StartStr, p2EndStr;

        if (activeTab === 'general') {
            p1StartStr = period1Start ? toYMD(period1Start) : toYMD(getUtcCalendarDate(-1));
            p1EndStr = period1End ? toYMD(period1End) : p1StartStr;
            p2StartStr = period2Start ? toYMD(period2Start) : toYMD(getUtcCalendarDate());
            p2EndStr = period2End ? toYMD(period2End) : p2StartStr;
        } else {
            // TIME MODE:
            // P1 is timeComparisonDate
            p1StartStr = timeComparisonDate ? toYMD(timeComparisonDate) : toYMD(getUtcCalendarDate(-1));
            p1EndStr = p1StartStr;
            // P2 is the current UTC day
            p2StartStr = toYMD(getUtcCalendarDate());
            p2EndStr = p2StartStr;
        }

        const managerMap = managers.reduce((acc, m) => ({ ...acc, [m.id]: m.name }), {});
        // Create a set of visible manager IDs
        const visibleManagerIds = new Set(
            managers
                .filter(m => m.show_in_schedule !== false && matchesDepartment(m.role, selectedDepartments))
                .map(m => m.id)
        );

        const getScheduledManagers = (sDateStart, sDateEnd, sGeo) => {
            const foundIds = new Set();
            schedules.forEach(s => {
                // Check if manager is visible and matches criteria
                if (s.date >= sDateStart && s.date <= sDateEnd && splitGeoCodes(s.geo_code).includes(sGeo)) {
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

        return filteredGeos.map(rawGeo => {
            const geo = normalizeGeoCode(rawGeo);
            const country = countryLookup.get(geo);
            if (isHiddenGeoCode(geo) || !country) return null;

            // Helper to aggregate stats for a range of dates
            const aggregate = (startStr, endStr) => {
                let sales = 0;
                let traffic = 0;

                forEachYmdInRange(startStr, endStr, (dStr) => {
                    // Sum Sales
                    const salesCounts = normalizedSalesStats[geo]?.[dStr];
                    sales += getSourceCount(salesCounts, filters.source);

                    // Sum Traffic
                    const trafficCounts = normalizedTrafficStats[geo]?.[dStr];
                    traffic += getSourceCount(trafficCounts, filters.source);
                });

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
                previous.startDate = getUtcCalendarDate();
                previous.endDate = getUtcCalendarDate();
            }

            const currentManagerName = formatManagerName(getScheduledManagers(p1StartStr, p1EndStr, geo));
            const previousManagerName = formatManagerName(getScheduledManagers(p2StartStr, p2EndStr, geo));

            const project = country?.project_id ? projectsById.get(country.project_id) : null;

            return {
                geo,
                flag: country?.emoji || getFlag(geo),
                name: country?.name || getGeoName(geo),
                country,
                project,
                isActive: country?.is_active !== false,
                currentManagerName,
                previousManagerName,
                current,
                previous
            };
        }).filter(Boolean).sort((a, b) => {
            if (a.isActive !== b.isActive) return a.isActive ? -1 : 1;

            const orderA = getProjectOrder(a.project?.name);
            const orderB = getProjectOrder(b.project?.name);
            if (orderA !== orderB) return orderA - orderB;

            const salesA = a.current.sales + a.previous.sales;
            const salesB = b.current.sales + b.previous.sales;
            if (salesA !== salesB) return salesB - salesA;

            const trafficA = a.current.traffic + a.previous.traffic;
            const trafficB = b.current.traffic + b.previous.traffic;
            if (trafficA !== trafficB) return trafficB - trafficA;

            return a.name.localeCompare(b.name, 'ru');
        });
    }, [filteredGeos, period1Start, period1End, period2Start, period2End, activeTab, timeComparisonDate, filters, normalizedSalesStats, schedules, normalizedTrafficStats, managers, selectedDepartments, countryLookup, projectsById]);

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
        const today = getUtcCalendarDate();
        const yesterday = getUtcCalendarDate(-1);
        setPeriod1([yesterday, yesterday]);
        setPeriod2([today, today]);
        setTimeComparisonDate(yesterday); // Reset time comparison date too
        setActiveTab('time');
        setFilters({ source: 'all', department: ['sales'] });
        setShowMobileFilters(false);
    };

    const period1LabelDate = activeTab === 'time' ? timeComparisonDate : period1Start;
    const period1LabelEndDate = activeTab === 'time' ? timeComparisonDate : period1End;
    const period2LabelDate = activeTab === 'time' ? getUtcCalendarDate() : period2Start;
    const period2LabelEndDate = activeTab === 'time' ? getUtcCalendarDate() : period2End;
    const formatPeriodLabel = (start, end) => {
        if (!start) return '—';
        if (end && start.getTime() !== end.getTime()) return `${toDateStr(start)} - ${toDateStr(end)}`;
        return toDateStr(start);
    };

    if (pageLoading) {
        return (
            <AstroLoadingStatus
                variant="page"
                title="Загружаем сравнительный анализ"
                message="Собираем трафик, продажи и расписание"
                steps={QUICK_STATS_LOADING_STEPS}
                activeStep={loadingStep}
                className="min-h-[calc(100vh-120px)]"
            />
        );
    }



    return (
        <div className="pb-10 w-full max-w-full overflow-x-hidden">
            {/* HEADER */}
            <div className="sticky top-0 z-20 bg-[#F5F5F5] dark:bg-[#0A0A0A] -mx-3 px-3 md:-mx-6 md:px-6 py-3 border-b border-transparent flex flex-col gap-3">
                <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-3">
                    <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-2 w-full xl:w-auto">
                        <SourceFilterButtons filters={filters} setFilters={setFilters} />
                        <ComparisonModeButtons activeTab={activeTab} setActiveTab={setActiveTab} />
                        <DepartmentFilterButtons filters={filters} setFilters={setFilters} />

                        <button
                            onClick={() => setShowMobileFilters(!showMobileFilters)}
                            className="md:hidden w-full bg-white dark:bg-[#111] border border-gray-200 dark:border-[#333] text-gray-700 dark:text-gray-200 py-1.5 px-3 rounded-[6px] text-xs font-medium hover:border-gray-400 dark:hover:border-[#555] transition-colors text-left flex justify-between items-center h-[34px]"
                        >
                            <span className="flex items-center gap-2">
                                <Filter size={12} />
                                <span>Периоды</span>
                            </span>
                        </button>
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
                                        {toDateStr(getUtcCalendarDate())} (UTC сейчас)
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

                {showMobileFilters && (
                    <div className="md:hidden space-y-3 p-3 bg-white dark:bg-[#111] border border-gray-200 dark:border-[#333] rounded-lg animate-in fade-in slide-in-from-top-2 duration-200">
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
                                        {toDateStr(getUtcCalendarDate())} (UTC сейчас)
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

            {/* SUMMARY TABLE */}
            <div className="mt-4 overflow-x-auto rounded-lg border border-gray-200 dark:border-[#333] bg-white dark:bg-[#111]">
                <table className="w-full text-[10px]">
                    <thead>
                        <tr className="border-b border-gray-200 dark:border-[#333]">
                            <th rowSpan={2} className="sticky left-0 z-10 w-[190px] min-w-[190px] bg-gray-50 px-3 py-2 text-left font-bold text-gray-600 dark:bg-[#0A0A0A] dark:text-gray-400">ГЕО</th>
                            <th colSpan={5} className="px-3 py-2 text-center font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 border-l border-gray-200 dark:border-[#333]">
                                П1: {formatPeriodLabel(period1LabelDate, period1LabelEndDate)}
                            </th>
                            <th colSpan={10} className="px-3 py-2 text-center font-bold text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 border-l border-gray-200 dark:border-[#333]">
                                П2: {formatPeriodLabel(period2LabelDate, period2LabelEndDate)}
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
                                <tr key={geo.geo} className={`border-b border-gray-100 dark:border-[#222] ${getGeoRowClass(geo, idx)}`}>
                                    <td className={`sticky left-0 z-10 w-[190px] min-w-[190px] bg-inherit px-3 py-1 align-middle shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] ${getGeoAccentClass(geo)}`}>
                                        <QuickStatsGeoCell geo={geo} />
                                    </td>
                                    {/* Period 1 data */}
                                    <td className="border-l border-gray-100 px-2 py-1.5 text-center font-medium text-blue-600 dark:border-[#222] dark:text-blue-400">{geo.current.traffic}</td>
                                    <td className="px-2 py-1.5 text-center font-bold text-blue-600 dark:text-blue-400">{geo.current.sales}</td>
                                    <td className="px-2 py-1.5 text-center text-blue-600 dark:text-blue-400">{geo.current.conversion.toFixed(1)}%</td>
                                    <td className="px-2 py-1.5 text-center text-gray-400">—</td>
                                    <td className="px-2 py-1.5 text-center text-gray-400">—</td>
                                    {/* Period 2 data with diffs */}
                                    <td className="border-l border-gray-100 px-2 py-1.5 text-center font-medium text-gray-600 dark:border-[#222] dark:text-gray-300">{geo.previous.traffic}</td>
                                    <td className={`px-1 py-1.5 text-center text-[10px] font-bold ${getDiffClass(trafficDiff)}`}>{formatDiff(trafficDiff)}</td>
                                    <td className="px-2 py-1.5 text-center font-bold text-gray-600 dark:text-gray-300">{geo.previous.sales}</td>
                                    <td className={`px-1 py-1.5 text-center text-[10px] font-bold ${getDiffClass(salesDiff)}`}>{formatDiff(salesDiff)}</td>
                                    <td className="px-2 py-1.5 text-center text-gray-600 dark:text-gray-300">{geo.previous.conversion.toFixed(1)}%</td>
                                    <td className={`px-1 py-1.5 text-center text-[10px] font-bold ${getDiffClass(convDiff)}`}>{formatDiff(convDiff, true)}</td>
                                    <td className="px-2 py-1.5 text-center text-gray-400">—</td>
                                    <td className="px-1 py-1.5 text-center text-[10px] text-gray-400">—</td>
                                    <td className="px-2 py-1.5 text-center text-gray-400">—</td>
                                    <td className="px-1 py-1.5 text-center text-[10px] text-gray-400">—</td>
                                </tr>
                            );
                        })}
                    </tbody>
                    {/* TOTAL FOOTER */}
                    <tfoot className="sticky bottom-0 z-10 border-t-2 border-gray-200 bg-gray-100 text-[10px] font-bold dark:border-[#333] dark:bg-[#1A1A1A]">
                        <tr>
                            <td className="sticky left-0 z-10 w-[190px] min-w-[190px] bg-inherit px-3 py-2 text-gray-900 dark:text-white">ВСЕГО</td>
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
