import React, { useState, useMemo, useEffect } from 'react';
import { useAppStore } from '../store/appStore';
import { supabase } from '../services/supabaseClient';
import { Calendar, Settings, Edit, ChevronLeft, ChevronRight, RefreshCcw } from 'lucide-react';

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
    const { user, managers, countries, schedules } = useAppStore();
    const isAdmin = user && ['Admin', 'C-level'].includes(user.role);

    const [currentDate, setCurrentDate] = useState(new Date());
    const [isDemo, setIsDemo] = useState(false); // Real data by default
    const [isEditing, setIsEditing] = useState(false); // Edit mode
    const [scheduleState, setScheduleState] = useState(schedules || []); // Local state for optimistic UI

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
            if (isDemo) return;

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
    }, [currentDate, isDemo]);

    // --- DEMO DATA ---
    const demoManagers = useMemo(() => {
        const GEO_KEYS = Object.keys(GEO_PALETTE);
        const mockNames = [
            'Юра @yurissoo',
            'Игорь @gonigorr',
            'Анна @Annet6996',
            'Алина @alinaserheeva',
            'Виктория @vika',
            'Ольга @helka',
            'Денис @beetle',
            'Светлана @sveta',
            'Ксения @ksenia'
        ];

        return mockNames.map((name, idx) => {
            const geo = GEO_KEYS[idx % GEO_KEYS.length];
            const shifts = {};

            daysInMonth.forEach(day => {
                const dateKey = day.toISOString().split('T')[0];
                if (Math.random() > 0.3) {
                    shifts[dateKey] = geo; // Same geo for all shifts
                }
            });

            return {
                id: `demo-${idx}`,
                name,
                geo,
                shifts
            };
        });
    }, [daysInMonth]);

    // Prepare rows (demo or real)
    const scheduleData = useMemo(() => {
        if (isDemo) {
            return demoManagers;
        }

        return (managers || []).map(manager => {
            const managerSchedules = scheduleMap[manager.id] || {};

            const shifts = {};
            daysInMonth.forEach(day => {
                const dateKey = day.toISOString().split('T')[0];
                shifts[dateKey] = managerSchedules[dateKey] || null;
            });

            // Handle geo as array (take first element)
            const managerGeo = Array.isArray(manager.geo) && manager.geo.length > 0
                ? manager.geo[0]
                : manager.geo;

            return {
                id: manager.id,
                name: manager.name,
                geo: managerGeo,
                shifts
            };
        });
    }, [isDemo, demoManagers, managers, scheduleMap, daysInMonth]);

    const prevMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    };

    const nextMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    };

    // Toggle shift in edit mode
    const toggleShift = async (managerId, dateKey, managerGeo) => {
        if (!isEditing || isDemo) return; // Only in edit mode and real data

        console.log('Toggle shift:', { managerId, dateKey, managerGeo }); // DEBUG

        try {
            // Check if shift exists in DB (not just local state)
            const { data: existingInDB, error: checkError } = await supabase
                .from('schedules')
                .select('*')
                .eq('manager_id', managerId)
                .eq('date', dateKey)
                .maybeSingle(); // Returns null if not found, doesn't throw

            if (checkError) {
                console.error('Check error:', checkError);
                throw checkError;
            }

            console.log('Existing in DB:', existingInDB); // DEBUG

            if (existingInDB) {
                // Remove shift
                console.log('Deleting shift...'); // DEBUG
                const { error } = await supabase
                    .from('schedules')
                    .delete()
                    .eq('manager_id', managerId)
                    .eq('date', dateKey);

                if (error) {
                    console.error('Delete error:', error); // DEBUG
                    throw error;
                }

                console.log('Shift deleted successfully'); // DEBUG
                // Update local state
                setScheduleState(prev => prev.filter(
                    s => !(s.manager_id === managerId && s.date === dateKey)
                ));
            } else {
                // Add shift (use upsert to prevent duplicates)
                console.log('Adding shift...', { managerId, dateKey, geo_code: managerGeo }); // DEBUG
                const { data, error } = await supabase
                    .from('schedules')
                    .upsert({
                        manager_id: managerId,
                        date: dateKey,
                        geo_code: managerGeo
                    }, {
                        onConflict: 'manager_id,date' // Handle conflicts on unique constraint
                    })
                    .select()
                    .single();

                if (error) {
                    console.error('Insert error:', error); // DEBUG
                    throw error;
                }

                console.log('Shift added successfully:', data); // DEBUG
                // Update local state - replace if exists, add if not
                setScheduleState(prev => {
                    const filtered = prev.filter(
                        s => !(s.manager_id === managerId && s.date === dateKey)
                    );
                    return [...filtered, data];
                });
            }
        } catch (error) {
            console.error('Error toggling shift:', error);
            console.error('Error details:', JSON.stringify(error, null, 2)); // DEBUG
            alert(`Ошибка при изменении смены: ${error.message || 'Unknown error'}`);
        }
    };

    return (
        <div className="pb-10 w-full max-w-full overflow-x-hidden">
            {/* EDITING MODE INDICATOR */}
            {isEditing && !isDemo && (
                <div className="mb-4 px-4 py-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg flex items-center gap-2">
                    <Edit size={16} className="text-green-600 dark:text-green-400" />
                    <p className="text-sm text-green-700 dark:text-green-300 font-medium">
                        Режим редактирования активен. Кликайте на ячейки для добавления/удаления смен.
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

                    {/* Demo Toggle */}
                    <button
                        onClick={() => setIsDemo(!isDemo)}
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all ${isDemo ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/20' : 'bg-white dark:bg-[#111] border border-gray-200 dark:border-[#333] text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-[#222]'}`}
                    >
                        <RefreshCcw size={14} className={isDemo ? 'animate-spin-slow' : ''} />
                        Demo
                    </button>

                    {isAdmin && (
                        <div className="flex items-center gap-2">
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
                            <button className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium transition-colors shadow-sm">
                                <Settings size={14} />
                                <span className="hidden sm:inline">Расширенное</span>
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* CUSTOM GRID */}
            <div className="bg-white dark:bg-[#111] border border-gray-200 dark:border-[#333] rounded-xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <div className="inline-block min-w-full">
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

                            {/* Day headers */}
                            <div className="flex">
                                {daysInMonth.map((day, idx) => (
                                    <div
                                        key={idx}
                                        className="w-[32px] flex-shrink-0 px-0.5 py-1.5 text-center text-xs font-normal text-gray-600 dark:text-gray-300"
                                    >
                                        {String(day.getDate()).padStart(2, '0')}
                                    </div>
                                ))}
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
                                        {/* Name part (90%) */}
                                        <div className="flex-1 px-2 py-1.5 text-xs font-normal text-gray-700 dark:text-gray-300 flex items-center overflow-hidden">
                                            <span className="truncate">{row.name}</span>
                                        </div>

                                        {/* Geo part (10%) */}
                                        <div className="w-[24px] flex-shrink-0 px-0.5 py-1.5 flex flex-col items-center justify-center border-l border-gray-200 dark:border-[#333] gap-0.5">
                                            {geoInfo ? (
                                                <>
                                                    <span className="text-xs leading-none">{geoInfo.emoji}</span>
                                                    <span className="text-[8px] leading-none text-gray-500 dark:text-gray-400 font-medium">{managerGeo}</span>
                                                </>
                                            ) : (
                                                <span className="text-gray-400 text-xs">—</span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Day Cells */}
                                    <div className="flex">
                                        {daysInMonth.map((day, dayIdx) => {
                                            // Use local date format to avoid timezone issues
                                            const year = day.getFullYear();
                                            const month = String(day.getMonth() + 1).padStart(2, '0');
                                            const dayNum = String(day.getDate()).padStart(2, '0');
                                            const dateKey = `${year}-${month}-${dayNum}`;

                                            const geo = row.shifts[dateKey];
                                            const geoConfig = GEO_PALETTE[geo];

                                            const canEdit = isEditing && !isDemo;
                                            const cellClasses = `w-full h-[28px] rounded flex items-center justify-center text-[9px] font-semibold shadow-sm transition-all ${canEdit ? 'cursor-pointer' : ''
                                                }`;

                                            return (
                                                <div
                                                    key={dayIdx}
                                                    className="w-[32px] flex-shrink-0 p-0.5 flex items-center justify-center"
                                                    onClick={() => canEdit && toggleShift(row.id, dateKey, row.geo)}
                                                >
                                                    {geoConfig ? (
                                                        <div
                                                            className={`${cellClasses} text-white hover:opacity-80`}
                                                            style={{ backgroundColor: geoConfig.color }}
                                                        >
                                                            {geoConfig.label}
                                                        </div>
                                                    ) : (
                                                        <div
                                                            className={`${cellClasses} ${canEdit
                                                                    ? 'border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800'
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
        </div>
    );
};

export default SchedulePage;
