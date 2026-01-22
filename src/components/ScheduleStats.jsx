import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import { showToast } from '../utils/toastEvents';
import { Save, Loader2, Calculator } from 'lucide-react';

const ScheduleStats = ({ rows, currentDate, onDataChange }) => {
    const [adjustments, setAdjustments] = useState({});
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(null); // managerId being saved

    // Format current month for DB: YYYY-MM-01
    const getMonthDate = () => {
        const year = currentDate.getFullYear();
        const month = String(currentDate.getMonth() + 1).padStart(2, '0');
        return `${year}-${month}-01`;
    };

    // Load adjustments
    useEffect(() => {
        const loadAdjustments = async () => {
            setLoading(true);
            try {
                const monthDate = getMonthDate();
                const { data, error } = await supabase
                    .from('schedule_adjustments')
                    .select('manager_id, extra_shifts')
                    .eq('month', monthDate);

                if (error) throw error;

                const adjMap = {};
                (data || []).forEach(item => {
                    adjMap[item.manager_id] = item.extra_shifts;
                });
                setAdjustments(adjMap);
            } catch (error) {
                console.error('Error loading adjustments:', error);
            } finally {
                setLoading(false);
            }
        };

        loadAdjustments();
    }, [currentDate]);

    // Save adjustment
    const handleSave = async (managerId, value) => {
        setSaving(managerId);
        try {
            const extraShifts = parseInt(value) || 0;
            const monthDate = getMonthDate();

            const { error } = await supabase
                .from('schedule_adjustments')
                .upsert({
                    manager_id: managerId,
                    month: monthDate,
                    extra_shifts: extraShifts
                }, {
                    onConflict: 'manager_id, month'
                });

            if (error) throw error;

            setAdjustments(prev => ({ ...prev, [managerId]: extraShifts }));
            if (onDataChange) onDataChange();

        } catch (error) {
            console.error('Error saving adjustment:', error);
            console.error('Error details:', error.message, error.details, error.hint);
            showToast(`Ошибка при сохранении: ${error.message}`, 'error');
        } finally {
            setSaving(null);
        }
    };

    // Calculate stats per manager
    const stats = (rows || []).map(row => {
        const shiftsValues = Object.values(row.shifts || {}).filter(Boolean);

        const totalShifts = shiftsValues.length;
        const multiGeoShifts = shiftsValues.filter(geo => geo.includes(',')).length;
        const extraShifts = adjustments[row.id] || 0;

        return {
            ...row,
            totalShifts,
            multiGeoShifts,
            extraShifts
        };
    });

    return (
        <div className="bg-white dark:bg-[#111] rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-[#333] mt-6">
            <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600 dark:text-blue-400">
                    <Calculator size={20} />
                </div>
                <div>
                    <h3 className="text-lg font-bold dark:text-white">Статистика смен</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        Подсчет смен и корректировки за {(currentDate || new Date()).toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })}
                    </p>
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 dark:bg-[#1A1A1A] text-gray-500 dark:text-gray-400">
                        <tr>
                            <th className="px-4 py-3 rounded-l-xl font-medium">Менеджер</th>
                            <th className="px-4 py-3 font-medium">ГЕО</th>
                            <th className="px-4 py-3 font-medium text-center">Всего смен</th>
                            <th className="px-4 py-3 font-medium text-center">Совмещения (2 ГЕО)</th>
                            <th className="px-4 py-3 rounded-r-xl font-medium text-center w-[180px]">Доп. смены</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-[#222]">
                        {stats.map(stat => (
                            <tr key={stat.id} className="hover:bg-gray-50/50 dark:hover:bg-[#1A1A1A]/50 transition-colors">
                                <td className="px-4 py-3 font-medium dark:text-white">
                                    {stat.name}
                                </td>
                                <td className="px-4 py-3">
                                    <div className="flex gap-1">
                                        {(Array.isArray(stat.geos) ? stat.geos : (stat.geo ? [stat.geo] : [])).slice(0, 3).map((g, i) => (
                                            <span key={i} className="px-1.5 py-0.5 bg-gray-100 dark:bg-[#222] rounded text-xs text-gray-600 dark:text-gray-300">
                                                {g}
                                            </span>
                                        ))}
                                    </div>
                                </td>
                                <td className="px-4 py-3 text-center font-bold text-gray-900 dark:text-white">
                                    {stat.totalShifts}
                                </td>
                                <td className="px-4 py-3 text-center">
                                    {stat.multiGeoShifts > 0 ? (
                                        <span className="px-2 py-1 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 rounded-md font-semibold text-xs">
                                            {stat.multiGeoShifts}
                                        </span>
                                    ) : (
                                        <span className="text-gray-400">—</span>
                                    )}
                                </td>
                                <td className="px-4 py-3 text-center">
                                    <div className="flex items-center justify-center gap-2">
                                        <input
                                            type="number"
                                            className="w-16 px-2 py-1 bg-gray-50 dark:bg-[#1A1A1A] border border-gray-200 dark:border-[#333] rounded-lg text-center dark:text-white text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                            value={adjustments[stat.id] ?? 0}
                                            onChange={(e) => {
                                                const val = parseInt(e.target.value) || 0;
                                                setAdjustments(prev => ({ ...prev, [stat.id]: val }));
                                            }}
                                            onBlur={(e) => handleSave(stat.id, e.target.value)}
                                        />
                                        {saving === stat.id && (
                                            <Loader2 size={14} className="animate-spin text-blue-500" />
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot className="border-t border-gray-200 dark:border-[#333]">
                        <tr>
                            <td colSpan="2" className="px-4 py-4 font-bold text-gray-900 dark:text-white text-right">
                                Итого:
                            </td>
                            <td className="px-4 py-4 text-center font-bold text-blue-600 dark:text-blue-400">
                                {stats.reduce((acc, s) => acc + s.totalShifts, 0)}
                            </td>
                            <td className="px-4 py-4 text-center font-bold text-purple-600 dark:text-purple-400">
                                {stats.reduce((acc, s) => acc + s.multiGeoShifts, 0)}
                            </td>
                            <td className="px-4 py-4 text-center font-bold text-gray-700 dark:text-gray-300">
                                {stats.reduce((acc, s) => acc + (parseInt(s.extraShifts) || 0), 0)}
                            </td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        </div>
    );
};

export default ScheduleStats;
