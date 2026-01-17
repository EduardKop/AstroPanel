import React, { useState, useEffect } from 'react';
import { X, Check, User } from 'lucide-react';
import { supabase } from '../services/supabaseClient';

const AdvancedScheduleModal = ({ isOpen, onClose, managers, countries, onSave }) => {
    const [localManagers, setLocalManagers] = useState([]);
    const [isSaving, setIsSaving] = useState(false);

    // Initialize local state when modal opens
    useEffect(() => {
        if (isOpen && managers) {
            setLocalManagers(managers.map(m => ({
                id: m.id,
                name: m.name,
                geo: Array.isArray(m.geo) && m.geo.length > 0 ? m.geo[0] : m.geo,
                show_in_schedule: m.show_in_schedule !== false
            })));
        }
    }, [isOpen, managers]);

    const toggleManager = (managerId) => {
        setLocalManagers(prev => prev.map(m =>
            m.id === managerId
                ? { ...m, show_in_schedule: !m.show_in_schedule }
                : m
        ));
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const updates = localManagers.map(m =>
                supabase
                    .from('managers')
                    .update({ show_in_schedule: m.show_in_schedule })
                    .eq('id', m.id)
            );

            await Promise.all(updates);

            if (onSave) onSave();
            onClose();
        } catch (error) {
            console.error('Error saving manager visibility:', error);
            alert('Ошибка при сохранении настроек');
        } finally {
            setIsSaving(false);
        }
    };

    const getCountryEmoji = (geoCode) => {
        const country = (countries || []).find(c => c.code === geoCode);
        return country?.emoji || '🌍';
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-[#111] rounded-xl shadow-2xl max-w-2xl w-full max-h-[80vh] flex flex-col">
                <div className="px-6 py-4 border-b border-gray-200 dark:border-[#333] flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-bold dark:text-white flex items-center gap-2">
                            <User size={20} className="text-blue-600" />
                            Расширенные Настройки
                        </h2>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            Управление видимостью менеджеров в графике
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-[#222] rounded-lg transition-colors">
                        <X size={20} className="text-gray-500" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6">
                    <div className="space-y-2">
                        {localManagers.map((manager) => (
                            <label
                                key={manager.id}
                                className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-[#1A1A1A] cursor-pointer transition-colors group"
                            >
                                <input
                                    type="checkbox"
                                    checked={manager.show_in_schedule}
                                    onChange={() => toggleManager(manager.id)}
                                    className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                />

                                <div className="flex-1 flex items-center gap-2">
                                    <span className="text-sm font-medium dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                        {manager.name}
                                    </span>
                                    {/* Display all manager GEOs */}
                                    {manager.geo && (
                                        <div className="flex items-center gap-1">
                                            {(Array.isArray(manager.geo) ? manager.geo : [manager.geo]).map((g, idx) => (
                                                <div key={idx} className="flex items-center gap-1 px-2 py-0.5 bg-gray-100 dark:bg-[#222] rounded text-xs">
                                                    <span>{getCountryEmoji(g)}</span>
                                                    <span className="text-gray-600 dark:text-gray-400 font-medium">{g}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <span className={`text-xs font-medium ${manager.show_in_schedule
                                    ? 'text-green-600 dark:text-green-400'
                                    : 'text-gray-400'
                                    }`}>
                                    {manager.show_in_schedule ? 'Показывать' : 'Скрыт'}
                                </span>
                            </label>
                        ))}
                    </div>
                </div>

                <div className="px-6 py-4 border-t border-gray-200 dark:border-[#333] flex items-center justify-between">
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                        Показано: <span className="font-bold text-blue-600">{localManagers.filter(m => m.show_in_schedule).length}</span> из {localManagers.length}
                    </p>
                    <div className="flex gap-2">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#222] rounded-lg transition-colors"
                        >
                            Отмена
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={isSaving}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white text-sm font-medium rounded-lg transition-colors"
                        >
                            {isSaving ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Сохранение...
                                </>
                            ) : (
                                <>
                                    <Check size={16} />
                                    Сохранить
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdvancedScheduleModal;
