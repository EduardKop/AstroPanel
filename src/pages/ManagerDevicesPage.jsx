import React, { useEffect, useMemo, useState, useCallback, useDeferredValue } from 'react';
import { supabase } from '../services/supabaseClient';
import { useAppStore } from '../store/appStore';
import {
    Monitor, Smartphone, HelpCircle, Tablet,
    RefreshCw, Search, Users, Calendar,
    ChevronLeft, ChevronRight, Clock,
} from 'lucide-react';

const API_BASE = '/novalumen-api/v1';
const API_OFFSET = 2;

const FILTER_ROLES = [
    'Sales', 'SeniorSales', 'SalesTaro', 'SalesTaroNew',
    'Consultant', 'SMM', 'SeniorSMM', 'Admin', 'C-level', 'HR',
];

const roleBadgeClasses = {
    Sales: 'border-sky-400/20 bg-sky-500/10 text-sky-200',
    SeniorSales: 'border-indigo-400/20 bg-indigo-500/10 text-indigo-200',
    SalesTaro: 'border-violet-400/20 bg-violet-500/10 text-violet-200',
    SalesTaroNew: 'border-fuchsia-400/20 bg-fuchsia-500/10 text-fuchsia-200',
    Consultant: 'border-emerald-400/20 bg-emerald-500/10 text-emerald-200',
    SMM: 'border-amber-400/20 bg-amber-500/10 text-amber-200',
    SeniorSMM: 'border-orange-400/20 bg-orange-500/10 text-orange-200',
    Admin: 'border-slate-400/20 bg-slate-400/10 text-slate-200',
    'C-level': 'border-rose-400/20 bg-rose-500/10 text-rose-200',
    HR: 'border-teal-400/20 bg-teal-500/10 text-teal-200',
};
const getRoleBadge = (role) => roleBadgeClasses[role] || 'border-white/10 bg-white/5 text-white/55';

const getDeviceIcon = (deviceType) => {
    switch ((deviceType || '').toLowerCase()) {
        case 'desktop': return Monitor;
        case 'mobile':  return Smartphone;
        case 'tablet':  return Tablet;
        default:        return HelpCircle;
    }
};

const DEVICE_COLORS = {
    desktop: 'border-blue-500/30 bg-blue-500/10 text-blue-300',
    mobile:  'border-green-500/30 bg-green-500/10 text-green-300',
    tablet:  'border-purple-500/30 bg-purple-500/10 text-purple-300',
};
const getDeviceColor = (t) => DEVICE_COLORS[(t || '').toLowerCase()] || 'border-gray-500/30 bg-gray-500/10 text-gray-400';

const DEVICE_LABELS = { desktop: 'Компьютер', mobile: 'Телефон', tablet: 'Планшет' };
const getDeviceLabel = (t) => DEVICE_LABELS[(t || '').toLowerCase()] || 'Неизвестно';

const isExpired = (iso) => !iso || new Date(iso) < new Date();

const formatExpiry = (iso) => {
    if (!iso) return '—';
    const d = new Date(iso);
    const now = new Date();
    const diffMs = d - now;
    if (diffMs < 0) return 'Истёк';
    const days = Math.floor(diffMs / 86400000);
    if (days === 0) return 'Сегодня';
    if (days === 1) return 'Завтра';
    if (days < 30) return `${days} дн.`;
    return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
};

const buildApiBoundary = (dateValue, endOfDay = false) =>
    `${dateValue}T${endOfDay ? '23:59:59' : '00:00:00'}-00:00`;

