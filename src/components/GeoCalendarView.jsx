import React, { useState, useEffect, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Activity } from 'lucide-react';
import { fetchGeoNotesInRange } from '../services/dataService';

const GeoCalendarView = ({ countries }) => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [notes, setNotes] = useState([]);
    const [loading, setLoading] = useState(false);
    const [hoveredCell, setHoveredCell] = useState(null);

    // --- Helpers ---
    const getDaysInMonth = (date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        return new Date(year, month + 1, 0).getDate();
    };

    const getLocalDateKey = (date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const monthDays = useMemo(() => {
        const days = [];
        const numDays = getDaysInMonth(currentDate);
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();

        for (let i = 1; i <= numDays; i++) {
            days.push(new Date(year, month, i));
        }
        return days;
    }, [currentDate]);

    // --- Data Fetching ---
    useEffect(() => {
        const fetchNotes = async () => {
            setLoading(true);
            try {
                // Start of month
                const start = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
                // End of month
                const end = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0, 23, 59, 59);

                const data = await fetchGeoNotesInRange(start, end);
                setNotes(data);
            } catch (err) {
                console.error("Failed to fetch notes for calendar:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchNotes();
    }, [currentDate]);

    // --- Status Logic ---
    const getStatusForDay = (geo, day) => {
        // day is 00:00:00 local time
        const dayStart = day.getTime(); // Local timestamp
        const dayEnd = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 23, 59, 59).getTime();

        const history = (geo.status_history || []).sort((a, b) => new Date(a.at) - new Date(b.at));

        // 1. Find status immediately BEFORE dayStart
        let isActive = false;

        const lastEventBefore = history.filter(h => new Date(h.at).getTime() < dayStart).pop();
        if (lastEventBefore) {
            isActive = lastEventBefore.action === 'activated';
        } else {
            const firstEvent = history[0];
            if (firstEvent) {
                // If the first recorded event is 'deactivated', it implies previous state was 'active'
                isActive = firstEvent.action === 'deactivated';
            } else {
                // No history -> default to current status
                isActive = geo.isActive;
            }
        }

        const dayEvents = history.filter(h => {
            const t = new Date(h.at).getTime();
            return t >= dayStart && t <= dayEnd;
        });

        if (isActive) return 'active';
        const becameActive = dayEvents.some(h => h.action === 'activated');
        if (becameActive) return 'active';

        return 'inactive';
    };

    // --- Notes matching ---
    const getNotesForDay = (geoCode, day) => {
        const dateKey = getLocalDateKey(day);
        return notes.filter(n => {
            // geo_notes.created_at is UTC ISO string.
            // We need to convert it to local YYYY-MM-DD to match the calendar cell
            // Assuming the note date should match the User's local calendar date
            const nDate = new Date(n.created_at);
            const nKey = getLocalDateKey(nDate);
            return n.geo_code === geoCode && nKey === dateKey;
        });
    };

    // --- Render ---
    const monthName = currentDate.toLocaleString('ru-RU', { month: 'long', year: 'numeric' });

    const handlePrevMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    };

    const handleNextMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    };

    return (
        <div className="animate-in fade-in duration-300">
            {/* Header / Month Nav */}
            <div className="flex items-center justify-between mb-4 bg-white dark:bg-[#111] p-3 rounded-lg border border-gray-200 dark:border-[#333]">
                <div className="flex items-center gap-4">
                    <h2 className="text-lg font-bold capitalize text-gray-900 dark:text-gray-100">{monthName}</h2>
                    <div className="flex items-center gap-1">
                        <button onClick={handlePrevMonth} className="p-1 hover:bg-gray-100 dark:hover:bg-[#222] rounded transition-colors">
                            <ChevronLeft size={20} />
                        </button>
                        <button onClick={handleNextMonth} className="p-1 hover:bg-gray-100 dark:hover:bg-[#222] rounded transition-colors">
                            <ChevronRight size={20} />
                        </button>
                    </div>
                </div>
                <div className="flex items-center gap-4 text-xs">
                    <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 rounded-[2px] bg-emerald-300 dark:bg-emerald-600"></div>
                        <span>Работало</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 rounded-[2px] bg-rose-300 dark:bg-rose-600"></div>
                        <span>Блокировка</span>
                    </div>
                </div>
            </div>

            {/* Matrix */}
            <div className="bg-white dark:bg-[#111] border border-gray-200 dark:border-[#333] rounded-lg overflow-x-auto">
                <table className="w-full text-xs box-border border-collapse">
                    <thead>
                        <tr>
                            <th className="sticky left-0 z-20 bg-gray-50 dark:bg-[#161616] p-2 text-left font-bold border-b border-r border-gray-200 dark:border-[#333] min-w-[120px]">
                                ГЕО
                            </th>
                            {monthDays.map(d => (
                                <th key={d.toString()} className="p-2 min-w-[32px] text-center font-bold border-b border-gray-200 dark:border-[#333] text-gray-500">
                                    {d.getDate()}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-[#222]">
                        {countries.map(country => (
                            <tr key={country.code} className="hover:bg-gray-50 dark:hover:bg-[#1A1A1A] transition-colors">
                                <td className="sticky left-0 z-10 bg-white dark:bg-[#111] p-2 border-r border-gray-200 dark:border-[#333] font-medium flex items-center gap-2">
                                    <span className="text-base">{country.emoji}</span>
                                    <span>{country.name}</span>
                                </td>
                                {monthDays.map(d => {
                                    const status = getStatusForDay(country, d);
                                    const dayNotes = getNotesForDay(country.code, d);
                                    const hasNotes = dayNotes.length > 0;

                                    return (
                                        <td
                                            key={d.toString()}
                                            className="p-2 text-center relative group isolate"
                                            onMouseEnter={() => hasNotes && setHoveredCell({ country: country.code, date: d.toString() })}
                                            onMouseLeave={() => setHoveredCell(null)}
                                        >
                                            <div className={`w-3 h-3 mx-auto rounded-[2px] cursor-default transition-transform hover:scale-110 ${status === 'active' ? 'bg-emerald-300 dark:bg-emerald-600' : 'bg-rose-300 dark:bg-rose-600'}`}></div>

                                            {/* Notes Indicator */}
                                            {hasNotes && (
                                                <div className="absolute top-1 right-1 w-1.5 h-1.5 bg-blue-500 rounded-full border border-white dark:border-[#111]"></div>
                                            )}

                                            {/* Tooltip */}
                                            {hasNotes && (
                                                <div className="absolute z-50 bottom-full mb-2 left-1/2 -translate-x-1/2 w-64 hidden group-hover:block transition-opacity opacity-0 group-hover:opacity-100 pointer-events-none">
                                                    <div className="bg-white dark:bg-[#1A1A1A] rounded-lg shadow-xl border border-gray-200 dark:border-[#333] p-3 text-left">
                                                        <div className="text-[10px] text-gray-400 mb-2 pb-1 border-b border-gray-100 dark:border-[#333]">
                                                            {d.toLocaleDateString()}
                                                        </div>
                                                        <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar">
                                                            {dayNotes.map(n => (
                                                                <div key={n.id} className="text-[10px]">
                                                                    <div className="font-bold text-gray-700 dark:text-gray-300 mb-0.5">{n.author_name || 'System'}</div>
                                                                    <div className="text-gray-600 dark:text-gray-400 whitespace-pre-wrap">{n.note}</div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {loading && (
                <div className="absolute inset-0 bg-white/50 dark:bg-black/50 flex items-center justify-center backdrop-blur-sm z-50 rounded-lg">
                    <Activity className="animate-spin text-blue-500" />
                </div>
            )}
        </div>
    );
};

export default GeoCalendarView;
