import React, { startTransition, useDeferredValue, useEffect, useMemo, useState } from 'react';
import { supabase } from '../services/supabaseClient';
import { useAppStore } from '../store/appStore';
import {
    BarChart3,
    Calendar,
    MessageSquare,
    RefreshCw,
    Search,
    Timer,
    Users,
    AlertTriangle,
    Scissors,
    Clock,
    ChevronLeft,
    ChevronRight,
} from 'lucide-react';
import {
    buildTimelineFromPayload,
    clampTooltipPosition,
    computeSmartBounds,
    formatCoverageLabel,
    formatTimelineDuration,
    formatTimelineRange,
    getInitials,
} from '../utils/activityTimeline';

const API_BASE = '/novalumen-api/v1';
const API_OFFSET = 2;
const FILTER_ROLES = ['Sales', 'SeniorSales', 'SalesTaro', 'SalesTaroNew', 'Consultant', 'SMM', 'SeniorSMM', 'Admin', 'C-level', 'HR'];
const TIMELINE_BATCH_SIZE = 8;
const BOARD_COLUMNS = 'grid-cols-[210px_minmax(450px,1fr)_85px_55px]';

const buildApiBoundary = (dateValue, endOfDay = false) => `${dateValue}T${endOfDay ? '23:59:59' : '00:00:00'}-00:00`;
const buildLocalBoundary = (dateValue, endOfDay = false) => `${dateValue}T${endOfDay ? '23:59:59' : '00:00:00'}`;

const formatNumber = (value) => Number(value || 0).toLocaleString('ru-RU');

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
    Unknown: 'border-white/10 bg-white/5 text-white/55',
};

const getRoleBadge = (role) => roleBadgeClasses[role] || roleBadgeClasses.Unknown;

const Tooltip = ({ segment }) => (
    <div
        className="pointer-events-none absolute -top-14 z-20 rounded-lg bg-white px-3 py-2 text-[10px] leading-tight text-gray-900 shadow-xl border border-gray-200 dark:bg-[#1E2026] dark:text-white dark:border-[#2B2F36]"
        style={{ left: `${clampTooltipPosition(segment.centerPct)}%`, transform: 'translateX(-50%)' }}
    >
        <div className={`mb-1 font-bold uppercase tracking-wider ${segment.active ? 'text-[#25C266]' : 'text-[#C9264E]'}`}>
            {segment.active ? 'Активность' : 'Пауза'}
        </div>
        <div className="whitespace-nowrap text-gray-500 dark:text-white/80">{formatTimelineRange(segment.startMs, segment.endMs)}</div>
    </div>
);

const ActivityRail = React.memo(({ segments, status = 'ready', startLabel = '00:00', endLabel = '23:59' }) => {
    const [hoveredSegment, setHoveredSegment] = useState(null);

    if (status !== 'ready') {
        return (
            <div className="relative w-full">
                <div className="flex h-[36px] w-full items-center justify-center rounded-lg bg-gray-100 border border-gray-200 dark:bg-[#1A1A1A] dark:border-[#222]">
                    <span className="text-[9px] font-bold uppercase tracking-[0.16em] text-gray-400 dark:text-[#555]">
                        Нет данных
                    </span>
                </div>
                <div className="mt-1 flex items-center text-[10px] font-medium text-gray-400 dark:text-[#444]">
                    Таймлайн недоступен
                </div>
            </div>
        );
    }

    return (
        <div className="relative w-full">
            {hoveredSegment && <Tooltip segment={hoveredSegment} />}

            <div className="flex h-[36px] w-full items-stretch gap-0 rounded-lg bg-gray-100 p-[3px] border border-gray-200 dark:bg-[#0A0C11] dark:border-[#1E2026]">
                {segments.map((segment, index, arr) => (
                    <div
                        key={`${segment.startMs}-${segment.endMs}-${segment.active ? 'on' : 'off'}-${index}`}
                        onMouseEnter={() => setHoveredSegment(segment)}
                        onMouseLeave={() => setHoveredSegment(null)}
                        className={`h-full min-w-[1px] rounded-[5px] transition-opacity duration-100 hover:opacity-80 ${
                            segment.active
                                ? 'bg-[#25C266]'
                                : 'bg-[#E8364F]'
                        }`}
                        style={{ width: `${segment.widthPct}%` }}
                    />
                ))}
            </div>

            <div className="mt-1 flex items-center justify-between text-[9px] font-semibold text-gray-400 dark:text-[#555]">
                <span>{startLabel}</span>
                <span>{endLabel}</span>
            </div>
        </div>
    );
});

