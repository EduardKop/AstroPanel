import React, { useState, useMemo, useEffect } from 'react';
import { useAppStore } from '../store/appStore';
import { supabase } from '../services/supabaseClient';
import {
    Users, UserCheck, UserPlus, Copy, Check, Calendar, Globe, Briefcase,
    Search, ChevronDown
} from 'lucide-react';

const FLAGS = {
    UA: '🇺🇦', PL: '🇵🇱', IT: '🇮🇹', HR: '🇭🇷',
    BG: '🇧🇬', CZ: '🇨🇿', RO: '🇷🇴', LT: '🇱🇹',
    TR: '🇹🇷', FR: '🇫🇷', PT: '🇵🇹', DE: '🇩🇪',
    US: '🇺🇸', ES: '🇪🇸', SK: '🇸🇰', HU: '🇭🇺'
};

const getInitials = (name) => {
    if (!name) return '?';
    return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
};

const formatBirthday = (dateStr) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
};

const formatStartDate = (dateStr) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' });
};

const CopyButton = ({ text }) => {
    const [copied, setCopied] = useState(false);
    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(text);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        } catch { /* ignore */ }
    };
    return (
        <button onClick={handleCopy} className="p-0.5 hover:bg-gray-200 dark:hover:bg-[#333] rounded transition-colors" title="Скопировать">
            {copied ? <Check size={10} className="text-emerald-500" /> : <Copy size={10} className="text-gray-400" />}
        </button>
    );
};

const GRID_COLS = "grid grid-cols-[40px_minmax(200px,1fr)_120px_100px_100px_80px_100px_80px] gap-3 items-center";

