import React, { useEffect, useState, useMemo } from 'react';
import { supabase } from '../../../services/supabaseClient';
import { useAppStore } from '../../../store/appStore';
import { ActivityRow } from '../../../components/activity/ActivityUI';
import { buildTimelineFromPayload, computeSmartBounds } from '../../../utils/activityTimeline';

const API_OFFSET = 2; // Fixed timezone offset for APIs
const TIMELINE_BATCH_SIZE = 1;

const buildApiBoundary = (dateValue, endOfDay = false) => `${dateValue}T${endOfDay ? '23:59:59' : '00:00:00'}-00:00`;
const buildLocalBoundary = (dateValue, endOfDay = false) => `${dateValue}T${endOfDay ? '23:59:59' : '00:00:00'}`;

import { MessageSquare } from 'lucide-react';

export const CurrentManagerActivityWidget = () => {
    const currentUser = useAppStore((state) => state.user);
    const channelsMap = useAppStore((state) => state.channelsMap);
    const countries = useAppStore((state) => state.countries);

    const [itemData, setItemData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!currentUser) return;

        let isMounted = true;
        
        const fetchActivity = async () => {
            setIsLoading(true);
            const today = new Date().toISOString().split('T')[0];
            const rangeStartForApi = buildApiBoundary(today, false);
            const rangeEndForApi = buildApiBoundary(today, true);
            const rangeStartForTimeline = buildLocalBoundary(today, false);
            const rangeEndForTimeline = buildLocalBoundary(today, true);

            try {
                // Fetch traffic
                let todayDirect = 0;
                let todayComments = 0;
                const activeDate = today;

                const dEnd = new Date(today);
                dEnd.setDate(dEnd.getDate() + 1);
                const trafficEndApi = dEnd.toISOString().split('T')[0];

                const { data: leadData } = await supabase.rpc('get_lead_stats_v2', { start_date: activeDate, end_date: trafficEndApi });
                
                let mapToUse = channelsMap;
                if (!mapToUse || Object.keys(mapToUse).length === 0) {
                    const { data: cData } = await supabase.from('channels').select('id, wazzup_id, country_code');
                    const tempMap = {};
                    if (cData) {
                        cData.forEach(c => {
                            tempMap[c.wazzup_id] = c.country_code;
                            tempMap[c.id] = c.country_code;
                        });
                        mapToUse = tempMap;
                    }
                }

                if (leadData && currentUser.geo) {
                    const geoArray = Array.isArray(currentUser.geo) ? currentUser.geo : currentUser.geo.split(',').map(g => g.trim().toUpperCase());
                    
                    leadData.forEach((stat) => {
                        const countryCode = mapToUse[stat.channel_id];
                        if (!countryCode) return;
                        if (!geoArray.includes(countryCode)) return; // Only count for this manager's geos

                        const dateStr = stat.created_date;
                        const count = Number(stat.count || 0);

                        if (dateStr === activeDate) {
                            if (stat.is_comment) todayComments += count;
                            else todayDirect += count;
                        }
                    });
                }

                // Fetch total messages and user_id from stats
                let totalMessages = 0;
                let novalumenUserId = null;

                const invokeResult = await supabase.functions.invoke('novalumen-statistics', {
                    body: { fromDt: rangeStartForApi, toDt: rangeEndForApi, offset: API_OFFSET }
                });

                if (!invokeResult.error && invokeResult.data && !invokeResult.data.error) {
                    const rawStats = Array.isArray(invokeResult.data.data) ? invokeResult.data.data : [];
                    // Match by telegram_id just like ManagerActivityEfficiencyPage
                    const mgrStat = rawStats.find(s => String(s.telegram_id) === String(currentUser.telegram_id));
                    if (mgrStat) {
                        novalumenUserId = mgrStat.user_id;
                        totalMessages = Number(mgrStat.total_messages_count) || 0;
                    }
                }

                // Fetch Timeline
                let timelinePayloads = {};
                let timelineErrors = {};

                if (novalumenUserId) {
                    const { data: tlData, error: tlError } = await supabase.functions.invoke('novalumen-sent-messages', {
                        body: {
                            fromDt: rangeStartForApi,
                            toDt: rangeEndForApi,
                            offset: API_OFFSET,
                            userIds: [novalumenUserId],
                        },
                    });

                    if (tlError) {
                        timelineErrors = { global: tlError.message || 'Ошибка таймлайна' };
                    } else {
                        timelinePayloads = tlData?.results || {};
                        timelineErrors = tlData?.errors || {};
                    }
                } else {
                    timelineErrors = { global: 'Пользователь не найден в системе статистики' };
                }

                // Format data
                const geoString = currentUser.geo || null;
                let displayGeo = geoString;
                if (geoString) {
                    const geoArray = Array.isArray(geoString) ? geoString : geoString.split(',').map(g => g.trim().toUpperCase());
                    displayGeo = geoArray.map((g) => {
                        const country = countries?.find(c => c.code === g);
                        return country ? `${country.emoji} ${country.name}` : g;
                    }).join(', ');
                }

                const smartBounds = Object.keys(timelinePayloads).length > 0 ? computeSmartBounds(timelinePayloads, rangeStartForTimeline, rangeEndForTimeline) : null;
                const effectiveRangeStart = smartBounds?.startIso || rangeStartForTimeline;
                const effectiveRangeEnd = smartBounds?.endIso || rangeEndForTimeline;
                const timelineStartLabel = smartBounds?.startLabel || '00:00';
                const timelineEndLabel = smartBounds?.endLabel || '23:59';

                const hasTimelinePayload = novalumenUserId && Object.prototype.hasOwnProperty.call(timelinePayloads, novalumenUserId);
                const timelineError = (novalumenUserId && timelineErrors[novalumenUserId]) || timelineErrors.global || null;
                let timelineStatus = hasTimelinePayload ? 'ready' : timelineError ? 'unavailable' : 'ready';
                
                const timelineData = hasTimelinePayload
                    ? buildTimelineFromPayload(
                        timelinePayloads[novalumenUserId] || [],
                        effectiveRangeStart,
                        effectiveRangeEnd,
                        2
                    ) : null;

                if (isMounted) {
                    setItemData({
                        user_id: novalumenUserId || currentUser.id,
                        managerName: [currentUser.name, currentUser.last_name].filter(Boolean).join(' ') || 'Менеджер',
                        role: currentUser.role || 'Unknown',
                        avatar_url: currentUser.avatar_url || null,
                        telegramUsername: currentUser.telegram_username || null,
                        geo: displayGeo,
                        todayDirect,
                        todayComments,
                        pastDirect: 0,
                        pastComments: 0,
                        totalMessages: totalMessages || timelineData?.messageCount || 0,
                        timelineStatus,
                        timelineError,
                        timelineSegments: timelineData?.segments || [],
                        activeDurationMs: timelineData?.activeDurationMs ?? null,
                        timelineStartLabel,
                        timelineEndLabel,
                    });
                }

            } catch (err) {
                console.error("Failed to load widget activity", err);
            } finally {
                if (isMounted) setIsLoading(false);
            }
        };

        fetchActivity();

        return () => { isMounted = false; };
    }, [currentUser, channelsMap, countries]);

    if (!currentUser || isLoading) {
        return (
            <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-white/5 dark:bg-[#111318] mb-6 min-h-[90px] flex items-center justify-center">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
            </div>
        );
    }

    if (!itemData) return null;

    return (
        <div className="mb-6 -mx-1 md:mx-0 bg-white dark:bg-[#111] border border-gray-200 dark:border-[#333] rounded-xl shadow-sm transition-colors duration-200">
            <div className="px-4 py-3 border-b border-gray-200 dark:border-[#333] flex items-center justify-between bg-gray-50/50 dark:bg-[#161616] rounded-t-xl">
                <div className="flex items-center gap-2">
                    <MessageSquare size={14} className="text-gray-400 shrink-0" />
                    <span className="text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-400">
                        Активность в чатах за сегодня <span className="lowercase font-semibold text-gray-400 dark:text-[#777] ml-1 tracking-normal">(норма от 6 часов и выше)</span>
                    </span>
                </div>
            </div>
            <div className="w-full relative overflow-visible">
                <ActivityRow 
                    item={itemData} 
                    pastDateRangeLabel="" 
                    isDashboardView={true} 
                    hideIdentity={true} 
                    hideTraffic={true} 
                />
            </div>
        </div>
    );
};
