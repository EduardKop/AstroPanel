import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/appStore';
import { supabase } from '../services/supabaseClient';
import { showToast } from '../utils/toastEvents';
import { Calendar, Settings, Edit, ChevronLeft, ChevronRight, Users2 } from 'lucide-react';
import AdvancedScheduleModal from '../components/AdvancedScheduleModal';
import MultiGeoModal from '../components/MultiGeoModal';
import ScheduleStats from '../components/ScheduleStats';
import AutoFillModal from '../components/AutoFillModal';

// --- GEO COLORS & CODES ---
const GEO_PALETTE = {
    'UA': { color: '#0ea5e9', label: 'Укр' },
    'PL': { color: '#ef4444', label: 'Пол' },
    'CZ': { color: '#8b5cf6', label: 'Чех' },
    'DE': { color: '#f59e0b', label: 'Гер' },
    'IT': { color: '#10b981', label: 'Ита' },
    'FR': { color: '#3b82f6', label: 'Фра' },
    'ES': { color: '#eab308', label: 'Исп' },
    'PT': { color: '#ec4899', label: 'Пор' },
    'BG': { color: '#14b8a6', label: 'Бол' },
    'RO': { color: '#6366f1', label: 'Рум' },
    'TR': { color: '#f97316', label: 'Тур' },
    'KZ': { color: '#2dd4bf', label: 'Каз' },
    'US': { color: '#64748b', label: 'США' },
    'UK': { color: '#3b82f6', label: 'Анг' },
};

