import React, { useState, useEffect, useMemo } from 'react';
import { useAppStore } from '../store/appStore';
import { supabase } from '../services/supabaseClient';
import { Clock, Calendar, Users, RotateCcw, ChevronLeft, ChevronRight } from 'lucide-react';
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

const TimeLogPage = () => {
    const { user, managers } = useAppStore();
    const [entries, setEntries] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedManager, setSelectedManager] = useState('all');

    // Date range for filtering
    const [dateRange, setDateRange] = useState(() => {
        const end = new Date();
        const start = new Date();
        start.setDate(start.getDate() - 7);
        return [start, end];
    });
    const [startDate, endDate] = dateRange;

    const isAdmin = user && ['Admin', 'C-level', 'SeniorSales'].includes(user.role);

    // Fetch time entries
    useEffect(() => {
        const fetchEntries = async () => {
            setIsLoading(true);

            let query = supabase
                .from('work_shifts')
                .select('*, managers(name, avatar_url)')
                .order('clock_in', { ascending: false });

            if (!user) return;

            // Strict Access Control:
            // - Admins/C-level: Can see all or filter by specific manager
            // - Others (Sales): CAN ONLY see their own entries
            if (!isAdmin) {
                query = query.eq('manager_id', user.id);
            } else if (selectedManager !== 'all') {
                query = query.eq('manager_id', selectedManager);
            }

            // Date filter
            if (startDate) {
                query = query.gte('clock_in', startDate.toISOString());
            }
            if (endDate) {
                const endOfDay = new Date(endDate);
                endOfDay.setHours(23, 59, 59, 999);
                query = query.lte('clock_in', endOfDay.toISOString());
            }

            const { data, error } = await query;

            if (!error && data) {
                setEntries(data);
            }
            setIsLoading(false);
        };

        fetchEntries();
    }, [user, isAdmin, selectedManager, startDate, endDate]);

    // Format duration
    const formatDuration = (clockIn, clockOut, breakMins = 0) => {
        if (!clockOut) return 'В работе...';

        const start = new Date(clockIn);
        const end = new Date(clockOut);
        const totalMinutes = Math.floor((end - start) / 60000) - breakMins;

        const hours = Math.floor(totalMinutes / 60);
        const mins = totalMinutes % 60;

        return `${hours}ч ${mins}м`;
    };

    // Format time
    const formatTime = (dateStr) => {
        if (!dateStr) return '—';
        const date = new Date(dateStr);
        return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    };

    // Format date
    const formatDate = (dateStr) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
    };

    // Calculate totals
    const totals = useMemo(() => {
        let totalMinutes = 0;
        let completedShifts = 0;

        entries.forEach(entry => {
            if (entry.clock_out) {
                const start = new Date(entry.clock_in);
                const end = new Date(entry.clock_out);
                const mins = Math.floor((end - start) / 60000) - (entry.break_minutes || 0);
                totalMinutes += mins;
                completedShifts++;
            }
        });

        return {
            totalHours: Math.floor(totalMinutes / 60),
            totalMinutes: totalMinutes % 60,
            completedShifts
        };
    }, [entries]);

    const resetFilters = () => {
        const end = new Date();
        const start = new Date();
        start.setDate(start.getDate() - 7);
        setDateRange([start, end]);
        setSelectedManager('all');
    };

    return (
        <div className="pb-10">
            {/* HEADER */}
            <div className="sticky top-0 z-20 bg-[#F5F5F5] dark:bg-[#0A0A0A] -mx-3 px-3 md:-mx-6 md:px-6 py-3 border-b border-transparent flex flex-col gap-3">
                <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold dark:text-white tracking-tight flex items-center gap-2">
                        <Clock size={18} className="text-blue-600 dark:text-blue-500" />
                        <span>Учёт времени</span>
                    </h2>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    {/* Date Range Picker */}
                    <div className="flex items-center gap-2 bg-white dark:bg-[#111] border border-gray-200 dark:border-[#333] rounded-lg px-3 py-1.5">
                        <Calendar size={14} className="text-gray-400" />
                        <DatePicker
                            selectsRange={true}
                            startDate={startDate}
                            endDate={endDate}
                            onChange={(update) => setDateRange(update)}
                            dateFormat="dd.MM.yyyy"
                            className="bg-transparent text-xs font-medium dark:text-white outline-none w-[160px] cursor-pointer"
                            placeholderText="Выберите период"
                        />
                    </div>

                    {/* Manager Filter (Admin only) */}
                    {isAdmin && (
                        <select
                            value={selectedManager}
                            onChange={(e) => setSelectedManager(e.target.value)}
                            className="bg-white dark:bg-[#111] border border-gray-200 dark:border-[#333] rounded-lg px-3 py-1.5 text-xs font-medium dark:text-white"
                        >
                            <option value="all">Все менеджеры</option>
                            {managers.map(m => (
                                <option key={m.id} value={m.id}>{m.name}</option>
                            ))}
                        </select>
                    )}

                    <button onClick={resetFilters} className="text-gray-400 hover:text-blue-500">
                        <RotateCcw size={14} />
                    </button>
                </div>

                {/* Summary Cards */}
                <div className="flex gap-3">
                    <div className="bg-white dark:bg-[#111] border border-gray-200 dark:border-[#333] rounded-lg px-4 py-2">
                        <div className="text-[10px] text-gray-500 uppercase">Всего часов</div>
                        <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
                            {totals.totalHours}ч {totals.totalMinutes}м
                        </div>
                    </div>
                    <div className="bg-white dark:bg-[#111] border border-gray-200 dark:border-[#333] rounded-lg px-4 py-2">
                        <div className="text-[10px] text-gray-500 uppercase">Смен</div>
                        <div className="text-lg font-bold text-gray-700 dark:text-gray-300">
                            {totals.completedShifts}
                        </div>
                    </div>
                </div>
            </div>

            {/* TABLE */}
            <div className="mt-4 overflow-x-auto rounded-xl border border-gray-200 dark:border-[#333] bg-white dark:bg-[#111]">
                <table className="w-full text-xs">
                    <thead>
                        <tr className="border-b border-gray-200 dark:border-[#333]">
                            <th className="px-4 py-3 text-left font-bold text-gray-600 dark:text-gray-400">Дата</th>
                            {isAdmin && <th className="px-4 py-3 text-left font-bold text-gray-600 dark:text-gray-400">Менеджер</th>}
                            <th className="px-4 py-3 text-center font-bold text-gray-600 dark:text-gray-400">Начало</th>
                            <th className="px-4 py-3 text-center font-bold text-gray-600 dark:text-gray-400">Конец</th>
                            <th className="px-4 py-3 text-center font-bold text-gray-600 dark:text-gray-400">Перерыв</th>
                            <th className="px-4 py-3 text-center font-bold text-gray-600 dark:text-gray-400">Отработано</th>
                            <th className="px-4 py-3 text-left font-bold text-gray-600 dark:text-gray-400">GEO</th>
                        </tr>
                    </thead>
                    <tbody>
                        {isLoading ? (
                            <tr>
                                <td colSpan={isAdmin ? 7 : 6} className="px-4 py-8 text-center text-gray-400">
                                    Загрузка...
                                </td>
                            </tr>
                        ) : entries.length === 0 ? (
                            <tr>
                                <td colSpan={isAdmin ? 7 : 6} className="px-4 py-8 text-center text-gray-400">
                                    Нет записей за выбранный период
                                </td>
                            </tr>
                        ) : (
                            entries.map((entry, idx) => (
                                <tr
                                    key={entry.id}
                                    className={`border-b border-gray-100 dark:border-[#222] hover:bg-gray-50 dark:hover:bg-[#1A1A1A] ${!entry.clock_out ? 'bg-emerald-50 dark:bg-emerald-900/10' : ''}`}
                                >
                                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                                        {formatDate(entry.clock_in)}
                                    </td>
                                    {isAdmin && (
                                        <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                                            {entry.managers?.name || '—'}
                                        </td>
                                    )}
                                    <td className="px-4 py-3 text-center text-emerald-600 dark:text-emerald-400 font-medium">
                                        {formatTime(entry.clock_in)}
                                    </td>
                                    <td className="px-4 py-3 text-center text-rose-600 dark:text-rose-400 font-medium">
                                        {formatTime(entry.clock_out)}
                                    </td>
                                    <td className="px-4 py-3 text-center text-gray-500">
                                        {entry.break_minutes ? `${entry.break_minutes}м` : '—'}
                                    </td>
                                    <td className="px-4 py-3 text-center font-bold text-blue-600 dark:text-blue-400">
                                        {formatDuration(entry.clock_in, entry.clock_out, entry.break_minutes)}
                                    </td>
                                    <td className="px-4 py-3 text-gray-500">
                                        {entry.geo_code || '—'}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default TimeLogPage;