const EmployeeCard = ({ employee, daysInCompany, formattedTenure, daysUntilBirthday }) => {
    const isNewbie = daysInCompany <= 7;

    return (
        <div className={`px-4 py-3 rounded-lg border transition-all hover:shadow-sm ${GRID_COLS} ${isNewbie
            ? 'bg-violet-50 dark:bg-violet-900/10 border-violet-200 dark:border-violet-800/30'
            : 'bg-white dark:bg-[#111] border-gray-200 dark:border-[#222]'
            }`}>
            {/* Avatar */}
            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold shrink-0 border ${isNewbie
                ? 'bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 border-violet-200 dark:border-violet-700/40'
                : 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-900/50'
                }`}>
                {employee.avatar_url
                    ? <img src={employee.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                    : getInitials(employee.name)
                }
            </div>

            {/* Name + Telegram */}
            <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                    <span className="font-bold text-sm text-gray-900 dark:text-white truncate">{employee.name}</span>
                    {isNewbie && (
                        <span className="px-1.5 py-0.5 bg-violet-500/10 text-violet-600 dark:text-violet-400 rounded text-[9px] font-bold uppercase">New</span>
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
                    <span className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-[#222] border border-gray-200 dark:border-[#333] text-[10px] font-bold text-gray-500 dark:text-gray-500">
                        +{(employee.geo || []).length - 3}
                    </span>
                )}
            </div>

            {/* Role */}
            <div className="flex justify-start">
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${employee.role === 'SalesTaro'
                    ? 'bg-orange-100 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400'
                    : 'bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                    }`}>
                    {employee.role}
                </span>
            </div>

            {/* Start Date */}
            <div className="text-[11px] text-gray-500 dark:text-gray-400 font-medium whitespace-nowrap">
                {formatStartDate(employee.started_at)}
            </div>

            {/* Days in company */}
            <div className="flex flex-col items-center justify-center">
                <span className={`text-xs font-black whitespace-nowrap ${isNewbie ? 'text-violet-600 dark:text-violet-400' : 'text-gray-900 dark:text-white'}`}>
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

const SectorHeader = ({ title, icon: Icon, count, color }) => (
    <div className="flex items-center gap-2 mb-3 mt-6">
        <div className={`w-7 h-7 rounded-lg ${color} flex items-center justify-center`}>
            <Icon size={14} className="text-white" />
        </div>
        <h3 className="font-bold text-sm text-gray-900 dark:text-white">{title}</h3>
        <span className="px-2 py-0.5 rounded-full bg-gray-100 dark:bg-[#222] text-[10px] font-bold text-gray-500">{count}</span>
    </div>
);

const ColumnHeaders = ({ sortOrder, onSortChange }) => (
    <div className={`px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 ${GRID_COLS}`}>
        {/* Avatar placeholder */}
        <div />
        {/* Name + Telegram */}
        <div>Сотрудник / Telegram</div>
        {/* GEO */}
        <div>ГЕО</div>
        {/* Role */}
        <div>Роль</div>
        {/* Start Date */}
        <div>Начал работать</div>
        {/* Days */}
        <div
            className="text-center cursor-pointer hover:text-violet-500 transition-colors select-none flex items-center justify-center gap-1"
            onClick={onSortChange}
            title="Сортировать по стажу"
        >
            Стаж
            <ChevronDown size={10} className={`transform transition-transform ${sortOrder === 'asc' ? 'rotate-180' : ''}`} />
        </div>
        {/* Days until Birthday */}
        <div className="text-center">До ДР</div>
        {/* Birthday */}
        <div className="text-right">Д.Р.</div>
    </div>
);

const HRDashboardPage = () => {
    const { managers } = useAppStore();
    const [search, setSearch] = useState('');
    const [roleFilter, setRoleFilter] = useState('all'); // 'all', 'Sales', 'SalesTaro'
    const [sortOrder, setSortOrder] = useState('asc'); // 'asc' (lowest tenure first) or 'desc'

    // Calculate days based on started_at or fallback to created_at
    const getDaysInCompany = (manager) => {
        const startDate = manager.started_at || manager.created_at;
        if (!startDate) return 0;

        const start = new Date(startDate);
        // Valid date check
        if (Object.prototype.toString.call(start) !== "[object Date]" || isNaN(start.getTime())) {
            return 0;
        }

        const now = new Date();
        const diffTime = Math.abs(now - start);
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    };

    // Format tenure string like in BirthdaysPage
    const formatTenure = (days) => {
        if (days >= 365) {
            const years = Math.floor(days / 365);
            const months = Math.floor((days % 365) / 30);
            return `${years} г. ${months > 0 ? `${months} мес.` : ''}`;
        }
        if (days >= 30) {
            return `${Math.floor(days / 30)} мес.`;
        }
        return `${days} дн.`;
    };

    // Calculate days until birthday
    const getDaysUntilBirthday = (birthDateStr) => {
        if (!birthDateStr) return null;
        const birthDate = new Date(birthDateStr);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const currentYear = today.getFullYear();
        let nextBirthday = new Date(currentYear, birthDate.getMonth(), birthDate.getDate());

        if (nextBirthday < today) {
            nextBirthday.setFullYear(currentYear + 1);
        }

        const diffTime = nextBirthday - today;
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    };

    // Filter employees
    const { newbies, experienced, stats } = useMemo(() => {
        let employees = (managers || []).filter(m =>
            m.status === 'active' && ['Sales', 'SalesTaro'].includes(m.role)
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

        const newbieList = [];
        const expList = [];

        employees.forEach(emp => {
            // Use started_at if available, otherwise created_at
            const days = getDaysInCompany(emp);
            const daysUntilBirthday = getDaysUntilBirthday(emp.birth_date);

            // Newbie if <= 7 days
            if (days <= 7) {
                newbieList.push({ ...emp, days, daysUntilBirthday });
            } else {
                expList.push({ ...emp, days, daysUntilBirthday });
            }
        });

        // Sort by days
        const sortFn = (a, b) => {
            return sortOrder === 'asc' ? a.days - b.days : b.days - a.days;
        };

        newbieList.sort(sortFn);
        expList.sort(sortFn);

        return {
            newbies: newbieList,
            experienced: expList,
            stats: {
                total: employees.length,
                newbies: newbieList.length,
                experienced: expList.length,
                sales: employees.filter(m => m.role === 'Sales').length,
                salesTaro: employees.filter(m => m.role === 'SalesTaro').length,
            }
        };
    }, [managers, search, roleFilter, sortOrder]);

    const toggleSort = () => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');

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
                        Sales & SalesTaro — обзор сотрудников по стажу
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
                        </select>
                        <ChevronDown size={10} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    </div>
                </div>
            </div>

            {/* STATS CARDS */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                <div className="bg-white dark:bg-[#111] rounded-lg border border-gray-200 dark:border-[#222] p-3">
                    <div className="text-[10px] text-gray-400 uppercase font-bold mb-1">Всего</div>
                    <div className="text-2xl font-black text-gray-900 dark:text-white">{stats.total}</div>
                </div>
                <div className="bg-violet-50 dark:bg-violet-900/10 rounded-lg border border-violet-200 dark:border-violet-800/30 p-3">
                    <div className="text-[10px] text-violet-500 uppercase font-bold mb-1">Новички (≤7 дней)</div>
                    <div className="text-2xl font-black text-violet-600 dark:text-violet-400">{stats.newbies}</div>
                </div>
                <div className="bg-white dark:bg-[#111] rounded-lg border border-gray-200 dark:border-[#222] p-3">
                    <div className="text-[10px] text-gray-400 uppercase font-bold mb-1">Sales</div>
                    <div className="text-2xl font-black text-blue-600 dark:text-blue-400">{stats.sales}</div>
                </div>
                <div className="bg-white dark:bg-[#111] rounded-lg border border-gray-200 dark:border-[#222] p-3">
                    <div className="text-[10px] text-gray-400 uppercase font-bold mb-1">SalesTaro</div>
                    <div className="text-2xl font-black text-orange-600 dark:text-orange-400">{stats.salesTaro}</div>
                </div>
            </div>

            {/* NEWBIES SECTOR (PURPLE) */}
            {newbies.length > 0 && (
                <>
                    <SectorHeader
                        title="Новички — до 7 дней включительно"
                        icon={UserPlus}
                        count={newbies.length}
                        color="bg-violet-500"
                    />
                    <ColumnHeaders sortOrder={sortOrder} onSortChange={toggleSort} />
                    <div className="space-y-2">
                        {newbies.map(emp => (
                            <EmployeeCard key={emp.id} employee={emp} daysInCompany={emp.days} formattedTenure={formatTenure(emp.days)} daysUntilBirthday={emp.daysUntilBirthday} />
                        ))}
                    </div>
                </>
            )}

            {/* EXPERIENCED SECTOR */}
            {experienced.length > 0 && (
                <>
                    <SectorHeader
                        title="Опытные — более 7 дней"
                        icon={UserCheck}
                        count={experienced.length}
                        color="bg-emerald-500"
                    />
                    <ColumnHeaders sortOrder={sortOrder} onSortChange={toggleSort} />
                    <div className="space-y-2">
                        {experienced.map(emp => (
                            <EmployeeCard key={emp.id} employee={emp} daysInCompany={emp.days} formattedTenure={formatTenure(emp.days)} daysUntilBirthday={emp.daysUntilBirthday} />
                        ))}
                    </div>
                </>
            )}

            {newbies.length === 0 && experienced.length === 0 && (
                <div className="text-center py-16 text-gray-400 text-sm">
                    Нет сотрудников Sales / SalesTaro
                </div>
            )}
        </div>
    );
};

export default HRDashboardPage;
