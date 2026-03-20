import React, { useState, useEffect, useMemo } from 'react';
import { useAppStore } from '../store/appStore';
import {
    Activity, Calendar, Clock, MessageSquare, AlertTriangle,
    ChevronDown, ChevronUp, ArrowUpDown, Filter, RefreshCw, Users
} from 'lucide-react';

// Use proxy path both in dev (Vite proxy) and prod (Vercel rewrite) to avoid CORS
const API_BASE = '/novalumen-api/v1';

// Format minutes to human-readable
const formatMinutes = (mins) => {
    if (mins === null || mins === undefined) return '—';
    if (mins < 1) return `${Math.round(mins * 60)}с`;
    if (mins < 60) return `${Math.round(mins)}м`;
    const h = Math.floor(mins / 60);
    const m = Math.round(mins % 60);
    return `${h}ч ${m}м`;
};

// Format start time from ISO.
// API returns first_message_time which may be a late-night leftover from prev shift.
// We treat anything before 06:00 UTC as "not a real shift start" and display accordingly.
const formatTime = (iso) => {
    if (!iso) return '—';
    // Parse as UTC directly from the ISO string (API gives naive UTC timestamps)
    const match = iso.match(/T(\d{2}):(\d{2})/);
    if (!match) return '—';
    const hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);
    if (hours < 6) return '—';
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
};

// Get color for response time
const getResponseColor = (mins) => {
    if (mins === null || mins === undefined) return 'text-gray-400';
    if (mins <= 5) return 'text-green-600 dark:text-green-400';
    if (mins <= 15) return 'text-yellow-600 dark:text-yellow-400';
    if (mins <= 60) return 'text-orange-600 dark:text-orange-400';
    return 'text-red-600 dark:text-red-400';
};

// Get color for unanswered count
const getUnansweredColor = (count) => {
    if (!count || count === 0) return 'text-green-600 dark:text-green-400';
    if (count <= 3) return 'text-yellow-600 dark:text-yellow-400';
    if (count <= 10) return 'text-orange-600 dark:text-orange-400';
    return 'text-red-600 dark:text-red-400';
};

const getRoleBadge = (role) => {
    const map = {
        'Sales': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
        'SeniorSales': 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
        'SalesTaro': 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400',
        'SalesTaroNew': 'bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-900/30 dark:text-fuchsia-400',
        'Consultant': 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
        'SeniorSMM': 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400',
        'SMM': 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',
        'Admin': 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
        'C-level': 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
        'HR': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    };
    return map[role] || 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400';
};

const FILTER_ROLES = ['Sales', 'SalesTaro', 'SalesTaroNew', 'SeniorSales', 'Consultant', 'SMM', 'SeniorSMM', 'Admin', 'C-level', 'HR'];

