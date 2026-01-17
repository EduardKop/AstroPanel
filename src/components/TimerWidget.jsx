import React, { useState, useEffect, useCallback } from 'react';
import { useAppStore } from '../store/appStore';
import { supabase } from '../services/supabaseClient';
import { Play, Square, Clock } from 'lucide-react';

const TimerWidget = () => {
    const { user, schedules, countries } = useAppStore();
    const [activeEntry, setActiveEntry] = useState(null);
    const [elapsed, setElapsed] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const [shiftError, setShiftError] = useState(null);

    // Fetch active time entry
    const fetchActiveEntry = useCallback(async () => {
        if (!user?.id) return;

        const { data, error } = await supabase
            .from('time_entries')
            .select('*')
            .eq('manager_id', user.id)
            .is('clock_out', null)
            .order('clock_in', { ascending: false })
            .limit(1)
            .single();

        if (data && !error) {
            setActiveEntry(data);
        } else {
            setActiveEntry(null);
        }
    }, [user?.id]);

    // Initial fetch
    useEffect(() => {
        fetchActiveEntry();
    }, [fetchActiveEntry]);

    // Timer tick
    useEffect(() => {
        if (!activeEntry) {
            setElapsed(0);
            return;
        }

        const clockIn = new Date(activeEntry.clock_in);

        const updateElapsed = () => {
            const now = new Date();
            const diff = Math.floor((now - clockIn) / 1000);
            setElapsed(diff);
        };

        updateElapsed();
        const interval = setInterval(updateElapsed, 1000);
        return () => clearInterval(interval);
    }, [activeEntry]);

    // Format time HH:MM:SS
    const formatTime = (seconds) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    // Validation Logic
    const validateShiftTime = () => {
        // 1. Find today's schedule
        const todayStr = new Date().toISOString().split('T')[0];
        const schedule = schedules.find(s => s.manager_id === user.id && s.date === todayStr);

        if (!schedule) {
            return { valid: false, message: 'Нет смены в расписании на сегодня' };
        }

        // 2. Find GEO and shift times
        const country = Array.from(countries).find(c => c.code === schedule.geo);
        if (!country || !country.shift_start || !country.shift_end) {
            // If no settings, allow (assuming it's safe to let them work if config is missing)
            return { valid: true, geo: schedule.geo };
        }

        // 3. Get Current Kiev Time
        const now = new Date();
        const kievTimeStr = now.toLocaleString("en-US", { timeZone: "Europe/Kiev" });
        const kievDate = new Date(kievTimeStr);
        const currentMins = kievDate.getHours() * 60 + kievDate.getMinutes();

        // 4. Parse Start/End
        const [startH, startM] = country.shift_start.split(':').map(Number);
        const [endH, endM] = country.shift_end.split(':').map(Number);

        const startMins = startH * 60 + startM;
        const endMins = endH * 60 + endM;

        // 5. Check window
        let isValid = false;
        // Buffer: Allow 15 mins early
        const buffer = 15;

        if (startMins < endMins) {
            // Standard day shift (e.g. 09:00 - 18:00)
            isValid = currentMins >= (startMins - buffer) && currentMins < endMins;
        } else {
            // Night shift (e.g. 22:00 - 06:00)
            // Valid if: >= 21:45 OR < 06:00
            isValid = currentMins >= (startMins - buffer) || currentMins < endMins;
        }

        if (!isValid) {
            return {
                valid: false,
                message: `Смена ${country.code}: ${country.shift_start} - ${country.shift_end} (Киев)`
            };
        }

        return { valid: true, geo: schedule.geo };
    };

    // Clock In
    const handleClockIn = async () => {
        if (!user?.id || isLoading) return;
        setShiftError(null);

        // Validate
        const check = validateShiftTime();
        if (!check.valid) {
            setShiftError(check.message);
            // Hide error after 5s
            setTimeout(() => setShiftError(null), 5000);
            return;
        }

        setIsLoading(true);

        const { data, error } = await supabase
            .from('time_entries')
            .insert({
                manager_id: user.id,
                clock_in: new Date().toISOString(),
                geo_code: check.geo // Save GEO
            })
            .select()
            .single();

        if (data && !error) {
            setActiveEntry(data);
        } else {
            console.error('Clock in error:', error);
        }
        setIsLoading(false);
    };

    // Clock Out
    const handleClockOut = async () => {
        if (!activeEntry || isLoading) return;
        setIsLoading(true);

        const { error } = await supabase
            .from('time_entries')
            .update({
                clock_out: new Date().toISOString()
            })
            .eq('id', activeEntry.id);

        if (!error) {
            setActiveEntry(null);
            setElapsed(0);
        } else {
            console.error('Clock out error:', error);
        }
        setIsLoading(false);
    };

    if (!user) return null;

    // Only show timer for Sales and SeniorSales roles
    if (!['Sales', 'SeniorSales'].includes(user.role)) return null;

    return (
        <div className="w-full flex flex-col gap-2">
            {/* Error Message */}
            {shiftError && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-500 text-[10px] px-2 py-1.5 rounded text-center animate-fade-in">
                    {shiftError}
                </div>
            )}

            <div className="w-full">
                {activeEntry ? (
                    // Active shift - show timer
                    <div className="flex items-center justify-between gap-2 w-full bg-gray-50 dark:bg-[#1A1A1A] p-1 rounded-lg border border-gray-100 dark:border-[#333]">
                        <div className="flex items-center gap-2 pl-2">
                            <Clock size={14} className="text-emerald-500 animate-pulse" />
                            <span className="font-mono text-sm font-bold text-gray-700 dark:text-gray-200">{formatTime(elapsed)}</span>
                            {activeEntry.geo_code && (
                                <span className="text-[10px] bg-gray-200 dark:bg-[#333] px-1.5 py-0.5 rounded text-gray-600 dark:text-gray-400 font-medium">
                                    {activeEntry.geo_code}
                                </span>
                            )}
                        </div>
                        <button
                            onClick={handleClockOut}
                            disabled={isLoading}
                            className="bg-rose-500 hover:bg-rose-600 text-white px-3 py-1.5 rounded-md text-xs font-bold transition-colors disabled:opacity-50 flex items-center gap-1"
                        >
                            <Square size={10} />
                            Stop
                        </button>
                    </div>
                ) : (
                    // No active shift - show start button full width
                    <button
                        onClick={handleClockIn}
                        disabled={isLoading}
                        className="w-full flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white py-2 rounded-lg text-sm font-bold transition-all shadow-sm hover:shadow active:scale-95 disabled:opacity-50 disabled:active:scale-100"
                    >
                        <Play size={16} fill="currentColor" />
                        Начать смену
                    </button>
                )}
            </div>
        </div>
    );
};

export default TimerWidget;
