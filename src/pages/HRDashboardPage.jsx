import React, { useState, useMemo } from 'react';
import { useAppStore } from '../store/appStore';
import {
    Users, UserCheck, UserPlus, Copy, Check, Calendar, Globe, Briefcase,
    Search, ChevronDown, Sparkles, FlaskConical, BadgeCheck
} from 'lucide-react';

const FLAGS = {
    UA: '🇺🇦', PL: '🇵🇱', IT: '🇮🇹', HR: '🇭🇷',
    BG: '🇧🇬', CZ: '🇨🇿', RO: '🇷🇴', LT: '🇱🇹',
    TR: '🇹🇷', FR: '🇫🇷', PT: '🇵🇹', DE: '🇩🇪',
    US: '🇺🇸', ES: '🇪🇸', SK: '🇸🇰', HU: '🇭🇺',
    GE: '🇬🇪', AZ: '🇦🇿', LV: '🇱🇻', EE: '🇪🇪',
    MX: '🇲🇽', BR: '🇧🇷', GR: '🇬🇷', UZ: '🇺🇿',
};

// ── Статус по стажу ────────────────────────────────────────────────────────────
const getEmploymentStatus = (mgr) => {
    const dateStr = mgr.started_at || mgr.created_at;
    if (!dateStr) return null;
    const days = Math.ceil(Math.abs(new Date() - new Date(dateStr)) / (1000 * 3600 * 24));
    if (days <= 7) return { key: 'intern', label: 'Стажер', days, icon: Sparkles, color: 'violet' };
    if (days <= 30) return { key: 'probation', label: 'Исп. период', days, icon: FlaskConical, color: 'amber' };
    return { key: 'employee', label: 'Сотрудник', days, icon: BadgeCheck, color: 'emerald' };
};

const STATUS_SECTORS = [
    {
        key: 'intern',
        title: 'Стажер',
        subtitle: 'до 7 дней включительно',
        icon: Sparkles,
        bgColor: 'bg-violet-500',
        rowBg: 'bg-violet-50 dark:bg-violet-900/10 border-violet-200 dark:border-violet-800/30',
        avatarBg: 'bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 border-violet-200 dark:border-violet-700/40',
        tenureColor: 'text-violet-600 dark:text-violet-400',
        badgeBg: 'bg-violet-500/10 text-violet-600 dark:text-violet-400',
    },
    {
        key: 'probation',
        title: 'Испытательный период',
        subtitle: 'от 8 до 30 дней включительно',
        icon: FlaskConical,
        bgColor: 'bg-amber-500',
        rowBg: 'bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800/30',
        avatarBg: 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-700/40',
        tenureColor: 'text-amber-600 dark:text-amber-400',
        badgeBg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
    },
    {
        key: 'employee',
        title: 'Сотрудник',
        subtitle: 'более 30 дней',
        icon: BadgeCheck,
        bgColor: 'bg-emerald-500',
        rowBg: 'bg-white dark:bg-[#111] border-gray-200 dark:border-[#222]',
        avatarBg: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-700/40',
        tenureColor: 'text-gray-900 dark:text-white',
        badgeBg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    },
];

const getInitials = (name) => {
    if (!name) return '?';
    return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
};

const formatBirthday = (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
};

const formatStartDate = (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' });
};

const formatTenure = (days) => {
    if (days >= 365) {
        const years = Math.floor(days / 365);
        const months = Math.floor((days % 365) / 30);
        return `${years} г. ${months > 0 ? `${months} мес.` : ''}`;
    }
    if (days >= 30) return `${Math.floor(days / 30)} мес.`;
    return `${days} дн.`;
};

const getDaysUntilBirthday = (birthDateStr) => {
    if (!birthDateStr) return null;
    const birthDate = new Date(birthDateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let nextBirthday = new Date(today.getFullYear(), birthDate.getMonth(), birthDate.getDate());
    if (nextBirthday < today) nextBirthday.setFullYear(today.getFullYear() + 1);
    return Math.ceil((nextBirthday - today) / (1000 * 60 * 60 * 24));
};

const CopyButton = ({ text }) => {
    const [copied, setCopied] = useState(false);
    const handleCopy = async () => {
        try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); }
        catch { /* ignore */ }
    };
    return (
        <button onClick={handleCopy} className="p-0.5 hover:bg-gray-200 dark:hover:bg-[#333] rounded transition-colors" title="Скопировать">
            {copied ? <Check size={10} className="text-emerald-500" /> : <Copy size={10} className="text-gray-400" />}
        </button>
    );
};

