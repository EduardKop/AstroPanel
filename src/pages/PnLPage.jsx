import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    TrendingUp, ClipboardList, ChevronDown, ChevronRight,
    Plus, Save, X, Clipboard, Edit3, Trash2, Check, RefreshCw,
    Calendar as CalendarIcon, RotateCcw, ArrowUpAZ, ArrowDownUp,
    MessageCircle, MessageSquare
} from 'lucide-react';
import { useAppStore } from '../store/appStore';
import { supabase } from '../services/supabaseClient';

// ─── TABS CONFIG ──────────────────────────────────────────────────────────────
const TABS = [
    { key: 'report', label: 'P&L', icon: TrendingUp, resource: 'pnl_report' },
    { key: 'data', label: 'Заполнение данных', icon: ClipboardList, resource: 'pnl_data' },
];

// ─── EUR → USD via cache ──────────────────────────────────────────────────────
const RATE_CACHE_KEY = 'exchange_rates_cache';
const getEurToUsd = () => {
    try {
        const cached = localStorage.getItem(RATE_CACHE_KEY);
        if (cached) {
            const { rates } = JSON.parse(cached);
            return rates?.usd || 1.08; // fallback
        }
    } catch (_) { }
    return 1.08;
};

// ─── HELPERS ─────────────────────────────────────────────────────────────────
const parseGoogleRow = (raw) => {
    const cols = raw.trim().split(/\t/);
    if (cols.length < 4) return null;
    const [day, month] = (cols[0] || '').split('.');
    if (!day || !month) return null;
    const year = new Date().getFullYear();
    const date = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    const spent = parseFloat((cols[1] || '0').replace(/\s/g, '').replace(',', '.')) || 0;
    const clicks = parseInt((cols[3] || '0').replace(/\s/g, '').replace(',', '.'), 10) || 0;
    return { date, spent, clicks };
};

const fmt = (n, dec = 2) => Number(n || 0).toFixed(dec);
const fmtInt = (n) => Math.round(n || 0).toLocaleString('ru-RU');
const formatDate = (d) => {
    if (!d) return '';
    const [y, m, day] = d.split('-');
    return `${day}.${m}.${y}`;
};

