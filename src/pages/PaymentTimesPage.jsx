import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useAppStore } from '../store/appStore';
import {
    Filter, RotateCcw, X,
    Users, Calendar as CalendarIcon,
    Clock, ChevronDown, ChevronUp, MessageCircle, MessageSquare, Phone, Percent, List, AlignJustify
} from 'lucide-react';

// --- CONFIGURATION ---
const FLAGS = {
    UA: '🇺🇦', PL: '🇵🇱', IT: '🇮🇹', HR: '🇭🇷',
    BG: '🇧🇬', CZ: '🇨🇿', RO: '🇷🇴', LT: '🇱🇹',
    TR: '🇹🇷', FR: '🇫🇷', PT: '🇵🇹', DE: '🇩🇪',
    US: '🇺🇸', ES: '🇪🇸', SK: '🇸🇰', HU: '🇭🇺',
    KZ: '🇰🇿', UZ: '🇺🇿', MD: '🇲🇩'
};
const getFlag = (code) => FLAGS[code] || '🏳️';

const getLastWeekRange = () => {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - 7);
    return [start, end];
};

const toYMD = (date) => {
    if (!date) return '';
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
};

// --- REUSED COMPONENTS (Selects, DatePickers) ---
const MobileSelect = ({ label, value, options, onChange }) => {
    const [isOpen, setIsOpen] = useState(false);
    const handleSelect = (val) => { onChange(val); setIsOpen(false); };
    return (
        <div className="relative w-full">
            <button type="button" onClick={() => setIsOpen(!isOpen)} className="w-full bg-white dark:bg-[#111] border border-gray-200 dark:border-[#333] text-gray-700 dark:text-gray-200 py-1.5 px-3 rounded-[6px] text-xs font-medium hover:border-gray-400 dark:hover:border-[#555] transition-colors text-left flex justify-between items-center">
                <span className={value ? '' : 'text-gray-400'}>{value || label}</span>
                <Filter size={10} className="shrink-0 ml-2" />
            </button>
            {isOpen && (
                <>
                    <div className="fixed inset-0 z-[60]" onClick={() => setIsOpen(false)} />
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-[#111] border border-gray-200 dark:border-[#333] rounded-lg shadow-lg max-h-60 overflow-y-auto z-[70]">
                        <button onClick={() => handleSelect('')} className={`w-full px-3 py-2 text-left text-xs hover:bg-gray-100 dark:hover:bg-[#222] transition-colors ${!value ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-bold' : ''}`}>{label}</button>
                        {options.map(opt => (
                            <button key={opt} onClick={() => handleSelect(opt)} className={`w-full px-3 py-2 text-left text-xs hover:bg-gray-100 dark:hover:bg-[#222] transition-colors ${value === opt ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-bold' : ''}`}>{opt}</button>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
};

const DesktopSelect = ({ label, value, options, onChange }) => (
    <div className="relative group w-full sm:w-auto flex-1 sm:flex-none min-w-[100px]">
        <select value={value} onChange={(e) => onChange(e.target.value)} className="w-full appearance-none bg-white dark:bg-[#111] border border-gray-200 dark:border-[#333] text-gray-700 dark:text-gray-200 py-1.5 pl-2 pr-6 rounded-[6px] text-xs font-medium focus:outline-none focus:border-blue-500 hover:border-gray-400 dark:hover:border-[#555] transition-colors cursor-pointer">
            <option value="">{label}</option>
            {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
        </select>
        <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400"><Filter size={10} /></div>
    </div>
);

const DenseSelect = (props) => (
    <>
        <div className="md:hidden w-full"><MobileSelect {...props} /></div>
        <div className="hidden md:block"><DesktopSelect {...props} /></div>
    </>
);

const MobileDateRangePicker = ({ startDate, endDate, onChange, onReset }) => {
    const formatDate = (date) => { if (!date) return ''; const y = date.getFullYear(); const m = String(date.getMonth() + 1).padStart(2, '0'); const d = String(date.getDate()).padStart(2, '0'); return `${y}-${m}-${d}`; };
    const parseDate = (str) => { if (!str) return null; const [year, month, day] = str.split('-'); return new Date(parseInt(year), parseInt(month) - 1, parseInt(day)); };
    const [isOpen, setIsOpen] = useState(false);
    const displayText = () => { if (!startDate && !endDate) return 'Период'; if (!startDate) return `По ${endDate.toLocaleDateString('ru-RU')}`; if (!endDate) return `С ${startDate.toLocaleDateString('ru-RU')}`; return `${startDate.toLocaleDateString('ru-RU')} - ${endDate.toLocaleDateString('ru-RU')}`; };
    return (
        <div className="relative w-full">
            <button type="button" onClick={() => setIsOpen(!isOpen)} className="w-full bg-white dark:bg-[#111] border border-gray-200 dark:border-[#333] text-gray-700 dark:text-gray-200 py-1.5 px-3 rounded-[6px] text-xs font-medium hover:border-gray-400 dark:hover:border-[#555] transition-colors text-left flex justify-between items-center h-[34px]">
                <CalendarIcon size={12} className="shrink-0 mr-2 text-gray-400" />
                <span className={`flex-1 ${!startDate && !endDate ? 'text-gray-400' : ''}`}>{displayText()}</span>
                <RotateCcw size={12} className="shrink-0 ml-2 text-gray-400 hover:text-red-500 transition-colors" onClick={(e) => { e.stopPropagation(); onReset(); }} />
            </button>
            {isOpen && (
                <>
                    <div className="fixed inset-0 z-[60]" onClick={() => setIsOpen(false)} />
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-[#111] border border-gray-200 dark:border-[#333] rounded-lg shadow-lg p-3 z-[70]">
                        <div className="space-y-2">
                            <div><label className="text-xs text-gray-500 block mb-1">От</label><input type="date" value={formatDate(startDate)} onChange={(e) => onChange([parseDate(e.target.value), endDate])} className="w-full bg-white dark:bg-[#0A0A0A] border border-gray-200 dark:border-[#333] rounded px-2 py-1.5 text-xs text-gray-700 dark:text-gray-200" /></div>
                            <div><label className="text-xs text-gray-500 block mb-1">До</label><input type="date" value={formatDate(endDate)} onChange={(e) => onChange([startDate, parseDate(e.target.value)])} className="w-full bg-white dark:bg-[#0A0A0A] border border-gray-200 dark:border-[#333] rounded px-2 py-1.5 text-xs text-gray-700 dark:text-gray-200" /></div>
                            <button onClick={() => setIsOpen(false)} className="w-full bg-blue-500 hover:bg-blue-600 text-white rounded px-3 py-1.5 text-xs font-bold transition-colors">Применить</button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

const CustomDateRangePicker = ({ startDate, endDate, onChange, onReset }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [viewDate, setViewDate] = useState(startDate || new Date());
    const [selecting, setSelecting] = useState('start');
    const DAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
    const MONTHS = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
    const formatDate = (date) => { if (!date) return ''; const d = String(date.getDate()).padStart(2, '0'); const m = String(date.getMonth() + 1).padStart(2, '0'); const y = date.getFullYear(); return `${d}.${m}.${y}`; };
    const isSameDay = (d1, d2) => d1 && d2 && d1.toDateString() === d2.toDateString();
    const isInRange = (date) => startDate && endDate && date >= startDate && date <= endDate;
    const handleDayClick = (day) => { const clickedDate = new Date(viewDate.getFullYear(), viewDate.getMonth(), day); if (selecting === 'start') { onChange([clickedDate, null]); setSelecting('end'); } else { if (clickedDate < startDate) onChange([clickedDate, startDate]); else onChange([startDate, clickedDate]); setSelecting('start'); setIsOpen(false); } };
    const displayText = () => { if (startDate && endDate) return `${formatDate(startDate)} - ${formatDate(endDate)}`; if (startDate) return `${formatDate(startDate)} - ...`; return 'Период'; };
    const getDaysInMonth = (y, m) => new Date(y, m + 1, 0).getDate();
    const getFirstDayOfMonth = (y, m) => { const d = new Date(y, m, 1).getDay(); return d === 0 ? 6 : d - 1; };
    const setYesterday = () => { const y = new Date(); y.setDate(y.getDate() - 1); onChange([y, y]); setIsOpen(false); };
    const setToday = () => { onChange([new Date(), new Date()]); setIsOpen(false); };
    const setLastWeek = () => { const today = new Date(); const dayOfWeek = today.getDay(); const thisMonday = new Date(today); thisMonday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1)); const lastMonday = new Date(thisMonday); lastMonday.setDate(thisMonday.getDate() - 7); const lastSunday = new Date(lastMonday); lastSunday.setDate(lastMonday.getDate() + 6); onChange([lastMonday, lastSunday]); setIsOpen(false); };
    const setCurrentWeek = () => { const today = new Date(); const dayOfWeek = today.getDay(); const monday = new Date(today); monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1)); const sunday = new Date(monday); sunday.setDate(monday.getDate() + 6); onChange([monday, sunday]); setIsOpen(false); };
    const setLastMonth = () => { const today = new Date(); onChange([new Date(today.getFullYear(), today.getMonth() - 1, 1), new Date(today.getFullYear(), today.getMonth(), 0)]); setIsOpen(false); };
    const setCurrentMonth = () => { const today = new Date(); onChange([new Date(today.getFullYear(), today.getMonth(), 1), new Date(today.getFullYear(), today.getMonth() + 1, 0)]); setIsOpen(false); };

    return (
        <div className="relative flex-1">
            <div onClick={() => { setIsOpen(!isOpen); setSelecting('start'); }} className="flex items-center bg-white dark:bg-[#111] border border-gray-200 dark:border-[#333] rounded-[6px] px-2 py-0.5 shadow-sm h-[34px] cursor-pointer hover:border-gray-400 dark:hover:border-[#555] transition-colors w-full">
                <CalendarIcon size={12} className="text-gray-400 mr-2 shrink-0" />
                <span className={`flex-1 text-xs font-medium text-center ${startDate ? 'text-gray-900 dark:text-white' : 'text-gray-400'}`}>{displayText()}</span>
                <button onClick={(e) => { e.stopPropagation(); onReset(); }} className="ml-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"><X size={12} /></button>
            </div>
            {isOpen && (
                <>
                    <div className="fixed inset-0 z-[60]" onClick={() => setIsOpen(false)} />
                    <div className="absolute top-full right-0 mt-2 bg-white dark:bg-[#111] border border-gray-200 dark:border-[#333] rounded-xl shadow-xl z-[70] p-2.5 w-[220px] animate-in fade-in slide-in-from-top-2 duration-150">
                        <div className="grid grid-cols-2 gap-1 mb-2 border-b border-gray-100 dark:border-[#222] pb-2">
                            <button onClick={setYesterday} className="px-2 py-1 text-[10px] font-medium bg-gray-50 dark:bg-[#1A1A1A] hover:bg-gray-100 dark:hover:bg-[#222] rounded text-gray-700 dark:text-gray-300 transition-colors">Вчера</button>
                            <button onClick={setToday} className="px-2 py-1 text-[10px] font-medium bg-gray-50 dark:bg-[#1A1A1A] hover:bg-gray-100 dark:hover:bg-[#222] rounded text-gray-700 dark:text-gray-300 transition-colors">Сегодня</button>
                            <button onClick={setLastWeek} className="px-2 py-1 text-[10px] font-medium bg-gray-50 dark:bg-[#1A1A1A] hover:bg-gray-100 dark:hover:bg-[#222] rounded text-gray-700 dark:text-gray-300 transition-colors">Пред. нед</button>
                            <button onClick={setCurrentWeek} className="px-2 py-1 text-[10px] font-medium bg-gray-50 dark:bg-[#1A1A1A] hover:bg-gray-100 dark:hover:bg-[#222] rounded text-gray-700 dark:text-gray-300 transition-colors">Тек. нед</button>
                            <button onClick={setLastMonth} className="px-2 py-1 text-[10px] font-medium bg-gray-50 dark:bg-[#1A1A1A] hover:bg-gray-100 dark:hover:bg-[#222] rounded text-gray-700 dark:text-gray-300 transition-colors">Пред. мес</button>
                            <button onClick={setCurrentMonth} className="px-2 py-1 text-[10px] font-medium bg-gray-50 dark:bg-[#1A1A1A] hover:bg-gray-100 dark:hover:bg-[#222] rounded text-gray-700 dark:text-gray-300 transition-colors">Тек. мес</button>
                        </div>
                        <div className="flex items-center justify-between mb-2">
                            <button onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1))} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-[#222]"><ChevronDown className="rotate-90" size={14} /></button>
                            <span className="text-xs font-bold text-gray-900 dark:text-white">{MONTHS[viewDate.getMonth()]} {viewDate.getFullYear()}</span>
                            <button onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1))} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-[#222]"><ChevronDown className="-rotate-90" size={14} /></button>
                        </div>
                        <div className="grid grid-cols-7 gap-0.5 mb-0.5">{DAYS.map(d => <div key={d} className="text-[9px] font-bold text-gray-400 text-center py-0.5">{d}</div>)}</div>
                        <div className="grid grid-cols-7 gap-0.5">
                            {Array.from({ length: getFirstDayOfMonth(viewDate.getFullYear(), viewDate.getMonth()) }).map((_, i) => <div key={`empty-${i}`} className="w-7 h-7" />)}
                            {Array.from({ length: getDaysInMonth(viewDate.getFullYear(), viewDate.getMonth()) }).map((_, i) => { const day = i + 1; const d = new Date(viewDate.getFullYear(), viewDate.getMonth(), day); const isS = isSameDay(d, startDate); const isE = isSameDay(d, endDate); const inR = isInRange(d); let cls = 'w-7 h-7 flex items-center justify-center text-[11px] font-medium rounded cursor-pointer transition-all '; if (isS || isE) cls += 'bg-blue-500 text-white font-bold '; else if (inR) cls += 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 '; else cls += 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#222] '; return <button key={day} onClick={() => handleDayClick(day)} className={cls}>{day}</button>; })}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

// --- HEATMAP TIME HELPER -- 
// Used by both Heatmap and Rows
const getBucketInfo = (count, maxCount) => {
    let colorClass, type;
    if (count === 0) { colorClass = 'bg-rose-500/80 dark:bg-rose-500/60'; type = 'red'; }
    else if ((count / maxCount) >= 0.6) { colorClass = 'bg-emerald-500'; type = 'green'; }
    else { colorClass = 'bg-amber-400'; type = 'yellow'; }
    return { colorClass, type };
};
const getTimeSlotIndex = (date) => {
    if (!date) return -1;
    const d = new Date(date);
    return (d.getHours() * 4) + Math.floor(d.getMinutes() / 15);
};

// --- HEATMAP COMPONENT ---
const TimeHeatmap = ({ payments }) => {
    const [hoveredSegment, setHoveredSegment] = useState(null);
    const containerRef = useRef(null);

    const { segments, maxCount } = useMemo(() => {
        const b = new Array(96).fill(0);
        payments.forEach(p => {
            const idx = getTimeSlotIndex(p.transactionDate);
            if (idx >= 0 && idx < 96) b[idx]++;
        });

        const max = Math.max(...b, 1);
        const merged = [];
        let currentSeg = null;

        for (let i = 0; i < 96; i++) {
            const count = b[i];
            const { colorClass } = getBucketInfo(count, max);

            if (!currentSeg) {
                currentSeg = { colorClass, startIdx: i, endIdx: i, totalCount: count };
            } else {
                if (currentSeg.colorClass === colorClass) {
                    currentSeg.endIdx = i;
                    currentSeg.totalCount += count;
                } else {
                    merged.push(currentSeg);
                    currentSeg = { colorClass, startIdx: i, endIdx: i, totalCount: count };
                }
            }
        }
        if (currentSeg) merged.push(currentSeg);

        return { segments: merged, maxCount: max };
    }, [payments]);

    const formatTime = (mins) => {
        const h = Math.floor(mins / 60) % 24;
        const m = mins % 60;
        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
    };

    return (
        <div className="mt-6 relative w-full select-none">
            <div className="absolute -top-4 w-full h-4 text-[9px] text-gray-400 font-medium flex justify-between pointer-events-none px-0.5">
                <span>00:00</span><span>04:00</span><span>08:00</span><span>12:00</span><span>16:00</span><span>20:00</span><span>24:00</span>
            </div>
            <div className="relative w-full h-[24px] rounded-[6px] overflow-hidden flex bg-gray-100 dark:bg-[#222]" ref={containerRef} onMouseLeave={() => setHoveredSegment(null)}>
                {segments.map((seg, i) => {
                    const length = seg.endIdx - seg.startIdx + 1;
                    const startMins = seg.startIdx * 15;
                    const endMins = (seg.endIdx + 1) * 15;
                    const label = `${formatTime(startMins)} - ${formatTime(endMins)}`;

                    // Calculate center percentage for tooltip
                    // Total buckets = 96.
                    // Center bucket index = (seg.startIdx + seg.endIdx) / 2
                    // + 0.5 to be in the middle of that bucket? 
                    // Let's take middle: (startIdx + endIdx + 1) / 2 is the float index of the right edge of center?
                    // Let's use simpler math: 
                    // width of segment in % = (length / 96) * 100
                    // left of segment in % = (seg.startIdx / 96) * 100
                    // center = left + width/2
                    const centerPct = ((seg.startIdx + length / 2) / 96) * 100;

                    return (
                        <div key={i} style={{ flexGrow: length }} className={`h-full ${seg.colorClass} hover:brightness-110 transition-all border-r border-black/5 last:border-0`} onMouseEnter={() => setHoveredSegment({ label, count: seg.totalCount, centerPct })} />
                    );
                })}
            </div>
            {hoveredSegment && (
                <div
                    className="absolute -top-10 -translate-x-1/2 transform bg-slate-800 text-white text-xs py-1.5 px-3 rounded shadow-xl flex flex-col items-center whitespace-nowrap z-[80] pointer-events-none"
                    style={{ left: `${hoveredSegment.centerPct}%` }}
                >
                    <span className="font-bold">{hoveredSegment.label}</span>
                    <span className="text-[10px] opacity-80">{hoveredSegment.count} sales</span>
                    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-800 rotate-45"></div>
                </div>
            )}
        </div>
    );
};

// --- NEW SUB-COMPONENTS ---
const TimeStats = ({ payments }) => {
    const [interval, setInterval] = useState(2); // hours

    // Dynamically calculate stats based on interval
    const stats = useMemo(() => {
        const bucketsCount = Math.ceil(24 / interval);
        const b = new Array(bucketsCount).fill(0);

        payments.forEach(p => {
            if (!p.transactionDate) return;
            const h = new Date(p.transactionDate).getHours();
            const idx = Math.floor(h / interval);
            if (idx >= 0 && idx < bucketsCount) b[idx]++;
        });

        const total = payments.length;
        return b.map((count, i) => {
            const start = i * interval;
            const end = start + interval;
            const label = `${start.toString().padStart(2, '0')}:00 - ${Math.min(end, 24).toString().padStart(2, '0')}:00`;
            const pct = total ? ((count / total) * 100).toFixed(0) : 0;
            return { label, count, pct };
        });
    }, [payments, interval]);

    return (
        <div className="mb-4">
            <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-bold text-gray-500 uppercase flex items-center gap-1"><Percent size={12} /> Статистика по времени</h3>
                <div className="flex gap-1">
                    {[1, 2, 4, 6, 8].map(v => (
                        <button
                            key={v}
                            onClick={() => setInterval(v)}
                            className={`px-3 py-1 text-[11px] rounded-[6px] font-bold border transition-all ${interval === v
                                ? 'bg-white dark:bg-[#333] border-gray-300 dark:border-gray-500 text-gray-900 dark:text-white shadow-sm'
                                : 'bg-transparent border-transparent text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#1A1A1A]'
                                }`}
                        >
                            {v}ч
                        </button>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                {stats.map((s, i) => (
                    <div key={i} className="bg-white dark:bg-[#1A1A1A] rounded p-2 text-center border border-gray-100 dark:border-[#333]">
                        <div className="text-[10px] text-gray-400 mb-1">{s.label}</div>
                        <div className="font-bold text-sm text-gray-900 dark:text-white">{s.pct}% <span className="text-[10px] text-gray-500 font-normal">({s.count})</span></div>
                    </div>
                ))}
            </div>
        </div>
    );
};

const AllPaymentsList = ({ payments }) => {
    const [isOpen, setIsOpen] = useState(false);

    // Determine visuals for each payment row
    const enrichedPayments = useMemo(() => {
        // We need 'maxCount' of the 15-min buckets to assign colors
        // Re-calculate buckets simply
        const b = new Array(96).fill(0);
        payments.forEach(p => {
            const idx = getTimeSlotIndex(p.transactionDate);
            if (idx >= 0 && idx < 96) b[idx]++;
        });
        const max = Math.max(...b, 1);

        return payments.map(p => {
            const idx = getTimeSlotIndex(p.transactionDate);
            const count = b[idx] || 0;
            const { type } = getBucketInfo(count, max);
            return { ...p, rowType: type };
        }).sort((a, b) => b.transactionDate.localeCompare(a.transactionDate));
    }, [payments]);

    return (
        <div className="border border-gray-200 dark:border-[#333] rounded-lg overflow-hidden bg-white dark:bg-[#151515]">
            <div
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center justify-between p-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-[#1A1A1A] transition-colors"
            >
                <div className="flex items-center gap-2">
                    <List size={16} className="text-gray-500" />
                    <span className="font-bold text-sm text-gray-900 dark:text-white">Все оплаты</span>
                    <span className="text-xs text-gray-500">({payments.length})</span>
                </div>
                {isOpen ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
            </div>

            {isOpen && (
                <div className="border-t border-gray-200 dark:border-[#333] max-h-[500px] overflow-auto">
                    <table className="w-full text-left text-xs whitespace-nowrap">
                        <thead className="bg-gray-50 dark:bg-[#1A1A1A] text-gray-500 sticky top-0">
                            <tr>
                                <th className="px-3 py-2"></th>
                                <th className="px-2 py-2">Время</th>
                                <th className="px-2 py-2">Менеджер</th>
                                <th className="px-2 py-2 text-right">Сумма</th>
                                <th className="px-2 py-2">Тип</th>
                            </tr>
                        </thead>
                        <tbody>
                            {enrichedPayments.map(p => {
                                let dotClass = 'bg-gray-300';
                                if (p.rowType === 'green') dotClass = 'bg-emerald-500';
                                if (p.rowType === 'yellow') dotClass = 'bg-amber-500';
                                if (p.rowType === 'red') dotClass = 'bg-rose-500';

                                return (
                                    <tr key={p.id} className="border-b border-gray-100 dark:border-[#222] hover:bg-gray-50 dark:hover:bg-[#1A1A1A]">
                                        <td className="px-3 py-2 w-[1%]">
                                            <div className={`w-2 h-2 rounded-full ${dotClass}`} title={p.rowType} />
                                        </td>
                                        <td className="px-2 py-2 font-mono text-gray-600 dark:text-gray-400">
                                            {p.transactionDate ? p.transactionDate.substring(0, 16).replace('T', ' ') : '-'}
                                        </td>
                                        <td className="px-2 py-2 font-medium">{p.manager}</td>
                                        <td className="px-2 py-2 text-right font-bold">€{p.amountEUR}</td>
                                        <td className="px-2 py-2 uppercase text-[10px] text-gray-500">{p.type}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

// --- MAIN PAGE ---
const PaymentTimesPage = () => {
    const { payments, user: currentUser, isLoading, fetchAllData } = useAppStore();
    const [dateRange, setDateRange] = useState(getLastWeekRange());
    const [startDate, endDate] = dateRange;
    const [filters, setFilters] = useState(() => ({ manager: '', country: '', product: '', type: '', source: 'all', department: 'all', showMobileFilters: false }));
    const [expandedGeo, setExpandedGeo] = useState(null);

    const hasActiveFilters = useMemo(() => !!(filters.manager || filters.country || filters.product || filters.type || filters.source !== 'all'), [filters]);
    useEffect(() => { if (fetchAllData) fetchAllData(true); }, [fetchAllData]);
    const isRestrictedUser = useMemo(() => { if (!currentUser) return false; return ['Sales', 'Retention', 'Consultant'].includes(currentUser.role); }, [currentUser]);

    const uniqueValues = useMemo(() => {
        const getUnique = (key) => [...new Set(payments.map(p => p[key]).filter(Boolean))].sort();
        return { managers: getUnique('manager'), countries: getUnique('country'), products: getUnique('product'), types: getUnique('type') };
    }, [payments]);

    const filteredData = useMemo(() => {
        const startStr = startDate ? toYMD(startDate) : '0000-00-00';
        const endStr = endDate ? toYMD(endDate) : '9999-99-99';
        return payments.filter(item => {
            if (!item.transactionDate) return false;
            const dbDateStr = item.transactionDate.slice(0, 10);
            if (dbDateStr < startStr || dbDateStr > endStr) return false;
            if (isRestrictedUser) { if (item.manager !== currentUser.name) return false; }
            else { if (filters.manager && item.manager !== filters.manager) return false; }
            if (filters.country && item.country !== filters.country) return false;
            if (filters.product && item.product !== filters.product) return false;
            if (filters.type && item.type !== filters.type) return false;
            if (filters.source !== 'all' && item.source !== filters.source) return false;
            if (filters.department !== 'all') {
                if (filters.department === 'sales') { if (item.managerRole !== 'Sales' && item.managerRole !== 'SeniorSales') return false; }
                else if (filters.department === 'consultant') { if (item.managerRole !== 'Consultant') return false; }
            }
            return true;
        });
    }, [payments, startDate, endDate, filters, isRestrictedUser, currentUser]);

    const groupedData = useMemo(() => {
        const groups = {};
        filteredData.forEach(p => {
            const geo = p.country || 'Unknown';
            if (!groups[geo]) groups[geo] = { geo, managers: new Set(), totalCount: 0, payments: [] };
            groups[geo].totalCount++;
            groups[geo].payments.push(p);
            if (p.manager) groups[geo].managers.add(p.manager);
        });
        return Object.values(groups).map(g => {
            // peak calc
            const buckets = new Array(96).fill(0);
            g.payments.forEach(p => { if (!p.transactionDate) return; const idx = getTimeSlotIndex(p.transactionDate); if (idx >= 0 && idx < 96) buckets[idx]++; });
            let maxSum = -1, bestStartIdx = 0;
            for (let i = 0; i < 96; i++) { let sum = 0; for (let j = 0; j < 8; j++) sum += buckets[(i + j) % 96]; if (sum > maxSum) { maxSum = sum; bestStartIdx = i; } }
            const format = (mins) => { const h = Math.floor(mins / 60) % 24; const m = mins % 60; return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`; };
            const peak = maxSum === 0 ? '—' : `${format(bestStartIdx * 15)} - ${format((bestStartIdx + 8) * 15)}`;

            return { ...g, managerCount: g.managers.size, peakWindow: peak };
        }).sort((a, b) => b.totalCount - a.totalCount);
    }, [filteredData]);

    const resetDateRange = () => setDateRange(getLastWeekRange());
    const resetFilters = () => { setFilters({ manager: '', country: '', product: '', type: '', source: 'all', department: 'all' }); setDateRange(getLastWeekRange()); };

    return (
        <div className="pb-10 transition-colors duration-200 w-full max-w-full">
            <div className="sticky top-0 z-30 bg-[#F5F5F5] dark:bg-[#0A0A0A] -mx-3 px-2 md:px-6 py-2 md:py-3 border-b border-transparent transition-colors duration-200">
                <div className="flex items-center justify-center md:justify-start gap-2 mb-3">
                    <h2 className="text-base md:text-lg font-bold dark:text-white tracking-tight flex items-center gap-2 text-center md:text-left min-w-0">
                        <Clock size={16} className="text-blue-600 dark:text-blue-500 shrink-0 md:w-5 md:h-5" />
                        <span>Время оплат (Timeline)</span>
                    </h2>
                </div>
                <div className="w-full md:w-auto mx-auto max-w-[90%] md:max-w-none">
                    <div className="flex flex-col md:flex-row md:flex-wrap items-stretch md:items-center gap-2 md:justify-between">
                        <div className="flex flex-col md:flex-row gap-2 w-full md:w-auto">
                            <div className="flex bg-gray-200 dark:bg-[#1A1A1A] p-0.5 rounded-[6px] h-[34px] items-center w-full md:w-auto justify-center">
                                <button onClick={() => setFilters(prev => ({ ...prev, source: 'all' }))} className={`px-2.5 h-full rounded-[4px] text-[10px] font-bold transition-all whitespace-nowrap ${filters.source === 'all' ? 'bg-white dark:bg-[#333] text-black dark:text-white shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}>Все</button>
                                <button onClick={() => setFilters(prev => ({ ...prev, source: 'direct' }))} className={`px-2 h-full rounded-[4px] text-[10px] font-bold transition-all flex items-center gap-1 whitespace-nowrap ${filters.source === 'direct' ? 'bg-white dark:bg-[#333] text-blue-600 dark:text-blue-400 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}><MessageCircle size={10} />Direct</button>
                                <button onClick={() => setFilters(prev => ({ ...prev, source: 'comments' }))} className={`px-2 h-full rounded-[4px] text-[10px] font-bold transition-all flex items-center gap-1 whitespace-nowrap ${filters.source === 'comments' ? 'bg-white dark:bg-[#333] text-orange-600 dark:text-orange-400 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}><MessageSquare size={10} />Comm</button>
                                <button onClick={() => setFilters(prev => ({ ...prev, source: 'whatsapp' }))} className={`px-2 h-full rounded-[4px] text-[10px] font-bold transition-all flex items-center gap-1 whitespace-nowrap ${filters.source === 'whatsapp' ? 'bg-white dark:bg-[#333] text-green-600 dark:text-green-400 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}><Phone size={10} />WP</button>
                            </div>
                            <div className="flex bg-gray-200 dark:bg-[#1A1A1A] p-0.5 rounded-[6px] h-[34px] items-center w-full md:w-auto justify-center">
                                <button onClick={() => setFilters(prev => ({ ...prev, department: 'all' }))} className={`px-2.5 h-full rounded-[4px] text-[10px] font-bold transition-all whitespace-nowrap ${filters.department === 'all' ? 'bg-white dark:bg-[#333] text-black dark:text-white shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}>Все</button>
                                <button onClick={() => setFilters(prev => ({ ...prev, department: 'sales' }))} className={`px-2.5 h-full rounded-[4px] text-[10px] font-bold transition-all whitespace-nowrap ${filters.department === 'sales' ? 'bg-white dark:bg-[#333] text-black dark:text-white shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}>ОП</button>
                                <button onClick={() => setFilters(prev => ({ ...prev, department: 'consultant' }))} className={`px-2.5 h-full rounded-[4px] text-[10px] font-bold transition-all whitespace-nowrap ${filters.department === 'consultant' ? 'bg-white dark:bg-[#333] text-black dark:text-white shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}>Конс.</button>
                            </div>
                        </div>
                        <div className="flex flex-col md:flex-row md:flex-wrap items-stretch md:items-center gap-2 w-full md:w-auto">
                            <div className="md:hidden w-full space-y-2">
                                <button onClick={() => setFilters(prev => ({ ...prev, showMobileFilters: !prev.showMobileFilters }))} className="w-full bg-white dark:bg-[#111] border border-gray-200 dark:border-[#333] text-gray-700 dark:text-gray-200 py-1.5 px-3 rounded-[6px] text-xs font-medium hover:border-gray-400 dark:hover:border-[#555] transition-colors text-left flex justify-between items-center h-[34px]">
                                    <span className="flex items-center gap-2"><Filter size={12} /><span>Фильтры</span></span>
                                    <span className="text-[10px] text-gray-400">{hasActiveFilters && '●'}</span>
                                </button>
                                {filters.showMobileFilters && (
                                    <div className="space-y-2 p-3 bg-white dark:bg-[#111] border border-gray-200 dark:border-[#333] rounded-lg">
                                        {!isRestrictedUser && <DenseSelect label="Менеджер" value={filters.manager} options={uniqueValues.managers} onChange={(val) => setFilters(p => ({ ...p, manager: val }))} />}
                                        <DenseSelect label="Страна" value={filters.country} options={uniqueValues.countries} onChange={(val) => setFilters(p => ({ ...p, country: val }))} />
                                        <DenseSelect label="Продукт" value={filters.product} options={uniqueValues.products} onChange={(val) => setFilters(p => ({ ...p, product: val }))} />
                                        <DenseSelect label="Платежки" value={filters.type} options={uniqueValues.types} onChange={(val) => setFilters(p => ({ ...p, type: val }))} />
                                        <MobileDateRangePicker startDate={startDate} endDate={endDate} onChange={(update) => setDateRange(update)} onReset={resetDateRange} />
                                        <button onClick={resetFilters} disabled={!hasActiveFilters} className={`w-full p-2 bg-red-500/10 text-red-500 rounded-[6px] hover:bg-red-500/20 text-xs font-bold transition-opacity ${hasActiveFilters ? 'opacity-100' : 'opacity-50 cursor-not-allowed'}`}>Сбросить фильтры</button>
                                    </div>
                                )}
                            </div>
                            <div className="hidden md:contents">
                                {!isRestrictedUser && (<DenseSelect label="Менеджер" value={filters.manager} options={uniqueValues.managers} onChange={(val) => setFilters(p => ({ ...p, manager: val }))} />)}
                                <DenseSelect label="Страна" value={filters.country} options={uniqueValues.countries} onChange={(val) => setFilters(p => ({ ...p, country: val }))} />
                                <DenseSelect label="Продукт" value={filters.product} options={uniqueValues.products} onChange={(val) => setFilters(p => ({ ...p, product: val }))} />
                                <DenseSelect label="Платежки" value={filters.type} options={uniqueValues.types} onChange={(val) => setFilters(p => ({ ...p, type: val }))} />
                                <div className="flex items-center gap-2 w-full md:w-auto">
                                    <div className="flex flex-1"><CustomDateRangePicker startDate={startDate} endDate={endDate} onChange={(update) => setDateRange(update)} onReset={resetDateRange} /></div>
                                    <button onClick={resetFilters} className="bg-gray-200 dark:bg-[#1A1A1A] hover:bg-gray-300 dark:hover:bg-[#333] text-gray-500 dark:text-gray-400 p-1.5 rounded-[6px] transition-colors h-[34px] w-[34px] flex items-center justify-center" title="Сбросить фильтры"><X size={14} /></button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="mt-4 px-2 md:px-6 space-y-4">
                {groupedData.length === 0 ? (
                    <div className="text-center py-10 text-gray-400 dark:text-gray-600 text-sm">Нет данных за выбранный период</div>
                ) : (
                    groupedData.map(group => {
                        const isExpanded = expandedGeo === group.geo;
                        return (
                            <div key={group.geo} className="bg-white dark:bg-[#111] border border-gray-200 dark:border-[#333] rounded-lg overflow-hidden shadow-sm transition-all">
                                <div className="p-4 flex flex-col gap-4">
                                    <div onClick={() => setExpandedGeo(isExpanded ? null : group.geo)} className="flex items-center justify-between cursor-pointer">
                                        <div className="flex items-center gap-3">
                                            <div className="text-2xl">{getFlag(group.geo)}</div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <div className="text-lg font-bold text-gray-900 dark:text-white">{group.geo}</div>
                                                    <div className="text-xs text-gray-400">({group.managerCount})</div>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex-1 flex justify-center">
                                            <div className="flex items-center gap-2 text-sm bg-gray-50 dark:bg-[#1A1A1A] px-3 py-1 rounded-full border border-gray-100 dark:border-[#333]">
                                                <Clock size={14} className="text-blue-500" />
                                                <span className="text-gray-500 dark:text-gray-400">Пик оплат:</span>
                                                <span className="font-bold text-gray-900 dark:text-white">{group.peakWindow}</span>
                                            </div>
                                        </div>
                                        <div className="text-gray-400">
                                            {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                                        </div>
                                    </div>
                                    <TimeHeatmap payments={group.payments} />
                                </div>
                                {isExpanded && (
                                    <div className="border-t border-gray-100 dark:border-[#222] bg-gray-50/30 dark:bg-[#151515] p-3 animate-in slide-in-from-top-1 fade-in duration-200">
                                        {/* 1. 2-Hour Breakdown */}
                                        <TimeStats payments={group.payments} />
                                        {/* 2. All Payments Logic */}
                                        <AllPaymentsList payments={group.payments} />
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
};

export default PaymentTimesPage;
