import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/appStore';
import { supabase } from '../services/supabaseClient';
import { showToast } from '../utils/toastEvents';
import { Calendar, Settings, Edit, ChevronLeft, ChevronRight, ChevronDown, Users2, Globe, LayoutGrid } from 'lucide-react';
import ManagerRow from '../components/ManagerRow';
import AdvancedScheduleModal from '../components/AdvancedScheduleModal';
import MultiGeoModal from '../components/MultiGeoModal';
import ScheduleStats from '../components/ScheduleStats';
import AutoFillModal from '../components/AutoFillModal';
import SingleGeoSelectModal from '../components/SingleGeoSelectModal';

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
    'Таро': { color: '#8b5cf6', label: 'Тар' }, // Purple
    'Доп смена': { color: '#f59e0b', label: 'Доп' }, // Orange
};

const SchedulePage = () => {
    const navigate = useNavigate();
    const { user, managers, countries, schedules, fetchAllData, onlineUsers, logActivity, permissions, managerRates, kpiSettings } = useAppStore();
    // Edit access: C-level, Admin, SeniorSales only
    const SCHEDULE_EDIT_ROLES = ['C-level', 'Admin', 'SeniorSales'];
    const canEdit = SCHEDULE_EDIT_ROLES.includes(user?.role);
    const isAdmin = canEdit; // Keeping variable name for compatibility

    const [currentDate, setCurrentDate] = useState(new Date());
    const [isEditing, setIsEditing] = useState(false); // Edit mode (single GEO)
    const [isMultiGeoEditing, setIsMultiGeoEditing] = useState(false); // Multi-GEO edit mode
    const [showAdvancedModal, setShowAdvancedModal] = useState(false);  // Advanced settings modal
    const [showMultiGeoModal, setShowMultiGeoModal] = useState(false); // Multi-GEO modal
    const [showAutoFillModal, setShowAutoFillModal] = useState(false); // Auto-fill modal
    const [selectedManagerForAutoFill, setSelectedManagerForAutoFill] = useState(null); // Manager to fill
    const [isAdditionalEditing, setIsAdditionalEditing] = useState(false); // New "Edit Additional" mode
    const [showSingleGeoModal, setShowSingleGeoModal] = useState(false); // Modal for single GEO selection
    const [selectedCell, setSelectedCell] = useState(null); // { managerId, date, currentGeos, assignedGeos }
    const [scheduleState, setScheduleState] = useState(schedules || []); // Local state for optimistic UI
    const [refreshKey, setRefreshKey] = useState(0); // Force refresh trigger
    const [adjustments, setAdjustments] = useState({}); // managerId -> extraShifts

    // --- VIEW MODE ---
    const [viewMode, setViewMode] = useState(() => localStorage.getItem('schedule_view_mode') || 'standard');
    const [cellStyle, setCellStyle] = useState(() => localStorage.getItem('schedule_cell_style') || 'standard');
    const [showViewMenu, setShowViewMenu] = useState(false);
    const viewMenuRef = useRef(null);
    const toggleViewMode = () => {
        const next = viewMode === 'standard' ? 'compact' : 'standard';
        setViewMode(next);
        localStorage.setItem('schedule_view_mode', next);
    };
    const selectViewMode = (mode) => {
        setViewMode(mode);
        localStorage.setItem('schedule_view_mode', mode);
    };
    const selectCellStyle = (style) => {
        setCellStyle(style);
        localStorage.setItem('schedule_cell_style', style);
    };

    // Close view menu on click outside
    useEffect(() => {
        if (!showViewMenu) return;
        const handler = (e) => { if (viewMenuRef.current && !viewMenuRef.current.contains(e.target)) setShowViewMenu(false); };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [showViewMenu]);

    // --- REORDERING (HTML5 native DnD) ---
    const [orderedManagers, setOrderedManagers] = useState([]);
    const [draggedId, setDraggedId] = useState(null);

    // Load saved order from localStorage on mount
    useEffect(() => {
        const savedOrder = localStorage.getItem('schedule_manager_order');
        if (savedOrder) {
            try {
                const parsedOrder = JSON.parse(savedOrder);
                // We will apply this order in the useMemo or useEffect below
            } catch (e) {
                console.error('Failed to parse saved order', e);
            }
        }
    }, []);

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

    const getGeoConfig = useCallback((code) => {
        if (!code) return null;
        if (GEO_PALETTE[code]) return GEO_PALETTE[code];
        let hash = 0;
        for (let i = 0; i < code.length; i++) hash = code.charCodeAt(i) + ((hash << 5) - hash);
        return { color: `hsl(${Math.abs(hash % 360)}, 65%, 48%)`, label: code.substring(0, 3) };
    }, []);

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

                // Load adjustments for this month
                const monthDate = `${year}-${String(month).padStart(2, '0')}-01`;
                const { data: adjData } = await supabase
                    .from('schedule_adjustments')
                    .select('manager_id, extra_shifts')
                    .eq('month_date', monthDate);
                if (adjData) {
                    const adjMap = {};
                    adjData.forEach(a => { adjMap[a.manager_id] = a.extra_shifts || 0; });
                    setAdjustments(adjMap);
                }
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
                setIsAdditionalEditing(false);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [currentDate]);

    const scheduleData = useMemo(() => {
        // Filter managers by show_in_schedule field
        const visibleManagers = (managers || []).filter(m =>
            m.show_in_schedule !== false &&
            ['Sales', 'SalesTaro', 'SalesTaroNew', 'SeniorSales'].includes(m.role)
        );

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
                nickname: manager.telegram_username,
                geo: primaryGeo,        // For compatibility with toggleShift
                geos: managerGeos,      // All manager GEOs
                shifts,
                rawManager: manager     // Pass the whole object for status check
            };
        }).sort((a, b) => {
            const shiftsA = Object.values(a.shifts || {}).filter(Boolean).length;
            const shiftsB = Object.values(b.shifts || {}).filter(Boolean).length;

            // 0-shift managers always go to the bottom
            const hasA = shiftsA > 0 ? 0 : 1;
            const hasB = shiftsB > 0 ? 0 : 1;
            if (hasA !== hasB) return hasA - hasB;

            const geosA = a.geos || [];
            const geosB = b.geos || [];

            // Primary: first GEO
            const g1A = (geosA[0] || '').toLowerCase();
            const g1B = (geosB[0] || '').toLowerCase();
            if (g1A < g1B) return -1;
            if (g1A > g1B) return 1;

            // Secondary: second GEO (if any)
            const g2A = (geosA[1] || '').toLowerCase();
            const g2B = (geosB[1] || '').toLowerCase();
            if (g2A < g2B) return -1;
            if (g2A > g2B) return 1;

            // Tertiary: name
            return a.name.localeCompare(b.name);
        });
    }, [managers, scheduleMap, daysInMonth, refreshKey]);

    const prevMonth = useCallback(() => setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1)), []);
    const nextMonth = useCallback(() => setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1)), []);

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

    // Handle Single GEO selection for "Edit Additional"
    const handleSingleGeoSelect = async (geoCode) => {
        if (!selectedCell) return;
        const { managerId, dateKey } = selectedCell;

        // Use existing toggleShift logic but force the specific GEO
        // First we should check if we need to clear or set. 
        // The user wants to "put a shift". 
        // If there's already a shift there, toggleShift normally removes it. 
        // But here we are selecting a specific GEO to SET.
        // Actually toggleShift toggles. 
        // Let's modify toggleShift to accept a 'forceSet' or 'forceGeo' but it already takes managerGeo.
        // If I pass the selected GEO, toggleShift will:
        // 1. Check if ANY shift exists for this date/manager.
        // 2. If yes -> remove it.
        // 3. If no -> add it with the passed GEO.

        // Wait, if I want to CHANGE the geo of an existing shift?
        // "Ред Доп" usuall implies adding/modifying.
        // If I click a cell that has 'UA' and I select 'KZ', it should probably switch to 'KZ'.
        // toggleShift currently: "If existing -> delete". It doesn't check if the existing GEO matches.

        // Let's call a more direct set function or improve toggleShift?
        // Use direct upsert for simplicity and certainty.

        try {
            const { error } = await supabase
                .from('schedules')
                .upsert({
                    manager_id: managerId,
                    date: dateKey,
                    geo_code: geoCode
                }, {
                    onConflict: 'manager_id,date'
                });

            if (error) throw error;

            // 📝 LOG ACTIVITY
            logActivity({
                action: 'update',
                entity: 'schedule',
                entityId: `${managerId}_${dateKey}`,
                details: { managerId, date: dateKey, geo: geoCode, action: 'set_additional_shift' },
                importance: 'low'
            });

            // Update local state
            setScheduleState(prev => {
                const filtered = prev.filter(
                    s => !(s.manager_id === managerId && s.date === dateKey)
                );
                return [...filtered, { manager_id: managerId, date: dateKey, geo_code: geoCode }];
            });

            // Close modal
            setShowSingleGeoModal(false);
            setSelectedCell(null);

        } catch (error) {
            console.error('Error setting additional shift:', error);
            showToast(`Ошибка: ${error.message}`, 'error');
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

    // Save extra shifts (Доп смены) for a manager to schedule_adjustments
    const handleExtraShiftsSave = useCallback(async (managerId, value) => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth() + 1;
        const monthDate = `${year}-${String(month).padStart(2, '0')}-01`;

        // Optimistic update
        setAdjustments(prev => ({ ...prev, [managerId]: value }));

        try {
            const { error } = await supabase
                .from('schedule_adjustments')
                .upsert({ manager_id: managerId, month_date: monthDate, extra_shifts: value }, { onConflict: 'manager_id,month_date' });
            if (error) throw error;
            showToast(`Доп. смены сохранены: ${value}`, 'success');
        } catch (err) {
            console.error('Error saving extra shifts:', err);
            showToast('Ошибка сохранения доп. смен', 'error');
        }
    }, [currentDate]);


    // --- FINAL SORTED DATA ---
    const sortedScheduleData = useMemo(() => {
        if (orderedManagers.length === 0) return scheduleData;

        // Clone to avoid mutation
        const sorted = [...scheduleData].sort((a, b) => {
            const indexA = orderedManagers.indexOf(a.id);
            const indexB = orderedManagers.indexOf(b.id);

            // If both have custom order, sort by index
            if (indexA !== -1 && indexB !== -1) return indexA - indexB;

            // If only A has custom order, it comes first
            if (indexA !== -1) return -1;
            // If only B has custom order, it comes first
            if (indexB !== -1) return 1;

            // If neither has custom order, keep original sort (GEO/Name)
            return 0;
        });

        return sorted;
    }, [scheduleData, orderedManagers]);

    // Update order when drag ends
    const handleReorder = useCallback((newIds) => {
        setOrderedManagers(newIds);
        localStorage.setItem('schedule_manager_order', JSON.stringify(newIds));
    }, []);

    // HTML5 DnD handlers
    const handleDragStart = useCallback((id) => setDraggedId(id), []);
    const handleDragOver = useCallback((e) => e.preventDefault(), []);
    const handleDrop = useCallback((e, targetId) => {
        e.preventDefault();
        if (!draggedId || draggedId === targetId) return;
        const ids = sortedScheduleData.map(r => r.id);
        const from = ids.indexOf(draggedId);
        const to = ids.indexOf(targetId);
        if (from === -1 || to === -1) return;
        const next = [...ids];
        next.splice(from, 1);
        next.splice(to, 0, draggedId);
        handleReorder(next);
        setDraggedId(null);
    }, [draggedId, sortedScheduleData, handleReorder]);
    const handleDragEnd = useCallback(() => setDraggedId(null), []);

    // Initialize orderedManagers on first load if empty but data exists
    useEffect(() => {
        if (scheduleData.length > 0 && orderedManagers.length === 0) {
            const savedOrder = localStorage.getItem('schedule_manager_order');
            if (savedOrder) {
                setOrderedManagers(JSON.parse(savedOrder));
            } else {
                // Initialize with default sort to prevent jump
                // setOrderedManagers(scheduleData.map(m => m.id));
            }
        }
    }, [scheduleData]);

    return (
        <div className="pb-10 w-full max-w-full overflow-x-hidden">
            {/* PAGE HEADER */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 px-1">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <Calendar className="w-6 h-6 text-blue-600" />
                        График Смен
                    </h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        Планирование рабочих смен и распределение ГЕО
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 bg-white dark:bg-[#111] p-1.5 rounded-lg border border-gray-200 dark:border-[#333] shadow-sm">
                    {/* Month Nav */}
                    <div className="flex items-center bg-gray-50 dark:bg-[#1A1A1A] rounded-md px-1 mr-2">
                        <button
                            onClick={() => {
                                const newDate = new Date(currentDate);
                                newDate.setMonth(newDate.getMonth() - 1);
                                setCurrentDate(newDate);
                            }}
                            className="p-1.5 hover:bg-gray-200 dark:hover:bg-[#333] rounded-md transition-colors text-gray-600 dark:text-gray-400"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        <span className="text-sm font-medium w-[120px] text-center text-gray-700 dark:text-gray-300 capitalize">
                            {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
                        </span>
                        <button
                            onClick={() => {
                                const newDate = new Date(currentDate);
                                newDate.setMonth(newDate.getMonth() + 1);
                                setCurrentDate(newDate);
                            }}
                            className="p-1.5 hover:bg-gray-200 dark:hover:bg-[#333] rounded-md transition-colors text-gray-600 dark:text-gray-400"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Edit Modes */}
                    {canEdit && (
                        <>
                            <button
                                onClick={() => {
                                    setIsEditing(!isEditing);
                                    if (isMultiGeoEditing) setIsMultiGeoEditing(false);
                                    setSelectedCell(null);
                                }}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${isEditing
                                    ? 'bg-blue-600 text-white shadow-sm'
                                    : 'bg-gray-50 dark:bg-[#1A1A1A] text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#222]'
                                    }`}
                            >
                                <Edit className="w-3.5 h-3.5" />
                                Ред.
                            </button>

                            <button
                                onClick={() => {
                                    setIsMultiGeoEditing(!isMultiGeoEditing);
                                    if (isEditing) setIsEditing(false);
                                    setSelectedCell(null);
                                }}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${isMultiGeoEditing
                                    ? 'bg-purple-600 text-white shadow-sm'
                                    : 'bg-gray-50 dark:bg-[#1A1A1A] text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#222]'
                                    }`}
                            >
                                <Globe className="w-3.5 h-3.5" />
                                Ред Мульти
                            </button>
                        </>
                    )}

                    {canEdit && (
                        <button
                            onClick={() => {
                                setIsAdditionalEditing(!isAdditionalEditing);
                                if (isEditing) setIsEditing(false);
                                if (isMultiGeoEditing) setIsMultiGeoEditing(false);
                                setSelectedCell(null);
                            }}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${isAdditionalEditing
                                ? 'bg-emerald-600 text-white shadow-sm'
                                : 'bg-gray-50 dark:bg-[#1A1A1A] text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#222]'
                                }`}
                        >
                            <Calendar className="w-3.5 h-3.5" />
                            Ред Доп
                        </button>
                    )}

                    {canEdit && (
                        <button
                            onClick={() => setShowAdvancedModal(true)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow-sm"
                        >
                            <Settings className="w-3.5 h-3.5" />
                            Расширенное
                        </button>
                    )}

                    {/* Вид — dropdown, available to ALL roles */}
                    <div ref={viewMenuRef} className="relative ml-auto">
                        <button
                            onClick={() => setShowViewMenu(v => !v)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                                viewMode === 'compact'
                                    ? 'bg-indigo-600 text-white shadow-sm'
                                    : 'bg-gray-50 dark:bg-[#1A1A1A] text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#222]'
                            }`}
                        >
                            <LayoutGrid className="w-3.5 h-3.5" />
                            Вид
                            <ChevronDown className={`w-3 h-3 transition-transform ${showViewMenu ? 'rotate-180' : ''}`} />
                        </button>

                        {showViewMenu && (
                            <div className="absolute right-0 top-full mt-1 z-[100] bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-lg shadow-xl py-1 min-w-[170px]">

                                {/* Section: Размер */}
                                <div className="px-3 pt-2 pb-1 text-[9px] font-bold uppercase tracking-widest text-gray-400 dark:text-zinc-500">Размер</div>
                                {[['standard', 'Стандартный'], ['compact', 'Компактный']].map(([mode, label]) => (
                                    <button
                                        key={mode}
                                        onClick={() => selectViewMode(mode)}
                                        className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs text-left transition-colors ${
                                            viewMode === mode
                                                ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 font-semibold'
                                                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-zinc-800'
                                        }`}
                                    >
                                        <LayoutGrid className="w-3 h-3 flex-shrink-0" />
                                        {label}
                                        {viewMode === mode && <span className="ml-auto text-indigo-500">✓</span>}
                                    </button>
                                ))}

                                {/* Divider */}
                                <div className="my-1 border-t border-gray-100 dark:border-zinc-800" />

                                {/* Section: Стиль */}
                                <div className="px-3 pt-1 pb-1 text-[9px] font-bold uppercase tracking-widest text-gray-400 dark:text-zinc-500">Стиль</div>
                                {[['standard', 'Стандартный'], ['contrast', 'Контрастный']].map(([style, label]) => (
                                    <button
                                        key={style}
                                        onClick={() => selectCellStyle(style)}
                                        className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs text-left transition-colors ${
                                            cellStyle === style
                                                ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 font-semibold'
                                                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-zinc-800'
                                        }`}
                                    >
                                        <span className={`w-3 h-3 flex-shrink-0 rounded-sm border ${style === 'contrast' ? 'bg-emerald-500 border-emerald-600' : 'bg-gray-200 border-gray-300 dark:bg-zinc-700 dark:border-zinc-600'}`} />
                                        {label}
                                        {cellStyle === style && <span className="ml-auto text-indigo-500">✓</span>}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* CUSTOM GRID */}
            <div className="bg-white dark:bg-[#121212] border border-gray-200 dark:border-zinc-800 rounded-xl shadow-sm flex flex-col h-[calc(100vh-140px)]">
                {/* Scrollable Container — crosshair hover via DOM (no React state) */}
                <div
                    className="flex-1 overflow-x-scroll overflow-y-auto schedule-scroll"
                    onMouseLeave={() => {
                        document.querySelectorAll('.sch-col-hl').forEach(el => el.classList.remove('sch-col-hl'));
                    }}
                    onMouseOver={(e) => {
                        const cell = e.target.closest('[data-day-idx]');
                        document.querySelectorAll('.sch-col-hl').forEach(el => el.classList.remove('sch-col-hl'));
                        if (cell) {
                            const idx = cell.getAttribute('data-day-idx');
                            document.querySelectorAll(`[data-day-idx="${idx}"]`).forEach(el => el.classList.add('sch-col-hl'));
                        }
                    }}
                >
                    <div className="inline-block min-w-full">
                        {/* HEADER ROW */}
                        <div className="flex border-b border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-[#0A0A0A] sticky top-0 z-40 shadow-sm">
                            {/* Header: Manager Name */}
                            <div className={`${viewMode === 'compact' ? 'w-[120px]' : 'w-[152px]'} flex-shrink-0 px-2 py-1.5 text-[10px] font-semibold text-gray-500 dark:text-zinc-500 uppercase tracking-wide border-r border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-[#0A0A0A] sticky left-0 z-50 flex items-center`}>
                                <span>Менеджер</span>
                            </div>

                            {/* Header: Days */}
                            <div className="flex flex-1">
                                {daysInMonth.map((day, idx) => {
                                    const isToday = day.toDateString() === new Date().toDateString();
                                    const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                                    return (
                                        <div
                                            key={idx}
                                            data-day-idx={idx}
                                            className={[
                                                'min-w-[30px] flex-1 py-1 flex flex-col items-center justify-center',
                                                'border-r border-gray-100 dark:border-zinc-800/50 last:border-0',
                                                isToday  ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 font-bold' : '',
                                                isWeekend && !isToday ? 'bg-blue-50/40 dark:bg-blue-900/10 text-blue-500 dark:text-blue-500' : '',
                                                !isToday && !isWeekend ? 'text-gray-500 dark:text-zinc-500' : '',
                                            ].filter(Boolean).join(' ')}
                                        >
                                            <span className="text-[9px] opacity-70 leading-tight">{day.toLocaleDateString('ru-RU', { weekday: 'short' })}</span>
                                            <span className="text-[10px] leading-tight">{day.getDate()}</span>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Summary column headers */}
                            <div className="flex flex-shrink-0 border-l border-gray-200 dark:border-zinc-800">
                                {[['Смены','w-[48px]'],['Доп','w-[40px]'],['2ГЕО','w-[44px]']].map(([label, w]) => (
                                    <div key={label} className={`${w} py-1 flex items-center justify-center text-[9px] font-semibold text-gray-400 dark:text-zinc-500 uppercase tracking-wide border-r border-gray-200 dark:border-zinc-800 last:border-r-0`}>
                                        {label}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* MANAGER ROWS — plain divs, HTML5 DnD */}
                        <div>
                            {sortedScheduleData.map((row) => (
                                <ManagerRow
                                    key={row.id}
                                    row={row}
                                    countryMap={countryMap}
                                    daysInMonth={daysInMonth}
                                    isEditing={isEditing}
                                    isMultiGeoEditing={isMultiGeoEditing}
                                    isAdditionalEditing={isAdditionalEditing}
                                    canEdit={canEdit}
                                    onAutoFillClick={(managerId) => { setSelectedManagerForAutoFill(managerId); setShowAutoFillModal(true); }}
                                    onCellClick={(row, dateKey, geos) => {
                                        if (canEdit && isEditing) toggleShift(row.id, dateKey, row.geo);
                                        else if (isMultiGeoEditing) handleMultiGeoClick(row.id, dateKey, geos);
                                        else if (isAdditionalEditing) {
                                            setSelectedCell({ managerId: row.id, dateKey, managerName: row.name, assignedGeos: row.geos });
                                            setShowSingleGeoModal(true);
                                        }
                                    }}
                                    onNicknameCopy={(nick) => { navigator.clipboard.writeText(nick); showToast(`Скопировано: ${nick}`, 'success'); }}
                                    getGeoConfig={getGeoConfig}
                                    extraShifts={adjustments[row.id] || 0}
                                    onExtraShiftsSave={handleExtraShiftsSave}
                                    viewMode={viewMode}
                                    cellStyle={cellStyle}
                                    isDragging={draggedId === row.id}
                                    onDragStart={() => handleDragStart(row.id)}
                                    onDragOver={handleDragOver}
                                    onDrop={(e) => handleDrop(e, row.id)}
                                    onDragEnd={handleDragEnd}
                                />
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Schedule Stats */}
            <ScheduleStats
                rows={scheduleData}
                currentDate={currentDate}
                managerRates={managerRates}
                kpiSettings={kpiSettings}
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
                    // Refresh data
                    const { fetchAllData } = useAppStore.getState();
                    fetchAllData(true);
                }}
            />

            {/* Single GEO Selection Modal for "Edit Additional" */}
            <SingleGeoSelectModal
                isOpen={showSingleGeoModal}
                onClose={() => setShowSingleGeoModal(false)}
                onSelect={handleSingleGeoSelect}
                availableGeos={selectedCell?.assignedGeos || []}
                managerName={selectedCell?.managerName}
                date={selectedCell?.dateKey}
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
        </div >
    );
};

export default SchedulePage;