const SchedulePage = () => {
    const navigate = useNavigate();
    const { user, managers, countries, schedules, fetchAllData, onlineUsers, logActivity, permissions } = useAppStore();
    // isAdmin logic replaced with precise permission check
    const canEdit = user?.role === 'C-level' || permissions?.[user?.role]?.['schedule_edit'];
    const isAdmin = canEdit; // Keeping variable name for now to minimize refactor churn, but logic is new

    const [currentDate, setCurrentDate] = useState(new Date());
    const [isEditing, setIsEditing] = useState(false); // Edit mode (single GEO)
    const [isMultiGeoEditing, setIsMultiGeoEditing] = useState(false); // Multi-GEO edit mode
    const [showAdvancedModal, setShowAdvancedModal] = useState(false);  // Advanced settings modal
    const [showMultiGeoModal, setShowMultiGeoModal] = useState(false); // Multi-GEO modal
    const [showAutoFillModal, setShowAutoFillModal] = useState(false); // Auto-fill modal
    const [selectedManagerForAutoFill, setSelectedManagerForAutoFill] = useState(null); // Manager to fill
    const [selectedCell, setSelectedCell] = useState(null); // { managerId, date, currentGeos }
    const [scheduleState, setScheduleState] = useState(schedules || []); // Local state for optimistic UI
    const [refreshKey, setRefreshKey] = useState(0); // Force refresh trigger

    // --- DATE HELPERS ---
    const daysInMonth = useMemo(() => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const days = [];

        // Get number of days in month
        const daysCount = new Date(year, month + 1, 0).getDate();

        // Generate all days from 1 to last day
        for (let day = 1; day <= daysCount; day++) {
            days.push(new Date(year, month, day));
        }

        console.log(`Generated ${days.length} days for ${year}-${month + 1}:`, days.map(d => d.getDate()));

        return days;
    }, [currentDate]);

    const monthLabel = currentDate.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' });

    // Country code -> emoji mapping
    const countryMap = useMemo(() => {
        const map = {};
        (countries || []).forEach(c => {
            map[c.code] = { emoji: c.emoji, name: c.name };
        });
        return map;
    }, [countries]);

    // Get GEO config (color/label) with dynamic fallback
    const getGeoConfig = (code) => {
        if (!code) return null;
        // Check static palette first
        if (GEO_PALETTE[code]) return GEO_PALETTE[code];

        // Generate consistent dynamic color from code
        let hash = 0;
        for (let i = 0; i < code.length; i++) {
            hash = code.charCodeAt(i) + ((hash << 5) - hash);
        }
        const hue = Math.abs(hash % 360);
        const color = `hsl(${hue}, 70%, 50%)`;

        return {
            color,
            label: code.substring(0, 3)
        };
    };

    // Create schedule map: manager_id -> date -> geo_code (for real data)
    const scheduleMap = useMemo(() => {
        const map = {};
        (scheduleState || []).forEach(s => {
            if (!map[s.manager_id]) map[s.manager_id] = {};
            const dateKey = s.date; // Expected format: "2026-01-15"
            map[s.manager_id][dateKey] = s.geo_code;
        });
        return map;
    }, [scheduleState]);

    // Sync local state with store when schedules change
    useEffect(() => {
        setScheduleState(schedules || []);
    }, [schedules]);

    // Load schedules for current month (optimized)
    useEffect(() => {
        const loadMonthSchedules = async () => {

            const year = currentDate.getFullYear();
            const month = currentDate.getMonth() + 1;
            const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
            const endDate = new Date(year, month, 0); // Last day of month
            const endDateStr = `${year}-${String(month).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')}`;

            try {
                // Load with pagination if needed
                let allSchedules = [];
                let from = 0;
                const limit = 1000;

                while (true) {
                    const { data, error } = await supabase
                        .from('schedules')
                        .select('*')
                        .gte('date', startDate)
                        .lte('date', endDateStr)
                        .range(from, from + limit - 1)
                        .order('date', { ascending: true });

                    if (error) {
                        console.error('Error loading schedules:', error);
                        break;
                    }

                    allSchedules = [...allSchedules, ...data];

                    if (!data || data.length < limit) break;
                    from += limit;
                }

                console.log(`Loaded ${allSchedules.length} schedules for ${startDate} to ${endDateStr}`);
                setScheduleState(allSchedules);
            } catch (error) {
                console.error('Failed to load schedules:', error);
            }
        };

        loadMonthSchedules();
    }, [currentDate]);

    // Hotkeys for navigation
    useEffect(() => {
        const handleKeyDown = (e) => {
            // Ignore if input is focused
            if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) return;

            if (e.key === 'ArrowLeft') prevMonth();
            if (e.key === 'ArrowRight') nextMonth();
            if (e.key === 'Escape') {
                setIsEditing(false);
                setIsMultiGeoEditing(false);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [currentDate]);

    const scheduleData = useMemo(() => {
        // Filter managers by show_in_schedule field
        const visibleManagers = (managers || []).filter(m => m.show_in_schedule !== false);

        return visibleManagers.map(manager => {
            const managerSchedules = scheduleMap[manager.id] || {};

            const shifts = daysInMonth.reduce((acc, day) => {
                const year = day.getFullYear();
                const month = String(day.getMonth() + 1).padStart(2, '0');
                const dayNum = String(day.getDate()).padStart(2, '0');
                const dateKey = `${year}-${month}-${dayNum}`;
                acc[dateKey] = managerSchedules[dateKey] || null;
                return acc;
            }, {});

            // Handle geo as array - keep all GEOs
            const managerGeos = Array.isArray(manager.geo)
                ? manager.geo
                : (manager.geo ? [manager.geo] : []);
            const primaryGeo = managerGeos[0] || null;

            return {
                id: manager.id,
                name: manager.name,
                geo: primaryGeo,        // For compatibility with toggleShift
                geos: managerGeos,      // All manager GEOs
                shifts
            };
        });
    }, [managers, scheduleMap, daysInMonth, refreshKey]);

    const prevMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    };

    const nextMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    };

    // Toggle shift in edit mode (simple add/remove)
    const toggleShift = async (managerId, dateKey, managerGeo) => {
        if (!isEditing) return;

        try {
            const { data: existingInDB, error: checkError } = await supabase
                .from('schedules')
                .select('*')
                .eq('manager_id', managerId)
                .eq('date', dateKey)
                .maybeSingle();

            if (checkError) throw checkError;

            if (existingInDB) {
                // Remove shift
                const { error } = await supabase
                    .from('schedules')
                    .delete()
                    .eq('manager_id', managerId)
                    .eq('date', dateKey);

                if (error) throw error;

                setScheduleState(prev => prev.filter(
                    s => !(s.manager_id === managerId && s.date === dateKey)
                ));

                // 📝 LOG ACTIVITY
                logActivity({
                    action: 'delete',
                    entity: 'schedule',
                    entityId: `${managerId}_${dateKey}`,
                    details: { managerId, date: dateKey, action: 'remove_shift' },
                    importance: 'low'
                });
            } else {
                // Add shift with single GEO
                const { data, error } = await supabase
                    .from('schedules')
                    .upsert({
                        manager_id: managerId,
                        date: dateKey,
                        geo_code: managerGeo
                    }, {
                        onConflict: 'manager_id,date'
                    })
                    .select()
                    .single();

                if (error) throw error;

                setScheduleState(prev => {
                    const filtered = prev.filter(
                        s => !(s.manager_id === managerId && s.date === dateKey)
                    );
                    return [...filtered, data];
                });

                // 📝 LOG ACTIVITY
                logActivity({
                    action: 'create',
                    entity: 'schedule',
                    entityId: `${managerId}_${dateKey}`,
                    details: { managerId, date: dateKey, geo: managerGeo, action: 'add_shift' },
                    importance: 'low'
                });
            }
        } catch (error) {
            console.error('Error toggling shift:', error);
            alert(`Ошибка: ${error.message || 'Unknown error'}`);
        }
    };

    // Handle multi-GEO cell click
    const handleMultiGeoClick = (managerId, dateKey, currentGeos) => {
        if (!isMultiGeoEditing) return;
        setSelectedCell({ managerId, dateKey, currentGeos });
        setShowMultiGeoModal(true);
    };

    // Save multi-GEO
    const handleSaveMultiGeo = async (geos) => {
        if (!selectedCell || geos.length !== 2) return;

        try {
            const { managerId, dateKey } = selectedCell;
            const geoCode = `${geos[0]},${geos[1]}`;

            const { data, error } = await supabase
                .from('schedules')
                .upsert({
                    manager_id: managerId,
                    date: dateKey,
                    geo_code: geoCode
                }, {
                    onConflict: 'manager_id,date'
                })
                .select()
                .single();

            if (error) throw error;

            // 📝 LOG ACTIVITY
            logActivity({
                action: 'update',
                entity: 'schedule',
                entityId: `${managerId}_${dateKey}`,
                details: { managerId, date: dateKey, geo: geoCode, action: 'update_multi_geo_shift' },
                importance: 'low'
            });

            // Close modal
            setShowMultiGeoModal(false);
            setSelectedCell(null);

            // Force reload all schedules from DB
            const year = currentDate.getFullYear();
            const month = currentDate.getMonth() + 1;
            const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
            const lastDay = new Date(year, month, 0).getDate();
            const endDate = `${year}-${String(month).padStart(2, '0')}-${lastDay}`;

            const { data: updatedSchedules, error: fetchError } = await supabase
                .from('schedules')
                .select('*')
                .gte('date', startDate)
                .lte('date', endDate);

            if (fetchError) throw fetchError;

            // Update local state - this will trigger useMemo recalculation
            setScheduleState(updatedSchedules || []);

            // Force re-render to ensure UI updates
            setRefreshKey(prev => prev + 1);
        } catch (error) {
            console.error('Error saving multi-GEO:', error);
            alert(`Ошибка: ${error.message}`);
        }
    };
    // --- AUTO FILL ---
    const handleAutoFill = async ({ startDate, pattern, geos, clear }) => {
        try {
            if (!selectedManagerForAutoFill) return;
            const manager = managers.find(m => m.id === selectedManagerForAutoFill);
            if (!manager) return;

            // Determine date range
            const start = new Date(startDate);
            const end = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0); // End of current view month
            const monthStartStr = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-${String(start.getDate()).padStart(2, '0')}`;
            const monthEndStr = `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, '0')}-${String(end.getDate()).padStart(2, '0')}`;

            // --- CLEAR LOGIC ---
            if (clear) {
                if (!window.confirm(`Вы уверены, что хотите очистить график менеджера ${manager.name} с ${startDate}?`)) return;

                console.log(`🗑️ Clearing schedule for ${manager.name} from ${startDate} to ${monthEndStr}`);

                const { error } = await supabase
                    .from('schedules')
                    .delete()
                    .eq('manager_id', manager.id)
                    .gte('date', monthStartStr)
                    .lte('date', monthEndStr);

                if (error) throw error;

                // 📝 LOG ACTIVITY
                logActivity({
                    action: 'delete',
                    entity: 'schedule',
                    entityId: `clear_${manager.id}`,
                    details: { manager: manager.name, range: `${startDate} - ${monthEndStr}`, action: 'clear_schedule' },
                    importance: 'high'
                });

                // Refresh
                const { fetchAllData } = useAppStore.getState();
                fetchAllData(true);
                setRefreshKey(prev => prev + 1);
                return;
            }

            // Determine GEO to use
            let geoCode = null;
            if (isMultiGeoEditing) {
                // Multi mode: use selected pair
                if (geos && geos.length === 2) {
                    geoCode = `${geos[0]},${geos[1]}`;
                }
            } else {
                // Single mode: use manager's primary GEO
                const primaryGeo = Array.isArray(manager.geo) ? manager.geo[0] : manager.geo;
                geoCode = primaryGeo;
            }

            if (!geoCode) throw new Error('Не удалось определить ГЕО для заполнения');

            console.log(`🚀 Auto-filling for ${manager.name} from ${startDate} with pattern ${pattern} and GEO ${geoCode}`);

            // Parse pattern (e.g., "2-2")
            const [workDays, restDays] = pattern.split('-').map(Number);
            const cycleLength = workDays + restDays;

            // Calculate dates


            const schedulesToUpsert = [];

            // Iterate day by day from Start Date until End of Month
            const current = new Date(start);

            // If start date is in previous month, fast forward to start of this month?
            // No, user assumes "From this date". If they select date in past, it's fine.

            // To ensuring we start calculating the cycle correctly from Day 1 of the pattern...
            // "From that date... automatically sets". So Date 1 = Work Day 1.
            let dayCounter = 0;

            while (current <= end) {
                // Check pattern position
                const positionInCycle = dayCounter % cycleLength;
                const isWorkDay = positionInCycle < workDays;

                if (isWorkDay) {
                    const dateStr = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}-${String(current.getDate()).padStart(2, '0')}`;

                    schedulesToUpsert.push({
                        manager_id: manager.id,
                        date: dateStr,
                        geo_code: geoCode
                    });
                }

                current.setDate(current.getDate() + 1);
                dayCounter++;
            }

            // 1. Upsert work days
            if (schedulesToUpsert.length > 0) {
                const { error } = await supabase
                    .from('schedules')
                    .upsert(schedulesToUpsert, { onConflict: 'manager_id,date' });

                if (error) throw error;

                // 📝 LOG ACTIVITY
                logActivity({
                    action: 'update',
                    entity: 'schedule',
                    entityId: `autofill_${manager.id}`,
                    details: { manager: manager.name, pattern, range: `${startDate} - ${monthEndStr}`, shifts_count: schedulesToUpsert.length },
                    importance: 'high'
                });
            }

            // Refresh
            const { fetchAllData } = useAppStore.getState();
            fetchAllData(true);

            // Force re-render
            setRefreshKey(prev => prev + 1);

        } catch (error) {
            console.error('Error auto-filling:', error);
            alert(`Ошибка автозаполнения: ${error.message}`);
        }
    };

    return (
        <div className="pb-10 w-full max-w-full overflow-x-hidden">
            {/* EDITING MODE INDICATOR */}
            {isEditing && (
                <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 border-l-4 border-green-500 rounded-r-lg">
                    <p className="text-sm font-medium text-green-800 dark:text-green-300">
                        ✏️ Режим редактирования: кликните на ячейку чтобы добавить/удалить смену (1 ГЕО)
                    </p>
                </div>
            )}

            {/* MULTI-GEO EDITING MODE INDICATOR */}
            {isMultiGeoEditing && (
                <div className="mb-4 p-3 bg-purple-50 dark:bg-purple-900/20 border-l-4 border-purple-500 rounded-r-lg">
                    <p className="text-sm font-medium text-purple-800 dark:text-purple-300">
                        🎨 Режим Мульти-ГЕО: кликните на ячейку чтобы назначить 2 ГЕО (split-color)
                    </p>
                </div>
            )}

            {/* HEADER */}
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-bold dark:text-white flex items-center gap-2">
                        <Calendar className="text-blue-600 dark:text-blue-500" />
                        График Смен
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 text-xs mt-1">
                        Планирование рабочих смен и распределение ГЕО
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center bg-white dark:bg-[#111] border border-gray-200 dark:border-[#333] rounded-lg p-1 shadow-sm">
                        <button onClick={prevMonth} className="p-1.5 hover:bg-gray-100 dark:hover:bg-[#222] rounded-md transition-colors text-gray-600 dark:text-gray-300">
                            <ChevronLeft size={16} />
                        </button>
                        <span className="px-3 text-sm font-bold dark:text-white capitalize min-w-[140px] text-center">
                            {monthLabel}
                        </span>
                        <button onClick={nextMonth} className="p-1.5 hover:bg-gray-100 dark:hover:bg-[#222] rounded-md transition-colors text-gray-600 dark:text-gray-300">
                            <ChevronRight size={16} />
                        </button>
                    </div>



                    {isAdmin && (
                        <div className="flex items-center gap-2">
                            {/* Обычное редактирование */}
                            <button
                                onClick={() => setIsEditing(!isEditing)}
                                className={`flex items-center gap-2 px-3 py-2 border rounded-lg text-xs font-medium transition-all shadow-sm ${isEditing
                                    ? 'bg-green-600 text-white border-green-600 hover:bg-green-700'
                                    : 'bg-white dark:bg-[#1A1A1A] border-gray-200 dark:border-[#333] hover:bg-gray-50 dark:hover:bg-[#252525] text-gray-700 dark:text-gray-200'
                                    }`}
                            >
                                <Edit size={14} />
                                <span className="hidden sm:inline">{isEditing ? 'Готово' : 'Ред.'}</span>
                            </button>

                            {/* Мульти-ГЕО редактирование */}
                            <button
                                onClick={() => setIsMultiGeoEditing(!isMultiGeoEditing)}
                                className={`flex items-center gap-2 px-3 py-2 border rounded-lg text-xs font-medium transition-all shadow-sm ${isMultiGeoEditing
                                    ? 'bg-purple-600 text-white border-purple-600 hover:bg-purple-700'
                                    : 'bg-white dark:bg-[#1A1A1A] border-gray-200 dark:border-[#333] hover:bg-gray-50 dark:hover:bg-[#252525] text-gray-700 dark:text-gray-200'
                                    }`}
                            >
                                <Users2 size={14} />
                                <span className="hidden sm:inline">{isMultiGeoEditing ? 'Готово' : 'Ред Мульти'}</span>
                            </button>

                            {/* Расширенное */}
                            <button
                                onClick={() => setShowAdvancedModal(true)}
                                className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium transition-colors shadow-sm"
                            >
                                <Settings size={14} />
                                <span className="hidden sm:inline">Расширенное</span>
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* CUSTOM GRID */}
            <div className="bg-white dark:bg-[#111] border border-gray-200 dark:border-[#333] rounded-xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto 2xl:overflow-x-visible">
                    <div className="inline-block min-w-full 2xl:block">
                        {/* HEADER ROW */}
                        <div className="flex border-b border-gray-200 dark:border-[#333] bg-gray-50 dark:bg-[#0A0A0A] sticky top-0 z-10">
                            {/* Manager column header - sticky left */}
                            <div className="w-[160px] flex-shrink-0 border-r border-gray-200 dark:border-[#333] flex sticky left-0 z-20 bg-gray-50 dark:bg-[#0A0A0A]">
                                {/* Name part (90%) */}
                                <div className="flex-1 px-2 py-1.5 text-xs font-medium text-gray-500 dark:text-gray-400">
                                    Менеджер
                                </div>
                                {/* Geo part (10%) */}
                                <div className="w-[24px] flex-shrink-0 px-0.5 py-1.5 text-center text-xs font-medium text-gray-500 dark:text-gray-400 border-l border-gray-200 dark:border-[#333]">
                                    🌍
                                </div>
                            </div>

                            {/* Day headers - stretch on 2xl+ */}
                            <div className="flex flex-1">
                                {daysInMonth.map((day, idx) => {
                                    const isToday = new Date().toDateString() === day.toDateString();
                                    return (
                                        <div
                                            key={idx}
                                            className="min-w-[32px] flex-1 px-0.5 py-1.5 flex items-center justify-center text-xs font-normal text-gray-600 dark:text-gray-300"
                                        >
                                            <div className={`w-[24px] h-[24px] flex items-center justify-center rounded-full ${isToday ? 'bg-blue-500 text-white font-bold' : ''}`}>
                                                {String(day.getDate()).padStart(2, '0')}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* MANAGER ROWS */}
                        {scheduleData.map((row, rowIdx) => {
                            const managerGeo = row.geo;
                            const geoInfo = countryMap[managerGeo];

                            return (
                                <div
                                    key={rowIdx}
                                    className="flex border-b border-gray-100 dark:border-[#1A1A1A] hover:bg-gray-50 dark:hover:bg-[#0A0A0A] transition-colors"
                                >
                                    {/* Manager Name + Geo */}
                                    <div className="w-[160px] flex-shrink-0 border-r border-gray-200 dark:border-[#333] flex sticky left-0 z-10 bg-white dark:bg-[#111]">
                                        {/* Name part */}
                                        <div className="flex-1 px-2 py-1.5 text-xs font-normal text-gray-700 dark:text-gray-300 flex items-center overflow-hidden">
                                            <span
                                                className={`truncate font-medium transition-colors ${(isEditing || isMultiGeoEditing) ? 'text-blue-600 dark:text-blue-400 cursor-pointer hover:underline' : ''}`}
                                                onClick={() => {
                                                    if (isEditing || isMultiGeoEditing) {
                                                        setSelectedManagerForAutoFill(row.id);
                                                        setShowAutoFillModal(true);
                                                    }
                                                }}
                                                title={isEditing || isMultiGeoEditing ? "Нажмите для автозаполнения графика" : row.name}
                                            >
                                                {row.name}
                                            </span>
                                        </div>

                                        {/* All Manager GEO Flags */}
                                        <div className="w-[24px] flex-shrink-0 px-0.5 py-1.5 flex flex-col items-center justify-center border-l border-gray-200 dark:border-[#333] gap-0.5">
                                            {row.geos && row.geos.length > 0 ? (
                                                row.geos.slice(0, 3).map((geo, idx) => (
                                                    <span key={idx} className="text-xs leading-none" title={geo}>{countryMap[geo]?.emoji || '🌍'}</span>
                                                ))
                                            ) : (
                                                <span className="text-gray-400 text-xs">—</span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Day Cells - stretch on 2xl+ */}
                                    <div className="flex flex-1">
                                        {daysInMonth.map((day, dayIdx) => {
                                            // Use local date format to avoid timezone issues
                                            const year = day.getFullYear();
                                            const month = String(day.getMonth() + 1).padStart(2, '0');
                                            const dayNum = String(day.getDate()).padStart(2, '0');
                                            const dateKey = `${year}-${month}-${dayNum}`;

                                            const geo = row.shifts[dateKey];

                                            // Parse multi-GEO format ("RO" or "RO,BG")
                                            const geos = geo ? geo.split(',').map(g => g.trim()) : [];
                                            const geoConfigs = geos.map(g => getGeoConfig(g)).filter(Boolean);

                                            const canEdit = isEditing;
                                            const canMultiGeoEdit = isMultiGeoEditing;
                                            const isInteractive = canEdit || canMultiGeoEdit;

                                            return (
                                                <div
                                                    key={dayIdx}
                                                    className={`min-w-[32px] flex-1 p-0.5 flex items-center justify-center ${isInteractive ? 'cursor-pointer' : ''
                                                        }`}
                                                    onClick={() => {
                                                        if (canEdit) {
                                                            toggleShift(row.id, dateKey, row.geo);
                                                        } else if (canMultiGeoEdit) {
                                                            handleMultiGeoClick(row.id, dateKey, geos);
                                                        }
                                                    }}
                                                >
                                                    {geoConfigs.length === 2 ? (
                                                        /* Dual GEO - Split Color Cell */
                                                        <div className={`w-full h-[28px] rounded overflow-hidden flex flex-col shadow-sm transition-all ${canMultiGeoEdit ? 'ring-2 ring-purple-300 dark:ring-purple-600 hover:ring-purple-400' : 'hover:opacity-80'
                                                            }`}>
                                                            {/* Top GEO */}
                                                            <div
                                                                className="flex-1 flex items-center justify-center text-white text-[8px] font-bold"
                                                                style={{ backgroundColor: geoConfigs[0].color }}
                                                            >
                                                                {geoConfigs[0].label}
                                                            </div>
                                                            {/* Bottom GEO */}
                                                            <div
                                                                className="flex-1 flex items-center justify-center text-white text-[8px] font-bold border-t border-white/30"
                                                                style={{ backgroundColor: geoConfigs[1].color }}
                                                            >
                                                                {geoConfigs[1].label}
                                                            </div>
                                                        </div>
                                                    ) : geoConfigs.length === 1 ? (
                                                        /* Single GEO */
                                                        <div
                                                            className={`w-full h-[28px] rounded flex items-center justify-center text-[9px] font-semibold shadow-sm transition-all text-white ${canEdit ? 'hover:opacity-80' : ''
                                                                } ${canMultiGeoEdit ? 'ring-2 ring-purple-300 dark:ring-purple-600 hover:ring-purple-400' : ''
                                                                }`}
                                                            style={{ backgroundColor: geoConfigs[0].color }}
                                                        >
                                                            {geoConfigs[0].label}
                                                        </div>
                                                    ) : (
                                                        /* Empty Cell */
                                                        <div
                                                            className={`w-full h-[28px] rounded flex items-center justify-center text-[9px] font-semibold shadow-sm transition-all ${canEdit
                                                                ? 'border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-green-400 dark:hover:border-green-500 hover:bg-green-50 dark:hover:bg-green-900/20'
                                                                : canMultiGeoEdit
                                                                    ? 'border-2 border-dashed border-purple-300 dark:border-purple-600 hover:border-purple-400 dark:hover:border-purple-500 hover:bg-purple-50 dark:hover:bg-purple-900/20'
                                                                    : ''
                                                                }`}
                                                        />
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Schedule Stats */}
            <ScheduleStats
                rows={scheduleData}
                currentDate={currentDate}
                onDataChange={() => {
                    // Optional: reload if needed, but adjustments are local to Stats component
                    // or trigger global refresh if adjustments affect other things
                }}
            />

            {/* Advanced Settings Modal */}
            <AdvancedScheduleModal
                isOpen={showAdvancedModal}
                onClose={() => setShowAdvancedModal(false)}
                managers={managers}
                countries={countries}
                onSave={() => {
                    const { fetchAllData } = useAppStore.getState();
                    fetchAllData(true);
                }}
            />

            {/* Multi-GEO Modal */}
            <MultiGeoModal
                isOpen={showMultiGeoModal}
                onClose={() => {
                    setShowMultiGeoModal(false);
                    setSelectedCell(null);
                }}
                onSave={handleSaveMultiGeo}
                countries={countries}
            />

            {/* Auto Fill Modal */}
            <AutoFillModal
                isOpen={showAutoFillModal}
                onClose={() => {
                    setShowAutoFillModal(false);
                    setSelectedManagerForAutoFill(null);
                }}
                onSave={handleAutoFill}
                mode={isMultiGeoEditing ? 'multi' : 'single'}
                countries={countries}
                managerName={managers.find(m => m.id === selectedManagerForAutoFill)?.name}
                currentDate={currentDate}
            />
        </div>
    );
};

export default SchedulePage;
