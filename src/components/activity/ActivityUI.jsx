import React, { useState } from 'react';
import {
    clampTooltipPosition,
    formatTimelineDuration,
    formatTimelineRange,
    getInitials,
} from '../../utils/activityTimeline';

export const BOARD_COLUMNS = 'grid-cols-[210px_minmax(450px,1fr)_85px_55px]';

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

export const getRoleBadge = (role) => roleBadgeClasses[role] || roleBadgeClasses.Unknown;

export const formatNumber = (value) => Number(value || 0).toLocaleString('ru-RU');

export const Tooltip = ({ segment }) => (
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

export const ActivityRail = React.memo(({ segments, status = 'ready', startLabel = '00:00', endLabel = '23:59' }) => {
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
                {segments.map((segment, index) => (
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

export const ManagerIdentity = React.memo(({ name, userId, avatarUrl, username, geo }) => {
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
                        <div className="relative group flex items-center gap-1.5 min-w-0">
                            <span className="text-[10px] text-gray-300 dark:text-[#444] shrink-0">•</span>
                            <span className="text-[9px] font-bold uppercase tracking-widest text-gray-500 dark:text-[#777] truncate cursor-pointer transition-colors hover:text-gray-700 dark:hover:text-gray-300">
                                {formattedGeo}
                            </span>
                            
                            <div className="pointer-events-none absolute left-4 top-full mt-1.5 z-50 w-max max-w-[250px] opacity-0 group-hover:opacity-100 transition-all duration-200 translate-y-1 group-hover:translate-y-0">
                                <div className="rounded-lg bg-gray-900 px-3 py-2 text-[10px] font-bold uppercase tracking-widest leading-relaxed text-white shadow-xl dark:bg-[#1E2026] dark:border dark:border-[#2B2F36]">
                                    {formattedGeo}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
});

export const ActivityRow = React.memo(({ item, pastDateRangeLabel, isDashboardView = false, hideIdentity = false, hideTraffic = false }) => {
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
    
    // adjust columns based on props
    let columnsClass = BOARD_COLUMNS;
    if (hideIdentity && hideTraffic) {
        columnsClass = 'grid-cols-[minmax(200px,1fr)_85px_55px]';
    } else if (hideIdentity) {
        columnsClass = 'grid-cols-[minmax(200px,1fr)_85px_55px]'; // Traffic is handled below
    }

    return (
        <div className={`grid ${columnsClass} items-center gap-6 ${isDashboardView ? 'py-4 px-6' : 'border-b border-gray-200 px-3 py-3 md:px-6 dark:border-[#1E2026] hover:bg-gray-50 dark:hover:bg-[#16181D]'}`}>
            {!hideIdentity && (
                <div className="min-w-0">
                    <ManagerIdentity 
                        name={item.managerName} 
                        userId={item.user_id} 
                        avatarUrl={item.avatar_url} 
                        username={item.telegramUsername}
                        geo={item.geo}
                    />
                </div>
            )}

            <div className="min-w-0 px-2 flex flex-col justify-center gap-1.5 py-1">
                {!hideTraffic && (item.todayDirect > 0 || item.todayComments > 0 || item.pastDirect > 0 || item.pastComments > 0) && (
                    <div className="flex items-center gap-1.5 text-[8px] font-bold text-gray-400 dark:text-[#555] uppercase tracking-widest pl-1 leading-none">
                        <span className="flex items-center gap-1 text-[#3B82F6]/90 dark:text-blue-400">
                            Дневной <span className="text-gray-700 dark:text-[#EAECEF] font-medium">Direct <span className="text-[10px] font-bold">{item.todayDirect}</span></span> <span className="text-gray-700 dark:text-[#EAECEF] font-medium">Комментарии <span className="text-[10px] font-bold">{item.todayComments}</span></span>
                        </span>
                        {pastDateRangeLabel && (
                            <>
                                <span className="text-gray-300 dark:text-[#333]">|</span>
                                <span className="flex items-center gap-1 text-[#10B981]/90 dark:text-emerald-400">
                                    База клиентов {pastDateRangeLabel ? `(${pastDateRangeLabel})` : ''} <span className="text-gray-700 dark:text-[#EAECEF] font-medium">Direct <span className="text-[10px] font-bold">{item.pastDirect}</span></span> <span className="text-gray-700 dark:text-[#EAECEF] font-medium">Комментарии <span className="text-[10px] font-bold">{item.pastComments}</span></span>
                                </span>
                            </>
                        )}
                    </div>
                )}
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
