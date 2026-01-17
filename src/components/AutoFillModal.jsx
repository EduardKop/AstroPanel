import React, { useState } from 'react';
import { X, Check, Calendar as CalendarIcon, RotateCw, Trash2 } from 'lucide-react';

const PATTERNS = [
    { id: '2-2', label: '2/2 (2 раб, 2 вых)' },
    { id: '3-3', label: '3/3 (3 раб, 3 вых)' },
    { id: '5-2', label: '5/2 (5 раб, 2 вых)' },
    { id: '6-0', label: '6/0 (Без выходных)' }, // User specific request
    { id: '4-2', label: '4/2 (4 раб, 2 вых)' },
    { id: '3-1', label: '3/1 (3 раб, 1 вых)' },
    { id: '4-1', label: '4/1 (4 раб, 1 вых)' },
    { id: '5-1', label: '5/1 (5 раб, 1 вых)' },
];

const AutoFillModal = ({ isOpen, onClose, onSave, mode, countries, managerName, currentDate }) => {
    // Default start date: today or 1st of current month
    const [startDate, setStartDate] = useState(() => {
        const now = new Date();
        // If current view month is different from real current month, maybe use 1st of view month?
        // Let's use 1st of the view month from props
        const year = currentDate.getFullYear();
        const month = String(currentDate.getMonth() + 1).padStart(2, '0');
        return `${year}-${month}-01`;
    });

    const [pattern, setPattern] = useState('2-2');
    const [geo1, setGeo1] = useState('');
    const [geo2, setGeo2] = useState('');

    const handleSave = () => {
        if (!startDate) return;
        if (mode === 'multi' && (!geo1 || !geo2)) return;

        onSave({
            startDate,
            pattern,
            geos: mode === 'multi' ? [geo1, geo2] : null
        });
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[70] p-4">
            <div className="bg-white dark:bg-[#111] rounded-xl shadow-2xl w-full max-w-md border border-gray-200 dark:border-[#333]">
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-200 dark:border-[#333] flex items-center justify-between">
                    <div>
                        <h3 className="text-lg font-bold dark:text-white flex items-center gap-2">
                            <RotateCw size={18} className="text-blue-500" />
                            Автозаполнение
                        </h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                            Для: <span className="font-medium text-gray-700 dark:text-gray-300">{managerName}</span>
                        </p>
                    </div>
                    <button onClick={onClose} className="p-1.5 hover:bg-gray-100 dark:hover:bg-[#222] rounded-lg transition-colors">
                        <X size={18} className="text-gray-500" />
                    </button>
                </div>

                <div className="p-6 space-y-5">
                    {/* Start Date */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                            <CalendarIcon size={14} />
                            Начать с даты
                        </label>
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="w-full px-3 py-2 bg-white dark:bg-[#1A1A1A] border border-gray-300 dark:border-[#333] rounded-lg text-sm focus:ring-2 focus:ring-blue-500 dark:text-white outline-none"
                        />
                    </div>

                    {/* Pattern */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            График работы
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                            {PATTERNS.map(p => (
                                <button
                                    key={p.id}
                                    onClick={() => setPattern(p.id)}
                                    className={`px-3 py-2 text-xs font-medium rounded-lg border transition-all ${pattern === p.id
                                        ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-500 text-blue-700 dark:text-blue-400'
                                        : 'bg-white dark:bg-[#1A1A1A] border-gray-200 dark:border-[#333] text-gray-600 dark:text-gray-400 hover:border-blue-300'
                                        }`}
                                >
                                    {p.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Multi GEO Selection */}
                    {mode === 'multi' && (
                        <div className="p-4 bg-purple-50 dark:bg-purple-900/10 rounded-xl border border-purple-100 dark:border-purple-900/30 space-y-3">
                            <h4 className="text-sm font-semibold text-purple-800 dark:text-purple-300 mb-2">
                                Выберите пару ГЕО
                            </h4>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs text-gray-500 mb-1 block">Верх</label>
                                    <select
                                        value={geo1}
                                        onChange={(e) => setGeo1(e.target.value)}
                                        className="w-full px-2 py-1.5 bg-white dark:bg-[#1A1A1A] border border-gray-300 dark:border-[#333] rounded text-xs dark:text-white"
                                    >
                                        <option value="">Выбрать...</option>
                                        {(countries || []).map(c => (
                                            <option key={c.code} value={c.code}>{c.emoji} {c.code}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs text-gray-500 mb-1 block">Низ</label>
                                    <select
                                        value={geo2}
                                        onChange={(e) => setGeo2(e.target.value)}
                                        className="w-full px-2 py-1.5 bg-white dark:bg-[#1A1A1A] border border-gray-300 dark:border-[#333] rounded text-xs dark:text-white"
                                    >
                                        <option value="">Выбрать...</option>
                                        {(countries || []).map(c => (
                                            <option key={c.code} value={c.code}>{c.emoji} {c.code}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="px-6 py-4 border-t border-gray-200 dark:border-[#333] flex justify-between items-center">
                    <button
                        onClick={() => onSave({ startDate, clear: true })}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                    >
                        <Trash2 size={16} />
                        Очистить
                    </button>
                    <div className="flex gap-2">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#222] rounded-lg transition-colors"
                        >
                            Отмена
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={mode === 'multi' && (!geo1 || !geo2)}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors shadow-lg shadow-blue-500/30"
                        >
                            <Check size={16} />
                            Применить
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AutoFillModal;
