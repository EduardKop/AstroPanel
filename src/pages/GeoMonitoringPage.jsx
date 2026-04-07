import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useAppStore } from '../store/appStore';
import { useLocation } from 'react-router-dom';
import { toggleGeoStatus } from '../services/dataService';
import { showToast } from '../utils/toastEvents';
import {
    Globe, Power, PowerOff, Calendar as CalendarIcon, Search,
    TrendingUp, X, Clock, Activity, History, Users, MessageSquare, Send, LayoutGrid, List, RefreshCw, DollarSign, Star,
    ChevronLeft, ChevronRight
} from 'lucide-react';
import { fetchGeoNotes, addGeoNote, updateGeoShift } from '../services/dataService';
import { supabase } from '../services/supabaseClient';
import { PAYMENT_METHODS } from '../components/payments/AddPaymentModal';
import GeoCalendarView from '../components/GeoCalendarView';
import ProjectBadge from '../components/geo/ProjectBadge';

// --- HELPER ---
const toYMD = (date) => {
    if (!date) return '';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const formatDateShort = (dateStr) => {
    if (!dateStr) return '—';
    const parts = dateStr.split('-');
    return `${parts[2]}.${parts[1]}.${parts[0]}`;
};

const getFlagIconUrl = (code) => {
    if (!code || !/^[A-Za-z]{2}$/.test(code)) return '';
    return `https://cdn.jsdelivr.net/npm/flag-icons/flags/4x3/${code.toLowerCase()}.svg`;
};

const CountryFlagIcon = ({ code, emoji, name, className = '', imgClassName = '', fallbackClassName = '' }) => {
    const [hasError, setHasError] = useState(false);
    const src = getFlagIconUrl(code);

    if (!src || hasError) {
        return <span className={`${fallbackClassName} ${className}`}>{emoji || '🏳️'}</span>;
    }

    return (
        <img
            src={src}
            alt={name ? `Флаг ${name}` : `Флаг ${code}`}
            loading="lazy"
            decoding="async"
            onError={() => setHasError(true)}
            className={`${imgClassName} ${className}`}
        />
    );
};

// --- COMPACT DATE RANGE PICKER ---
const DateRangePicker = ({ startDate, endDate, onChange, onReset }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [viewDate, setViewDate] = useState(startDate || new Date());
    const [selecting, setSelecting] = useState('start');

    const DAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
    const MONTHS = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
        'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];

    const fmtDate = (date) => {
        if (!date) return '';
        return `${String(date.getDate()).padStart(2, '0')}.${String(date.getMonth() + 1).padStart(2, '0')}.${date.getFullYear()}`;
    };

    const getDaysInMonth = (y, m) => new Date(y, m + 1, 0).getDate();
    const getFirstDay = (y, m) => { const d = new Date(y, m, 1).getDay(); return d === 0 ? 6 : d - 1; };
    const isSameDay = (d1, d2) => d1 && d2 && d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth() && d1.getDate() === d2.getDate();
    const isInRange = (date) => startDate && endDate && date >= startDate && date <= endDate;
    const isToday = (date) => isSameDay(date, new Date());

    const handleDayClick = (day) => {
        const clicked = new Date(viewDate.getFullYear(), viewDate.getMonth(), day);
        if (selecting === 'start') { onChange([clicked, null]); setSelecting('end'); }
        else { onChange([clicked < startDate ? clicked : startDate, clicked < startDate ? startDate : clicked]); setSelecting('start'); setIsOpen(false); }
    };

    const setToday = () => { onChange([new Date(), new Date()]); setIsOpen(false); };
    const setYesterday = () => { const y = new Date(); y.setDate(y.getDate() - 1); onChange([y, y]); setIsOpen(false); };
    const setCurrentWeek = () => {
        const t = new Date(), dow = t.getDay(), mon = new Date(t); mon.setDate(t.getDate() - (dow === 0 ? 6 : dow - 1));
        const sun = new Date(mon); sun.setDate(mon.getDate() + 6); onChange([mon, sun]); setIsOpen(false);
    };
    const setLastWeek = () => {
        const t = new Date(), dow = t.getDay(), thisMon = new Date(t); thisMon.setDate(t.getDate() - (dow === 0 ? 6 : dow - 1));
        const lastMon = new Date(thisMon); lastMon.setDate(thisMon.getDate() - 7);
        const lastSun = new Date(lastMon); lastSun.setDate(lastMon.getDate() + 6); onChange([lastMon, lastSun]); setIsOpen(false);
    };

    const year = viewDate.getFullYear(), month = viewDate.getMonth();

    return (
        <div className="relative">
            <div onClick={() => { setIsOpen(!isOpen); setSelecting('start'); }}
                className="flex items-center bg-white dark:bg-[#111] border border-gray-200 dark:border-[#333] rounded-[6px] px-2 py-0.5 shadow-sm h-[34px] cursor-pointer hover:border-gray-400 dark:hover:border-[#555] transition-colors">
                <CalendarIcon size={12} className="text-gray-400 mr-2 shrink-0" />
                <span className={`text-xs font-medium ${startDate ? 'text-gray-900 dark:text-white' : 'text-gray-400'}`}>
                    {startDate && endDate ? `${fmtDate(startDate)} — ${fmtDate(endDate)}` : 'Сегодня'}
                </span>
                <button onClick={(e) => { e.stopPropagation(); onReset(); }} className="ml-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                    <X size={12} />
                </button>
            </div>

            {isOpen && (
                <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
                    <div className="absolute top-full right-0 mt-2 bg-white dark:bg-[#111] border border-gray-200 dark:border-[#333] rounded-xl shadow-xl z-50 p-2.5 w-[220px]">
                        <div className="space-y-1 mb-2">
                            <div className="flex gap-1">
                                <button onClick={setYesterday} className="flex-1 text-[10px] font-medium py-1 px-1 rounded-md bg-gray-100 dark:bg-[#222] text-gray-600 dark:text-gray-300 hover:bg-blue-100 dark:hover:bg-blue-900/30 hover:text-blue-600 transition-colors">Вчера</button>
                                <button onClick={setToday} className="flex-1 text-[10px] font-medium py-1 px-1 rounded-md bg-gray-100 dark:bg-[#222] text-gray-600 dark:text-gray-300 hover:bg-blue-100 dark:hover:bg-blue-900/30 hover:text-blue-600 transition-colors">Сегодня</button>
                            </div>
                            <div className="flex gap-1">
                                <button onClick={setLastWeek} className="flex-1 text-[10px] font-medium py-1 px-1 rounded-md bg-gray-100 dark:bg-[#222] text-gray-600 dark:text-gray-300 hover:bg-blue-100 dark:hover:bg-blue-900/30 hover:text-blue-600 transition-colors">Пр. нед.</button>
                                <button onClick={setCurrentWeek} className="flex-1 text-[10px] font-medium py-1 px-1 rounded-md bg-gray-100 dark:bg-[#222] text-gray-600 dark:text-gray-300 hover:bg-blue-100 dark:hover:bg-blue-900/30 hover:text-blue-600 transition-colors">Тек. нед.</button>
                            </div>
                        </div>
                        <div className="flex items-center justify-between mb-2">
                            <button onClick={() => setViewDate(new Date(year, month - 1, 1))} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-[#222] text-gray-500 transition-colors">
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
                            </button>
                            <span className="text-xs font-bold text-gray-900 dark:text-white">{MONTHS[month]} {year}</span>
                            <button onClick={() => setViewDate(new Date(year, month + 1, 1))} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-[#222] text-gray-500 transition-colors">
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg>
                            </button>
                        </div>
                        <div className="grid grid-cols-7 gap-0.5 mb-0.5">
                            {DAYS.map(d => <div key={d} className="text-[9px] font-bold text-gray-400 text-center py-0.5">{d}</div>)}
                        </div>
                        <div className="grid grid-cols-7 gap-0.5">
                            {Array.from({ length: getFirstDay(year, month) }).map((_, i) => <div key={`e-${i}`} className="w-7 h-7" />)}
                            {Array.from({ length: getDaysInMonth(year, month) }).map((_, i) => {
                                const day = i + 1, date = new Date(year, month, day);
                                const isS = isSameDay(date, startDate), isE = isSameDay(date, endDate), inR = isInRange(date), td = isToday(date);
                                let cls = 'w-7 h-7 flex items-center justify-center text-[11px] font-medium rounded cursor-pointer transition-all ';
                                if (isS || isE) cls += 'bg-blue-500 text-white font-bold ';
                                else if (inR) cls += 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 ';
                                else if (td) cls += 'ring-1 ring-blue-400 text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-[#222] ';
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

// --- HISTORY MODAL ---
const HistoryModal = ({ country, onClose }) => {
    const history = Array.isArray(country?.status_history) ? [...country.status_history].reverse() : [];
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-[#111] w-full max-w-md rounded-lg shadow-2xl border border-gray-200 dark:border-[#333] overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100 dark:border-[#222] flex items-center justify-between bg-gray-50 dark:bg-[#161616]">
                    <div className="flex items-center gap-2">
                        <span className="text-xl">{country.emoji}</span>
                        <span className="font-bold text-sm dark:text-white">{country.name}</span>
                        <span className="text-[10px] font-mono text-gray-400">{country.code}</span>
                    </div>
                    <button onClick={onClose} className="p-1.5 hover:bg-gray-100 dark:hover:bg-[#222] rounded transition-colors">
                        <X size={14} className="text-gray-400" />
                    </button>
                </div>
                <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
                    {history.length === 0 ? (
                        <div className="p-6 text-center text-xs text-gray-400">Нет истории изменений</div>
                    ) : (
                        <div className="divide-y divide-gray-100 dark:divide-[#222]">
                            {history.map((entry, idx) => {
                                const isOn = entry.action === 'activated';
                                const d = new Date(entry.at);
                                const dateStr = `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;
                                const timeStr = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
                                return (
                                    <div key={idx} className="grid grid-cols-[auto_1fr_1fr] gap-3 px-4 py-2.5 text-xs items-center hover:bg-gray-50 dark:hover:bg-[#1A1A1A] transition-colors">
                                        <span className={isOn ? 'text-emerald-500' : 'text-red-500'}>
                                            {isOn ? <Power size={12} /> : <PowerOff size={12} />}
                                        </span>
                                        <span className={`font-bold ${isOn ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                                            {isOn ? 'Включено' : 'Отключено'}
                                        </span>
                                        <span className="text-gray-400 text-right text-[10px]">{entry.by} • {dateStr} {timeStr}</span>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};


// --- NOTES MODAL ---
const NotesModal = ({ country, onClose, user, onNoteAdded }) => {
    const [notes, setNotes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [newNote, setNewNote] = useState('');
    const [sending, setSending] = useState(false);

    // Permission to add notes
    const canAdd = ['C-level', 'Admin', 'SeniorSales', 'SeniorSMM'].includes(user?.role);

    useEffect(() => {
        loadNotes();
    }, [country.code]);

    const loadNotes = async () => {
        setLoading(true);
        const data = await fetchGeoNotes(country.code);
        setNotes(data);
        setLoading(false);
    };

    const handleSend = async () => {
        if (!newNote.trim()) return;
        setSending(true);
        try {
            await addGeoNote(country.code, newNote, user?.name || 'Unknown', user?.id);
            setNewNote('');
            await loadNotes();
            onNoteAdded(); // Refresh parent data if needed
            showToast('Заметка добавлена', 'success');
        } catch (error) {
            console.error('Error adding note:', error);
            showToast('Ошибка при добавлении заметки', 'error');
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-[#111] w-full max-w-2xl rounded-2xl shadow-2xl border border-gray-200 dark:border-[#333] overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-200">
                {/* Modal Header */}
                <div className="px-5 py-4 border-b border-gray-100 dark:border-[#222] flex items-center justify-between bg-gray-50/50 dark:bg-[#161616]">
                    <div className="flex items-center gap-3">
                        <span className="text-2xl shadow-sm rounded-md bg-white dark:bg-[#222] p-1">{country.emoji}</span>
                        <div>
                            <h3 className="font-bold text-base text-gray-900 dark:text-white leading-tight">Заметки: {country.name}</h3>
                            <p className="text-[10px] text-gray-500 uppercase tracking-wider font-medium">{country.code}</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white dark:hover:bg-[#222] rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-all shadow-sm border border-transparent hover:border-gray-100 dark:hover:border-[#333]"
                    >
                        <X size={16} />
                    </button>
                </div>

                {/* Notes Grid */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-5 bg-gray-50/30 dark:bg-[#0A0A0A]">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center h-48 gap-3 text-gray-400">
                            <Activity size={24} className="animate-spin text-blue-500" />
                            <span className="text-xs font-medium">Загрузка истории...</span>
                        </div>
                    ) : notes.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-48 gap-3 text-gray-300 dark:text-gray-700">
                            <MessageSquare size={32} strokeWidth={1.5} />
                            <span className="text-xs">История заметок пуста</span>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {notes.map((note, idx) => (
                                <div
                                    key={note.id}
                                    className={`relative group bg-white dark:bg-[#151515] p-4 rounded-xl border border-gray-100 dark:border-[#2a2a2a] shadow-sm hover:shadow-md transition-all duration-200 flex flex-col ${idx === 0 ? 'ring-1 ring-blue-500/20 dark:ring-blue-500/10' : ''}`}
                                >
                                    <div className="flex justify-between items-start mb-3 pb-2 border-b border-gray-50 dark:border-[#222]">
                                        <div className="flex items-center gap-2">
                                            <div className="w-5 h-5 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30 flex items-center justify-center text-[9px] font-bold text-blue-600 dark:text-blue-400">
                                                {note.author_name ? note.author_name.charAt(0).toUpperCase() : '?'}
                                            </div>
                                            <span className="text-[11px] font-semibold text-gray-800 dark:text-gray-200 line-clamp-1" title={note.author_name}>
                                                {note.author_name || 'Система'}
                                            </span>
                                        </div>
                                        <span className="text-[9px] text-gray-400 font-mono shrink-0 bg-gray-50 dark:bg-[#222] px-1.5 py-0.5 rounded">
                                            {new Date(note.created_at).toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-xs text-gray-600 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
                                            {note.note.replace(/\[DISCONNECT REASON\]\s*/g, '')}
                                        </p>
                                    </div>
                                    {idx === 0 && (
                                        <span className="absolute top-2 right-2 flex h-2 w-2">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                                            <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                                        </span>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Input Area */}
                {canAdd && (
                    <div className="p-4 border-t border-gray-100 dark:border-[#222] bg-white dark:bg-[#111] shadow-[0_-4px_20px_-10px_rgba(0,0,0,0.05)]">
                        <div className="relative group">
                            <textarea
                                value={newNote}
                                onChange={e => setNewNote(e.target.value)}
                                placeholder="Напишите новую заметку..."
                                className="w-full bg-gray-50 dark:bg-[#161616] border border-gray-200 dark:border-[#333] rounded-xl pl-4 pr-12 py-3 text-xs focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:text-white resize-none h-20 transition-all placeholder:text-gray-400"
                                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                            />
                            <button
                                onClick={handleSend}
                                disabled={sending || !newNote.trim()}
                                className="absolute right-3 bottom-3 p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-blue-600/20 active:scale-95 group-focus-within:bg-blue-500"
                                title="Отправить (Enter)"
                            >
                                <Send size={14} className={sending ? 'animate-pulse' : ''} />
                            </button>
                        </div>
                        <div className="mt-2 flex items-center justify-between text-[10px] text-gray-400 px-1">
                            <span>Нажмите Enter для отправки</span>
                            <span className={newNote.length > 0 ? "text-blue-500" : ""}>{newNote.length} симв.</span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

// --- CONFIRM DEACTIVATION MODAL ---
const ConfirmDeactivationModal = ({ country, onClose, onConfirm }) => {
    const [reason, setReason] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const handleConfirm = async () => {
        if (!reason.trim()) return;
        setSubmitting(true);
        await onConfirm(reason);
        setSubmitting(false);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-[#111] w-full max-w-sm rounded-lg shadow-2xl border border-red-200 dark:border-red-900/30 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100 dark:border-[#222] flex items-center justify-between bg-red-50 dark:bg-red-900/10">
                    <span className="font-bold text-sm text-red-600 dark:text-red-400">Отключение: {country.name}</span>
                    <button onClick={onClose} className="p-1.5 hover:bg-red-100 dark:hover:bg-red-900/20 rounded transition-colors text-red-500">
                        <X size={14} />
                    </button>
                </div>
                <div className="p-4">
                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
                        Обязательно укажите причину отключения ГЕО. Эта заметка будет сохранена в истории.
                    </p>
                    <textarea
                        value={reason}
                        onChange={e => setReason(e.target.value)}
                        placeholder="Причина отключения..."
                        className="w-full bg-gray-50 dark:bg-[#1A1A1A] border border-gray-200 dark:border-[#333] rounded-lg p-3 text-xs focus:outline-none focus:border-red-500 dark:text-white resize-none h-24 mb-4"
                        autoFocus
                    />
                    <div className="flex justify-end gap-2">
                        <button onClick={onClose} className="px-3 py-1.5 text-xs font-medium text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors">
                            Отмена
                        </button>
                        <button
                            onClick={handleConfirm}
                            disabled={!reason.trim() || submitting}
                            className="px-3 py-1.5 bg-red-600 text-white text-xs font-bold rounded-md hover:bg-red-700 disabled:opacity-50 transition-colors flex items-center gap-2"
                        >
                            {submitting ? 'Отключение...' : 'Отключить ГЕО'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export const getPaymentColorClass = (method) => {
    if (method.toLowerCase().includes('дроп')) {
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800/50";
    }
    switch (method) {
        case 'Lava': return "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400 border-orange-200 dark:border-orange-800/50";
        case 'JETFEX': return "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400 border-purple-200 dark:border-purple-800/50";
        case 'IBAN': return "bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-400 border-sky-200 dark:border-sky-800/50";
        case 'Прямые реквизиты': return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/50";
        case 'MyFatoorah': return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800/50";
        case 'INSTAPAY': return "bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-400 border-pink-200 dark:border-pink-800/50";
        default: return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300 border-gray-200 dark:border-gray-700/50";
    }
};

// --- PAYMENT CONFIG MODAL ---
const PaymentConfigModal = ({ country, onClose, onSave }) => {
    const [selectedPayments, setSelectedPayments] = useState([]);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (country.payment && Array.isArray(country.payment)) {
            setSelectedPayments(country.payment);
        } else {
            setSelectedPayments([]);
        }
    }, [country]);

    const handleToggle = (method, isMain) => {
        setSelectedPayments(prev => {
            const existing = prev.find(p => p.method === method);
            if (existing) {
                if (existing.type === (isMain ? 'main' : 'additional')) {
                    return prev.filter(p => p.method !== method);
                } else {
                    return prev.map(p => p.method === method ? { ...p, type: isMain ? 'main' : 'additional' } : p);
                }
            } else {
                return [...prev, { method, type: isMain ? 'main' : 'additional' }];
            }
        });
    };

    const handleSave = async () => {
        setSaving(true);
        await onSave(country.code, selectedPayments);
        setSaving(false);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-[#111] w-full max-w-sm rounded-xl shadow-2xl border border-gray-200 dark:border-[#333] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <div className="px-5 py-4 border-b border-gray-100 dark:border-[#222] flex items-center justify-between bg-gray-50/50 dark:bg-[#161616]">
                    <div className="flex items-center gap-3">
                        <span className="text-2xl shadow-sm rounded-md bg-white dark:bg-[#222] p-1">{country.emoji}</span>
                        <div>
                            <h3 className="font-bold text-base text-gray-900 dark:text-white leading-tight">Платежки: {country.name}</h3>
                            <p className="text-[10px] text-gray-500 uppercase tracking-wider font-medium">{country.code}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-200 dark:hover:bg-[#222] rounded-full transition-colors">
                        <X size={16} className="text-gray-400" />
                    </button>
                </div>
                <div className="p-5 max-h-[60vh] overflow-y-auto custom-scrollbar space-y-3">
                    {PAYMENT_METHODS.map(method => {
                        const current = selectedPayments.find(p => p.method === method);
                        const methodColorClass = getPaymentColorClass(method);
                        return (
                            <div key={method} className={`flex items-center justify-between p-2.5 rounded-lg border transition-all ${methodColorClass} ${current ? 'ring-1 ring-current shadow-sm' : 'border-dashed opacity-50 hover:opacity-80 hover:border-solid grayscale-[20%] hover:grayscale-0'}`}>
                                <span className="text-xs font-medium flex items-center gap-2 text-inherit">
                                    {method}
                                </span>
                                <div className="flex items-center gap-3">
                                    <label className="flex items-center gap-1.5 cursor-pointer group">
                                        <input
                                            type="checkbox"
                                            checked={current?.type === 'main'}
                                            onChange={() => handleToggle(method, true)}
                                            className="w-3.5 h-3.5 rounded text-blue-600 focus:ring-blue-500 cursor-pointer bg-white dark:bg-black/20 border-transparent transition-all group-hover:scale-110"
                                        />
                                        <span className={`text-[10px] uppercase font-bold relative top-px ${current?.type === 'main' ? 'opacity-100' : 'opacity-40'}`}>Осн.</span>
                                    </label>
                                    <div className="w-px h-6 bg-current opacity-20"></div>
                                    <label className="flex items-center gap-1.5 cursor-pointer group">
                                        <input
                                            type="checkbox"
                                            checked={current?.type === 'additional'}
                                            onChange={() => handleToggle(method, false)}
                                            className="w-3.5 h-3.5 rounded text-fuchsia-600 focus:ring-fuchsia-500 cursor-pointer bg-white dark:bg-black/20 border-transparent transition-all group-hover:scale-110"
                                        />
                                        <span className={`text-[10px] uppercase font-bold relative top-px ${current?.type === 'additional' ? 'opacity-100' : 'opacity-40'}`}>Доп.</span>
                                    </label>
                                </div>
                            </div>
                        );
                    })}
                </div>
                <div className="p-4 border-t border-gray-100 dark:border-[#222] flex gap-2">
                    <button onClick={onClose} className="flex-1 px-4 py-2 text-xs font-bold text-gray-500 bg-gray-100 dark:bg-[#222] hover:bg-gray-200 dark:hover:bg-[#333] transition-colors rounded-lg">Отмена</button>
                    <button disabled={saving} onClick={handleSave} className="flex-[2] px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors rounded-lg shadow-lg flex items-center justify-center">
                        {saving ? 'Сохранение...' : 'Сохранить'}
                    </button>
                </div>
            </div>
        </div>
    );
};
const GeoMonitoringPage = () => {
    const { countries, trafficStats, channels, user, fetchAllData, managers, schedules, permissions, isLoading, updateGeoPayments, fetchTrafficStats, projects } = useAppStore();

    // Permission check for geo toggle
    const canToggleGeo = useMemo(() => {
        if (!user) return false;
        if (user.role === 'C-level') return true;
        return permissions?.[user.role]?.geo_toggle === true;
    }, [user, permissions]);

    const [activeTab, setActiveTab] = useState('monitoring'); // 'monitoring', 'calendar'

    // --- Active Staff per GEO (schedule-based for Sales, profile-based for SMM/Consultant) ---
    const activeStaffByGeo = useMemo(() => {
        if (!managers) return {};

        const today = toYMD(new Date());
        const result = {};

        // Build manager lookup
        const mgrMap = {};
        managers.forEach(m => { mgrMap[m.id] = m; });

        // === PART 1: Schedule-based detection (Sales roles) ===
        const geoSchedules = {}; // geoCode -> [{date, manager_id}, ...]
        if (schedules) {
            schedules.forEach(s => {
                if (!s.geo_code || !s.date) return;
                const geos = s.geo_code.split(',').map(g => g.trim()).filter(Boolean);
                geos.forEach(geo => {
                    if (!geoSchedules[geo]) geoSchedules[geo] = [];
                    geoSchedules[geo].push({ date: s.date, manager_id: s.manager_id });
                });
            });
        }

        // For each GEO from schedules: take last 4 unique dates, collect managers
        Object.entries(geoSchedules).forEach(([geoCode, entries]) => {
            const pastEntries = entries.filter(e => e.date <= today);
            const uniqueDates = [...new Set(pastEntries.map(e => e.date))]
                .sort((a, b) => b.localeCompare(a))
                .slice(0, 4);

            const recentDates = new Set(uniqueDates);
            const managerShiftCount = {};

            pastEntries.forEach(e => {
                if (recentDates.has(e.date)) {
                    managerShiftCount[e.manager_id] = (managerShiftCount[e.manager_id] || 0) + 1;
                }
            });

            const minShifts = uniqueDates.length <= 2 ? 1 : 2;
            if (!result[geoCode]) result[geoCode] = [];

            Object.entries(managerShiftCount).forEach(([mgrId, count]) => {
                if (count >= minShifts) {
                    const mgr = mgrMap[mgrId];
                    if (mgr) {
                        result[geoCode].push({ id: mgrId, name: mgr.name, role: mgr.role, nick: mgr.telegram_username || '' });
                    }
                }
            });
        });

        // === PART 2: Profile-based detection (all roles) ===
        // This ensures managers manually assigned to a GEO in their profile show up even without past shifts
        managers.forEach(mgr => {
            if (mgr.status === 'inactive') return;

            // Parse manager.geo (can be array or string)
            const mgrGeos = Array.isArray(mgr.geo)
                ? mgr.geo
                : (mgr.geo ? [mgr.geo] : []);

            mgrGeos.forEach(geoCode => {
                if (!geoCode) return;
                if (!result[geoCode]) result[geoCode] = [];

                // Avoid duplicates (in case they also appear in schedules)
                const alreadyAdded = result[geoCode].some(s => String(s.id) === String(mgr.id));
                if (!alreadyAdded) {
                    result[geoCode].push({ id: mgr.id, name: mgr.name, role: mgr.role, nick: mgr.telegram_username || '' });
                }
            });
        });

        // Sort each GEO's staff by role priority
        const rolePriority = { SeniorSales: 0, Sales: 1, SalesTaro: 2, SalesTaroNew: 2, Consultant: 3, SMM: 4 };
        Object.values(result).forEach(staff => {
            staff.sort((a, b) => (rolePriority[a.role] ?? 99) - (rolePriority[b.role] ?? 99));
        });

        return result;
    }, [schedules, managers]);

    const [dateRange, setDateRange] = useState([new Date(), new Date()]);
    const [startDate, endDate] = dateRange;

    // Traffic fetcher — fully independent from store's fetchAllData
    // Builds channelsMap itself and fetches RPC with pagination
    const fetchTrafficDirect = async (from_date, to_date) => {
        try {
            // 1. Get channels (fast — 21 rows)
            const { data: chData } = await supabase.from('channels').select('wazzup_id, country_code');
            if (!chData) return;
            const chMap = {};
            chData.forEach(ch => { chMap[ch.wazzup_id] = ch.country_code; });

            // 2. Paginate RPC
            let all = [], offset = 0;
            const PAGE = 1000;
            while (true) {
                const { data, error } = await supabase
                    .rpc('get_lead_stats_v2', { start_date: from_date, end_date: to_date })
                    .range(offset, offset + PAGE - 1);
                if (error || !data || data.length === 0) break;
                all = all.concat(data);
                if (data.length < PAGE) break;
                offset += PAGE;
            }

            // 3. Build stats
            const stats = {};
            all.forEach(stat => {
                const cc = chMap[stat.channel_id] || 'Other';
                const d = stat.created_date;
                if (!stats[cc]) stats[cc] = {};
                if (!stats[cc][d]) stats[cc][d] = { direct: 0, comments: 0, whatsapp: 0, all: 0 };
                const count = Number(stat.count || 0);
                if (stat.is_whatsapp) stats[cc][d].whatsapp += count;
                else if (stat.is_comment) stats[cc][d].comments += count;
                else stats[cc][d].direct += count;
                stats[cc][d].all += count;
            });

            useAppStore.setState({ trafficStats: stats });
        } catch (e) {
            console.error('fetchTrafficDirect error:', e);
        }
    };

    // Re-fetch whenever the page becomes active (navigation or remount) or dates change
    const location = useLocation();

    useEffect(() => {
        if (!startDate || !endDate) return;
        fetchTrafficDirect(toYMD(startDate), toYMD(endDate));
    }, [location.pathname, startDate?.toDateString(), endDate?.toDateString()]);

    const [search, setSearch] = useState('');
    const [activeProjectFilter, setActiveProjectFilter] = useState(null); // null = all
    const [historyModal, setHistoryModal] = useState(null);
    const [notesModal, setNotesModal] = useState(null); // New state for notes modal
    const [deactivationModal, setDeactivationModal] = useState(null); // New state for deactivation confirms
    const [paymentModal, setPaymentModal] = useState(null); // Modals for payment configuration
    const [toggling, setToggling] = useState(null);
    const [lastNotes, setLastNotes] = useState({}); // geoCode -> last note text

    const handleSavePayments = async (code, selectedPayments) => {
        try {
            // Используем метод из store для мгновенного обновления без ожидания полного fetchAllData
            await updateGeoPayments(code, selectedPayments);
            showToast('Способы оплаты обновлены', 'success');
            setPaymentModal(null);
        } catch (err) {
            console.error('Update error:', err);
            showToast(`Ошибка: ${err.message}`, 'error');
        }
    };

    // Load last notes for all countries on mount
    const [notesLoaded, setNotesLoaded] = useState(false);
    useMemo(async () => {
        if (!countries.length || notesLoaded) return;
        const map = {};
        // Ideally fetch all last notes in one query, but for now loop 
        // (Optimization: replace with single RPC or view later if slow)
        await Promise.all(countries.map(async c => {
            const notes = await fetchGeoNotes(c.code);
            if (notes.length > 0) map[c.code] = notes[0].note;
        }));
        setLastNotes(map);
        setNotesLoaded(true);
    }, [countries.length]);

    const refreshNote = async (geoCode) => {
        const notes = await fetchGeoNotes(geoCode);
        if (notes.length > 0) {
            setLastNotes(prev => ({ ...prev, [geoCode]: notes[0].note }));
        }
    };

    const resetDate = () => setDateRange([new Date(), new Date()]);

    // --- Compute traffic per country ---
    const geoData = useMemo(() => {
        const startStr = startDate ? toYMD(startDate) : toYMD(new Date());
        const endStr = endDate ? toYMD(endDate) : toYMD(new Date());

        return countries.map(country => {
            let trafficCount = 0;
            const geoTraffic = trafficStats[country.code];
            if (geoTraffic) {
                Object.entries(geoTraffic).forEach(([dateStr, val]) => {
                    if (dateStr >= startStr && dateStr <= endStr) {
                        trafficCount += typeof val === 'object' ? (val.all || 0) : (Number(val) || 0);
                    }
                });
            }

            let lastTrafficDate = null;
            if (trafficCount === 0 && geoTraffic) {
                const dates = Object.keys(geoTraffic)
                    .filter(d => { const v = geoTraffic[d]; return (typeof v === 'object' ? (v.all || 0) : (Number(v) || 0)) > 0; })
                    .sort((a, b) => b.localeCompare(a));
                if (dates.length > 0) lastTrafficDate = dates[0];
            }

            const staff = activeStaffByGeo[country.code] || [];

            // Last deactivation date from status_history
            let lastDeactivated = null;
            const history = Array.isArray(country.status_history) ? country.status_history : [];
            for (let i = history.length - 1; i >= 0; i--) {
                if (history[i].action === 'deactivated' && history[i].at) {
                    const d = new Date(history[i].at);
                    lastDeactivated = toYMD(d);
                    break;
                }
            }

            return { ...country, isActive: country.is_active !== false, trafficCount, lastTrafficDate, staff, lastDeactivated };
        });
    }, [countries, trafficStats, channels, startDate, endDate, activeStaffByGeo]);

    // --- Filter & Sort ---
    const sortedGeos = useMemo(() => {
        let filtered = geoData;
        if (search) {
            const q = search.toLowerCase();
            filtered = filtered.filter(g => g.name.toLowerCase().includes(q) || g.code.toLowerCase().includes(q));
        }
        if (activeProjectFilter) {
            filtered = filtered.filter(g => g.project_id === activeProjectFilter);
        }
        return filtered.sort((a, b) => {
            if (a.isActive !== b.isActive) return a.isActive ? -1 : 1;
            
            const pA = projects.find(p => p.id === a.project_id)?.name || '';
            const pB = projects.find(p => p.id === b.project_id)?.name || '';
            const pALower = pA.toLowerCase();
            const pBLower = pB.toLowerCase();
            
            const isAstroA = pALower.includes('astrology') || pALower.includes('астро');
            const isAstroB = pBLower.includes('astrology') || pBLower.includes('астро');
            
            if (isAstroA && !isAstroB) return -1;
            if (!isAstroA && isAstroB) return 1;

            if (pA !== pB) return pA.localeCompare(pB);

            return a.name.localeCompare(b.name);
        });
    }, [geoData, search, activeProjectFilter, projects]);

    // --- Toggle ---
    const handleToggleClick = (geo) => {
        if (geo.isActive) {
            // Deactivating -> Require note
            setDeactivationModal(geo);
        } else {
            // Activating -> Direct toggle
            performToggle(geo, true);
        }
    };

    const performToggle = async (geo, newStatus, reason = null) => {
        setToggling(geo.code);
        try {
            // 1. Toggle Status
            await toggleGeoStatus(geo.code, newStatus, user?.name || 'Unknown');

            // 2. If deactivating, add note
            if (!newStatus && reason) {
                await addGeoNote(geo.code, reason, user?.name || 'Unknown', user?.id);
                await refreshNote(geo.code);
            }

            await fetchAllData(true);
            showToast(`${geo.name} ${newStatus ? 'активирован' : 'деактивирован'}`, 'success');
            setDeactivationModal(null);
        } catch (err) {
            console.error('Toggle error:', err);
            showToast(`Ошибка: ${err.message}`, 'error');
        }
        finally { setToggling(null); }
    };

    // --- Shift editing ---
    const [editingShift, setEditingShift] = useState(null); // { code, start, end }

    const handleShiftSave = async (code) => {
        if (!editingShift) return;
        try {
            await updateGeoShift(code, editingShift.start + ':00', editingShift.end + ':00');
            showToast('Время смены обновлено', 'success');
            setEditingShift(null);
            fetchAllData(true);
        } catch (e) {
            console.error('Error saving shift:', e);
            showToast('Ошибка сохранения: ' + e.message, 'error');
        }
    };

    const tableScrollRef = useRef(null);
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(true);

    const updateScrollState = useCallback(() => {
        const el = tableScrollRef.current;
        if (!el) return;
        setCanScrollLeft(el.scrollLeft > 0);
        setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
    }, []);

    const scrollTable = useCallback((dir) => {
        const el = tableScrollRef.current;
        if (!el) return;
        el.scrollBy({ left: dir * 300, behavior: 'smooth' });
    }, []);

    // --- Summary ---
    const activeCount = geoData.filter(g => g.isActive).length;
    const inactiveCount = geoData.filter(g => !g.isActive).length;
    const totalTraffic = geoData.reduce((s, g) => s + g.trafficCount, 0);

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center py-20 m-4 bg-white dark:bg-[#111] border border-gray-200 dark:border-[#333] rounded-lg shadow-sm">
                <RefreshCw size={28} className="text-blue-500 animate-spin mb-3" />
                <p className="text-gray-500 dark:text-gray-400 font-medium text-sm">Загрузка данных...</p>
            </div>
        );
    }

    return (
        <div className="p-4 max-w-[1600px] mx-auto font-sans text-gray-900 dark:text-gray-100">

            {/* Header */}
            <div className="flex items-center justify-between mb-4 border-b border-gray-200 dark:border-[#333] pb-4">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
                        <Globe size={16} className="text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                        <h1 className="text-lg font-bold leading-tight">ГЕО / Проекты</h1>
                        <p className="text-xs text-gray-500">
                            Активные: <span className="text-emerald-600 font-bold">{activeCount}</span> · Неактивные: <span className="text-red-500 font-bold">{inactiveCount}</span> · Трафик: <span className="font-bold">{totalTraffic.toLocaleString()}</span>
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <div className="relative">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={12} />
                        <input
                            type="text"
                            placeholder="Поиск..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="bg-white dark:bg-[#111] border border-gray-200 dark:border-[#333] pl-8 pr-3 py-0.5 rounded-[6px] text-xs h-[34px] focus:outline-none focus:border-blue-500 dark:text-white w-36 transition-all"
                        />
                    </div>
                    <DateRangePicker startDate={startDate} endDate={endDate} onChange={setDateRange} onReset={resetDate} />
                </div>
            </div>

            {/* TABS + PROJECT FILTER */}
            <div className="flex items-center justify-between gap-2 mb-4 flex-wrap">
                <div className="flex bg-gray-100 dark:bg-[#161616] p-1 rounded-lg">
                    <button
                        onClick={() => setActiveTab('monitoring')}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${activeTab === 'monitoring'
                            ? 'bg-white dark:bg-[#222] text-gray-900 dark:text-white shadow-sm'
                            : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                            }`}
                    >
                        <List size={14} />
                        Мониторинг
                    </button>
                    <button
                        onClick={() => setActiveTab('calendar')}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${activeTab === 'calendar'
                            ? 'bg-white dark:bg-[#222] text-gray-900 dark:text-white shadow-sm'
                            : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                            }`}
                    >
                        <LayoutGrid size={14} />
                        Календарь блокировок
                    </button>
                </div>

                {/* Project filter pills + scroll arrows */}
                <div className="flex items-center gap-1.5 flex-wrap">
                    {projects.length > 0 && (
                        <>
                            <button
                                onClick={() => setActiveProjectFilter(null)}
                                className={`px-3 py-1 rounded-full text-[11px] font-semibold transition-all border ${activeProjectFilter === null
                                    ? 'bg-gray-800 dark:bg-white text-white dark:text-gray-900 border-transparent'
                                    : 'bg-white dark:bg-[#111] text-gray-500 border-gray-200 dark:border-[#333] hover:border-gray-400'
                                }`}
                            >
                                Все проекты
                            </button>
                            {projects.map(p => {
                                const isActive = activeProjectFilter === p.id;
                                const dotColors = {
                                    blue: 'bg-blue-500', purple: 'bg-purple-500', green: 'bg-emerald-500',
                                    orange: 'bg-orange-500', red: 'bg-red-500', pink: 'bg-pink-500',
                                    yellow: 'bg-yellow-500', cyan: 'bg-cyan-500'
                                };
                                return (
                                    <button
                                        key={p.id}
                                        onClick={() => setActiveProjectFilter(isActive ? null : p.id)}
                                        className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold transition-all border ${isActive
                                            ? 'bg-gray-800 dark:bg-white text-white dark:text-gray-900 border-transparent'
                                            : 'bg-white dark:bg-[#111] text-gray-500 border-gray-200 dark:border-[#333] hover:border-gray-400'
                                        }`}
                                    >
                                        <span className={`w-1.5 h-1.5 rounded-full ${dotColors[p.color] || 'bg-blue-500'}`} />
                                        {p.name}
                                    </button>
                                );
                            })}
                        </>
                    )}

                    {/* Scroll arrows — only in monitoring tab */}
                    {activeTab === 'monitoring' && (
                        <div className="flex items-center gap-1 ml-1">
                            <button
                                onClick={() => scrollTable(-1)}
                                disabled={!canScrollLeft}
                                className={`w-7 h-7 flex items-center justify-center rounded-md border transition-all duration-150 ${
                                    canScrollLeft
                                        ? 'border-gray-200 dark:border-[#333] bg-white dark:bg-[#1E2026] text-gray-600 dark:text-gray-300 hover:border-gray-400 dark:hover:border-gray-500 hover:text-gray-900 dark:hover:text-white cursor-pointer'
                                        : 'border-gray-100 dark:border-[#222] bg-gray-50 dark:bg-[#161616] text-gray-300 dark:text-[#444] cursor-default'
                                }`}
                            >
                                <ChevronLeft size={14} />
                            </button>
                            <button
                                onClick={() => scrollTable(1)}
                                disabled={!canScrollRight}
                                className={`w-7 h-7 flex items-center justify-center rounded-md border transition-all duration-150 ${
                                    canScrollRight
                                        ? 'border-gray-200 dark:border-[#333] bg-white dark:bg-[#1E2026] text-gray-600 dark:text-gray-300 hover:border-gray-400 dark:hover:border-gray-500 hover:text-gray-900 dark:hover:text-white cursor-pointer'
                                        : 'border-gray-100 dark:border-[#222] bg-gray-50 dark:bg-[#161616] text-gray-300 dark:text-[#444] cursor-default'
                                }`}
                            >
                                <ChevronRight size={14} />
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {activeTab === 'monitoring' ? (
                /* Table */
                <div>
                    <div
                        ref={tableScrollRef}
                        onScroll={updateScrollState}
                        className="border border-gray-200 dark:border-[#333] rounded-lg overflow-x-auto"
                    >
                  <table className="w-full border-collapse text-xs">
                    <thead>
                        <tr className="bg-gray-50 dark:bg-[#161616] border-b border-gray-200 dark:border-[#333]">
                            <th className="px-4 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider text-left whitespace-nowrap min-w-[200px]">ГЕО</th>
                            <th className="px-4 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider text-left whitespace-nowrap">Статус</th>
                            <th className="px-4 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider text-left whitespace-nowrap">Смена (UTC)</th>
                            <th className="px-4 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider text-left whitespace-nowrap">Трафик</th>
                            <th className="px-4 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider text-left whitespace-nowrap">Платежка</th>
                            <th className="px-4 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider text-left whitespace-nowrap">Sales</th>
                            <th className="px-4 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider text-left whitespace-nowrap">Consultant</th>
                            <th className="px-4 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider text-left whitespace-nowrap">SMM</th>
                            <th className="px-4 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider text-left whitespace-nowrap">Отключено (дата)</th>
                            <th className="px-4 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider text-left whitespace-nowrap">История заметок</th>
                            <th className="px-4 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider text-right whitespace-nowrap">Действия</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-[#111] divide-y divide-gray-100 dark:divide-[#222]">
                        {sortedGeos.map((geo, index) => {
                            const isToggling = toggling === geo.code;
                            const project = projects.find(p => p.id === geo.project_id);
                            const projName = project?.name?.toLowerCase() || '';
                            
                            let rowBgClass = 'hover:bg-gray-50 dark:hover:bg-[#1A1A1A]';
                            if (projName.includes('органика') || projName.includes('organic')) {
                                rowBgClass = 'bg-amber-50/30 dark:bg-amber-900/10 hover:bg-amber-50/60 dark:hover:bg-amber-900/20';
                            } else if (projName.includes('таро') || projName.includes('taro')) {
                                rowBgClass = 'bg-fuchsia-50/40 dark:bg-fuchsia-900/10 hover:bg-fuchsia-50/80 dark:hover:bg-fuchsia-900/20';
                            }

                            // Determine if we crossed a project boundary
                            const prevGeo = index > 0 ? sortedGeos[index - 1] : null;
                            const prevProject = prevGeo ? projects.find(p => p.id === prevGeo.project_id) : null;
                            const isNewProjectGroup = index > 0 && prevGeo.isActive === geo.isActive && project?.name !== prevProject?.name;

                            return (
                                <tr
                                    key={geo.code}
                                    className={`text-xs transition-colors ${isNewProjectGroup ? 'border-t-[3px] border-t-gray-200 dark:border-t-[#333]' : ''} ${geo.isActive
                                        ? rowBgClass
                                        : 'opacity-60 hover:opacity-90 hover:bg-red-50/30 dark:hover:bg-red-900/5'
                                        }`}
                                >
                                    {/* GEO Name */}
                                    <td className="px-4 py-2.5 align-top whitespace-nowrap">
                                        <div className="relative flex min-h-[64px] items-center gap-3 overflow-hidden rounded-xl border border-white/10 bg-[#0b0b0b] px-3 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
                                            <div className="relative z-10 flex items-center gap-3">
                                                <div className="flex h-[26px] w-[38px] shrink-0 items-center justify-center overflow-hidden rounded-[6px] border border-white/15 bg-black/30 shadow-sm">
                                                    <CountryFlagIcon
                                                        code={geo.code}
                                                        emoji={geo.emoji}
                                                        name={geo.name}
                                                        imgClassName="h-full w-full object-cover"
                                                        fallbackClassName="text-[24px] leading-none"
                                                    />
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="font-bold text-white whitespace-nowrap">{geo.name}</span>
                                                        <span className="text-[10px] font-mono text-gray-400 whitespace-nowrap">{geo.code}</span>
                                                    </div>
                                                    <div className="mt-1.5">
                                                        {(() => {
                                                            const proj = projects.find(p => p.id === geo.project_id);
                                                            return proj ? <ProjectBadge project={proj} size="xs" /> : null;
                                                        })()}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </td>

                                    {/* Status */}
                                    <td className="px-4 py-2.5 align-top whitespace-nowrap">
                                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold ${geo.isActive
                                            ? 'bg-emerald-100 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400'
                                            : 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400'
                                            }`}>
                                            {geo.isActive ? <Power size={9} /> : <PowerOff size={9} />}
                                            {geo.isActive ? 'Активно' : 'Не активно'}
                                        </span>
                                    </td>

                                    {/* Shift Times */}
                                    <td className="px-4 py-2.5 align-top whitespace-nowrap">
                                        {editingShift?.code === geo.code ? (
                                            <div className="flex items-center gap-1">
                                                <input
                                                    type="time"
                                                    value={editingShift.start}
                                                    onChange={e => setEditingShift(prev => ({ ...prev, start: e.target.value }))}
                                                    className="bg-white dark:bg-[#0A0A0A] border border-blue-400 rounded px-1 py-0.5 text-[10px] font-mono w-[62px] focus:outline-none"
                                                />
                                                <span className="text-gray-400 text-[9px]">—</span>
                                                <input
                                                    type="time"
                                                    value={editingShift.end}
                                                    onChange={e => setEditingShift(prev => ({ ...prev, end: e.target.value }))}
                                                    className="bg-white dark:bg-[#0A0A0A] border border-blue-400 rounded px-1 py-0.5 text-[10px] font-mono w-[62px] focus:outline-none"
                                                />
                                                <button
                                                    onClick={() => handleShiftSave(geo.code)}
                                                    className="text-blue-500 hover:text-blue-700 text-[10px] font-bold ml-0.5"
                                                    title="Сохранить"
                                                >✓</button>
                                                <button
                                                    onClick={() => setEditingShift(null)}
                                                    className="text-gray-400 hover:text-red-500 text-[10px] font-bold"
                                                    title="Отмена"
                                                >✕</button>
                                            </div>
                                        ) : (
                                            <button
                                                onClick={() => canToggleGeo && setEditingShift({
                                                    code: geo.code,
                                                    start: geo.shift_start?.slice(0, 5) || '09:00',
                                                    end: geo.shift_end?.slice(0, 5) || '18:00'
                                                })}
                                                className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${canToggleGeo ? 'hover:bg-blue-50 dark:hover:bg-blue-900/20 cursor-pointer' : 'cursor-default'} text-gray-600 dark:text-gray-400 transition-colors`}
                                                title={canToggleGeo ? 'Нажмите чтобы изменить' : ''}
                                            >
                                                <Clock size={9} className="inline mr-1 opacity-50" />
                                                {geo.shift_start?.slice(0, 5) || '—'} – {geo.shift_end?.slice(0, 5) || '—'}
                                            </button>
                                        )}
                                    </td>

                                    {/* Traffic */}
                                    <td className="px-4 py-2.5 align-top whitespace-nowrap">
                                        <div className="flex items-center gap-1.5">
                                            {geo.trafficCount > 0 ? (
                                                <>
                                                    <TrendingUp size={12} className="text-blue-500" />
                                                    <span className="font-bold text-blue-600 dark:text-blue-400">{geo.trafficCount.toLocaleString()}</span>
                                                </>
                                            ) : (
                                                <span className="text-gray-400">0</span>
                                            )}
                                        </div>
                                    </td>

                                    {/* Payments Column */}
                                    <td className="px-4 py-2.5 align-top">
                                        <div
                                            onClick={() => canToggleGeo && setPaymentModal(geo)}
                                            className={`flex flex-col gap-1 ${canToggleGeo ? 'cursor-pointer hover:bg-gray-50 dark:hover:bg-[#1A1A1A] p-1.5 -m-1.5 rounded-lg transition-colors' : ''}`}
                                            title={canToggleGeo ? 'Нажмите для настройки' : ''}
                                        >
                                            {geo.payment && Array.isArray(geo.payment) && geo.payment.length > 0 ? (
                                                <div className="flex flex-col gap-1.5 w-max">
                                                    {geo.payment.filter(p => p.type === 'main').length > 0 && (
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-[10px] text-amber-600 dark:text-amber-500 font-extrabold uppercase tracking-wider whitespace-nowrap">Основная </span>
                                                            <div className="flex items-center gap-1">
                                                                {geo.payment.filter(p => p.type === 'main').map((p, idx) => (
                                                                    <span key={`${geo.code}-main-${idx}`} className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold whitespace-nowrap ring-1 ring-amber-500/50 shadow-[0_0_8px_rgba(245,158,11,0.25)] dark:shadow-[0_0_8px_rgba(245,158,11,0.15)] ${getPaymentColorClass(p.method)}`}>
                                                                        {p.method}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                    {geo.payment.filter(p => p.type === 'additional').length > 0 && (
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-[10px] text-gray-500 dark:text-gray-500 font-medium whitespace-nowrap">Дополнительные -</span>
                                                            <div className="flex items-center gap-1 opacity-80 hover:opacity-100 transition-opacity">
                                                                {geo.payment.filter(p => p.type === 'additional').map((p, idx) => (
                                                                    <span key={`${geo.code}-add-${idx}`} className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium whitespace-nowrap ${getPaymentColorClass(p.method)}`}>
                                                                        {p.method}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            ) : (
                                                <span className="text-xs text-gray-400 font-medium whitespace-nowrap flex items-center gap-1">
                                                    <DollarSign size={12} className="opacity-50" />
                                                    Не задано
                                                </span>
                                            )}
                                        </div>
                                    </td>

                                    {/* Sales */}
                                    <td className="px-4 py-2.5 align-top">
                                        <div className="flex flex-wrap gap-1">
                                            {geo.staff.filter(s => ['Sales', 'SeniorSales', 'SalesTaro', 'SalesTaroNew'].includes(s.role)).length > 0 ? (
                                                geo.staff.filter(s => ['Sales', 'SeniorSales', 'SalesTaro', 'SalesTaroNew'].includes(s.role)).map(s => {
                                                    const roleColors = {
                                                        SeniorSales: 'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400',
                                                        Sales: 'bg-sky-100 dark:bg-sky-900/20 text-sky-700 dark:text-sky-400',
                                                        SalesTaro: 'bg-purple-100 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400',
                                                        SalesTaroNew: 'bg-purple-100 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400',
                                                    };
                                                    const color = roleColors[s.role] || 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400';
                                                    const roleShort = { SeniorSales: 'Sr', Sales: 'S', SalesTaro: 'T', SalesTaroNew: 'TN' };
                                                    return (
                                                        <span key={s.id} className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium whitespace-nowrap ${color}`} title={`${s.name} (${s.role})`}>
                                                            <span className="font-bold text-[8px] opacity-60">{roleShort[s.role] || s.role}</span>
                                                            {s.name}
                                                            {s.nick && <span className="text-[9px] opacity-50 cursor-pointer hover:opacity-100 transition-opacity" onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(s.nick.startsWith('@') ? s.nick : '@' + s.nick); const el = e.currentTarget; el.textContent = '✓'; setTimeout(() => { el.textContent = '@' + s.nick.replace('@', ''); }, 800); }} title="Нажмите чтобы скопировать">@{s.nick.replace('@', '')}</span>}
                                                        </span>
                                                    );
                                                })
                                            ) : (
                                                <span className="text-[10px] text-gray-400">—</span>
                                            )}
                                        </div>
                                    </td>

                                    {/* Consultant */}
                                    <td className="px-4 py-2.5 align-top">
                                        <div className="flex flex-wrap gap-1">
                                            {geo.staff.filter(s => s.role === 'Consultant').length > 0 ? (
                                                geo.staff.filter(s => s.role === 'Consultant').map(s => (
                                                    <span key={s.id} className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium whitespace-nowrap bg-amber-100 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400" title={s.name}>
                                                        {s.name}
                                                        {s.nick && <span className="text-[9px] opacity-50 cursor-pointer hover:opacity-100 transition-opacity" onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(s.nick.startsWith('@') ? s.nick : '@' + s.nick); const el = e.currentTarget; el.textContent = '✓'; setTimeout(() => { el.textContent = '@' + s.nick.replace('@', ''); }, 800); }} title="Нажмите чтобы скопировать">@{s.nick.replace('@', '')}</span>}
                                                    </span>
                                                ))
                                            ) : (
                                                <span className="text-[10px] text-gray-400">—</span>
                                            )}
                                        </div>
                                    </td>

                                    {/* SMM */}
                                    <td className="px-4 py-2.5 align-top">
                                        <div className="flex flex-wrap gap-1">
                                            {geo.staff.filter(s => s.role === 'SMM').length > 0 ? (
                                                geo.staff.filter(s => s.role === 'SMM').map(s => (
                                                    <span key={s.id} className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium whitespace-nowrap bg-rose-100 dark:bg-rose-900/20 text-rose-700 dark:text-rose-400" title={`${s.name} (${s.role})`}>
                                                        {s.name}
                                                        {s.nick && <span className="text-[9px] opacity-50 cursor-pointer hover:opacity-100 transition-opacity" onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(s.nick.startsWith('@') ? s.nick : '@' + s.nick); const el = e.currentTarget; el.textContent = '✓'; setTimeout(() => { el.textContent = '@' + s.nick.replace('@', ''); }, 800); }} title="Нажмите чтобы скопировать">@{s.nick.replace('@', '')}</span>}
                                                    </span>
                                                ))
                                            ) : (
                                                <span className="text-[10px] text-gray-400">—</span>
                                            )}
                                        </div>
                                    </td>

                                    {/* Last Deactivation Date */}
                                    <td className="px-4 py-2.5 align-top whitespace-nowrap">
                                        <div className="flex items-center gap-1.5 text-gray-500">
                                            {geo.lastDeactivated ? (
                                                <>
                                                    <PowerOff size={10} className="text-red-400" />
                                                    <span className="text-[10px] font-mono">{formatDateShort(geo.lastDeactivated)}</span>
                                                </>
                                            ) : (
                                                <span className="text-[10px] text-gray-400">—</span>
                                            )}
                                        </div>
                                    </td>

                                    {/* Notes Summary */}
                                    <td className="px-4 py-2.5 align-top max-w-[200px]">
                                        <button
                                            onClick={() => setNotesModal(geo)}
                                            className="text-left w-full group"
                                        >
                                            {lastNotes[geo.code] ? (
                                                <div className="flex items-start gap-1">
                                                    <MessageSquare size={10} className="mt-0.5 text-blue-500 shrink-0" />
                                                    <span className="text-xs text-gray-600 dark:text-gray-300 line-clamp-2 leading-tight group-hover:text-blue-500 transition-colors">
                                                        {lastNotes[geo.code].replace(/\[DISCONNECT REASON\]\s*/g, '')}
                                                    </span>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-1 text-gray-300 dark:text-gray-700 group-hover:text-gray-400 transition-colors">
                                                    <MessageSquare size={10} />
                                                    <span className="text-xs whitespace-nowrap">Нет заметок</span>
                                                </div>
                                            )}
                                        </button>
                                    </td>

                                    {/* Actions */}
                                    <td className="px-4 py-2.5 align-top">
                                        <div className="flex items-center gap-1 justify-end">
                                            <button
                                                onClick={() => setHistoryModal(geo)}
                                                className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#333] rounded-md transition-colors"
                                                title="История"
                                            >
                                                <History size={13} />
                                            </button>
                                            {canToggleGeo && (
                                                <button
                                                    onClick={() => handleToggleClick(geo)}
                                                    disabled={isToggling}
                                                    className={`p-1.5 rounded-md transition-colors ${geo.isActive
                                                        ? 'text-emerald-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20'
                                                        : 'text-red-500 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20'
                                                        } ${isToggling ? 'animate-pulse cursor-wait' : ''}`}
                                                    title={geo.isActive ? 'Отключить' : 'Включить'}
                                                >
                                                    {geo.isActive ? <Power size={13} /> : <PowerOff size={13} />}
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}

                        {sortedGeos.length === 0 && (
                            <tr><td colSpan={11} className="p-6 text-center text-xs text-gray-400">Нет ГЕО локаций</td></tr>
                        )}
                    </tbody>
                  </table>
                    </div>
                </div>
            ) : (
                <GeoCalendarView countries={sortedGeos} />
            )}


            {/* History Modal */}
            {historyModal && <HistoryModal country={historyModal} onClose={() => setHistoryModal(null)} />}

            {/* Notes Modal */}
            {notesModal && <NotesModal country={notesModal} onClose={() => setNotesModal(null)} user={user} onNoteAdded={() => refreshNote(notesModal.code)} />}

            {/* Payment Modal */}
            {paymentModal && <PaymentConfigModal country={paymentModal} onClose={() => setPaymentModal(null)} onSave={handleSavePayments} />}

            {/* Deactivation Confirm Modal */}
            {deactivationModal && <ConfirmDeactivationModal country={deactivationModal} onClose={() => setDeactivationModal(null)} onConfirm={(reason) => performToggle(deactivationModal, false, reason)} />}
        </div>
    );
};

export default GeoMonitoringPage;
