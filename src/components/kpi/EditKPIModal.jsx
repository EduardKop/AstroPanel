import React, { useState, useEffect } from 'react';
import { X, Save, Plus, Trash2, DollarSign, Target, Users, Trophy } from 'lucide-react';
import { supabase } from '../../services/supabaseClient';
import { showToast } from '../../utils/toastEvents';
import { useAppStore } from '../../store/appStore';

// ─── EditKPIModal ───────────────────────────────────────────────────────────
// Allows admins to edit:
//  • Base salary (kpi_settings: base_salary)
//  • Daily KPI tiers (kpi_settings: daily_tiers JSON)
//  • Monthly bonus tiers (kpi_settings: monthly_tiers JSON)
//  • Product rates (kpi_product_rates table)
//  • Individual manager rates (manager_rates table)

const EditKPIModal = ({ onClose, onUpdate, kpiRates, kpiSettings, managers, managerRates }) => {
    const { countries } = useAppStore();
    const [activeTab, setActiveTab] = useState('general');
    const [isSaving, setIsSaving] = useState(false);

    // ── General settings ──
    const [baseSalary, setBaseSalary] = useState(kpiSettings?.base_salary || 100);

    // ── Daily tiers ──
    const parseTiers = (val) => {
        if (!val) return [];
        try { return typeof val === 'string' ? JSON.parse(val) : val; }
        catch { return []; }
    };
    const [dailyTiers, setDailyTiers] = useState(parseTiers(kpiSettings?.daily_tiers));
    const [monthlyTiers, setMonthlyTiers] = useState(parseTiers(kpiSettings?.monthly_tiers));

    // ── Product rates ──
    const [rates, setRates] = useState(kpiRates.map(r => ({ ...r })));

    // ── Team groups ──
    const DEFAULT_GROUPS = { 'I': [], 'II': [], 'III': [] };
    const parseGroups = (val) => {
        if (!val) return DEFAULT_GROUPS;
        try { return typeof val === 'string' ? JSON.parse(val) : val; }
        catch { return DEFAULT_GROUPS; }
    };
    const [teamGroups, setTeamGroups] = useState(parseGroups(kpiSettings?.team_groups));
    const [newCountryInputs, setNewCountryInputs] = useState({ 'I': '', 'II': '', 'III': '' });

    // Sync once on mount (kpiRates/kpiSettings may already be loaded when modal opens)
    useEffect(() => {
        if (kpiRates.length > 0) {
            setRates(kpiRates.map(r => ({ ...r })));
        }
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // Sync kpiSettings once on mount
    useEffect(() => {
        if (kpiSettings?.base_salary !== undefined) {
            setBaseSalary(kpiSettings.base_salary);
        }
        if (kpiSettings?.daily_tiers) {
            setDailyTiers(parseTiers(kpiSettings.daily_tiers));
        }
        if (kpiSettings?.monthly_tiers) {
            setMonthlyTiers(parseTiers(kpiSettings.monthly_tiers));
        }
        if (kpiSettings?.team_groups) {
            setTeamGroups(parseGroups(kpiSettings.team_groups));
        }
    }, []); // eslint-disable-line react-hooks/exhaustive-deps



    // ── Manager rates ──
    const salesManagers = managers.filter(m =>
        ['Sales', 'SeniorSales', 'SalesTaro', 'Retention'].includes(m.role) && m.status === 'active'
    );
    const [mRates, setMRates] = useState(() =>
        salesManagers.map(m => {
            const existing = managerRates.find(r => r.manager_id === m.id && !r.month);
            return {
                manager_id: m.id,
                name: m.name,
                role: m.role,
                base_rate: existing?.base_rate ?? 0,
                bonus: existing?.bonus ?? 0,
                penalty: existing?.penalty ?? 0,
                id: existing?.id ?? null,
            };
        })
    );

    // ── Save handlers ──

    const saveKpiSetting = async (key, value) => {
        const { error } = await supabase
            .from('kpi_settings')
            .upsert({ key, value: String(value) }, { onConflict: 'key' });
        if (error) throw error;
    };

    const handleSaveGeneral = async () => {
        setIsSaving(true);
        try {
            await saveKpiSetting('base_salary', baseSalary);
            await saveKpiSetting('daily_tiers', JSON.stringify(dailyTiers));
            await saveKpiSetting('monthly_tiers', JSON.stringify(monthlyTiers));
            showToast('Настройки сохранены', 'success');
            onUpdate();
        } catch (e) {
            showToast('Ошибка: ' + e.message, 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const handleSaveTeams = async () => {
        setIsSaving(true);
        try {
            await saveKpiSetting('team_groups', JSON.stringify(teamGroups));
            showToast('Команды сохранены', 'success');
            onUpdate();
        } catch (e) {
            showToast('Ошибка: ' + e.message, 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const addCountryToGroup = (group) => {
        const code = newCountryInputs[group].trim().toUpperCase();
        if (!code || code.length !== 2) return;
        if (teamGroups[group]?.includes(code)) return;
        setTeamGroups(prev => ({ ...prev, [group]: [...(prev[group] || []), code] }));
        setNewCountryInputs(prev => ({ ...prev, [group]: '' }));
    };

    const removeCountryFromGroup = (group, code) => {
        setTeamGroups(prev => ({ ...prev, [group]: prev[group].filter(c => c !== code) }));
    };

    const handleSaveRates = async () => {
        setIsSaving(true);
        try {
            for (const rate of rates) {
                const payload = {
                    product_name: rate.product_name,
                    rate: parseFloat(rate.rate),
                };
                if (rate.id) {
                    const { error } = await supabase
                        .from('kpi_product_rates')
                        .update(payload)
                        .eq('id', rate.id);
                    if (error) throw error;
                } else {
                    const { error } = await supabase
                        .from('kpi_product_rates')
                        .insert(payload);
                    if (error) throw error;
                }
            }
            showToast('\u0422\u0430\u0440\u0438\u0444\u044b \u0441\u043e\u0445\u0440\u0430\u043d\u0435\u043d\u044b', 'success');
            onUpdate();
        } catch (e) {
            showToast('\u041e\u0448\u0438\u0431\u043a\u0430: ' + e.message, 'error');
        } finally {
            setIsSaving(false);
        }
    };



    const handleDeleteRate = async (rate) => {
        if (rate.id) {
            await supabase.from('kpi_product_rates').delete().eq('id', rate.id);
            onUpdate();
        }
        setRates(prev => prev.filter(r => r !== rate));
    };

    const handleSaveManagerRates = async () => {
        setIsSaving(true);
        try {
            for (const mr of mRates) {
                const payload = {
                    manager_id: mr.manager_id,
                    base_rate: Number(mr.base_rate) || 0,
                    bonus: Number(mr.bonus) || 0,
                    penalty: Number(mr.penalty) || 0,
                    month: null,
                };
                if (mr.id) {
                    await supabase.from('manager_rates').update(payload).eq('id', mr.id);
                } else {
                    const { data } = await supabase.from('manager_rates').insert(payload).select().single();
                    if (data) mr.id = data.id;
                }
            }
            showToast('Ставки сотрудников сохранены', 'success');
            onUpdate();
        } catch (e) {
            showToast('Ошибка: ' + e.message, 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const TABS = [
        { id: 'general', label: 'Общее', icon: <DollarSign size={14} /> },
        { id: 'rates', label: 'Тарифы', icon: <Target size={14} /> },
        { id: 'teams', label: 'Команды', icon: <Trophy size={14} /> },
        { id: 'managers', label: 'Сотрудники', icon: <Users size={14} /> },
    ];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-[#111] w-full max-w-2xl rounded-2xl shadow-2xl border border-gray-200 dark:border-[#333] flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-100 dark:border-[#222] flex items-center justify-between shrink-0">
                    <h2 className="text-lg font-bold dark:text-white flex items-center gap-2">
                        <Target size={18} className="text-blue-500" /> Редактировать KPI
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-[#222] rounded-lg transition-colors">
                        <X size={18} className="text-gray-500" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-gray-100 dark:border-[#222] shrink-0 px-6">
                    {TABS.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-1.5 px-4 py-3 text-xs font-bold border-b-2 transition-colors -mb-px ${activeTab === tab.id
                                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                                : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                                }`}
                        >
                            {tab.icon} {tab.label}
                        </button>
                    ))}
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-5">

                    {/* ── GENERAL TAB ── */}
                    {activeTab === 'general' && (
                        <div className="space-y-6">
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase block mb-1.5">Базовый оклад ($)</label>
                                <input
                                    type="number"
                                    value={baseSalary}
                                    onChange={e => setBaseSalary(e.target.value)}
                                    className="w-full bg-gray-50 dark:bg-[#1A1A1A] border border-gray-200 dark:border-[#333] rounded-lg px-3 py-2 text-sm dark:text-white font-mono"
                                />
                                <p className="text-[10px] text-gray-400 mt-1">Фиксированная еженедельная выплата</p>
                            </div>

                            {/* Daily tiers */}
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <label className="text-xs font-bold text-gray-500 uppercase">Дневной KPI (продаж → бонус $)</label>
                                    <button
                                        onClick={() => setDailyTiers(prev => [...prev, { count: 0, reward: 0 }])}
                                        className="text-xs text-blue-500 hover:text-blue-600 flex items-center gap-1"
                                    >
                                        <Plus size={12} /> Добавить
                                    </button>
                                </div>
                                <div className="space-y-2">
                                    {dailyTiers.map((tier, i) => (
                                        <div key={i} className="flex items-center gap-2">
                                            <input
                                                type="number"
                                                value={tier.count}
                                                onChange={e => setDailyTiers(prev => prev.map((t, j) => j === i ? { ...t, count: Number(e.target.value) } : t))}
                                                className="w-24 bg-gray-50 dark:bg-[#1A1A1A] border border-gray-200 dark:border-[#333] rounded-lg px-3 py-1.5 text-sm dark:text-white font-mono"
                                                placeholder="Продаж"
                                            />
                                            <span className="text-gray-400 text-xs">→ +$</span>
                                            <input
                                                type="number"
                                                value={tier.reward}
                                                onChange={e => setDailyTiers(prev => prev.map((t, j) => j === i ? { ...t, reward: Number(e.target.value) } : t))}
                                                className="w-24 bg-gray-50 dark:bg-[#1A1A1A] border border-gray-200 dark:border-[#333] rounded-lg px-3 py-1.5 text-sm dark:text-white font-mono"
                                                placeholder="Бонус"
                                            />
                                            <button onClick={() => setDailyTiers(prev => prev.filter((_, j) => j !== i))} className="text-red-400 hover:text-red-600">
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Monthly tiers */}
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <label className="text-xs font-bold text-gray-500 uppercase">Бонус месяца (продаж → бонус $)</label>
                                    <button
                                        onClick={() => setMonthlyTiers(prev => [...prev, { label: '', reward: 0 }])}
                                        className="text-xs text-blue-500 hover:text-blue-600 flex items-center gap-1"
                                    >
                                        <Plus size={12} /> Добавить
                                    </button>
                                </div>
                                <div className="space-y-2">
                                    {monthlyTiers.map((tier, i) => (
                                        <div key={i} className="flex items-center gap-2">
                                            <input
                                                type="text"
                                                value={tier.label}
                                                onChange={e => setMonthlyTiers(prev => prev.map((t, j) => j === i ? { ...t, label: e.target.value } : t))}
                                                className="flex-1 bg-gray-50 dark:bg-[#1A1A1A] border border-gray-200 dark:border-[#333] rounded-lg px-3 py-1.5 text-sm dark:text-white"
                                                placeholder="Метка (напр. 30+ продаж)"
                                            />
                                            <span className="text-gray-400 text-xs">+$</span>
                                            <input
                                                type="number"
                                                value={tier.reward}
                                                onChange={e => setMonthlyTiers(prev => prev.map((t, j) => j === i ? { ...t, reward: Number(e.target.value) } : t))}
                                                className="w-24 bg-gray-50 dark:bg-[#1A1A1A] border border-gray-200 dark:border-[#333] rounded-lg px-3 py-1.5 text-sm dark:text-white font-mono"
                                                placeholder="Бонус"
                                            />
                                            <button onClick={() => setMonthlyTiers(prev => prev.filter((_, j) => j !== i))} className="text-red-400 hover:text-red-600">
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <button
                                onClick={handleSaveGeneral}
                                disabled={isSaving}
                                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2 text-sm"
                            >
                                <Save size={14} /> {isSaving ? 'Сохранение...' : 'Сохранить'}
                            </button>
                        </div>
                    )}

                    {/* ── RATES TAB ── */}
                    {activeTab === 'rates' && (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <p className="text-xs text-gray-500">Ставка за каждый проданный продукт</p>
                                <button
                                    onClick={() => setRates(prev => [...prev, { id: null, product_name: '', rate: 0 }])}
                                    className="text-xs text-blue-500 hover:text-blue-600 flex items-center gap-1"
                                >
                                    <Plus size={12} /> Добавить
                                </button>
                            </div>
                            <div className="space-y-2">
                                {rates.map((rate, i) => (
                                    <div key={i} className="flex items-center gap-2">
                                        <input
                                            type="text"
                                            value={rate.product_name}
                                            onChange={e => setRates(prev => prev.map((r, j) => j === i ? { ...r, product_name: e.target.value } : r))}
                                            className="flex-1 bg-gray-50 dark:bg-[#1A1A1A] border border-gray-200 dark:border-[#333] rounded-lg px-3 py-2 text-sm dark:text-white"
                                            placeholder="Продукт"
                                        />
                                        <span className="text-gray-400 text-xs shrink-0">$</span>
                                        <input
                                            type="number"
                                            value={rate.rate}
                                            onChange={e => setRates(prev => prev.map((r, j) => j === i ? { ...r, rate: Number(e.target.value) } : r))}
                                            className="w-24 bg-gray-50 dark:bg-[#1A1A1A] border border-gray-200 dark:border-[#333] rounded-lg px-3 py-2 text-sm dark:text-white font-mono"
                                            placeholder="Ставка"
                                        />
                                        <button onClick={() => handleDeleteRate(rate)} className="text-red-400 hover:text-red-600 shrink-0">
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                            <button
                                onClick={handleSaveRates}
                                disabled={isSaving}
                                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2 text-sm"
                            >
                                <Save size={14} /> {isSaving ? 'Сохранение...' : 'Сохранить тарифы'}
                            </button>
                        </div>
                    )}

                    {/* ── TEAMS TAB ── */}
                    {activeTab === 'teams' && (
                        <div className="space-y-4">
                            <p className="text-xs text-gray-500">Распределите ГЕО по группам командной гонки. Код страны — 2 буквы (ISO).</p>

                            {['I', 'II', 'III'].map((group, gi) => {
                                const colors = [
                                    'border-blue-500/40 bg-blue-500/5',
                                    'border-purple-500/40 bg-purple-500/5',
                                    'border-emerald-500/40 bg-emerald-500/5',
                                ];
                                const labelColors = ['text-blue-400', 'text-purple-400', 'text-emerald-400'];
                                return (
                                    <div key={group} className={`rounded-xl border p-4 ${colors[gi]}`}>
                                        <div className="flex items-center justify-between mb-3">
                                            <span className={`text-xs font-black uppercase tracking-widest ${labelColors[gi]}`}>
                                                Группа {group}
                                            </span>
                                            <span className="text-[10px] text-gray-400">{(teamGroups[group] || []).length} стран</span>
                                        </div>

                                        {/* Country chips */}
                                        <div className="flex flex-wrap gap-2 mb-3">
                                            {(teamGroups[group] || []).map(code => {
                                                const country = countries.find(c => c.code === code);
                                                return (
                                                    <span
                                                        key={code}
                                                        className="flex items-center gap-1 px-2 py-1 bg-black/30 border border-white/10 text-white text-xs font-bold rounded-lg"
                                                    >
                                                        {country?.emoji} {code}
                                                        <button
                                                            onClick={() => removeCountryFromGroup(group, code)}
                                                            className="text-red-400 hover:text-red-300 ml-0.5"
                                                        >
                                                            <X size={10} />
                                                        </button>
                                                    </span>
                                                );
                                            })}
                                            {(teamGroups[group] || []).length === 0 && (
                                                <span className="text-xs text-gray-500 italic">Пусто</span>
                                            )}
                                        </div>

                                        {/* Add country select */}
                                        <div className="flex gap-2">
                                            <select
                                                value={newCountryInputs[group]}
                                                onChange={e => setNewCountryInputs(prev => ({ ...prev, [group]: e.target.value }))}
                                                className="flex-1 bg-white/10 dark:bg-black/20 border border-white/20 rounded-lg px-3 py-1.5 text-sm text-white font-mono focus:outline-none focus:border-white/40"
                                            >
                                                <option value="">— Выбрать страну —</option>
                                                {countries
                                                    .filter(c => !Object.values(teamGroups).flat().includes(c.code))
                                                    .map(c => (
                                                        <option key={c.code} value={c.code}>
                                                            {c.emoji} {c.code} — {c.name}
                                                        </option>
                                                    ))
                                                }
                                            </select>
                                            <button
                                                onClick={() => addCountryToGroup(group)}
                                                disabled={!newCountryInputs[group]}
                                                className="flex items-center gap-1 px-3 py-1.5 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-xs text-white font-bold transition-colors disabled:opacity-40"
                                            >
                                                <Plus size={12} /> Добавить
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}

                            <button
                                onClick={handleSaveTeams}
                                disabled={isSaving}
                                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2 text-sm"
                            >
                                <Save size={14} /> {isSaving ? 'Сохранение...' : 'Сохранить команды'}
                            </button>
                        </div>
                    )}

                    {/* ── MANAGERS TAB ── */}
                    {activeTab === 'managers' && (
                        <div className="space-y-4">
                            <p className="text-xs text-gray-500">Индивидуальные ставки (базовая, надбавка, штраф) в $</p>
                            {salesManagers.length === 0 && (
                                <p className="text-sm text-gray-400 text-center py-8">Нет активных Sales-менеджеров</p>
                            )}
                            <div className="space-y-3">
                                {mRates.map((mr, i) => (
                                    <div key={mr.manager_id} className="bg-gray-50 dark:bg-[#1A1A1A] rounded-xl p-4 border border-gray-200 dark:border-[#333]">
                                        <div className="flex items-center gap-2 mb-3">
                                            <span className="font-bold text-sm dark:text-white">{mr.name}</span>
                                            <span className="text-[10px] bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded font-bold">{mr.role}</span>
                                        </div>
                                        <div className="grid grid-cols-3 gap-2">
                                            {[
                                                { key: 'base_rate', label: 'Базовая $' },
                                                { key: 'bonus', label: 'Надбавка $' },
                                                { key: 'penalty', label: 'Штраф $' },
                                            ].map(({ key, label }) => (
                                                <div key={key}>
                                                    <label className="text-[10px] text-gray-400 block mb-1">{label}</label>
                                                    <input
                                                        type="number"
                                                        value={mr[key]}
                                                        onChange={e => setMRates(prev => prev.map((r, j) => j === i ? { ...r, [key]: e.target.value } : r))}
                                                        className="w-full bg-white dark:bg-[#111] border border-gray-200 dark:border-[#333] rounded-lg px-2 py-1.5 text-sm dark:text-white font-mono"
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                            {salesManagers.length > 0 && (
                                <button
                                    onClick={handleSaveManagerRates}
                                    disabled={isSaving}
                                    className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2 text-sm"
                                >
                                    <Save size={14} /> {isSaving ? 'Сохранение...' : 'Сохранить ставки'}
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default EditKPIModal;