// ─── Manager identity cell (mirrors efficiency page) ───────────────────────
const ManagerIdentity = React.memo(({ name, role, avatarUrl, username, geo }) => {
    const initials = name ? name.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase() : '?';
    return (
        <div className="flex items-center gap-3 min-w-0">
            {avatarUrl ? (
                <img src={avatarUrl} className="h-9 w-9 flex-shrink-0 rounded-lg object-cover" alt={name} />
            ) : (
                <div className="h-9 w-9 flex-shrink-0 rounded-lg bg-gray-200 dark:bg-[#1E2026] flex items-center justify-center text-xs font-bold text-gray-500 dark:text-gray-300">
                    {initials}
                </div>
            )}
            <div className="min-w-0">
                <div className="truncate text-xs font-semibold text-gray-900 dark:text-white">{name}</div>
                {username && (
                    <div className="truncate text-[10px] text-gray-400 dark:text-[#666]">@{username.replace('@', '')}</div>
                )}
                {geo && (
                    <div className="mt-0.5 text-[10px] text-gray-400 dark:text-[#555]">{geo}</div>
                )}
                {role && (
                    <span className={`mt-1 inline-flex items-center rounded border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide ${getRoleBadge(role)}`}>
                        {role}
                    </span>
                )}
            </div>
        </div>
    );
});

