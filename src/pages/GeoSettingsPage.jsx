import React, { useState } from 'react';
import { useAppStore } from '../store/appStore';
import { addCountry, deleteCountry } from '../services/dataService';
import { supabase } from '../services/supabaseClient';
import { showToast } from '../utils/toastEvents';
import { Globe, Plus, Trash2, Search, X, AlertCircle, Save, Info, Clock, Flag, FolderOpen, ChevronDown, Check } from 'lucide-react';
import ProjectBadge, { getProjectColors } from '../components/geo/ProjectBadge';
import ProjectsManagerModal from '../components/geo/ProjectsManagerModal';

// Common flags for the dropdown — includes default currency
const COMMON_FLAGS = [
    { code: 'KZ', emoji: '🇰🇿', name: 'Казахстан', currency: 'KZT', lang: 'Казахский' },
    { code: 'UA', emoji: '🇺🇦', name: 'Украина', currency: 'UAH', lang: 'Украинский' },
    { code: 'PL', emoji: '🇵🇱', name: 'Польша', currency: 'PLN', lang: 'Польский' },
    { code: 'UZ', emoji: '🇺🇿', name: 'Узбекистан', currency: 'UZS', lang: 'Узбекский' },
    { code: 'TR', emoji: '🇹🇷', name: 'Турция', currency: 'TRY', lang: 'Турецкий' },
    { code: 'CZ', emoji: '🇨🇿', name: 'Чехия', currency: 'CZK', lang: 'Чешский' },
    { code: 'RO', emoji: '🇷🇴', name: 'Румыния', currency: 'RON', lang: 'Румынский' },
    { code: 'DE', emoji: '🇩🇪', name: 'Германия', currency: 'EUR', lang: 'Немецкий' },
    { code: 'US', emoji: '🇺🇸', name: 'США', currency: 'USD', lang: 'Английский' },
    { code: 'GB', emoji: '🇬🇧', name: 'Великобритания', currency: 'GBP', lang: 'Английский' },
    { code: 'FR', emoji: '🇫🇷', name: 'Франция', currency: 'EUR', lang: 'Французский' },
    { code: 'NL', emoji: '🇳🇱', name: 'Нидерланды', currency: 'EUR', lang: 'Нидерландский' },
    { code: 'ES', emoji: '🇪🇸', name: 'Испания', currency: 'EUR', lang: 'Испанский' },
    { code: 'IT', emoji: '🇮🇹', name: 'Италия', currency: 'EUR', lang: 'Итальянский' },
    { code: 'BG', emoji: '🇧🇬', name: 'Болгария', currency: 'BGN', lang: 'Болгарский' },
    { code: 'HU', emoji: '🇭🇺', name: 'Венгрия', currency: 'HUF', lang: 'Венгерский' },
    { code: 'CH', emoji: '🇨🇭', name: 'Швейцария', currency: 'CHF', lang: 'Немецкий' },
    { code: 'SE', emoji: '🇸🇪', name: 'Швеция', currency: 'SEK', lang: 'Шведский' },
    { code: 'NO', emoji: '🇳🇴', name: 'Норвегия', currency: 'NOK', lang: 'Норвежский' },
    { code: 'EG', emoji: '🇪🇬', name: 'Египет', currency: 'EGP', lang: 'Арабский' },
];

// Popular currency codes for the select dropdown
const CURRENCY_OPTIONS = [
    'EUR', 'USD', 'GBP', 'UAH', 'PLN', 'CZK', 'RON', 'KZT', 'TRY',
    'UZS', 'BGN', 'HUF', 'CHF', 'SEK', 'NOK', 'DKK', 'GEL', 'AMD',
    'AZN', 'BYN', 'MDL', 'RSD', 'EGP',
];

