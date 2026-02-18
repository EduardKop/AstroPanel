import React, { useState, useEffect } from 'react';
import { useAppStore } from '../../store/appStore';
import {
    Globe, Copy, Check, X, Settings2, BarChart3,
    Palette, Eye, LayoutTemplate, ExternalLink
} from 'lucide-react';
import { useLocation } from 'react-router-dom';

const ShareModal = ({ pageKey, pageTitle, onClose }) => {
    const { fetchSharedPage, createSharedPage, updateSharedPage, sharedPages } = useAppStore();
    const currentSharedPage = sharedPages[pageKey];

    const [isLoading, setIsLoading] = useState(true);
    const [settings, setSettings] = useState({
        title: pageTitle || '',
        description: '',
        theme: 'system', // light, dark, system
        sections: {} // key-value pairs for section visibility
    });
    const [isActive, setIsActive] = useState(false);
    const [copied, setCopied] = useState(false);

    // Load data on mount
    useEffect(() => {
        const load = async () => {
            setIsLoading(true);
            const data = await fetchSharedPage(pageKey);
            if (data) {
                setIsActive(data.is_active);
                setSettings({
                    title: data.settings?.title || pageTitle || '',
                    description: data.settings?.description || '',
                    theme: data.settings?.theme || 'system',
                    sections: data.settings?.sections || {}
                });
            } else {
                // Default new state
                setSettings(prev => ({ ...prev, title: pageTitle }));
            }
            setIsLoading(false);
        };
        load();
    }, [pageKey]);

    const handleToggle = async () => {
        if (!currentSharedPage) {
            // Create first
            await createSharedPage(pageKey, settings);
            setIsActive(true);
        } else {
            // Toggle
            const newActive = !isActive;
            await updateSharedPage(pageKey, { is_active: newActive });
            setIsActive(newActive);
        }
    };

    const handleSaveSettings = async () => {
        if (currentSharedPage) {
            await updateSharedPage(pageKey, { settings });
        }
    };

    // Debounced save for text inputs
    useEffect(() => {
        if (!isLoading && currentSharedPage) {
            const timeout = setTimeout(() => {
                handleSaveSettings();
            }, 1000);
            return () => clearTimeout(timeout);
        }
    }, [settings]);

    const copyLink = () => {
        if (currentSharedPage?.slug) {
            const url = `${window.location.origin}/s/${currentSharedPage.slug}`;
            navigator.clipboard.writeText(url);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const getFullUrl = () => {
        if (!currentSharedPage?.slug) return 'Ссылка будет создана...';
        return `${window.location.origin}/s/${currentSharedPage.slug}`;
    };

    return (
        <>
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50" onClick={onClose} />
            <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white dark:bg-[#111] rounded-xl shadow-2xl border border-gray-200 dark:border-[#333] z-50 overflow-hidden flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="px-4 py-3 border-b border-gray-200 dark:border-[#333] flex items-center justify-between bg-gray-50 dark:bg-[#1A1A1A]">
                    <div className="flex items-center gap-2">
                        <Globe size={16} className="text-blue-500" />
                        <h3 className="font-bold text-sm text-gray-900 dark:text-white">Публичный доступ</h3>
                    </div>
                    <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg hover:bg-gray-200 dark:hover:bg-[#333] transition-colors">
                        <X size={16} />
                    </button>
                </div>

                {isLoading ? (
                    <div className="p-8 text-center text-gray-400 text-xs">Загрузка настроек...</div>
                ) : (
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-0">

                        {/* 1. Main Toggle */}
                        <div className="p-4 border-b border-gray-100 dark:border-[#222]">
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex flex-col">
                                    <span className="text-sm font-bold text-gray-900 dark:text-white">Опубликовать в интернете</span>
                                    <span className="text-xs text-gray-500">Любой, у кого есть ссылка, сможет просматривать эту страницу</span>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" checked={isActive} onChange={handleToggle} className="sr-only peer" />
                                    <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-[#333] peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                                </label>
                            </div>

                            {/* Link Box */}
                            {isActive && (
                                <div className="mt-3 flex items-center gap-2">
                                    <div className="flex-1 bg-gray-100 dark:bg-[#222] rounded-lg px-3 py-2 text-xs font-mono text-gray-600 dark:text-gray-400 truncate border border-gray-200 dark:border-[#333]">
                                        {getFullUrl()}
                                    </div>
                                    <button
                                        onClick={copyLink}
                                        className="h-[34px] px-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg flex items-center gap-1.5 transition-colors text-xs font-bold"
                                    >
                                        {copied ? <Check size={14} /> : <Copy size={14} />}
                                        {copied ? 'Скопировано' : 'Копировать'}
                                    </button>
                                    <a
                                        href={getFullUrl()}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="h-[34px] px-3 bg-gray-200 dark:bg-[#333] hover:bg-gray-300 dark:hover:bg-[#444] text-gray-700 dark:text-gray-200 rounded-lg flex items-center gap-1.5 transition-colors text-xs font-bold"
                                        title="Открыть в новом окне"
                                    >
                                        <ExternalLink size={14} />
                                    </a>
                                </div>
                            )}

                            {/* Analytics Preview */}
                            {isActive && currentSharedPage && (
                                <div className="mt-3 flex items-center gap-4 text-xs text-gray-500">
                                    <div className="flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-900/10 text-emerald-600 dark:text-emerald-400 px-2 py-1 rounded">
                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                        <span className="font-bold">Онлайн</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <Eye size={14} />
                                        <span>Просмотров: <span className="font-bold text-gray-900 dark:text-white">{currentSharedPage.visit_count}</span></span>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* 2. SEO & Settings (Only visible if active or configuring) */}
                        <div className={`p-4 space-y-4 transition-opacity duration-200 ${isActive ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>

                            <div className="flex items-center gap-2 text-gray-800 dark:text-white font-bold text-xs uppercase tracking-wider mb-2">
                                <Settings2 size={12} />
                                Настройки страницы
                            </div>

                            {/* Title */}
                            <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1">Заголовок страницы</label>
                                <input
                                    type="text"
                                    value={settings.title}
                                    onChange={(e) => setSettings({ ...settings, title: e.target.value })}
                                    className="w-full bg-gray-50 dark:bg-[#1A1A1A] border border-gray-200 dark:border-[#333] rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white outline-none focus:border-blue-500 transition-colors"
                                    placeholder="Введите заголовок..."
                                />
                            </div>

                            {/* Description */}
                            <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1">Описание (Meta Description)</label>
                                <textarea
                                    value={settings.description}
                                    onChange={(e) => setSettings({ ...settings, description: e.target.value })}
                                    rows={3}
                                    className="w-full bg-gray-50 dark:bg-[#1A1A1A] border border-gray-200 dark:border-[#333] rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white outline-none focus:border-blue-500 transition-colors resize-none"
                                    placeholder="Краткое описание для поисковиков и превью..."
                                />
                            </div>

                            {/* Theme */}
                            <div>
                                <label className="block text-xs font-medium text-gray-500 mb-2">Тема оформления</label>
                                <div className="grid grid-cols-3 gap-2">
                                    <button
                                        onClick={() => setSettings({ ...settings, theme: 'light' })}
                                        className={`flex items-center justify-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium transition-all ${settings.theme === 'light' ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300' : 'bg-white dark:bg-[#1A1A1A] border-gray-200 dark:border-[#333] text-gray-600 dark:text-gray-400'}`}
                                    >
                                        <Palette size={14} /> Светлая
                                    </button>
                                    <button
                                        onClick={() => setSettings({ ...settings, theme: 'dark' })}
                                        className={`flex items-center justify-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium transition-all ${settings.theme === 'dark' ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300' : 'bg-white dark:bg-[#1A1A1A] border-gray-200 dark:border-[#333] text-gray-600 dark:text-gray-400'}`}
                                    >
                                        <Palette size={14} /> Темная
                                    </button>
                                    <button
                                        onClick={() => setSettings({ ...settings, theme: 'system' })}
                                        className={`flex items-center justify-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium transition-all ${settings.theme === 'system' ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300' : 'bg-white dark:bg-[#1A1A1A] border-gray-200 dark:border-[#333] text-gray-600 dark:text-gray-400'}`}
                                    >
                                        <LayoutTemplate size={14} /> Авто
                                    </button>
                                </div>
                            </div>

                            {/* Language */}
                            <div>
                                <label className="block text-xs font-medium text-gray-500 mb-2">Язык страницы</label>
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        onClick={() => setSettings({ ...settings, lang: 'ru' })}
                                        className={`flex items-center justify-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium transition-all ${!settings.lang || settings.lang === 'ru' ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300' : 'bg-white dark:bg-[#1A1A1A] border-gray-200 dark:border-[#333] text-gray-600 dark:text-gray-400'}`}
                                    >
                                        <Globe size={14} /> Русский 🇷🇺
                                    </button>
                                    <button
                                        onClick={() => setSettings({ ...settings, lang: 'ua' })}
                                        className={`flex items-center justify-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium transition-all ${settings.lang === 'ua' ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300' : 'bg-white dark:bg-[#1A1A1A] border-gray-200 dark:border-[#333] text-gray-600 dark:text-gray-400'}`}
                                    >
                                        <Globe size={14} /> Українська 🇺🇦
                                    </button>
                                </div>
                            </div>
                        </div>

                    </div>
                )}

                {/* Footer Actions */}
                <div className="p-4 border-t border-gray-200 dark:border-[#333] bg-gray-50 dark:bg-[#1A1A1A] flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-white dark:bg-[#222] border border-gray-200 dark:border-[#333] rounded-lg text-xs font-bold text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#333] transition-colors"
                    >
                        Закрыть
                    </button>
                </div>
            </div >
        </>
    );
};

export default ShareModal;
