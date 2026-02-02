import React, { useState } from 'react';
import { Filter } from 'lucide-react';

// Mobile Custom Multi-Select Dropdown
export const MobileSelect = ({ label, value, options, onChange, customButtons = [], gridCols = 1 }) => {
    const [isOpen, setIsOpen] = useState(false);
    const selectedValues = Array.isArray(value) ? value : [];

    const handleSelect = (val) => {
        let newValues;
        if (selectedValues.includes(val)) {
            newValues = selectedValues.filter(v => v !== val);
        } else {
            newValues = [...selectedValues, val];
        }
        onChange(newValues);
    };

    const handleClear = () => {
        onChange([]);
        setIsOpen(false);
    };

    const displayText = selectedValues.length > 0
        ? `${label} (${selectedValues.length})`
        : label;

    return (
        <div className="relative w-full">
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="w-full bg-white dark:bg-[#111] border border-gray-200 dark:border-[#333] text-gray-700 dark:text-gray-200 py-1.5 px-3 rounded-[6px] text-xs font-medium hover:border-gray-400 dark:hover:border-[#555] transition-colors text-left flex justify-between items-center"
            >
                <span className={selectedValues.length > 0 ? 'font-bold text-gray-900 dark:text-white' : 'text-gray-400'}>{displayText}</span>
                <Filter size={10} className="shrink-0 ml-2" />
            </button>

            {isOpen && (
                <>
                    <div
                        className="fixed inset-0 z-40"
                        onClick={() => setIsOpen(false)}
                    />
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-[#111] border border-gray-200 dark:border-[#333] rounded-lg shadow-lg max-h-60 overflow-y-auto z-50 p-2">
                        {/* Custom Buttons */}
                        {customButtons.length > 0 && (
                            <div className={`grid grid-cols-${customButtons.length > 1 ? '2' : '1'} gap-1 mb-2 pb-2 border-b border-gray-100 dark:border-[#222]`}>
                                {customButtons.map((btn, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => { btn.onClick(); setIsOpen(false); }}
                                        className="text-[10px] font-medium py-1.5 px-2 rounded-md bg-gray-100 dark:bg-[#222] text-gray-600 dark:text-gray-300 hover:bg-blue-100 dark:hover:bg-blue-900/30 hover:text-blue-600 dark:hover:text-blue-400 transition-colors text-center"
                                    >
                                        {btn.label}
                                    </button>
                                ))}
                            </div>
                        )}

                        <button
                            onClick={handleClear}
                            className="w-full px-2 py-1.5 text-left text-xs text-red-500 font-bold hover:bg-gray-100 dark:hover:bg-[#222] rounded mb-1"
                        >
                            Сбросить
                        </button>
                        <div className={gridCols > 1 ? `grid grid-cols-${gridCols} gap-1` : 'flex flex-col'}>
                            {options.map(opt => {
                                const isSelected = selectedValues.includes(opt);
                                return (
                                    <button
                                        key={opt}
                                        onClick={() => handleSelect(opt)}
                                        className={`w-full px-2 py-1.5 text-left text-xs hover:bg-gray-100 dark:hover:bg-[#222] transition-colors rounded flex items-center justify-between ${isSelected ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-bold' : ''}`}
                                    >
                                        <span className="truncate">{opt}</span>
                                        {isSelected && <span className="text-[10px] ml-1">✓</span>}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

// Custom Multi-Select Component (Desktop)
export const CustomSelect = ({ label, value, options, onChange, customButtons = [], gridCols = 1 }) => {
    const [isOpen, setIsOpen] = useState(false);
    const selectedValues = Array.isArray(value) ? value : [];

    const handleSelect = (val) => {
        let newValues;
        if (selectedValues.includes(val)) {
            newValues = selectedValues.filter(v => v !== val);
        } else {
            newValues = [...selectedValues, val];
        }
        onChange(newValues);
    };

    const handleClear = () => {
        onChange([]);
        setIsOpen(false);
    };

    const displayText = selectedValues.length > 0
        ? `${label} (${selectedValues.length})`
        : label;

    return (
        <div className="relative w-full sm:w-auto flex-1 sm:flex-none min-w-[100px]">
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between bg-white dark:bg-[#111] border border-gray-200 dark:border-[#333] text-gray-700 dark:text-gray-200 py-1.5 pl-3 pr-2 rounded-[6px] text-xs font-medium hover:border-gray-400 dark:hover:border-[#555] transition-colors h-[34px] shadow-sm"
            >
                <span className={`truncate mr-2 ${selectedValues.length > 0 ? 'font-bold text-gray-900 dark:text-white' : 'text-gray-400'}`}>{displayText}</span>
                <Filter size={10} className="text-gray-400 shrink-0" />
            </button>

            {isOpen && (
                <>
                    <div
                        className="fixed inset-0 z-40"
                        onClick={() => setIsOpen(false)}
                    />
                    <div className={`absolute top-full left-0 mt-1 bg-white dark:bg-[#111] border border-gray-200 dark:border-[#333] rounded-lg shadow-lg max-h-80 overflow-y-auto z-50 animate-in fade-in slide-in-from-top-2 duration-150 p-2 ${gridCols > 1 ? 'min-w-[280px]' : 'min-w-[160px]'}`}>
                        {/* Custom Buttons */}
                        {customButtons.length > 0 && (
                            <div className={`grid grid-cols-${customButtons.length > 1 ? '2' : '1'} gap-1 mb-2 pb-2 border-b border-gray-100 dark:border-[#222]`}>
                                {customButtons.map((btn, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => { btn.onClick(); setIsOpen(false); }}
                                        className="text-[10px] font-medium py-1.5 px-2 rounded-md bg-gray-100 dark:bg-[#222] text-gray-600 dark:text-gray-300 hover:bg-blue-100 dark:hover:bg-blue-900/30 hover:text-blue-600 dark:hover:text-blue-400 transition-colors text-center"
                                    >
                                        {btn.label}
                                    </button>
                                ))}
                            </div>
                        )}

                        <button
                            onClick={handleClear}
                            className="w-full px-2 py-1.5 text-left text-xs text-red-500 font-bold hover:bg-gray-100 dark:hover:bg-[#222] rounded mb-1"
                        >
                            Сбросить
                        </button>
                        <div className={gridCols > 1 ? `grid grid-cols-${gridCols} gap-1` : 'flex flex-col'}>
                            {options.map(opt => {
                                const isSelected = selectedValues.includes(opt);
                                return (
                                    <button
                                        key={opt}
                                        onClick={() => handleSelect(opt)}
                                        className={`w-full px-2 py-1.5 text-left text-xs hover:bg-gray-100 dark:hover:bg-[#222] transition-colors rounded flex items-center justify-between ${isSelected ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-bold' : ''}`}
                                    >
                                        <span className="truncate">{opt}</span>
                                        {isSelected && <span className="text-[10px] ml-1">✓</span>}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

// Adaptive Select Component
export const DenseSelect = (props) => (
    <>
        <div className="md:hidden w-full">
            <MobileSelect {...props} />
        </div>
        <div className="hidden md:block">
            <CustomSelect {...props} />
        </div>
    </>
);
