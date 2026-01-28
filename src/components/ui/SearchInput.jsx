import React, { useState, useRef, useEffect } from 'react';
import { Search, X } from 'lucide-react';

/**
 * SearchInput - Красивое кастомное поле поиска
 * @param {string} value - Текущее значение поиска
 * @param {function} onChange - Callback при изменении значения
 * @param {function} onClose - Callback при закрытии поля
 * @param {string} placeholder - Placeholder текст
 * @param {boolean} autoFocus - Автофокус при открытии
 */
const SearchInput = ({
    value,
    onChange,
    onClose,
    placeholder = "Поиск...",
    autoFocus = true
}) => {
    const inputRef = useRef(null);

    useEffect(() => {
        if (autoFocus && inputRef.current) {
            inputRef.current.focus();
        }
    }, [autoFocus]);

    const handleClear = () => {
        onChange('');
        if (inputRef.current) {
            inputRef.current.focus();
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Escape') {
            onClose?.();
        }
    };

    return (
        <div className="relative flex items-center animate-in fade-in slide-in-from-right-2 duration-200">
            {/* Glow background */}
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-lg blur-sm" />

            {/* Input container */}
            <div className="relative flex items-center bg-white dark:bg-[#111] border border-gray-200 dark:border-[#333] rounded-lg shadow-lg overflow-hidden group focus-within:border-blue-500 dark:focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20 transition-all">
                {/* Search icon */}
                <div className="pl-3 pr-2">
                    <Search size={14} className="text-gray-400 dark:text-gray-500 group-focus-within:text-blue-500 transition-colors" />
                </div>

                {/* Input field */}
                <input
                    ref={inputRef}
                    type="text"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={placeholder}
                    className="w-48 sm:w-64 py-2 pr-2 bg-transparent text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 outline-none"
                />

                {/* Clear button (when has value) */}
                {value && (
                    <button
                        onClick={handleClear}
                        className="px-2 py-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                        title="Очистить"
                    >
                        <X size={14} />
                    </button>
                )}

                {/* Close button */}
                <button
                    onClick={onClose}
                    className="px-3 py-2 border-l border-gray-200 dark:border-[#333] text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#1A1A1A] transition-all"
                    title="Закрыть поиск (Esc)"
                >
                    <X size={14} />
                </button>
            </div>
        </div>
    );
};

/**
 * SearchModal - Модальное окно поиска
 */
const SearchModal = ({
    isOpen,
    value,
    onChange,
    onClose,
    placeholder = "Поиск...",
}) => {
    const inputRef = useRef(null);

    useEffect(() => {
        if (isOpen && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isOpen]);

    useEffect(() => {
        const handleEsc = (e) => {
            if (e.key === 'Escape' && isOpen) {
                onClose?.();
            }
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [isOpen, onClose]);

    const handleClear = () => {
        onChange('');
        if (inputRef.current) {
            inputRef.current.focus();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[200] flex items-start justify-center pt-[15vh]">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
                onClick={onClose}
            />

            {/* Modal Content */}
            <div className="relative w-full max-w-lg mx-4 animate-in fade-in zoom-in-95 slide-in-from-top-4 duration-300">
                {/* Glow effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-blue-500/20 rounded-2xl blur-xl" />

                {/* Search container */}
                <div className="relative bg-white dark:bg-[#111] border border-gray-200 dark:border-[#333] rounded-2xl shadow-2xl overflow-hidden">
                    {/* Header */}
                    <div className="flex items-center gap-3 p-4 border-b border-gray-100 dark:border-[#222]">
                        <Search size={20} className="text-blue-500" />
                        <input
                            ref={inputRef}
                            type="text"
                            value={value}
                            onChange={(e) => onChange(e.target.value)}
                            placeholder={placeholder}
                            className="flex-1 bg-transparent text-lg text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 outline-none"
                        />
                        {value && (
                            <button
                                onClick={handleClear}
                                className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#222] rounded-lg transition-colors"
                                title="Очистить"
                            >
                                <X size={16} />
                            </button>
                        )}
                        <button
                            onClick={onClose}
                            className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#222] rounded-lg transition-colors"
                            title="Закрыть (Esc)"
                        >
                            <X size={18} />
                        </button>
                    </div>

                    {/* Hint */}
                    <div className="px-4 py-3 bg-gray-50 dark:bg-[#0A0A0A] text-xs text-gray-500 dark:text-gray-400">
                        <span className="inline-flex items-center gap-1">
                            <kbd className="px-1.5 py-0.5 rounded bg-gray-200 dark:bg-[#222] text-[10px] font-mono">Esc</kbd>
                            чтобы закрыть
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
};

/**
 * SearchButton - Кнопка для открытия поиска
 */
const SearchButton = ({ onClick, isActive = false }) => (
    <button
        onClick={onClick}
        className={`h-[34px] w-[34px] flex items-center justify-center rounded-[6px] border transition-all ${isActive
            ? 'bg-blue-500 border-blue-500 text-white shadow-md shadow-blue-500/20'
            : 'bg-white dark:bg-[#111] border-gray-200 dark:border-[#333] text-gray-500 dark:text-gray-400 hover:border-gray-400 dark:hover:border-[#555] hover:text-gray-700 dark:hover:text-gray-200'
            }`}
        title="Поиск"
    >
        <Search size={14} />
    </button>
);

export { SearchInput, SearchModal, SearchButton };