const ManagerActivityPage = () => {
    const { managers } = useAppStore();

    // Date filters — default: today
    const today = new Date().toISOString().split('T')[0];
    const [fromDate, setFromDate] = useState(today);
    const [toDate, setToDate] = useState(today);
    const [roleFilter, setRoleFilter] = useState('all');
    const [hideInactive, setHideInactive] = useState(true);
    const [sortField, setSortField] = useState('total_messages_count');
    const [sortDir, setSortDir] = useState('desc');

    const [apiData, setApiData] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    // Expanded rows for daily stats
    const [expandedRows, setExpandedRows] = useState(new Set());

    const toggleRow = (userId) => {
        setExpandedRows(prev => {
            const next = new Set(prev);
            if (next.has(userId)) next.delete(userId);
            else next.add(userId);
            return next;
        });
    };

    // Fetch data from API
    const fetchData = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const url = `${API_BASE}/users/statistics?from_dt=${fromDate}T01:00:00Z&to_dt=${toDate}T22:00:00Z&offset=2`;
            const res = await fetch(url);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            setApiData(data);
        } catch (e) {
            console.error('Error fetching activity:', e);
            setError(e.message);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [fromDate, toDate]);

    // Build manager lookup by telegram_id
    const managerMap = useMemo(() => {
        const map = {};
        (managers || []).forEach(m => {
            if (m.telegram_id) map[String(m.telegram_id)] = m;
        });
        return map;
    }, [managers]);

    // Merge API data with managers
    const mergedData = useMemo(() => {
        return apiData.map(item => {
            const manager = item.telegram_id ? managerMap[String(item.telegram_id)] : null;
            return {
                ...item,
                manager,
                role: manager?.role || 'Unknown',
                avatar_url: manager?.avatar_url || null,
                managerName: manager?.name || [item.name, item.last_name].filter(Boolean).join(' '),
                geo: manager?.geo || [],
                status: manager?.status || 'unknown',
            };
        });
    }, [apiData, managerMap]);

    // Apply filters & sorting
    const filteredData = useMemo(() => {
        let result = [...mergedData];

        // Role filter
        if (roleFilter !== 'all') {
            result = result.filter(d => d.role === roleFilter);
        }

        // Hide inactive (0 messages)
        if (hideInactive) {
            result = result.filter(d => d.total_messages_count > 0);
        }

        // Sort
        result.sort((a, b) => {
            let aVal = a[sortField];
            let bVal = b[sortField];
            if (aVal === null || aVal === undefined) aVal = -Infinity;
            if (bVal === null || bVal === undefined) bVal = -Infinity;
            return sortDir === 'desc' ? bVal - aVal : aVal - bVal;
        });

        return result;
    }, [mergedData, roleFilter, hideInactive, sortField, sortDir]);

    const handleSort = (field) => {
        if (sortField === field) {
            setSortDir(prev => prev === 'desc' ? 'asc' : 'desc');
        } else {
            setSortField(field);
            setSortDir('desc');
        }
    };

    // Summary stats
    const summary = useMemo(() => {
        const active = filteredData.filter(d => d.total_messages_count > 0);
        const totalMessages = filteredData.reduce((s, d) => s + d.total_messages_count, 0);
        const avgTimes = active.map(d => d.total_avg_response_time_minutes).filter(v => v !== null && v !== undefined);
        const avgResponse = avgTimes.length > 0 ? avgTimes.reduce((s, v) => s + v, 0) / avgTimes.length : null;
        const totalUnanswered10 = filteredData.reduce((s, d) => {
            return s + (d.daily_stats || []).reduce((ss, ds) => ss + (ds.unanswered_gt_10_min_count || 0), 0);
        }, 0);
        const totalUnanswered30 = filteredData.reduce((s, d) => {
            return s + (d.daily_stats || []).reduce((ss, ds) => ss + (ds.unanswered_gt_30_min_count || 0), 0);
        }, 0);
        return { activeCount: active.length, totalMessages, avgResponse, totalUnanswered10, totalUnanswered30 };
    }, [filteredData]);

    const SortIcon = ({ field }) => (
        <ArrowUpDown size={10} className={`inline ml-1 ${sortField === field ? 'text-blue-500' : 'text-gray-400'}`} />
    );

    return (
        <div className="p-4 max-w-[1600px] mx-auto font-sans text-gray-900 dark:text-gray-100">
            {/* Header */}
            <div className="flex items-center gap-3 mb-6 border-b border-gray-200 dark:border-[#333] pb-4">
                <div className="w-8 h-8 rounded-lg bg-violet-50 dark:bg-violet-900/20 flex items-center justify-center">
                    <Activity size={16} className="text-violet-600 dark:text-violet-400" />
                </div>
                <div>
                    <h1 className="text-lg font-bold leading-tight">Активность Менеджеров</h1>
                    <p className="text-xs text-gray-500">Мониторинг сообщений и времени ответа сотрудников</p>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-3 mb-4">
                <div className="flex items-center gap-2">
                    <Calendar size={14} className="text-gray-400" />
                    <input
                        type="date"
                        value={fromDate}
                        onChange={e => setFromDate(e.target.value)}
                        className="bg-white dark:bg-[#111] border border-gray-200 dark:border-[#333] rounded-lg px-3 py-1.5 text-xs font-medium focus:outline-none focus:border-blue-400"
                    />
                    <span className="text-xs text-gray-400">—</span>
                    <input
                        type="date"
                        value={toDate}
                        onChange={e => setToDate(e.target.value)}
                        className="bg-white dark:bg-[#111] border border-gray-200 dark:border-[#333] rounded-lg px-3 py-1.5 text-xs font-medium focus:outline-none focus:border-blue-400"
                    />
                </div>

                <div className="relative">
                    <select
                        value={roleFilter}
                        onChange={e => setRoleFilter(e.target.value)}
                        className="appearance-none bg-white dark:bg-[#111] border border-gray-200 dark:border-[#333] text-gray-700 dark:text-gray-200 py-1.5 pl-3 pr-8 rounded-lg text-xs font-medium focus:outline-none cursor-pointer"
                    >
                        <option value="all">Все роли</option>
                        {FILTER_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                    <ChevronDown size={10} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>

                <label className="flex items-center gap-1.5 text-xs text-gray-500 cursor-pointer select-none">
                    <input
                        type="checkbox"
                        checked={hideInactive}
                        onChange={e => setHideInactive(e.target.checked)}
                        className="rounded border-gray-300"
                    />
                    Скрыть неактивных
                </label>

                <button
                    onClick={fetchData}
                    disabled={isLoading}
                    className="ml-auto flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-colors disabled:opacity-50"
                >
                    <RefreshCw size={12} className={isLoading ? 'animate-spin' : ''} />
                    Обновить
                </button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-5">
                <div className="bg-white dark:bg-[#111] border border-gray-200 dark:border-[#222] rounded-lg p-3">
                    <div className="text-[10px] text-gray-400 uppercase font-bold mb-1">Активных</div>
                    <div className="text-xl font-black text-gray-900 dark:text-white flex items-baseline gap-1">
                        {summary.activeCount}
                        <span className="text-[10px] font-normal text-gray-400">/ {filteredData.length}</span>
                    </div>
                </div>
                <div className="bg-white dark:bg-[#111] border border-gray-200 dark:border-[#222] rounded-lg p-3">
                    <div className="text-[10px] text-gray-400 uppercase font-bold mb-1">Сообщений</div>
                    <div className="text-xl font-black text-gray-900 dark:text-white">{summary.totalMessages.toLocaleString()}</div>
                </div>
                <div className="bg-white dark:bg-[#111] border border-gray-200 dark:border-[#222] rounded-lg p-3">
                    <div className="text-[10px] text-gray-400 uppercase font-bold mb-1">Ср. ответ</div>
                    <div className={`text-xl font-black ${getResponseColor(summary.avgResponse)}`}>
                        {formatMinutes(summary.avgResponse)}
                    </div>
                </div>
                <div className="bg-white dark:bg-[#111] border border-gray-200 dark:border-[#222] rounded-lg p-3">
                    <div className="text-[10px] text-gray-400 uppercase font-bold mb-1">&gt;10 мин</div>
                    <div className={`text-xl font-black ${getUnansweredColor(summary.totalUnanswered10)}`}>
                        {summary.totalUnanswered10}
                    </div>
                </div>
                <div className="bg-white dark:bg-[#111] border border-gray-200 dark:border-[#222] rounded-lg p-3">
                    <div className="text-[10px] text-gray-400 uppercase font-bold mb-1">&gt;30 мин</div>
                    <div className={`text-xl font-black ${getUnansweredColor(summary.totalUnanswered30)}`}>
                        {summary.totalUnanswered30}
                    </div>
                </div>
            </div>

            {/* Error */}
            {error && (
                <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400 text-xs font-medium">
                    Ошибка загрузки: {error}
                </div>
            )}

            {/* Table */}
            <div className="bg-white dark:bg-[#111] border border-gray-200 dark:border-[#333] rounded-lg overflow-hidden">
                {isLoading ? (
                    <div className="flex items-center justify-center py-16 text-gray-400">
                        <RefreshCw size={20} className="animate-spin mr-2" />
                        <span className="text-sm">Загрузка данных...</span>
                    </div>
                ) : filteredData.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                        <Users size={24} className="mb-2 opacity-50" />
                        <span className="text-sm">Нет данных за выбранный период</span>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                            <thead>
                                <tr className="border-b border-gray-100 dark:border-[#222] bg-gray-50 dark:bg-[#0A0A0A]">
                                    <th className="text-left py-3 px-4 font-bold text-gray-500 uppercase text-[10px] tracking-wider">Менеджер</th>
                                    <th className="text-left py-3 px-3 font-bold text-gray-500 uppercase text-[10px] tracking-wider">Роль</th>
                                    <th
                                        className="text-center py-3 px-3 font-bold text-gray-500 uppercase text-[10px] tracking-wider cursor-pointer hover:text-gray-700 select-none"
                                        onClick={() => handleSort('total_messages_count')}
                                    >
                                        Сообщений <SortIcon field="total_messages_count" />
                                    </th>
                                    <th
                                        className="text-center py-3 px-3 font-bold text-gray-500 uppercase text-[10px] tracking-wider cursor-pointer hover:text-gray-700 select-none"
                                        onClick={() => handleSort('total_avg_response_time_minutes')}
                                    >
                                        Ср. ответ <SortIcon field="total_avg_response_time_minutes" />
                                    </th>
                                    <th className="text-center py-3 px-3 font-bold text-gray-500 uppercase text-[10px] tracking-wider">&gt;10м</th>
                                    <th className="text-center py-3 px-3 font-bold text-gray-500 uppercase text-[10px] tracking-wider">&gt;30м</th>
                                    <th className="text-center py-3 px-3 font-bold text-gray-500 uppercase text-[10px] tracking-wider">Дни</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredData.map((item) => {
                                    const totalUn10 = (item.daily_stats || []).reduce((s, ds) => s + (ds.unanswered_gt_10_min_count || 0), 0);
                                    const totalUn30 = (item.daily_stats || []).reduce((s, ds) => s + (ds.unanswered_gt_30_min_count || 0), 0);
                                    const isExpanded = expandedRows.has(item.user_id);
                                    const hasDailyStats = item.daily_stats && item.daily_stats.length > 0;

                                    return (
                                        <React.Fragment key={item.user_id}>
                                            <tr
                                                className={`border-b border-gray-50 dark:border-[#1A1A1A] hover:bg-gray-50 dark:hover:bg-[#161616] transition-colors ${hasDailyStats ? 'cursor-pointer' : ''}`}
                                                onClick={() => hasDailyStats && toggleRow(item.user_id)}
                                            >
                                                {/* Name + Avatar */}
                                                <td className="py-2.5 px-4">
                                                    <div className="flex items-center gap-2.5">
                                                        {item.avatar_url ? (
                                                            <img src={item.avatar_url} className="w-7 h-7 rounded-md object-cover" alt="" />
                                                        ) : (
                                                            <div className="w-7 h-7 rounded-md bg-gray-200 dark:bg-[#333] flex items-center justify-center text-[10px] font-bold text-gray-500">
                                                                {item.managerName?.[0] || '?'}
                                                            </div>
                                                        )}
                                                        <div>
                                                            <div className="font-bold text-gray-900 dark:text-white text-[11px]">{item.managerName}</div>
                                                            {item.geo && item.geo.length > 0 && (
                                                                <div className="text-[9px] text-gray-400 mt-0.5">{item.geo.join(', ')}</div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </td>

                                                {/* Role */}
                                                <td className="py-2.5 px-3">
                                                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${getRoleBadge(item.role)}`}>
                                                        {item.role}
                                                    </span>
                                                </td>

                                                {/* Messages */}
                                                <td className="py-2.5 px-3 text-center">
                                                    <span className="font-bold text-gray-900 dark:text-white">{item.total_messages_count}</span>
                                                </td>

                                                {/* Avg Response */}
                                                <td className="py-2.5 px-3 text-center">
                                                    <span className={`font-bold ${getResponseColor(item.total_avg_response_time_minutes)}`}>
                                                        {formatMinutes(item.total_avg_response_time_minutes)}
                                                    </span>
                                                </td>

                                                {/* Unanswered >10m */}
                                                <td className="py-2.5 px-3 text-center">
                                                    <span className={`font-bold ${getUnansweredColor(totalUn10)}`}>
                                                        {totalUn10}
                                                    </span>
                                                </td>

                                                {/* Unanswered >30m */}
                                                <td className="py-2.5 px-3 text-center">
                                                    <span className={`font-bold ${getUnansweredColor(totalUn30)}`}>
                                                        {totalUn30}
                                                    </span>
                                                </td>

                                                {/* Expand */}
                                                <td className="py-2.5 px-3 text-center">
                                                    {hasDailyStats ? (
                                                        <button className="p-1 hover:bg-gray-100 dark:hover:bg-[#222] rounded transition-colors">
                                                            {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                                                        </button>
                                                    ) : (
                                                        <span className="text-gray-300">—</span>
                                                    )}
                                                </td>
                                            </tr>

                                            {/* Expanded: Daily Stats */}
                                            {isExpanded && hasDailyStats && (
                                                <tr>
                                                    <td colSpan={7} className="bg-gray-50/50 dark:bg-[#0D0D0D] px-4 py-2">
                                                        <div className="grid gap-2">
                                                            {item.daily_stats.map(ds => (
                                                                <div key={ds.date} className="flex items-center gap-4 bg-white dark:bg-[#151515] border border-gray-100 dark:border-[#222] rounded-lg px-4 py-2.5">
                                                                    <div className="flex items-center gap-1.5 min-w-[90px]">
                                                                        <Calendar size={11} className="text-gray-400" />
                                                                        <span className="font-bold text-gray-700 dark:text-gray-300 text-[11px]">
                                                                            {new Date(ds.date).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' })}
                                                                        </span>
                                                                    </div>
                                                                    <div className="flex items-center gap-1.5 min-w-[80px]">
                                                                        <MessageSquare size={11} className="text-blue-400" />
                                                                        <span className="font-bold text-gray-900 dark:text-white">{ds.messages_count}</span>
                                                                        <span className="text-gray-400 text-[9px]">сооб.</span>
                                                                    </div>
                                                                    <div className="flex items-center gap-1.5 min-w-[80px]">
                                                                        <Clock size={11} className="text-gray-400" />
                                                                        <span className="text-[10px] text-gray-500">старт</span>
                                                                        <span className="font-bold text-gray-700 dark:text-gray-300">{formatTime(ds.first_message_time)}</span>
                                                                    </div>
                                                                    <div className="flex items-center gap-1.5 min-w-[80px]">
                                                                        <Clock size={11} className={getResponseColor(ds.avg_response_time_minutes)} />
                                                                        <span className="text-[10px] text-gray-500">ответ</span>
                                                                        <span className={`font-bold ${getResponseColor(ds.avg_response_time_minutes)}`}>
                                                                            {formatMinutes(ds.avg_response_time_minutes)}
                                                                        </span>
                                                                    </div>
                                                                    <div className="flex items-center gap-3">
                                                                        <div className="flex items-center gap-1">
                                                                            <AlertTriangle size={10} className={getUnansweredColor(ds.unanswered_gt_10_min_count)} />
                                                                            <span className={`font-bold text-[10px] ${getUnansweredColor(ds.unanswered_gt_10_min_count)}`}>
                                                                                {ds.unanswered_gt_10_min_count}&gt;10м
                                                                            </span>
                                                                        </div>
                                                                        <div className="flex items-center gap-1">
                                                                            <AlertTriangle size={10} className={getUnansweredColor(ds.unanswered_gt_30_min_count)} />
                                                                            <span className={`font-bold text-[10px] ${getUnansweredColor(ds.unanswered_gt_30_min_count)}`}>
                                                                                {ds.unanswered_gt_30_min_count}&gt;30м
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </React.Fragment>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ManagerActivityPage;
