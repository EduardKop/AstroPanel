import React from 'react';
import { X, Check } from 'lucide-react';

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

// Helper for dynamic colors
const getGeoConfig = (code) => {
    if (!code) return { color: '#gray', label: code };
    if (GEO_PALETTE[code]) return GEO_PALETTE[code];

    // Consistent dynamic color
    let hash = 0;
    for (let i = 0; i < code.length; i++) {
        hash = code.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = Math.abs(hash % 360);
    return {
        color: `hsl(${hue}, 70%, 50%)`,
        label: code.substring(0, 3)
    };
};

const MultiGeoModal = ({ isOpen, onClose, onSave, countries }) => {
    const [geo1, setGeo1] = React.useState('');
    const [geo2, setGeo2] = React.useState('');

    const handleSave = () => {
        if (geo1 && geo2) {
            onSave([geo1, geo2]);
            handleClose();
        }
    };

    const handleClose = () => {
        setGeo1('');
        setGeo2('');
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
            <div className="bg-white dark:bg-[#111] rounded-xl shadow-2xl w-full max-w-md">
                <div className="px-6 py-4 border-b border-gray-200 dark:border-[#333] flex items-center justify-between">
                    <h3 className="text-lg font-bold dark:text-white">Выберите 2 ГЕО</h3>
                    <button onClick={handleClose} className="p-1.5 hover:bg-gray-100 dark:hover:bg-[#222] rounded-lg transition-colors">
                        <X size={18} className="text-gray-500" />
                    </button>
                </div>

                <div className="p-6 space-y-4">
                    {/* GEO 1 */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Первое ГЕО (верх)
                        </label>
                        <select
                            value={geo1}
                            onChange={(e) => setGeo1(e.target.value)}
                            className="w-full px-3 py-2 bg-white dark:bg-[#1A1A1A] border border-gray-300 dark:border-[#333] rounded-lg text-sm focus:ring-2 focus:ring-blue-500 dark:text-white"
                        >
                            <option value="">Выберите...</option>
                            {(countries || []).map(c => (
                                <option key={c.code} value={c.code}>
                                    {c.emoji} {c.code}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* GEO 2 */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Второе ГЕО (низ)
                        </label>
                        <select
                            value={geo2}
                            onChange={(e) => setGeo2(e.target.value)}
                            disabled={!geo1}
                            className="w-full px-3 py-2 bg-white dark:bg-[#1A1A1A] border border-gray-300 dark:border-[#333] rounded-lg text-sm focus:ring-2 focus:ring-blue-500 dark:text-white disabled:opacity-50"
                        >
                            <option value="">Выберите...</option>
                            {(countries || [])
                                .filter(c => c.code !== geo1)
                                .map(c => (
                                    <option key={c.code} value={c.code}>
                                        {c.emoji} {c.code}
                                    </option>
                                ))}
                        </select>
                    </div>

                    {/* Preview */}
                    {geo1 && geo2 && (
                        <div className="bg-gray-50 dark:bg-[#1A1A1A] rounded-lg p-4 border border-gray-200 dark:border-[#333]">
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 text-center">Предпросмотр:</p>
                            <div className="w-16 h-14 mx-auto rounded overflow-hidden shadow-md">
                                <div
                                    className="h-1/2 flex items-center justify-center text-white text-xs font-bold"
                                    style={{ backgroundColor: getGeoConfig(geo1).color }}
                                >
                                    {getGeoConfig(geo1).label}
                                </div>
                                <div
                                    className="h-1/2 flex items-center justify-center text-white text-xs font-bold border-t border-white/30"
                                    style={{ backgroundColor: getGeoConfig(geo2).color }}
                                >
                                    {getGeoConfig(geo2).label}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="px-6 py-4 border-t border-gray-200 dark:border-[#333] flex gap-2 justify-end">
                    <button
                        onClick={handleClose}
                        className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#222] rounded-lg transition-colors"
                    >
                        Отмена
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={!geo1 || !geo2}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
                    >
                        <Check size={16} />
                        Назначить
                    </button>
                </div>
            </div>
        </div>
    );
};

export default MultiGeoModal;