const GeoSettingsPage = () => {
    const { countries, managers, projects, fetchAllData } = useAppStore();
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isProjectsModalOpen, setIsProjectsModalOpen] = useState(false);
    const [deleteModalData, setDeleteModalData] = useState(null); // { country, activeManagers }
    const [search, setSearch] = useState('');
    const [editingProjectGeo, setEditingProjectGeo] = useState(null);
    const [submitting, setSubmitting] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        code: '',
        name: '',
        emoji: '',
        lang: '',
        currency_code: 'EUR',
        shift_start: '09:00',
        shift_end: '18:00',
        project_id: ''
    });

    const handleProjectChange = async (countryCode, newProjectId) => {
        try {
            const { error } = await supabase.from('countries').update({ project_id: newProjectId }).eq('code', countryCode);
            if (error) throw error;
            useAppStore.setState(state => ({
                countries: state.countries.map(c => c.code === countryCode ? { ...c, project_id: newProjectId } : c)
            }));
            showToast('Успешно', 'Проект для ГЕО изменен', 'success');
        } catch (error) {
            console.error('Project assignment error:', error);
            showToast('Ошибка', 'Не удалось изменить проект', 'error');
        } finally {
            setEditingProjectGeo(null);
        }
    };

    // 🔍 SEARCH FILTER
    const filteredCountries = countries.filter(c =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.code.toLowerCase().includes(search.toLowerCase())
    );

    // --- HANDLERS ---

    const handleSelectFlag = (flagObj) => {
        setFormData(prev => ({
            ...prev,
            emoji: flagObj.emoji,
            code: flagObj.code,
            name: flagObj.name,
            lang: flagObj.lang || '',
            currency_code: flagObj.currency || 'EUR',
        }));
    };

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleAdd = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            await addCountry({
                code: formData.code.toUpperCase(),
                name: formData.name,
                emoji: formData.emoji,
                lang: formData.lang,
                currency_code: formData.currency_code.toUpperCase() || 'EUR',
                shift_start: formData.shift_start,
                shift_end: formData.shift_end,
                project_id: formData.project_id || null
            });
            await fetchAllData(true);
            setIsAddModalOpen(false);
            setFormData({ code: '', name: '', emoji: '', lang: '', currency_code: 'EUR', shift_start: '09:00', shift_end: '18:00', project_id: '' });
        } catch (error) {
            alert('Ошибка при добавлении: ' + error.message);
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeleteClick = (country) => {
        // Поиск активных менеджеров в этой стране
        const activeManagers = managers.filter(m =>
            // m.geo - массив кодов стран ['KZ', 'UA']
            m.geo && m.geo.includes(country.code) && m.status === 'active'
        );

        if (activeManagers.length > 0) {
            // Если есть активные менеджеры - показываем блокирующее окно
            setDeleteModalData({ country, activeManagers, blocked: true });
        } else {
            // Если нет - показываем подтверждение удаления
            setDeleteModalData({ country, activeManagers: [], blocked: false });
        }
    };

    const confirmDelete = async () => {
        if (!deleteModalData?.country) return;
        setSubmitting(true);
        try {
            await deleteCountry(deleteModalData.country.code);
            await fetchAllData(true);
            setDeleteModalData(null);
        } catch (error) {
            alert('Ошибка при удалении: ' + error.message);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="p-6 max-w-[1200px] mx-auto animate-in fade-in zoom-in duration-300">

            {/* HEADER */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-3 dark:text-white">
                        <Globe className="text-blue-500" />
                        Управление ГЕО
                    </h1>
                    <p className="text-gray-500 text-sm mt-1">Добавление стран и настройка рабочих смен</p>
                </div>

                <div className="flex items-center gap-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                        <input
                            type="text"
                            placeholder="Поиск..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="bg-white dark:bg-[#111] border border-gray-200 dark:border-[#333] pl-9 pr-4 py-2 rounded-lg text-sm focus:outline-none focus:border-blue-500 dark:text-white w-48 transition-all"
                        />
                    </div>
                    <button
                        onClick={() => setIsProjectsModalOpen(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-[#1A1A1A] text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-[#333] rounded-lg hover:bg-gray-200 dark:hover:bg-[#222] transition-all font-medium text-sm"
                    >
                        <FolderOpen size={16} /> Проекты
                    </button>
                    <button
                        onClick={() => setIsAddModalOpen(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all font-medium text-sm shadow-lg shadow-blue-500/20"
                    >
                        <Plus size={16} /> Добавить ГЕО
                    </button>
                </div>
            </div>

            {/* GRID */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredCountries.map(country => {
                    const project = projects.find(p => p.id === country.project_id);
                    return (
                    <div key={country.code} className="bg-white dark:bg-[#111] border border-gray-200 dark:border-[#333] rounded-xl p-5 hover:border-blue-400 dark:hover:border-blue-500/50 transition-all group relative">

                        <div className="flex items-start justify-between mb-4">
                            <div className="text-4xl">{country.emoji}</div>
                            <button
                                onClick={() => handleDeleteClick(country)}
                                className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                            >
                                <Trash2 size={18} />
                            </button>
                        </div>

                        <div className="mb-3">
                            <h3 className="font-bold text-lg dark:text-white mb-0.5">{country.name}</h3>
                            <div className="flex flex-wrap items-center gap-1.5 mt-1">
                                <span className="text-xs font-mono font-medium bg-gray-100 dark:bg-[#222] text-gray-500 px-2 py-0.5 rounded">{country.code}</span>
                                {country.currency_code && (
                                    <span className="text-xs font-mono font-bold bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded border border-blue-100 dark:border-blue-800">
                                        {country.currency_code}
                                    </span>
                                )}
                            </div>
                            {/* Project Selector inline */}
                            <div className="relative mt-2">
                                <button
                                    onClick={() => setEditingProjectGeo(editingProjectGeo === country.code ? null : country.code)}
                                    className="flex items-center gap-1.5 hover:scale-[1.02] transition-transform rounded focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                    title="Нажмите чтобы изменить проект"
                                >
                                    {project ? (
                                        <ProjectBadge project={project} />
                                    ) : (
                                        <span className="text-[10px] text-gray-400 border border-dashed border-gray-300 dark:border-gray-700 rounded px-2 py-0.5">Без проекта</span>
                                    )}
                                    <ChevronDown size={14} className="text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                                </button>
                                {editingProjectGeo === country.code && (
                                    <>
                                        <div className="fixed inset-0 z-40" onClick={() => setEditingProjectGeo(null)} />
                                        <div className="absolute top-full left-0 mt-2 w-48 bg-white dark:bg-[#111] border border-gray-200 dark:border-[#333] rounded-lg shadow-xl z-50 overflow-hidden flex flex-col py-1">
                                            <div className="px-3 py-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider bg-gray-50/50 dark:bg-[#1A1A1A]">Выберите проект</div>
                                            {projects.map(p => (
                                                <button
                                                    key={p.id}
                                                    onClick={() => handleProjectChange(country.code, p.id)}
                                                    className="px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-[#222] text-sm text-gray-700 dark:text-gray-300 transition-colors flex items-center justify-between"
                                                >
                                                    <span className="truncate">{p.name}</span>
                                                    {project?.id === p.id && <Check size={14} className="text-blue-500 flex-shrink-0 ml-2" />}
                                                </button>
                                            ))}
                                            <button
                                                onClick={() => handleProjectChange(country.code, null)}
                                                className="px-3 py-2 text-left hover:bg-red-50 dark:hover:bg-red-900/20 text-sm text-red-500 transition-colors border-t border-gray-100 dark:border-[#222]"
                                            >
                                                Открепить от проекта
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>

                        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-[#1A1A1A] p-2 rounded-lg">
                            <Clock size={14} className="text-blue-500" />
                            <span>Смена: <span className="font-mono text-gray-900 dark:text-gray-200">{country.shift_start?.slice(0, 5)} - {country.shift_end?.slice(0, 5)}</span></span>
                        </div>
                    </div>
                    );
                })}
            </div>

            {/* ADD MODAL */}
            {isAddModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-[#111] w-full max-w-md rounded-2xl shadow-2xl border border-gray-200 dark:border-[#333] overflow-hidden">
                        <div className="px-6 py-5 border-b border-gray-100 dark:border-[#222] flex items-center justify-between bg-gray-50/50 dark:bg-[#161616]">
                            <h2 className="text-lg font-bold dark:text-white">Новая ГЕО локация</h2>
                            <button onClick={() => setIsAddModalOpen(false)}><X size={20} className="text-gray-400 hover:text-gray-900 dark:hover:text-white" /></button>
                        </div>

                        <form onSubmit={handleAdd} className="p-6 space-y-5">

                            {/* PRESETS */}
                            <div>
                                <label className="text-xs font-bold text-gray-400 uppercase mb-2 block">Быстрый выбор</label>
                                <div className="flex flex-wrap gap-2">
                                    {COMMON_FLAGS.map(flag => (
                                        <button
                                            key={flag.code}
                                            type="button"
                                            onClick={() => handleSelectFlag(flag)}
                                            className="text-xl hover:scale-125 transition-transform"
                                            title={flag.name}
                                        >
                                            {flag.emoji}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-gray-500 dark:text-gray-400 flex items-center gap-1"><Flag size={12} /> Код (ISO)</label>
                                    <input required name="code" value={formData.code} onChange={handleChange} placeholder="KZ" className="w-full bg-gray-50 dark:bg-[#1A1A1A] border border-gray-200 dark:border-[#333] rounded-lg px-3 py-2 text-sm dark:text-white uppercase font-mono" />
                                    <p className="text-[10px] text-gray-400">Уникальный код страны</p>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-gray-500 dark:text-gray-400 flex items-center gap-1">Флаг (Emoji)</label>
                                    <input required name="emoji" value={formData.emoji} onChange={handleChange} placeholder="🇰🇿" className="w-full bg-gray-50 dark:bg-[#1A1A1A] border border-gray-200 dark:border-[#333] rounded-lg px-3 py-2 text-sm dark:text-white text-center text-xl" />
                                    <p className="text-[10px] text-gray-400">Смайлик флага</p>
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-bold text-gray-500 dark:text-gray-400">Название</label>
                                <input required name="name" value={formData.name} onChange={handleChange} placeholder="Казахстан" className="w-full bg-gray-50 dark:bg-[#1A1A1A] border border-gray-200 dark:border-[#333] rounded-lg px-3 py-2 text-sm dark:text-white" />
                                <p className="text-[10px] text-gray-400">Отображаемое название (на Русском)</p>
                            </div>

                            {/* Currency and Language */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-gray-500 dark:text-gray-400">💱 Валюта</label>
                                    <select
                                        name="currency_code"
                                        value={formData.currency_code}
                                        onChange={handleChange}
                                        className="w-full bg-gray-50 dark:bg-[#1A1A1A] border border-gray-200 dark:border-[#333] rounded-lg px-3 py-2 text-sm dark:text-white font-mono"
                                    >
                                        {CURRENCY_OPTIONS.map(c => (
                                            <option key={c} value={c}>{c}</option>
                                        ))}
                                    </select>
                                    <p className="text-[10px] text-gray-400">Автопостановка из флага</p>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-gray-500 dark:text-gray-400 flex items-center gap-1">🗣 Язык</label>
                                    <input required name="lang" value={formData.lang} onChange={handleChange} placeholder="Польский" className="w-full bg-gray-50 dark:bg-[#1A1A1A] border border-gray-200 dark:border-[#333] rounded-lg px-3 py-2 text-sm dark:text-white" />
                                    <p className="text-[10px] text-gray-400">Язык ГЕО</p>
                                </div>
                            </div>

                            {/* Project selector */}
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-gray-500 dark:text-gray-400 flex items-center gap-1"><FolderOpen size={12} /> Проект</label>
                                <select
                                    name="project_id"
                                    value={formData.project_id}
                                    onChange={handleChange}
                                    className="w-full bg-gray-50 dark:bg-[#1A1A1A] border border-gray-200 dark:border-[#333] rounded-lg px-3 py-2 text-sm dark:text-white"
                                >
                                    <option value="">— Не указан —</option>
                                    {projects.map(p => (
                                        <option key={p.id} value={p.id}>{p.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-gray-500 dark:text-gray-400 flex items-center gap-1"><Clock size={12} /> Начало смены</label>
                                    <input required type="time" name="shift_start" value={formData.shift_start} onChange={handleChange} className="w-full bg-gray-50 dark:bg-[#1A1A1A] border border-gray-200 dark:border-[#333] rounded-lg px-3 py-2 text-sm dark:text-white" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-gray-500 dark:text-gray-400 flex items-center gap-1"><Clock size={12} /> Конец смены</label>
                                    <input required type="time" name="shift_end" value={formData.shift_end} onChange={handleChange} className="w-full bg-gray-50 dark:bg-[#1A1A1A] border border-gray-200 dark:border-[#333] rounded-lg px-3 py-2 text-sm dark:text-white" />
                                </div>
                            </div>

                            <button type="submit" disabled={submitting} className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700 transition-colors flex items-center justify-center gap-2">
                                {submitting ? 'Сохранение...' : <><Save size={18} /> Сохранить</>}
                            </button>

                        </form>
                    </div>
                </div>
            )}

            {/* DELETE MODAL (BLOCKING OR CONFIRM) */}
            {deleteModalData && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-[#111] w-full max-w-sm rounded-2xl shadow-2xl border border-gray-200 dark:border-[#333] overflow-hidden">
                        <div className="p-6 text-center">
                            {deleteModalData.blocked ? (
                                <>
                                    <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <AlertCircle size={32} className="text-red-500" />
                                    </div>
                                    <h3 className="text-xl font-bold dark:text-white mb-2">Невозможно удалить</h3>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                                        В регионе <span className="font-bold text-gray-900 dark:text-white">{deleteModalData.country.name}</span> есть активные сотрудники. Удаление невозможно.
                                    </p>
                                    <div className="bg-gray-50 dark:bg-[#1A1A1A] rounded-lg p-3 text-left max-h-40 overflow-y-auto mb-6">
                                        <p className="text-xs font-bold text-gray-400 mb-2 uppercase">Список активных:</p>
                                        <ul className="space-y-1">
                                            {deleteModalData.activeManagers.map(m => (
                                                <li key={m.id} className="text-sm dark:text-gray-300 flex items-center gap-2">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                                                    {m.name}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                    <button onClick={() => setDeleteModalData(null)} className="w-full py-2.5 bg-gray-100 dark:bg-[#222] text-gray-900 dark:text-white font-medium rounded-lg hover:bg-gray-200 dark:hover:bg-[#333]">
                                        Понятно
                                    </button>
                                </>
                            ) : (
                                <>
                                    <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <Trash2 size={32} className="text-amber-600 dark:text-amber-500" />
                                    </div>
                                    <h3 className="text-xl font-bold dark:text-white mb-2">Удалить {deleteModalData.country.name}?</h3>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                                        Это действие необратимо. Убедитесь, что этот регион больше не используется.
                                    </p>
                                    <div className="flex gap-3">
                                        <button onClick={() => setDeleteModalData(null)} className="flex-1 py-2.5 bg-gray-100 dark:bg-[#222] text-gray-900 dark:text-white font-medium rounded-lg hover:bg-gray-200 dark:hover:bg-[#333]">
                                            Отмена
                                        </button>
                                        <button onClick={confirmDelete} disabled={submitting} className="flex-1 py-2.5 bg-red-500 text-white font-medium rounded-lg hover:bg-red-600 shadow-lg shadow-red-500/20">
                                            {submitting ? '...' : 'Удалить'}
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* PROJECTS MANAGER MODAL */}
            {isProjectsModalOpen && (
                <ProjectsManagerModal
                    projects={projects}
                    onClose={() => setIsProjectsModalOpen(false)}
                    onRefresh={() => fetchAllData(true)}
                />
            )}

        </div>
    );
};

export default GeoSettingsPage;