// ─── Session badge ──────────────────────────────────────────────────────────
const SessionBadge = ({ session }) => {
    const DevIcon = getDeviceIcon(session.device_type);
    const expired = isExpired(session.expires_at);
    const color = expired
        ? 'border-gray-600/30 bg-gray-600/10 text-gray-500'
        : getDeviceColor(session.device_type);

    return (
        <div className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[10px] font-medium ${color} ${expired ? 'opacity-50' : ''}`}>
            <DevIcon size={11} />
            <span>{getDeviceLabel(session.device_type)}</span>
            <span className="opacity-60">·</span>
            <span className={expired ? 'text-red-400' : 'text-gray-400 dark:text-gray-300'}>
                {formatExpiry(session.expires_at)}
            </span>
        </div>
    );
};

// ─── Main page ──────────────────────────────────────────────────────────────
const ManagerDevicesPage = () => {
    const storeManagers = useAppStore((s) => s.managers);
    const [localManagers, setLocalManagers] = useState(null);

    const today = new Date().toISOString().split('T')[0];
    const [date, setDate] = useState(today);
    const [roleFilter, setRoleFilter] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const deferredSearch = useDeferredValue(searchQuery);

    // novalumen user_id discovery: telegramId (string) → novalumen user_id
    const [novaIdMap, setNovaIdMap] = useState({}); // { "telegramId": novalumenUserId }

    // sessions per novalumen user_id
    const [sessions, setSessions] = useState({}); // { novalumenUserId: [ ...sessions ] }
    const [sessionErrors, setSessionErrors] = useState({});
    const [isLoading, setIsLoading] = useState(false);

    const managers = localManagers || storeManagers || [];

    // ── Fix: prevent scroll trapping (same as efficiency page) ──────────────
    useEffect(() => {
        const main = document.querySelector('main');
        if (!main) return;
        const prev = main.style.height;
        main.style.height = 'auto';
        return () => { main.style.height = prev; };
    }, []);

    // ── Load full managers list from Supabase ────────────────────────────────
    useEffect(() => {
        let mounted = true;
        supabase.from('managers').select('*').then(({ data }) => {
            if (mounted && data) setLocalManagers(data);
        });
        return () => { mounted = false; };
    }, []);

    // ── Step 1: discover novalumen user_ids via stats API ────────────────────
    const discoverNovaIds = useCallback(async () => {
        try {
            const fromDt = buildApiBoundary(date, false);
            const toDt   = buildApiBoundary(date, true);

            // Try edge function first (production), fall back to proxy (dev)
            const invokeResult = await supabase.functions.invoke('novalumen-statistics', {
                body: { fromDt, toDt, offset: API_OFFSET },
            });

            let stats = [];
            if (!invokeResult.error && invokeResult.data && !invokeResult.data.error) {
                const raw = invokeResult.data.data;
                stats = Array.isArray(raw) ? raw : Array.isArray(raw?.data) ? raw.data : [];
            } else if (import.meta.env.DEV) {
                const url = `${API_BASE}/users/statistics?from_dt=${encodeURIComponent(fromDt)}&to_dt=${encodeURIComponent(toDt)}&offset=${API_OFFSET}`;
                const res = await fetch(url);
                if (res.ok) {
                    const raw = await res.json();
                    stats = Array.isArray(raw) ? raw : Array.isArray(raw?.data) ? raw.data : [];
                }
            }

            // Build telegramId → novalumen user_id map
            const map = {};
            stats.forEach((item) => {
                if (item.telegram_id && item.user_id) {
                    map[String(item.telegram_id)] = item.user_id;
                }
            });
            setNovaIdMap(map);
            return map;
        } catch (e) {
            console.error('Failed to discover novalumen IDs', e);
            return {};
        }
    }, [date]);

    // ── Step 2: fetch sessions for each discovered user_id ───────────────────
    const fetchSessions = useCallback(async (map) => {
        const novaIds = Object.values(map);
        if (!novaIds.length) return;

        const results = {};
        const errors = {};
        const BATCH_SIZE = 5;

        // Chunking prevents hitting browser request limits or novalumen rate limits
        const chunks = [];
        for (let i = 0; i < novaIds.length; i += BATCH_SIZE) {
            chunks.push(novaIds.slice(i, i + BATCH_SIZE));
        }

        for (const batch of chunks) {
            await Promise.all(
                batch.map(async (userId) => {
                    try {
                        let data = null;
                        if (import.meta.env.DEV) {
                            const res = await fetch(`${API_BASE}/auth/sessions?user_id=${userId}`);
                            if (!res.ok) throw new Error(`HTTP ${res.status}`);
                            data = await res.json();
                        } else {
                            const { data: fnData, error: fnErr } = await supabase.functions.invoke('novalumen-sessions', {
                                body: { userId },
                            });
                            if (fnErr) throw new Error(fnErr?.message || 'Fn Error');
                            data = fnData;
                        }
                        results[userId] = Array.isArray(data) ? data : [];
                    } catch (e) {
                        errors[userId] = e.message || 'Ошибка';
                        results[userId] = [];
                    }
                })
            );
        }

        setSessions(results);
        setSessionErrors(errors);
    }, []);

    // ── Main load ────────────────────────────────────────────────────────────
    const loadAll = useCallback(async () => {
        setIsLoading(true);
        setSessions({});
        setSessionErrors({});
        const map = await discoverNovaIds();
        await fetchSessions(map);
        setIsLoading(false);
    }, [discoverNovaIds, fetchSessions]);

    useEffect(() => {
        loadAll();
    }, [date]);

    // ── Filter options ───────────────────────────────────────────────────────
    const roleOptions = useMemo(() => {
        const set = new Set(FILTER_ROLES);
        managers.forEach((m) => { if (m.role) set.add(m.role); });
        return ['all', ...Array.from(set)];
    }, [managers]);

    // ── Prepare rows ─────────────────────────────────────────────────────────
    const rows = useMemo(() => {
        const query = deferredSearch.trim().toLowerCase();

        return managers
            .filter((m) => {
                if (roleFilter !== 'all' && m.role !== roleFilter) return false;
                if (query) {
                    const name = (m.name || '').toLowerCase();
                    const nick = (m.telegram_username || '').toLowerCase();
                    const tid  = String(m.telegram_id || '');
                    if (!name.includes(query) && !nick.includes(query) && !tid.includes(query)) return false;
                }
                return true;
            })
            .map((m) => {
                const novaId = novaIdMap[String(m.telegram_id)] ?? null;
                const managerSessions = novaId !== null ? (sessions[novaId] || []) : [];
                const activeSessions  = managerSessions.filter((s) => !isExpired(s.expires_at));
                return {
                    manager: m,
                    novaId,
                    allSessions: managerSessions,
                    activeSessions,
                    sessionCount: managerSessions.length,
                    activeCount: activeSessions.length,
                    loadError: novaId !== null ? sessionErrors[novaId] : null,
                    novaIdKnown: novaId !== null,
                };
            })
            .sort((a, b) => b.activeCount - a.activeCount || b.sessionCount - a.sessionCount);
    }, [managers, roleFilter, deferredSearch, novaIdMap, sessions, sessionErrors]);

    // ── Summary ──────────────────────────────────────────────────────────────
    const summary = useMemo(() => {
        const acc = {
            total: rows.length,
            withSessions: 0,
            totalActive: 0,
            totalAll: 0,
            desktop: 0,
            mobile: 0,
            tablet: 0
        };

        rows.forEach(r => {
            if (r.activeCount > 0) acc.withSessions++;
            acc.totalActive += r.activeCount;
            acc.totalAll += r.sessionCount;
            
            r.activeSessions.forEach(s => {
                const type = (s.device_type || '').toLowerCase();
                if (acc[type] !== undefined) acc[type]++;
            });
        });

        return acc;
    }, [rows]);

    const handlePrevDay = () => {
        const d = new Date(date); d.setDate(d.getDate() - 1);
        setDate(d.toISOString().split('T')[0]);
    };
    const handleNextDay = () => {
        const d = new Date(date); d.setDate(d.getDate() + 1);
        setDate(d.toISOString().split('T')[0]);
    };

    return (
        <div className="pb-8">
            <div className="relative isolate overflow-hidden rounded-[28px]">
                <div aria-hidden="true" className="pointer-events-none select-none blur-[3px] opacity-45 saturate-75">
                    {/* ── Sticky header ─────────────────────────────────────────── */}
                    <div className="sticky top-0 z-20 -mx-3 border-b border-gray-200 bg-[#F5F5F5] px-3 py-3 dark:border-[#1E2026] dark:bg-[#0A0A0A] md:-mx-6 md:px-6">
                        <div className="flex flex-wrap items-center justify-between gap-4">
                            <div>
                                <h2 className="flex items-center gap-2 text-lg font-bold tracking-tight dark:text-white">
                                    <Monitor size={18} className="text-blue-500" />
                                    <span>Устройства</span>
                                </h2>
                                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                    Активные сессии менеджеров по типам устройств
                                </p>
                            </div>

                            <div className="flex flex-wrap items-center gap-2 text-[11px] font-medium">
                                {Object.entries(DEVICE_LABELS).map(([key, label]) => {
                                    const Icon = getDeviceIcon(key);
                                    return (
                                        <span key={key} className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 ${getDeviceColor(key)}`}>
                                            <Icon size={11} />
                                            {label}
                                        </span>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col">
                        {/* ── Filter bar ──────────────────────────────────────────── */}
                        <div className="-mx-3 flex flex-wrap items-center gap-3 border-b border-gray-200 bg-white px-3 py-3 shadow-sm md:-mx-6 md:px-6 dark:border-[#1E2026] dark:bg-[#0C0E14]">
                            {/* Date picker */}
                            <div className="flex items-center gap-1 rounded-lg border border-gray-200 bg-white p-1 shadow-sm dark:border-[#2A2A2A] dark:bg-[#16181d]">
                                <button onClick={handlePrevDay} className="flex h-7 w-7 items-center justify-center rounded-md text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-[#1E2026] dark:hover:text-white transition-colors">
                                    <ChevronLeft size={14} />
                                </button>
                                <div className="flex items-center gap-1.5 px-1">
                                    <Calendar size={13} className="text-gray-400" />
                                    <input
                                        type="date"
                                        value={date}
                                        onChange={(e) => setDate(e.target.value)}
                                        className="bg-transparent text-xs font-semibold text-gray-700 outline-none dark:text-white cursor-pointer"
                                    />
                                </div>
                                <button onClick={handleNextDay} className="flex h-7 w-7 items-center justify-center rounded-md text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-[#1E2026] dark:hover:text-white transition-colors">
                                    <ChevronRight size={14} />
                                </button>
                            </div>

                            {/* Role filter */}
                            <select
                                value={roleFilter}
                                onChange={(e) => setRoleFilter(e.target.value)}
                                className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-medium outline-none dark:border-[#2A2A2A] dark:bg-[#16181d] dark:text-white"
                            >
                                {roleOptions.map((r) => (
                                    <option key={r} value={r}>{r === 'all' ? 'Все роли' : r}</option>
                                ))}
                            </select>

                            {/* Search */}
                            <label className="relative min-w-[220px] flex-1">
                                <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    placeholder="Поиск по имени, @username или ID"
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-8 pr-3 text-xs outline-none transition-colors focus:border-blue-400 dark:border-[#2A2A2A] dark:bg-[#16181d] dark:text-white dark:placeholder-gray-500"
                                />
                            </label>

                            {/* Refresh */}
                            <button
                                onClick={loadAll}
                                disabled={isLoading}
                                className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-[#2A2A2A] dark:bg-[#16181d] dark:text-white dark:hover:bg-[#1E2026] disabled:opacity-50"
                            >
                                <RefreshCw size={13} className={isLoading ? 'animate-spin' : ''} />
                                Обновить
                            </button>
                        </div>

                        {/* ── Stats bar ───────────────────────────────────────────── */}
                        <div className="-mx-3 flex flex-wrap items-center gap-5 border-b border-gray-200 bg-white/60 px-3 py-2 text-[11px] font-medium text-gray-500 md:-mx-6 md:px-6 dark:border-[#1E2026] dark:bg-[#0C0E14]/60 dark:text-[#666]">
                            <span className="flex items-center gap-1.5">
                                <Users size={12} />
                                Показано: <strong className="text-gray-800 dark:text-white">{summary.total}</strong>
                            </span>
                            <span className="flex items-center gap-1.5">
                                <Monitor size={12} />
                                С сессиями: <strong className="text-blue-500">{summary.withSessions}</strong>
                            </span>
                            <span className="flex items-center gap-1.5">
                                <Smartphone size={12} />
                                Моб. устройства: <strong className="text-emerald-500">{summary.mobile}</strong>
                            </span>
                            <span className="flex items-center gap-1.5">
                                <Clock size={12} />
                                Активных сессий: <strong className="text-emerald-500">{summary.totalActive}</strong>
                            </span>
                            <span className="ml-auto flex items-center gap-1.5 text-[10px] text-gray-400 dark:text-[#555]">
                                Всего сессий: {summary.totalAll}
                            </span>
                        </div>

                        {/* ── Table ───────────────────────────────────────────────── */}
                        <div className="-mx-3 overflow-x-clip overflow-y-visible bg-white md:-mx-6 dark:bg-[#0A0C11]">
                            <div className="overflow-x-auto overflow-y-clip">
                                <div className="min-w-[640px]">
                                    {/* Header */}
                                    <div className="grid grid-cols-[210px_1fr_120px] gap-4 border-b border-gray-200 bg-gray-50 px-3 py-3 text-[9px] font-bold uppercase tracking-widest text-gray-400 md:px-6 dark:bg-[#12141A] dark:border-[#1E2026] dark:text-[#777]">
                                        <div>Менеджер</div>
                                        <div>Устройства / Сессии</div>
                                        <div className="text-right">Макс. срок</div>
                                    </div>

                                    {/* Rows */}
                                    <div className="flex flex-col [&>div:last-child]:border-b-0">
                                        {isLoading && rows.length === 0 ? (
                                            Array.from({ length: 6 }).map((_, i) => (
                                                <div key={i} className="grid grid-cols-[210px_1fr_120px] gap-4 border-b border-gray-100 px-3 py-4 md:px-6 dark:border-[#1A1A1A]">
                                                    <div className="flex items-center gap-3">
                                                        <div className="h-9 w-9 rounded-lg bg-gray-200 dark:bg-[#1E2026] animate-pulse" />
                                                        <div className="space-y-1.5">
                                                            <div className="h-2.5 w-28 rounded bg-gray-200 dark:bg-[#1E2026] animate-pulse" />
                                                            <div className="h-2 w-20 rounded bg-gray-100 dark:bg-[#16181d] animate-pulse" />
                                                        </div>
                                                    </div>
                                                    <div className="h-7 w-48 rounded-lg bg-gray-100 dark:bg-[#1A1A1A] animate-pulse self-center" />
                                                    <div className="ml-auto h-4 w-16 rounded bg-gray-100 dark:bg-[#1A1A1A] animate-pulse self-center" />
                                                </div>
                                            ))
                                        ) : rows.length === 0 ? (
                                            <div className="py-20 text-center text-sm text-gray-400 dark:text-[#555]">
                                                Нет данных
                                            </div>
                                        ) : (
                                            rows.map(({ manager, allSessions, loadError, novaIdKnown }) => {
                                                const latestExpiry = allSessions
                                                    .map(s => s.expires_at)
                                                    .filter(Boolean)
                                                    .sort()
                                                    .at(-1);

                                                return (
                                                    <div
                                                        key={manager.id}
                                                        className="grid grid-cols-[210px_1fr_120px] gap-4 border-b border-gray-100 px-3 py-3 transition-colors hover:bg-gray-50/50 md:px-6 dark:border-[#1A1A1A] dark:hover:bg-[#0E1016]"
                                                    >
                                                        {/* Manager identity */}
                                                        <ManagerIdentity
                                                            name={manager.name}
                                                            role={manager.role}
                                                            avatarUrl={manager.avatar_url}
                                                            username={manager.telegram_username}
                                                            geo={Array.isArray(manager.geo) ? manager.geo.join(', ') : manager.geo}
                                                        />

                                                        {/* Sessions */}
                                                        <div className="flex flex-wrap items-center gap-1.5 self-center">
                                                            {!novaIdKnown ? (
                                                                <span className="text-[10px] text-gray-400 dark:text-[#555] italic">
                                                                    ID не найден — нет активности за выбранный день
                                                                </span>
                                                            ) : loadError ? (
                                                                <span className="text-[10px] text-red-400">{loadError}</span>
                                                            ) : isLoading ? (
                                                                <div className="h-6 w-32 animate-pulse rounded-md bg-gray-100 dark:bg-[#1A1A1A]" />
                                                            ) : allSessions.length === 0 ? (
                                                                <span className="text-[10px] text-gray-400 dark:text-[#555]">Нет активных сессий</span>
                                                            ) : (
                                                                allSessions.map((session) => (
                                                                    <SessionBadge key={session.id} session={session} />
                                                                ))
                                                            )}
                                                        </div>

                                                        {/* Latest expiry */}
                                                        <div className="self-center text-right text-[11px] font-medium">
                                                            {novaIdKnown && latestExpiry ? (
                                                                <span className={isExpired(latestExpiry) ? 'text-red-400' : 'text-gray-500 dark:text-gray-300'}>
                                                                    {formatExpiry(latestExpiry)}
                                                                </span>
                                                            ) : (
                                                                <span className="text-gray-300 dark:text-[#444]">—</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="pointer-events-none absolute inset-0 rounded-[28px] bg-white/34 backdrop-blur-[1px] dark:bg-[#06070A]/42" />

                <div className="pointer-events-none absolute inset-x-0 top-4 z-30 flex justify-center px-4 sm:top-6">
                    <div className="w-full max-w-2xl rounded-2xl border border-blue-500/20 bg-white/88 px-4 py-4 shadow-2xl shadow-slate-900/10 backdrop-blur-md dark:bg-[#0D1117]/88 sm:px-5">
                        <div className="flex items-start gap-4">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-500 text-white shadow-lg shadow-blue-500/20">
                                <Monitor size={20} />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-gray-900 dark:text-white">Временная заглушка</h3>
                                <p className="mt-0.5 text-[11px] leading-5 text-gray-500 dark:text-gray-400">
                                    Эта страница-заглушка временно сделана поверх готовой страницы, пока ведётся разработка.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ManagerDevicesPage;