const ManagerIdentity = React.memo(({ name, userId, avatarUrl, username, geo }) => {
    const handleCopy = (e, text) => {
        e.preventDefault();
        e.stopPropagation();
        if (text) {
            navigator.clipboard.writeText(text);
            window.dispatchEvent(
                new CustomEvent('show-toast', {
                    detail: { message: 'Никнейм скопирован', type: 'success' },
                })
            );
        }
    };

    const formattedGeo = Array.isArray(geo) ? geo.join(', ') : geo;

    return (
        <div className="flex items-center gap-3 min-w-0 pr-2">
            {avatarUrl ? (
                <img src={avatarUrl} alt="" className="h-10 w-10 shrink-0 rounded-full object-cover ring-1 ring-gray-200 dark:ring-white/10" />
            ) : (
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-100 text-xs font-bold text-gray-500 ring-1 ring-gray-200 dark:bg-white/8 dark:text-white/80 dark:ring-white/10">
                    {getInitials(name)}
                </div>
            )}
            <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-gray-900 dark:text-white">{name}</div>
                <div className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-1">
                    {username ? (
                        <button 
                            onClick={(e) => handleCopy(e, username)}
                            className="text-[10px] font-medium text-emerald-600 transition-colors hover:text-emerald-500 hover:underline truncate dark:text-[#0ECB81] dark:hover:text-[#12e091]"
                            title="Скопировать никнейм"
                        >
                            @{username.replace(/^@/, '')}
                        </button>
                    ) : (
                        <span className="text-[10px] font-medium text-gray-400 dark:text-[#555]">#{userId}</span>
                    )}
                    {formattedGeo && (
                        <>
                            <span className="text-[10px] text-gray-300 dark:text-[#444]">•</span>
                            <span className="text-[9px] font-bold uppercase tracking-widest text-gray-500 dark:text-[#777] truncate">{formattedGeo}</span>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
});

const ActivityRow = React.memo(({ item }) => {
    const hasTimeline = item.timelineStatus === 'ready';
    
    let workTimeClass = 'text-gray-400 dark:text-gray-500'; // Default / no activity
    if (item.activeDurationMs > 0) {
        const activeHours = item.activeDurationMs / 3600000;
        if (activeHours >= 6.5) {
            workTimeClass = 'text-emerald-600 dark:text-[#25C266]'; // Green (>= 6h 30m)
        } else if (activeHours >= 6) {
            workTimeClass = 'text-amber-500 dark:text-yellow-400'; // Yellow
        } else if (activeHours >= 5) {
            workTimeClass = 'text-rose-500 dark:text-rose-400'; // Soft red
        } else {
            workTimeClass = 'text-red-600 dark:text-[#FF2A2A] drop-shadow-[0_0_2px_rgba(255,0,0,0.5)]'; // Screaming red
        }
    }

    const unknownWorkTimeClass = 'text-gray-400 dark:text-[#555]';

    return (
        <div className={`grid ${BOARD_COLUMNS} items-center gap-6 border-b border-gray-200 px-3 py-3 hover:bg-gray-50 md:px-6 dark:border-[#1E2026] dark:hover:bg-[#16181D]`}>
            <div className="min-w-0">
                <ManagerIdentity 
                    name={item.managerName} 
                    userId={item.user_id} 
                    avatarUrl={item.avatar_url} 
                    username={item.telegramUsername}
                    geo={item.geo}
                />
            </div>

            <div className="min-w-0 px-2 flex items-center">
                <ActivityRail segments={item.timelineSegments} status={item.timelineStatus} startLabel={item.timelineStartLabel} endLabel={item.timelineEndLabel} />
            </div>

            <div className="flex flex-col items-end gap-2">
                <span className={`text-[11px] font-black tracking-wide ${hasTimeline ? workTimeClass : unknownWorkTimeClass}`}>
                    {hasTimeline ? formatTimelineDuration(item.activeDurationMs || 0) : '—'}
                </span>
                <span className={`inline-flex items-center rounded-[4px] border px-1.5 py-[3px] text-[8px] font-bold uppercase tracking-widest leading-none ${getRoleBadge(item.role)}`}>
                    {item.role}
                </span>
            </div>

            <div className="flex flex-col items-end gap-1.5">
                <div className="text-[11px] font-black tracking-wide text-gray-900 dark:text-[#EAECEF]">{formatNumber(item.totalMessages)}</div>
                <div className="text-[8px] font-bold uppercase tracking-wider text-gray-400 dark:text-[#777]">смс</div>
            </div>
        </div>
    );
});

const ActivityRowSkeleton = ({ index }) => (
    <div key={index} className={`grid ${BOARD_COLUMNS} items-center gap-6 border-b border-gray-200 px-3 py-3 md:px-6 dark:border-[#1E2026]`}>
        <div className="flex items-center gap-3">
            <div className="h-10 w-10 animate-pulse rounded-full bg-gray-200 dark:bg-[#1A1C23]" />
            <div className="space-y-2">
                <div className="h-3.5 w-32 animate-pulse rounded bg-gray-200 dark:bg-[#1A1C23]" />
                <div className="h-2.5 w-16 animate-pulse rounded bg-gray-200 dark:bg-[#1A1C23]" />
            </div>
        </div>
        <div className="px-2">
            <div className="h-[36px] animate-pulse rounded-lg bg-gray-200 dark:bg-[#1A1C23]" />
        </div>
        <div className="ml-auto space-y-2 text-right">
            <div className="ml-auto h-4 w-16 animate-pulse rounded bg-gray-200 dark:bg-[#1A1C23]" />
            <div className="ml-auto h-2.5 w-20 animate-pulse rounded bg-gray-200 dark:bg-[#1A1C23]" />
        </div>
        <div className="ml-auto space-y-2 text-right">
            <div className="ml-auto h-4 w-10 animate-pulse rounded bg-gray-200 dark:bg-[#1A1C23]" />
            <div className="ml-auto h-2.5 w-14 animate-pulse rounded bg-gray-200 dark:bg-[#1A1C23]" />
        </div>
    </div>
);

const EmptyState = ({ icon: Icon, title, description, tone = 'default' }) => {
    const toneClasses = tone === 'warning'
        ? 'border-amber-400/20 bg-amber-500/10 text-amber-600 dark:text-amber-200'
        : 'border-gray-200 bg-gray-100 text-gray-500 dark:border-white/8 dark:bg-white/[0.04] dark:text-white/80';

    return (
        <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
            <div className={`mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border ${toneClasses}`}>
                <Icon size={24} />
            </div>
            <div className="text-lg font-semibold text-gray-900 dark:text-white">{title}</div>
            <div className="mt-2 max-w-md text-sm leading-relaxed text-gray-400 dark:text-white/45">{description}</div>
        </div>
    );
};

const chunkArray = (items, size) => {
    const chunks = [];
    for (let index = 0; index < items.length; index += size) {
        chunks.push(items.slice(index, index + size));
    }
    return chunks;
};

const getTimelineRequestErrorMessage = (status) => {
    if (status === 401 || status === 403) {
        return 'Локальный proxy не авторизован. Перезапусти `npm run dev`, чтобы Vite перечитал `NOVALUMEN_API_SECRET` из `.env.local`.';
    }

    if (status === 404) {
        return 'Таймлайн не найден на стороне Novalumen. Проверь после перезапуска `npm run dev`.';
    }

    return `Не удалось загрузить таймлайн (HTTP ${status})`;
};

const fetchTimelineForUser = async (userId, encodedFrom, encodedTo) => {
    const response = await fetch(
        `${API_BASE}/users/statistics/sent-messages?from_dt=${encodedFrom}&to_dt=${encodedTo}&offset=${API_OFFSET}&user_id=${userId}`
    );

    if (!response.ok) {
        throw new Error(getTimelineRequestErrorMessage(response.status));
    }

    return response.json();
};

const fetchTimelineInDev = async (userIds, fromDt, toDt) => {
    const results = {};
    const errors = {};
    const encodedFrom = encodeURIComponent(fromDt);
    const encodedTo = encodeURIComponent(toDt);
    const [firstUserId, ...restUserIds] = userIds;

    if (!firstUserId) {
        return { results, errors };
    }

    // First probe prevents a burst of identical browser errors if auth/CORS is broken.
    try {
        results[firstUserId] = await fetchTimelineForUser(firstUserId, encodedFrom, encodedTo);
    } catch (error) {
        errors.global = error instanceof Error ? error.message : 'Не удалось подключиться к Novalumen';
        return { results, errors };
    }

    for (const batch of chunkArray(restUserIds, TIMELINE_BATCH_SIZE)) {
        await Promise.all(batch.map(async (userId) => {
            try {
                results[userId] = await fetchTimelineForUser(userId, encodedFrom, encodedTo);
            } catch (error) {
                errors[userId] = error instanceof Error ? error.message : 'Ошибка загрузки таймлайна';
            }
        }));
    }

    return { results, errors };
};

const ManagerActivityEfficiencyPage = () => {
    const storeManagers = useAppStore((state) => state.managers);

    const [localManagers, setLocalManagers] = useState(null);
    const today = new Date().toISOString().split('T')[0];
    const [date, setDate] = useState(today);

    const handlePrevDay = () => {
        const d = new Date(date);
        d.setDate(d.getDate() - 1);
        setDate(d.toISOString().split('T')[0]);
    };

    const handleNextDay = () => {
        const d = new Date(date);
        d.setDate(d.getDate() + 1);
        setDate(d.toISOString().split('T')[0]);
    };
    const [roleFilter, setRoleFilter] = useState('all');
    const [hideInactive, setHideInactive] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    const deferredSearchQuery = useDeferredValue(searchQuery);

    const [statsData, setStatsData] = useState([]);
    const [timelinePayloads, setTimelinePayloads] = useState({});
    const [timelineErrors, setTimelineErrors] = useState({});
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [timelineMode, setTimelineMode] = useState('smart');

    useEffect(() => {
        let isMounted = true;

        const fetchManagers = async () => {
            const { data } = await supabase.from('managers').select('*');
            if (isMounted && data) setLocalManagers(data);
        };

        fetchManagers();
        return () => {
            isMounted = false;
        };
    }, []);

    const managers = localManagers || storeManagers || [];

    const managerMap = useMemo(() => {
        const map = {};
        managers.forEach((manager) => {
            if (manager.telegram_id) map[String(manager.telegram_id)] = manager;
        });
        return map;
    }, [managers]);

    const rangeStartForApi = useMemo(() => buildApiBoundary(date, false), [date]);
    const rangeEndForApi = useMemo(() => buildApiBoundary(date, true), [date]);
    const rangeStartForTimeline = useMemo(() => buildLocalBoundary(date, false), [date]);
    const rangeEndForTimeline = useMemo(() => buildLocalBoundary(date, true), [date]);

    const fetchEfficiencyData = async () => {
        setIsLoading(true);
        setError(null);

        try {
            let normalizedStats = [];
            
            // Try Edge Function first if deployed, fallback to local proxy in dev if it fails
            const invokeResult = await supabase.functions.invoke('novalumen-statistics', {
                body: { fromDt: rangeStartForApi, toDt: rangeEndForApi, offset: API_OFFSET }
            });

            if (!invokeResult.error && invokeResult.data?.data) {
                 const rawStats = invokeResult.data.data;
                 normalizedStats = Array.isArray(rawStats) ? rawStats : Array.isArray(rawStats?.data) ? rawStats.data : [];
            } else {
                 if (import.meta.env.DEV) {
                     // Fallback for dev if the Edge Function is not deployed locally yet
                     const statsUrl = `${API_BASE}/users/statistics?from_dt=${encodeURIComponent(rangeStartForApi)}&to_dt=${encodeURIComponent(rangeEndForApi)}&offset=${API_OFFSET}`;
                     const statsResponse = await fetch(statsUrl);
                     if (!statsResponse.ok) throw new Error(`Статистика недоступна (HTTP ${statsResponse.status}) - ${invokeResult.error?.message || ''}`);

                     const rawStats = await statsResponse.json();
                     normalizedStats = Array.isArray(rawStats) ? rawStats : Array.isArray(rawStats?.data) ? rawStats.data : [];
                 } else {
                     throw new Error(`Edge Function novalumen-statistics failed: ${invokeResult.error?.message || 'Unknown'}`);
                 }
            }

            setStatsData(normalizedStats);

            const userIds = normalizedStats.map((item) => item.user_id).filter(Boolean);
            if (userIds.length === 0) {
                setTimelinePayloads({});
                setTimelineErrors({});
                return;
            }

            if (import.meta.env.DEV) {
                const timelineData = await fetchTimelineInDev(userIds, rangeStartForApi, rangeEndForApi);
                setTimelinePayloads(timelineData.results || {});
                setTimelineErrors(timelineData.errors || {});
                return;
            }

            const { data, error: invokeError } = await supabase.functions.invoke('novalumen-sent-messages', {
                body: {
                    fromDt: rangeStartForApi,
                    toDt: rangeEndForApi,
                    offset: API_OFFSET,
                    userIds,
                },
            });

            if (invokeError) {
                console.error('Timeline invoke error:', invokeError);
                setTimelinePayloads({});
                setTimelineErrors({ global: invokeError.message || 'Не удалось загрузить интервалы сообщений' });
                return;
            }

            setTimelinePayloads(data?.results || {});
            setTimelineErrors(data?.errors || {});
        } catch (fetchError) {
            console.error('Efficiency fetch error:', fetchError);
            setError(fetchError.message || 'Не удалось загрузить данные');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchEfficiencyData();
    }, [rangeStartForApi, rangeEndForApi]);

    // Smart bounds: crop to working hours, expanding if any manager has activity outside
    const smartBounds = useMemo(() => {
        if (timelineMode === 'full' || Object.keys(timelinePayloads).length === 0) return null;
        return computeSmartBounds(timelinePayloads, rangeStartForTimeline, rangeEndForTimeline);
    }, [timelineMode, timelinePayloads, rangeStartForTimeline, rangeEndForTimeline]);

    const effectiveRangeStart = smartBounds?.startIso || rangeStartForTimeline;
    const effectiveRangeEnd = smartBounds?.endIso || rangeEndForTimeline;
    const timelineStartLabel = smartBounds?.startLabel || '00:00';
    const timelineEndLabel = smartBounds?.endLabel || '23:59';

    const preparedRows = useMemo(() => {
        return statsData.map((item) => {
            const manager = item.telegram_id ? managerMap[String(item.telegram_id)] : null;
            const managerName = manager?.name || [item.name, item.last_name].filter(Boolean).join(' ') || 'Неизвестный менеджер';
            const hasTimelinePayload = Object.prototype.hasOwnProperty.call(timelinePayloads, item.user_id);
            const timelineError = timelineErrors[item.user_id] || timelineErrors.global || null;
            const timelineStatus = hasTimelinePayload ? 'ready' : timelineError ? 'unavailable' : 'ready';
            const timelineData = hasTimelinePayload
                ? buildTimelineFromPayload(
                    timelinePayloads[item.user_id] || [],
                    effectiveRangeStart,
                    effectiveRangeEnd,
                    2
                )
                : null;

            return {
                ...item,
                manager,
                managerName,
                role: manager?.role || 'Unknown',
                avatar_url: manager?.avatar_url || null,
                telegramUsername: manager?.telegram_username || null,
                geo: manager?.geo || null,
                totalMessages: Number(item.total_messages_count) || timelineData?.messageCount || 0,
                timelineStatus,
                timelineError,
                timelineSegments: timelineData?.segments || [],
                activeDurationMs: timelineData?.activeDurationMs ?? null,
                coveragePct: timelineData?.coveragePct ?? null,
                timelineStartLabel,
                timelineEndLabel,
            };
        });
    }, [managerMap, effectiveRangeStart, effectiveRangeEnd, statsData, timelinePayloads, timelineStartLabel, timelineEndLabel]);

    const filteredRows = useMemo(() => {
        const normalizedQuery = deferredSearchQuery.trim().toLowerCase();

        return preparedRows
            .filter((item) => {
                if (roleFilter !== 'all' && item.role !== roleFilter) return false;
                if (hideInactive && item.totalMessages === 0) return false;
                if (!normalizedQuery) return true;

                const managerName = item.managerName?.toLowerCase() || '';
                const telegramUsername = item.manager?.telegram_username?.toLowerCase() || '';
                const userIdLabel = String(item.user_id || '');
                return managerName.includes(normalizedQuery) || telegramUsername.includes(normalizedQuery) || userIdLabel.includes(normalizedQuery);
            })
            .sort((a, b) => {
                if (b.totalMessages !== a.totalMessages) return b.totalMessages - a.totalMessages;
                return (b.activeDurationMs || 0) - (a.activeDurationMs || 0);
            });
    }, [deferredSearchQuery, hideInactive, preparedRows, roleFilter]);

    const summary = useMemo(() => {
        return filteredRows.reduce((acc, item) => {
            acc.totalMessages += item.totalMessages;
            acc.totalActiveDurationMs += item.activeDurationMs || 0;
            if (item.totalMessages > 0) acc.activeManagers += 1;
            return acc;
        }, { totalMessages: 0, totalActiveDurationMs: 0, activeManagers: 0 });
    }, [filteredRows]);

    const roleOptions = useMemo(() => {
        const roleSet = new Set(FILTER_ROLES);
        managers.forEach((manager) => {
            if (manager.role) roleSet.add(manager.role);
        });
        return ['all', ...Array.from(roleSet)];
    }, [managers]);

    const timelineIssuesCount = Object.keys(timelineErrors).length;

    return (
        <div className="pb-0">
            <div className="sticky top-0 z-20 -mx-3 border-b border-gray-200 bg-[#F5F5F5] px-3 py-3 dark:border-[#1E2026] dark:bg-[#0A0A0A] md:-mx-6 md:px-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <h2 className="flex items-center gap-2 text-lg font-bold tracking-tight dark:text-white">
                            <BarChart3 size={18} className="text-emerald-500" />
                            <span>Эффективность</span>
                        </h2>
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                            Таймлайн активности по отправленным сообщениям с шагом 2 минуты
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-[11px] font-medium text-gray-500 dark:text-gray-400">
                        <span className="inline-flex items-center gap-1 rounded-full border border-[#25C266]/30 bg-[#25C266]/10 px-2.5 py-1 text-[#25C266]">
                            <span className="h-2 w-2 rounded-full bg-[#25C266]" />
                            Есть SMS
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-full border border-[#C9264E]/30 bg-[#C9264E]/10 px-2.5 py-1 text-[#C9264E]">
                            <span className="h-2 w-2 rounded-full bg-[#C9264E]" />
                            Нет SMS
                        </span>
                    </div>
                </div>
            </div>

            <div className="flex flex-col">
                <div className="-mx-3 flex flex-wrap items-center gap-3 border-b border-gray-200 bg-white px-3 py-3 shadow-sm md:-mx-6 md:px-6 dark:border-[#1E2026] dark:bg-[#0C0E14]">
                    <div className="flex items-center gap-1 rounded-lg border border-gray-200 bg-white p-1 shadow-sm transition-colors focus-within:border-emerald-400 dark:border-[#2A2A2A] dark:bg-[#16181d]">
                        <button
                            onClick={handlePrevDay}
                            className="flex h-7 w-7 items-center justify-center rounded-md text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-[#1E2026] dark:hover:text-white"
                        >
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
                        <button
                            onClick={handleNextDay}
                            className="flex h-7 w-7 items-center justify-center rounded-md text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-[#1E2026] dark:hover:text-white"
                        >
                            <ChevronRight size={14} />
                        </button>
                    </div>

                    <select
                        value={roleFilter}
                        onChange={(e) => setRoleFilter(e.target.value)}
                        className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-medium outline-none transition-colors focus:border-emerald-400 dark:border-[#2A2A2A] dark:bg-[#16181d] dark:text-white"
                    >
                        {roleOptions.map((role) => (
                            <option key={role} value={role}>
                                {role === 'all' ? 'Все роли' : role}
                            </option>
                        ))}
                    </select>

                    <label className="relative min-w-[220px] flex-1">
                        <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => {
                                const value = e.target.value;
                                startTransition(() => setSearchQuery(value));
                            }}
                            placeholder="Поиск по имени, @username или ID"
                            className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-9 pr-3 text-xs font-medium outline-none transition-colors focus:border-emerald-400 dark:border-[#2A2A2A] dark:bg-[#16181d] dark:text-white"
                        />
                    </label>

                    <label className="inline-flex items-center gap-2 text-xs font-medium text-gray-500 dark:text-gray-400">
                        <input
                            type="checkbox"
                            checked={hideInactive}
                            onChange={(e) => setHideInactive(e.target.checked)}
                            className="rounded border-gray-300"
                        />
                        Скрыть без сообщений
                    </label>

                    <div className="flex items-center rounded-lg border border-gray-200 dark:border-[#2A2A2A] overflow-hidden">
                        <button
                            onClick={() => setTimelineMode('smart')}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-2 text-[11px] font-semibold transition-colors ${
                                timelineMode === 'smart'
                                    ? 'bg-emerald-600 text-white'
                                    : 'bg-white text-gray-500 hover:bg-gray-50 dark:bg-[#16181d] dark:text-gray-400 dark:hover:bg-[#1E2026]'
                            }`}
                        >
                            <Scissors size={11} />
                            Активность
                        </button>
                        <button
                            onClick={() => setTimelineMode('full')}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-2 text-[11px] font-semibold transition-colors ${
                                timelineMode === 'full'
                                    ? 'bg-emerald-600 text-white'
                                    : 'bg-white text-gray-500 hover:bg-gray-50 dark:bg-[#16181d] dark:text-gray-400 dark:hover:bg-[#1E2026]'
                            }`}
                        >
                            <Clock size={11} />
                            Полные сутки
                        </button>
                    </div>

                    <button
                        onClick={fetchEfficiencyData}
                        disabled={isLoading}
                        className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        <RefreshCw size={12} className={isLoading ? 'animate-spin' : ''} />
                        Обновить
                    </button>
                </div>

                <div className="-mx-3 flex flex-wrap items-center gap-x-5 gap-y-2 border-b border-gray-200 bg-[#FAFAFA] px-3 py-2 text-[11px] font-medium text-gray-500 md:-mx-6 md:px-6 dark:border-[#1E2026] dark:bg-[#0A0C11] dark:text-gray-400">
                    <span className="inline-flex items-center gap-1.5">
                        <Users size={13} />
                        Показано: <span className="font-bold text-gray-800 dark:text-white">{filteredRows.length}</span>
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                        <BarChart3 size={13} />
                        Активных: <span className="font-bold text-gray-800 dark:text-white">{summary.activeManagers}</span>
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                        <MessageSquare size={13} />
                        Сообщений: <span className="font-bold text-gray-800 dark:text-white">{formatNumber(summary.totalMessages)}</span>
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                        <Timer size={13} />
                        Время активности: <span className="font-bold text-gray-800 dark:text-white">{formatTimelineDuration(summary.totalActiveDurationMs)}</span>
                    </span>
                </div>

                {error && (
                    <div className="-mx-3 border-b border-rose-500/20 bg-rose-500/10 px-3 py-3 text-sm font-medium text-rose-600 md:-mx-6 md:px-6 dark:text-rose-300">
                        Ошибка загрузки: {error}
                    </div>
                )}

                {!error && timelineIssuesCount > 0 && (
                    <div className="-mx-3 border-b border-amber-500/20 bg-amber-500/10 px-3 py-3 text-sm text-amber-700 md:-mx-6 md:px-6 dark:text-amber-200">
                        {timelineErrors.global || 'Для части менеджеров таймлайн не загрузился. Таблица всё равно покажется, но отдельные строки могут остаться полностью красными.'}
                    </div>
                )}

                <div className="-mx-3 overflow-x-clip overflow-y-visible bg-white md:-mx-6 dark:bg-[#0A0C11]">
                    <div className="overflow-x-auto overflow-y-visible">
                        <div className="min-w-[900px]">
                            <div className={`grid ${BOARD_COLUMNS} gap-6 bg-gray-50 border-b border-gray-200 px-3 py-4 text-[9px] font-bold uppercase tracking-widest text-gray-400 md:px-6 dark:bg-[#12141A] dark:border-[#1E2026] dark:text-[#777]`}>
                                <div>Менеджер</div>
                                <div className="px-2">Таймлайн активности</div>
                                <div className="text-right">Рабочее время</div>
                                <div className="text-right">SMS</div>
                            </div>

                            <div className="flex flex-col [&>div:last-child]:border-b-0">
                                {isLoading ? (
                                    Array.from({ length: 6 }, (_, index) => <ActivityRowSkeleton key={index} index={index} />)
                                ) : filteredRows.length === 0 ? (
                                    <EmptyState
                                        icon={Users}
                                        title="Нет данных за выбранный период"
                                        description="Попробуй расширить даты или отключить фильтр скрытия неактивных менеджеров."
                                    />
                                ) : (
                                    filteredRows.map((item) => <ActivityRow key={item.user_id} item={item} />)
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {!isLoading && filteredRows.length > 0 && timelineIssuesCount > 0 && !timelineErrors.global && (
                    <div className="-mx-3 flex items-start gap-2 border-b border-amber-500/20 bg-amber-500/10 px-3 py-3 text-xs text-amber-800 md:-mx-6 md:px-6 dark:text-amber-200">
                        <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                        <span>
                            Если какой-то менеджер выглядит полностью неактивным, а сообщения у него точно были, пришли мне пример ответа `sent-messages` для одного такого `user_id`. Я быстро уточню парсер под точный формат API.
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ManagerActivityEfficiencyPage;