const GRID_COLS = "grid grid-cols-[40px_minmax(180px,1fr)_110px_100px_100px_80px_90px_80px] gap-3 items-center";

const ColumnHeaders = ({ sortOrder, onSortChange }) => (
    <div className={`px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 ${GRID_COLS}`}>
        <div />
        <div>Сотрудник / Telegram</div>
        <div>ГЕО</div>
        <div>Роль</div>
        <div>Начал работать</div>
        <div
            className="text-center cursor-pointer hover:text-violet-500 transition-colors select-none flex items-center justify-center gap-1"
            onClick={onSortChange}
            title="Сортировать по стажу"
        >
            Стаж
            <ChevronDown size={10} className={`transform transition-transform ${sortOrder === 'asc' ? 'rotate-180' : ''}`} />
        </div>
        <div className="text-center">До ДР</div>
        <div className="text-right">Д.Р.</div>
    </div>
);

const EmployeeCard = ({ employee, sector, formattedTenure, daysUntilBirthday }) => {
    const st = getEmploymentStatus(employee);
    return (
        <div className={`px-4 py-3 rounded-lg border transition-all hover:shadow-sm ${GRID_COLS} ${sector.rowBg}`}>
            {/* Avatar */}
            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold shrink-0 border ${sector.avatarBg}`}>
                {employee.avatar_url
                    ? <img src={employee.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                    : getInitials(employee.name)
                }
            </div>

            {/* Name + Telegram */}
            <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                    <span className="font-bold text-sm text-gray-900 dark:text-white truncate">{employee.name}</span>
                    {st && (
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${sector.badgeBg}`}>
                            {st.label}
                        </span>
                    )}
                </div>
                {employee.telegram_username && (
                    <div className="flex items-center gap-1 mt-0.5">
                        <span className="text-[11px] text-gray-400 font-mono truncate">{employee.telegram_username}</span>
                        <CopyButton text={employee.telegram_username} />
                    </div>
                )}
            </div>

            {/* GEO */}
            <div className="flex flex-wrap gap-1">
                {(employee.geo || []).slice(0, 3).map(g => (
                    <span key={g} className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-[#222] border border-gray-200 dark:border-[#333] text-[10px] font-bold text-gray-600 dark:text-gray-400">
                        {FLAGS[g] || ''} {g}
                    </span>
                ))}
                {(employee.geo || []).length > 3 && (
                    <span className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-[#222] border border-gray-200 dark:border-[#333] text-[10px] font-bold text-gray-500">
                        +{(employee.geo || []).length - 3}
                    </span>
                )}
            </div>

            {/* Role */}
            <div className="flex justify-start">
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${employee.role === 'SalesTaro' ? 'bg-orange-100 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400' :
                    employee.role === 'SalesTaroNew' ? 'bg-fuchsia-100 dark:bg-fuchsia-900/20 text-fuchsia-600 dark:text-fuchsia-400' :
                    employee.role === 'Consultant' ? 'bg-purple-100 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400' :
                        employee.role === 'SeniorSales' ? 'bg-sky-100 dark:bg-sky-900/20 text-sky-600 dark:text-sky-400' :
                            (employee.role === 'SMM' || employee.role === 'SeniorSMM') ? 'bg-pink-100 dark:bg-pink-900/20 text-pink-600 dark:text-pink-400' :
                                'bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                    }`}>
                    {employee.role}
                </span>
            </div>

            {/* Start Date */}
            <div className="text-[11px] text-gray-500 dark:text-gray-400 font-medium whitespace-nowrap">
                {formatStartDate(employee.started_at || employee.created_at)}
            </div>

            {/* Tenure */}
            <div className="flex flex-col items-center justify-center">
                <span className={`text-xs font-black whitespace-nowrap ${sector.tenureColor}`}>
                    {formattedTenure}
                </span>
            </div>

            {/* Days until Birthday */}
            <div className="text-center">
                {daysUntilBirthday !== null && (
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${daysUntilBirthday <= 14 ? 'bg-pink-100 text-pink-600 dark:bg-pink-900/30 dark:text-pink-400' : 'text-gray-400 bg-gray-100 dark:bg-[#222] dark:text-gray-500'}`}>
                        {daysUntilBirthday === 0 ? 'Сегодня' : `${daysUntilBirthday} дн.`}
                    </span>
                )}
            </div>

            {/* Birthday */}
            <div className="flex items-center gap-1 justify-end">
                <Calendar size={10} className="text-gray-400" />
                <span className="text-[11px] text-gray-500 dark:text-gray-400 whitespace-nowrap">{formatBirthday(employee.birth_date)}</span>
            </div>
        </div>
    );
};

const SectorHeader = ({ sector, count }) => {
    const Icon = sector.icon;
    return (
        <div className="flex items-center gap-2 mb-3 mt-6">
            <div className={`w-7 h-7 rounded-lg ${sector.bgColor} flex items-center justify-center`}>
                <Icon size={14} className="text-white" />
            </div>
            <h3 className="font-bold text-sm text-gray-900 dark:text-white">
                {sector.title}
                <span className="ml-1.5 text-[11px] font-medium text-gray-400 normal-case">— {sector.subtitle}</span>
            </h3>
            <span className="px-2 py-0.5 rounded-full bg-gray-100 dark:bg-[#222] text-[10px] font-bold text-gray-500">{count}</span>
        </div>
    );
};

// Roles shown in HR Dashboard
const HR_ROLES = ['Sales', 'SalesTaro', 'SalesTaroNew', 'SeniorSales', 'Consultant', 'SMM'];

const HRDashboardPage = () => {
    const { managers } = useAppStore();
    const [search, setSearch] = useState('');
    const [roleFilter, setRoleFilter] = useState('all');
    const [sortOrder, setSortOrder] = useState('asc');

    const { sectors, stats } = useMemo(() => {
        let employees = (managers || []).filter(m =>
            m.status === 'active' && HR_ROLES.includes(m.role)
        );

        if (roleFilter !== 'all') {
            employees = employees.filter(m => m.role === roleFilter);
        }

        if (search.trim()) {
            const q = search.toLowerCase();
            employees = employees.filter(m =>
                m.name?.toLowerCase().includes(q) ||
                m.telegram_username?.toLowerCase().includes(q)
            );
        }

        // Distribute into three buckets
        const buckets = { intern: [], probation: [], employee: [] };

        employees.forEach(emp => {
            const st = getEmploymentStatus(emp);
            const key = st ? st.key : 'employee'; // if no date — treat as employee
            buckets[key].push({
                ...emp,
                days: st ? st.days : 0,
                daysUntilBirthday: getDaysUntilBirthday(emp.birth_date),
            });
        });

        const sortFn = (a, b) => sortOrder === 'asc' ? a.days - b.days : b.days - a.days;
        buckets.intern.sort(sortFn);
        buckets.probation.sort(sortFn);
        buckets.employee.sort(sortFn);

        return {
            sectors: buckets,
            stats: {
                total: employees.length,
                intern: buckets.intern.length,
                probation: buckets.probation.length,
                employee: buckets.employee.length,
                consultant: employees.filter(m => m.role === 'Consultant').length,
                sales: employees.filter(m => m.role === 'Sales').length,
                smm: employees.filter(m => m.role === 'SMM').length,
            }
        };
    }, [managers, search, roleFilter, sortOrder]);

    const toggleSort = () => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');

    const totalVisible = stats.intern + stats.probation + stats.employee;

    return (
        <div className="animate-in fade-in zoom-in duration-300 pb-10 font-sans max-w-5xl mx-auto">

            {/* HEADER */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div>
                    <h2 className="text-xl font-bold dark:text-white flex items-center gap-2 tracking-tight">
                        <Users className="text-violet-500" size={20} />
                        HR Дашборд
                    </h2>
                    <p className="text-gray-500 dark:text-gray-400 text-xs mt-1 font-medium">
                        Sales, SalesTaro, SalesTaroNew, SeniorSales, Consultant, SMM — обзор сотрудников по стажу
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    {/* Search */}
                    <div className="relative">
                        <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Поиск..."
                            className="pl-8 pr-3 py-1.5 bg-white dark:bg-[#111] border border-gray-200 dark:border-[#333] rounded-[6px] text-xs focus:outline-none focus:border-violet-400 w-48 h-[34px]"
                        />
                    </div>

                    {/* Role Filter */}
                    <div className="relative">
                        <select
                            value={roleFilter}
                            onChange={(e) => setRoleFilter(e.target.value)}
                            className="appearance-none bg-white dark:bg-[#111] border border-gray-200 dark:border-[#333] text-gray-700 dark:text-gray-200 py-1.5 pl-3 pr-8 rounded-[6px] text-xs font-medium focus:outline-none cursor-pointer h-[34px]"
                        >
                            <option value="all">Все роли</option>
                            <option value="Sales">Sales</option>
                            <option value="SalesTaro">SalesTaro</option>
                            <option value="SalesTaroNew">SalesTaroNew</option>
                            <option value="SeniorSales">SeniorSales</option>
                            <option value="Consultant">Consultant</option>
                            <option value="SMM">SMM</option>
                        </select>
                        <ChevronDown size={10} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    </div>
                </div>
            </div>

            {/* STATS CARDS */}
            <div className="grid grid-cols-3 md:grid-cols-7 gap-3 mb-6">
                <div className="col-span-1 bg-white dark:bg-[#111] rounded-lg border border-gray-200 dark:border-[#222] p-3">
                    <div className="text-[10px] text-gray-400 uppercase font-bold mb-1">Всего</div>
                    <div className="text-2xl font-black text-gray-900 dark:text-white">{stats.total}</div>
                </div>
                <div className="col-span-1 bg-violet-50 dark:bg-violet-900/10 rounded-lg border border-violet-200 dark:border-violet-800/30 p-3">
                    <div className="text-[10px] text-violet-500 uppercase font-bold mb-1 flex items-center gap-1">
                        <Sparkles size={9} /> Стажер
                    </div>
                    <div className="text-2xl font-black text-violet-600 dark:text-violet-400">{stats.intern}</div>
                </div>
                <div className="col-span-1 bg-amber-50 dark:bg-amber-900/10 rounded-lg border border-amber-200 dark:border-amber-800/30 p-3">
                    <div className="text-[10px] text-amber-500 uppercase font-bold mb-1 flex items-center gap-1">
                        <FlaskConical size={9} /> Исп. период
                    </div>
                    <div className="text-2xl font-black text-amber-600 dark:text-amber-400">{stats.probation}</div>
                </div>
                <div className="col-span-1 bg-emerald-50 dark:bg-emerald-900/10 rounded-lg border border-emerald-200 dark:border-emerald-800/30 p-3">
                    <div className="text-[10px] text-emerald-500 uppercase font-bold mb-1 flex items-center gap-1">
                        <BadgeCheck size={9} /> Сотрудник
                    </div>
                    <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{stats.employee}</div>
                </div>
                <div className="col-span-1 bg-white dark:bg-[#111] rounded-lg border border-gray-200 dark:border-[#222] p-3">
                    <div className="text-[10px] text-gray-400 uppercase font-bold mb-1">Sales</div>
                    <div className="text-2xl font-black text-blue-600 dark:text-blue-400">{stats.sales}</div>
                </div>
                <div className="col-span-1 bg-white dark:bg-[#111] rounded-lg border border-gray-200 dark:border-[#222] p-3">
                    <div className="text-[10px] text-gray-400 uppercase font-bold mb-1">Consultant</div>
                    <div className="text-2xl font-black text-purple-600 dark:text-purple-400">{stats.consultant}</div>
                </div>
                <div className="col-span-1 bg-white dark:bg-[#111] rounded-lg border border-gray-200 dark:border-[#222] p-3">
                    <div className="text-[10px] text-gray-400 uppercase font-bold mb-1">SMM</div>
                    <div className="text-2xl font-black text-pink-600 dark:text-pink-400">{stats.smm}</div>
                </div>
            </div>

            {/* THREE SECTORS */}
            {STATUS_SECTORS.map(sector => {
                const list = sectors[sector.key];
                if (list.length === 0) return null;
                return (
                    <React.Fragment key={sector.key}>
                        <SectorHeader sector={sector} count={list.length} />
                        <ColumnHeaders sortOrder={sortOrder} onSortChange={toggleSort} />
                        <div className="space-y-2 mb-2">
                            {list.map(emp => (
                                <EmployeeCard
                                    key={emp.id}
                                    employee={emp}
                                    sector={sector}
                                    formattedTenure={formatTenure(emp.days)}
                                    daysUntilBirthday={emp.daysUntilBirthday}
                                />
                            ))}
                        </div>
                    </React.Fragment>
                );
            })}

            {totalVisible === 0 && (
                <div className="text-center py-16 text-gray-400 text-sm">
                    Нет сотрудников по выбранным фильтрам
                </div>
            )}
        </div>
    );
};

export default HRDashboardPage;
