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
    'Таро': { color: '#8b5cf6', label: 'Тар' }, // Purple
    'Доп смена': { color: '#f59e0b', label: 'Доп' }, // Orange
};

// Helper for dynamic colors (reused)
const getGeoConfig = (code) => {
    if (!code) return { color: '#gray', label: code };
    if (GEO_PALETTE[code]) return GEO_PALETTE[code];

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

const SingleGeoSelectModal = ({ isOpen, onClose, onSelect, availableGeos, managerName, date }) => {
    // Hotkey: Escape to close
    React.useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape' && isOpen) onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen]);

    const defaultOptions = ['Доп смена', 'Таро'];

    // Combine defaults with available manager GEOs, removing duplicates
    const allOptions = Array.from(new Set([...defaultOptions, ...(availableGeos || [])]));

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
            <div className="bg-white dark:bg-[#111] rounded-xl shadow-2xl w-full max-w-sm">
                <div className="px-6 py-4 border-b border-gray-200 dark:border-[#333] flex items-center justify-between">
                    <div>
                        <h3 className="text-lg font-bold dark:text-white">Выберите ГЕО</h3>
                        {managerName && <p className="text-xs text-gray-500 dark:text-gray-400">для {managerName} на {date}</p>}
                    </div>
                    <button onClick={onClose} className="p-1.5 hover:bg-gray-100 dark:hover:bg-[#222] rounded-lg transition-colors">
                        <X size={18} className="text-gray-500" />
                    </button>
                </div>

                <div className="p-6">
                    <div className="grid grid-cols-2 gap-3">
                        {allOptions.map(geoCode => {
                            const config = getGeoConfig(geoCode);
                            return (
                                <button
                                    key={geoCode}
                                    onClick={() => onSelect(geoCode)}
                                    className="flex flex-col items-center justify-center p-3 rounded-lg border border-gray-200 dark:border-[#333] hover:border-blue-500 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all group"
                                >
                                    <div
                                        className="w-10 h-6 mb-2 rounded flex items-center justify-center text-white text-[10px] font-bold shadow-sm"
                                        style={{ backgroundColor: config.color }}
                                    >
                                        {config.label}
                                    </div>
                                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-blue-600 dark:group-hover:text-blue-400">
                                        {geoCode}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SingleGeoSelectModal;