// ─── ENTRY FORM ──────────────────────────────────────────────────────────────
const EntryForm = ({ countryCode, onSaved, onCancel }) => {
    const [mode, setMode] = useState('paste');
    const [raw, setRaw] = useState('');
    const [parsed, setParsed] = useState(null);
    const [form, setForm] = useState({ date: new Date().toISOString().split('T')[0], spent: '', clicks: '' });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const handleParse = () => {
        const result = parseGoogleRow(raw);
        if (!result) { setError('Вставьте строку из Google Sheets (Tab-разделители).'); return; }
        setError(''); setParsed(result);
        setForm({ date: result.date, spent: String(result.spent), clicks: String(result.clicks) });
    };

    const handleSave = async () => {
        setError('');
        const date = form.date;
        const spent = parseFloat(form.spent) || 0;
        const clicks = parseInt(form.clicks, 10) || 0;
        if (!date) { setError('Укажите дату'); return; }
        setSaving(true);
        const { error: dbErr } = await supabase.from('pnl_entries')
            .upsert({ country_code: countryCode, date, spent, clicks, updated_at: new Date().toISOString() },
                { onConflict: 'country_code,date' });
        setSaving(false);
        if (dbErr) { setError(dbErr.message); return; }
        onSaved();
    };

    return (
        <div className="mt-3 bg-gray-50 dark:bg-[#161616] border border-gray-200 dark:border-[#2a2a2a] rounded-xl p-4 space-y-4">
            <div className="flex gap-1 bg-gray-200 dark:bg-[#222] p-0.5 rounded-lg w-fit">
                {[{ k: 'paste', label: 'Вставить строку', icon: Clipboard }, { k: 'manual', label: 'Вручную', icon: Edit3 }].map(m => (
                    <button key={m.k} onClick={() => { setMode(m.k); setError(''); }}
                        className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-bold transition-all ${mode === m.k ? 'bg-white dark:bg-[#333] text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}>
                        <m.icon size={12} />{m.label}
                    </button>
                ))}
            </div>

            {mode === 'paste' && (
                <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Строка из Google Sheets</label>
                    <textarea rows={2} value={raw}
                        onChange={e => { setRaw(e.target.value); setError(''); setParsed(null); }}
                        placeholder={"05.11\t383,00\t58 649\t1 865\t3,18%\t0,21\t..."}
                        className="w-full font-mono text-xs bg-white dark:bg-[#111] border border-gray-200 dark:border-[#333] rounded-lg px-3 py-2 dark:text-white resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    <button onClick={handleParse}
                        className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-colors">
                        Парсить
                    </button>
                    {parsed && (
                        <div className="flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400">
                            <Check size={14} />
                            Распознано: <b>{formatDate(parsed.date)}</b> · Потрачено: <b>${parsed.spent}</b> · Клики: <b>{parsed.clicks}</b>
                        </div>
                    )}
                </div>
            )}

            <div className="grid grid-cols-3 gap-3">
                {[
                    { label: 'Дата', name: 'date', type: 'date' },
                    { label: 'Потрачено, $', name: 'spent', type: 'number', placeholder: '0.00', step: '0.01' },
                    { label: 'Переходы (клики)', name: 'clicks', type: 'number', placeholder: '0', step: '1' },
                ].map(f => (
                    <div key={f.name} className="space-y-1">
                        <label className="text-xs font-bold text-gray-500">{f.label}</label>
                        <input type={f.type} value={form[f.name]} placeholder={f.placeholder} step={f.step}
                            onChange={e => setForm(p => ({ ...p, [f.name]: e.target.value }))}
                            className="w-full bg-white dark:bg-[#111] border border-gray-200 dark:border-[#333] rounded-lg px-3 py-2 text-sm dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                    </div>
                ))}
            </div>

            {error && <p className="text-xs text-red-500">{error}</p>}

            <div className="flex items-center gap-2">
                <button onClick={handleSave} disabled={saving}
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-colors disabled:opacity-50">
                    <Save size={13} />{saving ? 'Сохранение...' : 'Сохранить'}
                </button>
                <button onClick={onCancel}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-200 dark:bg-[#333] text-gray-700 dark:text-gray-300 text-xs font-bold rounded-lg hover:opacity-80 transition-opacity">
                    <X size={13} />Отмена
                </button>
            </div>
        </div>
    );
};

// ─── COUNTRY CARD (Data Tab) ──────────────────────────────────────────────────
const CountryCard = ({ country }) => {
    const [open, setOpen] = useState(false);
    const [entries, setEntries] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showForm, setShowForm] = useState(false);

    const fetchEntries = useCallback(async () => {
        setLoading(true);
        const { data } = await supabase.from('pnl_entries').select('*')
            .eq('country_code', country.code).order('date', { ascending: false }).limit(60);
        setEntries(data || []);
        setLoading(false);
    }, [country.code]);

    const handleOpen = () => { setOpen(o => !o); if (!open) fetchEntries(); };
    const handleDelete = async (id) => {
        if (!window.confirm('Удалить запись?')) return;
        await supabase.from('pnl_entries').delete().eq('id', id);
        setEntries(p => p.filter(e => e.id !== id));
    };

    return (
        <div className="bg-white dark:bg-[#111] border border-gray-200 dark:border-[#222] rounded-xl overflow-hidden">
            <button onClick={handleOpen}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 dark:hover:bg-[#1a1a1a] transition-colors">
                <div className="flex items-center gap-3">
                    <span className="text-xl">{country.emoji}</span>
                    <div className="text-left">
                        <div className="text-sm font-bold text-gray-900 dark:text-white">{country.name}</div>
                        <div className="text-[10px] text-gray-400 uppercase">{country.code} · {country.currency_code}</div>
                    </div>
                    {!country.is_active && <span className="px-1.5 py-0.5 bg-gray-100 dark:bg-[#222] text-gray-400 text-[9px] font-bold rounded uppercase">Неактивно</span>}
                </div>
                {open ? <ChevronDown size={16} className="text-gray-400" /> : <ChevronRight size={16} className="text-gray-400" />}
            </button>

            {open && (
                <div className="border-t border-gray-100 dark:border-[#222] px-4 pb-4 pt-3 space-y-3">
                    {!showForm && (
                        <button onClick={() => setShowForm(true)}
                            className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 text-xs font-bold rounded-lg border border-emerald-200 dark:border-emerald-900/30 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-colors">
                            <Plus size={13} />Добавить запись
                        </button>
                    )}
                    {showForm && <EntryForm countryCode={country.code} onSaved={() => { setShowForm(false); fetchEntries(); }} onCancel={() => setShowForm(false)} />}

                    {loading ? <div className="text-xs text-gray-400 py-2">Загрузка...</div>
                        : entries.length === 0 ? <div className="text-xs text-gray-400 py-2">Записей пока нет</div>
                            : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-xs">
                                        <thead>
                                            <tr className="border-b border-gray-100 dark:border-[#222]">
                                                {['Дата', 'Потрачено, $', 'Переходы', ''].map(h => (
                                                    <th key={h} className="text-left text-[10px] font-bold text-gray-400 uppercase pb-2 pr-4">{h}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-50 dark:divide-[#1a1a1a]">
                                            {entries.map(e => (
                                                <tr key={e.id} className="hover:bg-gray-50 dark:hover:bg-[#161616] group">
                                                    <td className="py-2 pr-4 font-mono font-bold text-gray-700 dark:text-gray-300">{formatDate(e.date)}</td>
                                                    <td className="py-2 pr-4 text-emerald-600 dark:text-emerald-400 font-bold">${fmt(e.spent)}</td>
                                                    <td className="py-2 pr-4 text-gray-700 dark:text-gray-300">{fmtInt(e.clicks)}</td>
                                                    <td className="py-2 text-right">
                                                        <button onClick={() => handleDelete(e.id)}
                                                            className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 transition-all rounded">
                                                            <Trash2 size={12} />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                </div>
            )}
        </div>
    );
};

// ─── DATA TAB ─────────────────────────────────────────────────────────────────
const PnLDataTab = () => {
    const { countries } = useAppStore();
    const [search, setSearch] = useState('');
    const [showInactive, setShowInactive] = useState(false);
    const [geoSort, setGeoSort] = useState(() => localStorage.getItem('pnl_data_sort') || 'standard');
    const toggleGeoSort = () => {
        const next = geoSort === 'standard' ? 'alpha' : 'standard';
        setGeoSort(next);
        localStorage.setItem('pnl_data_sort', next);
    };

    const filtered = (countries || [])
        .filter(c => showInactive || c.is_active)
        .filter(c => c.name.toLowerCase().includes(search.toLowerCase()) || c.code.toLowerCase().includes(search.toLowerCase()))
        .sort((a, b) => geoSort === 'alpha' ? a.name.localeCompare(b.name) : 0);

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Поиск страны..."
                    className="bg-white dark:bg-[#111] border border-gray-200 dark:border-[#333] rounded-lg px-3 py-2 text-sm dark:text-white w-48 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <button onClick={() => setShowInactive(p => !p)}
                    className={`px-3 py-2 text-xs font-bold rounded-lg border transition-all ${showInactive ? 'bg-gray-700 text-white border-gray-700' : 'bg-white dark:bg-[#111] border-gray-200 dark:border-[#333] text-gray-500 dark:text-gray-400 hover:border-gray-400'}`}>
                    {showInactive ? 'Скрыть неактивные' : 'Показать неактивные'}
                </button>
                <button
                    onClick={toggleGeoSort}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold border transition-all ${
                        geoSort === 'alpha'
                            ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800'
                            : 'bg-white dark:bg-[#111] border-gray-200 dark:border-[#333] text-gray-500 dark:text-gray-400 hover:border-gray-400'
                    }`}
                >
                    {geoSort === 'alpha' ? <ArrowUpAZ size={13} /> : <ArrowDownUp size={13} />}
                    {geoSort === 'alpha' ? 'А→Я' : 'Стандарт'}
                </button>
                <span className="text-xs text-gray-400">{filtered.length} стран</span>
            </div>
            <div className="space-y-2">
                {filtered.map(c => <CountryCard key={c.code} country={c} />)}
                {filtered.length === 0 && <div className="text-center py-10 text-gray-400 text-sm">Ничего не найдено</div>}
            </div>
        </div>
    );
};

// ─── CUSTOM DATE RANGE PICKER (same as DashboardPage) ────────────────────────
const CustomDateRangePicker = ({ startDate, endDate, onChange, onReset }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [viewDate, setViewDate] = useState(startDate || new Date());
    const [selecting, setSelecting] = useState('start');

    const DAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
    const MONTHS = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
        'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];

    const fmtD = (date) => {
        if (!date) return '';
        return `${String(date.getDate()).padStart(2, '0')}.${String(date.getMonth() + 1).padStart(2, '0')}.${date.getFullYear()}`;
    };
    const getDaysInMonth = (y, m) => new Date(y, m + 1, 0).getDate();
    const getFirstDayOfMonth = (y, m) => { const d = new Date(y, m, 1).getDay(); return d === 0 ? 6 : d - 1; };
    const isSameDay = (d1, d2) => d1 && d2 && d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth() && d1.getDate() === d2.getDate();
    const isInRange = (date) => startDate && endDate && date >= startDate && date <= endDate;
    const isToday = (date) => isSameDay(date, new Date());

    const handleDayClick = (day) => {
        const clicked = new Date(viewDate.getFullYear(), viewDate.getMonth(), day);
        if (selecting === 'start') { onChange([clicked, null]); setSelecting('end'); }
        else { onChange(clicked < startDate ? [clicked, startDate] : [startDate, clicked]); setSelecting('start'); setIsOpen(false); }
    };

    const setYesterday = () => { const y = new Date(); y.setDate(y.getDate() - 1); onChange([y, y]); setIsOpen(false); };
    const setToday = () => { onChange([new Date(), new Date()]); setIsOpen(false); };
    const setLastWeek = () => { const t = new Date(), d = t.getDay(), m = new Date(t); m.setDate(t.getDate() - (d === 0 ? 6 : d - 1)); const lm = new Date(m); lm.setDate(m.getDate() - 7); const ls = new Date(lm); ls.setDate(lm.getDate() + 6); onChange([lm, ls]); setIsOpen(false); };
    const setCurrentWeek = () => { const t = new Date(), d = t.getDay(), m = new Date(t); m.setDate(t.getDate() - (d === 0 ? 6 : d - 1)); const s = new Date(m); s.setDate(m.getDate() + 6); onChange([m, s]); setIsOpen(false); };
    const setLastMonth = () => { const t = new Date(); onChange([new Date(t.getFullYear(), t.getMonth() - 1, 1), new Date(t.getFullYear(), t.getMonth(), 0)]); setIsOpen(false); };
    const setCurrentMonth = () => { const t = new Date(); onChange([new Date(t.getFullYear(), t.getMonth(), 1), new Date(t.getFullYear(), t.getMonth() + 1, 0)]); setIsOpen(false); };

    const prevMonth = () => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
    const nextMonth = () => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));

    const year = viewDate.getFullYear(), month = viewDate.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);

    const displayText = () => {
        if (startDate && endDate) return `${fmtD(startDate)} — ${fmtD(endDate)}`;
        if (startDate) return `${fmtD(startDate)} — ...`;
        return 'Период';
    };

    return (
        <div className="relative">
            <div onClick={() => { setIsOpen(!isOpen); setSelecting('start'); }}
                className="flex items-center bg-white dark:bg-[#111] border border-gray-200 dark:border-[#333] rounded-lg px-3 py-2 h-[36px] cursor-pointer hover:border-gray-400 dark:hover:border-[#555] transition-colors min-w-[200px]">
                <CalendarIcon size={13} className="text-gray-400 mr-2 shrink-0" />
                <span className={`flex-1 text-xs font-medium ${startDate ? 'text-gray-900 dark:text-white' : 'text-gray-400'}`}>{displayText()}</span>
                <button onClick={(e) => { e.stopPropagation(); onReset(); }} className="ml-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"><X size={12} /></button>
            </div>

            {isOpen && (
                <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
                    <div className="absolute top-full left-0 mt-2 bg-white dark:bg-[#111] border border-gray-200 dark:border-[#333] rounded-xl shadow-xl z-50 p-2.5 w-[220px] animate-in fade-in slide-in-from-top-2 duration-150">
                        {/* Presets */}
                        <div className="space-y-1 mb-2">
                            <div className="flex gap-1">
                                <button onClick={setYesterday} className="flex-1 text-[10px] font-medium py-1 px-1 rounded-md bg-gray-100 dark:bg-[#222] text-gray-600 dark:text-gray-300 hover:bg-blue-100 dark:hover:bg-blue-900/30 hover:text-blue-600 transition-colors">Вчера</button>
                                <button onClick={setToday} className="flex-1 text-[10px] font-medium py-1 px-1 rounded-md bg-gray-100 dark:bg-[#222] text-gray-600 dark:text-gray-300 hover:bg-blue-100 dark:hover:bg-blue-900/30 hover:text-blue-600 transition-colors">Сегодня</button>
                            </div>
                            <div className="flex gap-1">
                                <button onClick={setLastWeek} className="flex-1 text-[10px] font-medium py-1 px-1 rounded-md bg-gray-100 dark:bg-[#222] text-gray-600 dark:text-gray-300 hover:bg-blue-100 dark:hover:bg-blue-900/30 hover:text-blue-600 transition-colors">Пр. нед.</button>
                                <button onClick={setCurrentWeek} className="flex-1 text-[10px] font-medium py-1 px-1 rounded-md bg-gray-100 dark:bg-[#222] text-gray-600 dark:text-gray-300 hover:bg-blue-100 dark:hover:bg-blue-900/30 hover:text-blue-600 transition-colors">Тек. нед.</button>
                            </div>
                            <div className="flex gap-1">
                                <button onClick={setLastMonth} className="flex-1 text-[10px] font-medium py-1 px-1 rounded-md bg-gray-100 dark:bg-[#222] text-gray-600 dark:text-gray-300 hover:bg-blue-100 dark:hover:bg-blue-900/30 hover:text-blue-600 transition-colors">Пр. мес.</button>
                                <button onClick={setCurrentMonth} className="flex-1 text-[10px] font-medium py-1 px-1 rounded-md bg-gray-100 dark:bg-[#222] text-gray-600 dark:text-gray-300 hover:bg-blue-100 dark:hover:bg-blue-900/30 hover:text-blue-600 transition-colors">Тек. мес.</button>
                            </div>
                        </div>
                        {/* Month nav */}
                        <div className="flex items-center justify-between mb-2">
                            <button onClick={prevMonth} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-[#222] text-gray-500 transition-colors">
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
                            </button>
                            <span className="text-xs font-bold text-gray-900 dark:text-white">{MONTHS[month]} {year}</span>
                            <button onClick={nextMonth} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-[#222] text-gray-500 transition-colors">
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg>
                            </button>
                        </div>
                        {/* Weekday headers */}
                        <div className="grid grid-cols-7 gap-0.5 mb-0.5">
                            {DAYS.map(d => <div key={d} className="text-[9px] font-bold text-gray-400 text-center py-0.5">{d}</div>)}
                        </div>
                        {/* Days grid */}
                        <div className="grid grid-cols-7 gap-0.5">
                            {Array.from({ length: firstDay }).map((_, i) => <div key={`e-${i}`} className="w-7 h-7" />)}
                            {Array.from({ length: daysInMonth }).map((_, i) => {
                                const day = i + 1;
                                const date = new Date(year, month, day);
                                const isStart = isSameDay(date, startDate), isEnd = isSameDay(date, endDate);
                                const inRange = isInRange(date), today = isToday(date);
                                let cls = 'w-7 h-7 flex items-center justify-center text-[11px] font-medium rounded cursor-pointer transition-all ';
                                if (isStart || isEnd) cls += 'bg-blue-500 text-white font-bold ';
                                else if (inRange) cls += 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 ';
                                else if (today) cls += 'ring-1 ring-blue-400 text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-[#222] ';
                                else cls += 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#222] ';
                                return <button key={day} onClick={() => handleDayClick(day)} className={cls}>{day}</button>;
                            })}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

// ─── P&L REPORT TAB (pivot) ──────────────────────────────────────────────────
const METRICS = [
    { key: 'profit', label: 'Прибыль', unit: '$' },
    { key: 'revenueUsd', label: 'Выручка', unit: '$' },
    { key: 'spent', label: 'Расходы', unit: '$' },
    { key: 'roi', label: 'ROI', unit: '%' },
    { key: 'clicks', label: 'Клики', unit: '' },
    { key: 'salesCount', label: 'Продажи', unit: '' },
    { key: 'cpc', label: 'Цена клика', unit: '$' },
];

const PnLReportTab = ({ startDate, endDate }) => {
    const { countries, payments: storePayments, isLoading: storeLoading } = useAppStore();
    const [entries, setEntries] = useState([]);
    const [localLoading, setLocalLoading] = useState(true);
    const loading = localLoading || storeLoading;
    const eurToUsd = getEurToUsd();
    const [metric, setMetric] = useState('profit');
    const [trafficSource, setTrafficSource] = useState('all'); // 'all', 'direct', 'comments'
    const [deptFilter, setDeptFilter] = useState(['sales']); // ['sales'] = ОП by default

    const toggleDept = (key) => setDeptFilter(prev =>
        prev.includes(key) ? prev.filter(d => d !== key) : [...prev, key]
    );

    const toYMD = (d) => d ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` : '';
    const dateFrom = toYMD(startDate);
    const dateTo = toYMD(endDate);

    // Load pnl_entries only
    useEffect(() => {
        if (!dateFrom || !dateTo) return;
        const load = async () => {
            setLocalLoading(true);
            const { data: ents } = await supabase.from('pnl_entries').select('*').gte('date', dateFrom).lte('date', dateTo);
            setEntries(ents || []);
            setLocalLoading(false);
        };
        load();
    }, [dateFrom, dateTo]);

    // Filter store payments by date range, trafficSource, and department
    const payments = useMemo(() => {
        if (!dateFrom || !dateTo) return [];
        return (storePayments || []).filter(p => {
            if (!p.transactionDate) return false;
            const d = p.transactionDate.slice(0, 10);
            if (d < dateFrom || d > dateTo) return false;
            if (p.status !== 'completed') return false;
            // Traffic source filter
            if (trafficSource !== 'all' && p.source !== trafficSource) return false;
            // Department filter (multi-select; empty = all)
            if (deptFilter.length > 0) {
                const role = p.managerRole || '';
                const match = deptFilter.some(dept => {
                    if (dept === 'sales') return role === 'Sales' || role === 'SeniorSales';
                    if (dept === 'consultant') return role === 'Consultant';
                    if (dept === 'taro') return role === 'SalesTaro';
                    return false;
                });
                if (!match) return false;
            }
            return true;
        });
    }, [storePayments, dateFrom, dateTo, trafficSource, deptFilter]);

    // Build cell data: map[countryCode][date] = metrics object
    const { cellMap, sortedGeos, sortedDates, geoTotals, dateTotals, grandTotal } = useMemo(() => {
        const map = {};
        const geoCodes = new Set();
        const dates = new Set();

        entries.forEach(entry => {
            const code = entry.country_code;
            const date = entry.date;
            geoCodes.add(code);
            dates.add(date);

            const dayPayments = payments.filter(p =>
                p.country === code && (p.transactionDate || '').slice(0, 10) === date
            );
            const salesCount = dayPayments.length;
            const revenueEur = dayPayments.reduce((s, p) => s + parseFloat(p.amountEUR || p.amount_eur || 0), 0);
            const revenueUsd = revenueEur * eurToUsd;
            const spent = parseFloat(entry.spent) || 0;
            const clicks = parseInt(entry.clicks) || 0;
            const profit = revenueUsd - spent;
            const cpc = clicks > 0 ? spent / clicks : 0;
            const roi = spent > 0 ? (profit / spent) * 100 : 0;

            if (!map[code]) map[code] = {};
            map[code][date] = { spent, clicks, salesCount, revenueUsd, profit, cpc, roi };
        });

        const sortedDates = [...dates].sort((a, b) => b.localeCompare(a));

        // Build interim geos list with totals for sorting
        const allGeoCodes = [...geoCodes];

        // Compute geo totals first, then sort
        const geoTotals = {};
        allGeoCodes.forEach(code => {
            const cells = Object.values(map[code] || {});
            const spent = cells.reduce((s, c) => s + c.spent, 0);
            const profit = cells.reduce((s, c) => s + c.profit, 0);
            geoTotals[code] = {
                spent,
                clicks: cells.reduce((s, c) => s + c.clicks, 0),
                salesCount: cells.reduce((s, c) => s + c.salesCount, 0),
                revenueUsd: cells.reduce((s, c) => s + c.revenueUsd, 0),
                profit,
                get cpc() { return this.clicks > 0 ? this.spent / this.clicks : 0; },
                get roi() { return this.spent > 0 ? (this.profit / this.spent) * 100 : 0; },
            };
        });

        const sortedGeos = [...allGeoCodes].sort((a, b) => a.localeCompare(b));

        // Per-date totals (bottom row)
        const dateTotals = {};
        sortedDates.forEach(date => {
            const cells = sortedGeos.map(g => map[g]?.[date]).filter(Boolean);
            dateTotals[date] = {
                spent: cells.reduce((s, c) => s + c.spent, 0),
                clicks: cells.reduce((s, c) => s + c.clicks, 0),
                salesCount: cells.reduce((s, c) => s + c.salesCount, 0),
                revenueUsd: cells.reduce((s, c) => s + c.revenueUsd, 0),
                profit: cells.reduce((s, c) => s + c.profit, 0),
                get cpc() { return this.clicks > 0 ? this.spent / this.clicks : 0; },
                get roi() { return this.spent > 0 ? (this.profit / this.spent) * 100 : 0; },
            };
        });

        // Grand total
        const allCells = Object.values(map).flatMap(g => Object.values(g));
        const totalSpent = allCells.reduce((s, c) => s + c.spent, 0);
        const totalProfit = allCells.reduce((s, c) => s + c.profit, 0);
        const grandTotal = {
            spent: totalSpent,
            clicks: allCells.reduce((s, c) => s + c.clicks, 0),
            salesCount: allCells.reduce((s, c) => s + c.salesCount, 0),
            revenueUsd: allCells.reduce((s, c) => s + c.revenueUsd, 0),
            profit: totalProfit,
            get cpc() { return this.clicks > 0 ? this.spent / this.clicks : 0; },
            get roi() { return this.spent > 0 ? (this.profit / this.spent) * 100 : 0; },
        };

        return { cellMap: map, sortedGeos, sortedDates, geoTotals, dateTotals, grandTotal };
    }, [entries, payments, eurToUsd, trafficSource, deptFilter]);

    // Get metric value from a cell
    const getVal = (cell, m) => cell ? cell[m] ?? 0 : null;
    const curMetric = METRICS.find(m => m.key === metric) || METRICS[0];

    // Cell color: heatmap based on profit/roi (positive = green shades, negative = red)
    const getCellStyle = (val, m) => {
        if (val === null) return '';
        if (m === 'profit' || m === 'roi') {
            if (val > 100) return 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300';
            if (val > 0) return 'bg-emerald-50 dark:bg-emerald-900/15 text-emerald-600 dark:text-emerald-400';
            if (val < 0) return 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400';
        }
        return 'text-gray-700 dark:text-gray-300';
    };

    const fmtCell = (val, m) => {
        if (val === null) return <span className="text-gray-200 dark:text-gray-700">—</span>;
        const unit = METRICS.find(x => x.key === m)?.unit || '';
        if (m === 'roi') return `${fmt(val, 1)}%`;
        if (m === 'cpc') return `${fmt(val, 3)}$`;
        if (m === 'clicks' || m === 'salesCount') return fmtInt(val);
        return `${fmt(val)}${unit}`;
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-[#111] border border-gray-200 dark:border-[#333] rounded-lg shadow-sm">
                <RefreshCw size={28} className="text-blue-500 animate-spin mb-3" />
                <p className="text-gray-500 dark:text-gray-400 font-medium text-sm">Загрузка данных P&L...</p>
            </div>
        );
    }

    return (
        <div className="space-y-5">
            {/* Controls: metric switcher + filter buttons */}
            <div className="flex flex-wrap items-center gap-2">

                {/* Metric switcher */}
                <div className="flex flex-wrap gap-1 bg-gray-100 dark:bg-[#1a1a1a] p-0.5 rounded-lg">
                    {METRICS.map(m => (
                        <button key={m.key} onClick={() => setMetric(m.key)}
                            className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${metric === m.key
                                ? 'bg-white dark:bg-[#333] text-gray-900 dark:text-white shadow-sm'
                                : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}>
                            {m.label}
                        </button>
                    ))}
                </div>

                {/* Traffic Source Toggle: Все / Direct / Comm */}
                <div className="flex bg-gray-200 dark:bg-[#1A1A1A] p-0.5 rounded-lg h-[30px] items-center">
                    <button onClick={() => setTrafficSource('all')}
                        className={`px-2.5 h-full rounded-md text-[10px] font-bold transition-all whitespace-nowrap ${
                            trafficSource === 'all' ? 'bg-white dark:bg-[#333] text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                        }`}>Все</button>
                    <button onClick={() => setTrafficSource('direct')}
                        className={`px-2 h-full rounded-md text-[10px] font-bold transition-all flex items-center gap-1 whitespace-nowrap ${
                            trafficSource === 'direct' ? 'bg-white dark:bg-[#333] text-blue-600 dark:text-blue-400 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                        }`}><MessageCircle size={10} />Direct</button>
                    <button onClick={() => setTrafficSource('comments')}
                        className={`px-2 h-full rounded-md text-[10px] font-bold transition-all flex items-center gap-1 whitespace-nowrap ${
                            trafficSource === 'comments' ? 'bg-white dark:bg-[#333] text-orange-600 dark:text-orange-400 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                        }`}><MessageSquare size={10} />Comm</button>
                </div>

                {/* Department Toggle: Все / on / Конс. / Таро — multi-select */}
                <div className="flex bg-gray-200 dark:bg-[#1A1A1A] p-0.5 rounded-lg h-[30px] items-center">
                    <button onClick={() => setDeptFilter([])}
                        className={`px-2.5 h-full rounded-md text-[10px] font-bold transition-all whitespace-nowrap ${
                            deptFilter.length === 0 ? 'bg-white dark:bg-[#333] text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                        }`}>Все</button>
                    <button onClick={() => toggleDept('sales')}
                        className={`px-2.5 h-full rounded-md text-[10px] font-bold transition-all whitespace-nowrap ${
                            deptFilter.includes('sales') ? 'bg-white dark:bg-[#333] text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                        }`}>on</button>
                    <button onClick={() => toggleDept('consultant')}
                        className={`px-2.5 h-full rounded-md text-[10px] font-bold transition-all whitespace-nowrap ${
                            deptFilter.includes('consultant') ? 'bg-white dark:bg-[#333] text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                        }`}>Конс.</button>
                    <button onClick={() => toggleDept('taro')}
                        className={`px-2.5 h-full rounded-md text-[10px] font-bold transition-all whitespace-nowrap ${
                            deptFilter.includes('taro') ? 'bg-white dark:bg-[#333] text-purple-600 dark:text-purple-400 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                        }`}>Таро</button>
                </div>
            </div>

            {/* Summary KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {[
                    { label: 'Расходы', value: `${fmt(grandTotal.spent)}$`, color: 'text-red-500' },
                    { label: 'Клики', value: fmtInt(grandTotal.clicks), color: 'text-blue-500' },
                    { label: 'Продажи', value: fmtInt(grandTotal.salesCount), color: 'text-purple-500' },
                    { label: 'Выручка', value: `${fmt(grandTotal.revenueUsd)}$`, color: 'text-emerald-500' },
                    {
                        label: 'Прибыль',
                        value: `${grandTotal.profit >= 0 ? '+' : ''}${fmt(grandTotal.profit)}$`,
                        color: grandTotal.profit >= 0 ? 'text-emerald-600' : 'text-red-500'
                    },
                ].map(k => (
                    <div key={k.label} className="bg-white dark:bg-[#111] border border-gray-200 dark:border-[#222] rounded-xl px-4 py-3">
                        <div className="text-[10px] text-gray-400 uppercase font-bold mb-1">{k.label}</div>
                        <div className={`text-lg font-bold ${k.color}`}>{k.value}</div>
                    </div>
                ))}
            </div>

            {/* Pivot table */}
            {sortedGeos.length === 0 && !loading ? (
                <div className="flex flex-col items-center justify-center min-h-[250px] border-2 border-dashed border-gray-200 dark:border-[#222] rounded-2xl gap-3">
                    <TrendingUp size={28} className="text-gray-300" />
                    <p className="text-gray-400 text-sm">Нет данных за выбранный период. Заполните их во вкладке «Заполнение данных».</p>
                </div>
            ) : (
                <div className="bg-white dark:bg-[#111] border border-gray-200 dark:border-[#222] rounded-xl overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="text-xs border-collapse w-full">
                            {/* HEADER: dates as columns */}
                            <thead>
                                <tr className="bg-gray-50 dark:bg-[#161616]">
                                    {/* Sticky GEO column header */}
                                    <th className="sticky left-0 z-10 bg-gray-50 dark:bg-[#161616] px-4 py-3 text-left border-b border-r border-gray-200 dark:border-[#222]">
                                        <div className="flex flex-col gap-0.5">
                                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">ГЕО</span>
                                            <span className="text-[9px] text-gray-300 dark:text-gray-600">{curMetric.label}</span>
                                        </div>
                                    </th>
                                    {sortedDates.map(d => (
                                        <th key={d} className="px-3 py-3 text-center border-b border-gray-200 dark:border-[#222] whitespace-nowrap min-w-[80px]">
                                            <div className="text-[10px] font-bold text-gray-500 dark:text-gray-400">{formatDate(d)}</div>
                                        </th>
                                    ))}
                                    {/* Total column */}
                                    <th className="px-3 py-3 text-center border-b border-l-2 border-gray-300 dark:border-[#333] bg-gray-100 dark:bg-[#1a1a1a] whitespace-nowrap min-w-[80px]">
                                        <div className="text-[10px] font-bold text-gray-500 uppercase">Итого</div>
                                    </th>
                                </tr>
                            </thead>

                            <tbody className="divide-y divide-gray-50 dark:divide-[#1a1a1a]">
                                {sortedGeos.map(code => {
                                    const country = countries?.find(c => c.code === code);
                                    const geo = geoTotals[code];
                                    const totalVal = getVal(geo, metric);
                                    return (
                                        <tr key={code} className="hover:bg-gray-50/80 dark:hover:bg-[#161616]/80 transition-colors group">
                                            {/* Sticky GEO label */}
                                            <td className="sticky left-0 z-10 bg-white dark:bg-[#111] group-hover:bg-gray-50 dark:group-hover:bg-[#161616] px-4 py-2.5 border-r border-gray-100 dark:border-[#222] transition-colors">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-base">{country?.emoji || ''}</span>
                                                    <div>
                                                        <div className="font-bold text-gray-800 dark:text-white">{code}</div>
                                                        <div className="text-[9px] text-gray-400 truncate max-w-[70px]">{country?.name || ''}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            {/* Date cells */}
                                            {sortedDates.map(d => {
                                                const cell = cellMap[code]?.[d] || null;
                                                const val = getVal(cell, metric);
                                                return (
                                                    <td key={d}
                                                        className={`px-3 py-2.5 text-center font-mono font-bold tabular-nums rounded-sm transition-colors ${getCellStyle(val, metric)}`}>
                                                        {fmtCell(val, metric)}
                                                    </td>
                                                );
                                            })}
                                            {/* GEO Total */}
                                            <td className={`px-3 py-2.5 text-center font-bold border-l-2 border-gray-200 dark:border-[#333] bg-gray-50 dark:bg-[#1a1a1a] tabular-nums ${getCellStyle(totalVal, metric)}`}>
                                                {fmtCell(totalVal, metric)}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>

                            {/* Date totals footer */}
                            <tfoot>
                                <tr className="bg-gray-100 dark:bg-[#1a1a1a] border-t-2 border-gray-300 dark:border-[#333]">
                                    <td className="sticky left-0 z-10 bg-gray-100 dark:bg-[#1a1a1a] px-4 py-2.5 border-r border-gray-200 dark:border-[#333]">
                                        <span className="text-[10px] font-bold text-gray-500 uppercase">Итого</span>
                                    </td>
                                    {sortedDates.map(d => {
                                        const cell = dateTotals[d];
                                        const val = getVal(cell, metric);
                                        return (
                                            <td key={d} className={`px-3 py-2.5 text-center font-bold tabular-nums ${getCellStyle(val, metric)}`}>
                                                {fmtCell(val, metric)}
                                            </td>
                                        );
                                    })}
                                    {/* Grand total */}
                                    <td className={`px-3 py-2.5 text-center font-bold border-l-2 border-gray-300 dark:border-[#444] tabular-nums text-sm ${getCellStyle(getVal(grandTotal, metric), metric)}`}>
                                        {fmtCell(getVal(grandTotal, metric), metric)}
                                    </td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>

                    {/* Legend */}
                    <div className="px-4 py-2 border-t border-gray-100 dark:border-[#222] flex items-center gap-4 text-[10px] text-gray-400">
                        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-emerald-100 dark:bg-emerald-900/30 inline-block" />Прибыль &gt; 0</span>
                        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-red-50 dark:bg-red-900/20 inline-block" />Убыток</span>
                        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-gray-100 border border-gray-200 inline-block" />Нет данных</span>
                    </div>
                </div>
            )}
        </div>
    );
};

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
const PnLPage = () => {
    const { user, permissions } = useAppStore();

    const hasAccess = (resource) => {
        if (user?.role === 'C-level') return true;
        return permissions?.[user?.role]?.[resource] === true;
    };

    const visibleTabs = TABS.filter(t => hasAccess(t.resource));
    const [activeTab, setActiveTab] = useState(() => visibleTabs[0]?.key || 'report');

    // Date range lives here so the calendar can be in the tab header
    const [dateRange, setDateRange] = useState(() => {
        const now = new Date();
        return [new Date(now.getFullYear(), now.getMonth(), 1),
        new Date(now.getFullYear(), now.getMonth() + 1, 0)];
    });
    const [startDate, endDate] = dateRange;
    const resetDateRange = () => {
        const now = new Date();
        setDateRange([new Date(now.getFullYear(), now.getMonth(), 1),
        new Date(now.getFullYear(), now.getMonth() + 1, 0)]);
    };

    if (visibleTabs.length === 0) {
        return <div className="flex items-center justify-center min-h-[400px] text-gray-400 text-sm">⛔ Нет доступа</div>;
    }

    const currentTab = TABS.find(t => t.key === activeTab) || visibleTabs[0];

    return (
        <div className="animate-in fade-in zoom-in duration-300 pb-10 font-sans">
            <div className="flex items-center gap-3 mb-6">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center">
                    <TrendingUp size={18} className="text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">P&amp;L</h2>
                    <p className="text-xs text-gray-400 font-medium mt-0.5">Profit &amp; Loss — финансовый отчёт</p>
                </div>
            </div>

            {/* Tab bar + calendar on the right */}
            <div className="flex items-center justify-between mb-6 bg-gray-100 dark:bg-[#1A1A1A] p-0.5 rounded-lg">
                <div className="flex gap-1">
                    {visibleTabs.map(tab => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.key;
                        return (
                            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                                className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-2 ${isActive
                                    ? 'bg-white dark:bg-[#333] text-gray-900 dark:text-white shadow-sm'
                                    : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}>
                                <Icon size={13} />{tab.label}
                            </button>
                        );
                    })}
                </div>

                {/* Calendar — visible only on the report tab */}
                {currentTab.key === 'report' && (
                    <div className="pr-0.5">
                        <CustomDateRangePicker
                            startDate={startDate}
                            endDate={endDate}
                            onChange={setDateRange}
                            onReset={resetDateRange}
                        />
                    </div>
                )}
            </div>

            <div className="animate-in fade-in duration-200">
                {currentTab.key === 'report' && <PnLReportTab startDate={startDate} endDate={endDate} />}
                {currentTab.key === 'data' && <PnLDataTab />}
            </div>
        </div>
    );
};

export default PnLPage;
