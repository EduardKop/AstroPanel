import React, { useState, useMemo } from 'react';
import { useAppStore } from '../store/appStore';
import { Calendar, Settings, Edit, ChevronLeft, ChevronRight, RefreshCcw } from 'lucide-react';
import { ResponsiveHeatMap } from '@nivo/heatmap';

// --- GEO COLORS & CODES ---
const GEO_PALETTE = {
    'UA': { color: '#0ea5e9', label: 'Укр' }, // Sky Blue
    'PL': { color: '#ef4444', label: 'Пол' }, // Red
    'CZ': { color: '#8b5cf6', label: 'Чех' }, // Violet
    'DE': { color: '#f59e0b', label: 'Гер' }, // Amber
    'IT': { color: '#10b981', label: 'Ита' }, // Emerald
    'FR': { color: '#3b82f6', label: 'Фра' }, // Blue
    'ES': { color: '#eab308', label: 'Исп' }, // Yellow
    'PT': { color: '#ec4899', label: 'Пор' }, // Pink
    'BG': { color: '#14b8a6', label: 'Бол' }, // Teal
    'RO': { color: '#6366f1', label: 'Рум' }, // Indigo
    'TR': { color: '#f97316', label: 'Тур' }, // Orange
    // Fallsbacks
    'KZ': { color: '#2dd4bf', label: 'Каз' },
    'US': { color: '#64748b', label: 'США' },
    'UK': { color: '#3b82f6', label: 'Анг' },
};

const GEO_KEYS = Object.keys(GEO_PALETTE);

const SchedulePage = () => {
    const { user, managers: storeManagers } = useAppStore();
    const isAdmin = user && ['Admin', 'C-level'].includes(user.role);

    const [currentDate, setCurrentDate] = useState(new Date());
    const [isDemo, setIsDemo] = useState(true); // Default to Demo for visualization

    // --- DATE HELPERS ---
    const daysInMonth = useMemo(() => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const date = new Date(year, month, 1);
        const days = [];
        while (date.getMonth() === month) {
            days.push(new Date(date));
            date.setDate(date.getDate() + 1);
        }
        return days;
    }, [currentDate]);

    const monthLabel = currentDate.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' });
    const dayKeys = daysInMonth.map(d => String(d.getDate()).padStart(2, '0'));

    // --- DATA GENERATION (Mix of Real Managers + Mock Schedules) ---
    const scheduleData = useMemo(() => {
        // 1. Get Managers (From Store or Mock if empty)
        let managersList = storeManagers.length > 0 ? storeManagers.map(m => m.name) : ['Alice', 'Bob', 'Charlie', 'David', 'Eva'];

        // Force some visual names if in Demo or empty
        if (isDemo || managersList.length < 5) {
            managersList = ['Юра @yurissoo', 'Игорь @gonigorr', 'Анна @Annet6996', 'Алина @alinaserheeva', 'Виктория @vika', 'Ольга @helka', 'Денис @beetle', 'Светлана @sveta', 'Ксения @ksenia'];
        }

        // 2. Build Rows
        return managersList.map(manager => {
            // Assign specific GEO for this manager (Stable for the session)
            const managerGeo = isDemo
                ? GEO_KEYS[Math.floor(Math.random() * GEO_KEYS.length)]
                : null;

            const dataPoints = daysInMonth.map(day => {
                const dayKey = String(day.getDate()).padStart(2, '0');

                let geo = null;
                if (isDemo) {
                    // Random Shift presence (60% chance), but always same GEO
                    if (Math.random() > 0.3) {
                        geo = managerGeo;
                    }
                }

                return {
                    x: dayKey,
                    y: geo ? 1 : 0, // Heatmap needs a value
                    geo: geo // Custom data
                };
            });

            return {
                id: manager,
                data: dataPoints
            };
        });
    }, [storeManagers, daysInMonth, isDemo]);

    // --- ACTIONS ---
    const prevMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    };
    const nextMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    };

    return (
        <div className="pb-10 w-full max-w-full overflow-x-hidden">
            {/* HEADER */}
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-bold dark:text-white flex items-center gap-2">
                        <Calendar className="text-blue-600 dark:text-blue-500" />
                        График Смен
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 text-xs mt-1">
                        Планирование рабочих смен и распределение ГЕО
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    {/* Date Nav */}
                    <div className="flex items-center bg-white dark:bg-[#111] border border-gray-200 dark:border-[#333] rounded-lg p-1 shadow-sm">
                        <button onClick={prevMonth} className="p-1.5 hover:bg-gray-100 dark:hover:bg-[#222] rounded-md transition-colors text-gray-600 dark:text-gray-300">
                            <ChevronLeft size={16} />
                        </button>
                        <span className="px-3 text-sm font-bold dark:text-white capitalize min-w-[140px] text-center">
                            {monthLabel}
                        </span>
                        <button onClick={nextMonth} className="p-1.5 hover:bg-gray-100 dark:hover:bg-[#222] rounded-md transition-colors text-gray-600 dark:text-gray-300">
                            <ChevronRight size={16} />
                        </button>
                    </div>

                    {/* Demo Toggle */}
                    <button
                        onClick={() => setIsDemo(!isDemo)}
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all ${isDemo ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/20' : 'bg-white dark:bg-[#111] border border-gray-200 dark:border-[#333] text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-[#222]'}`}
                    >
                        <RefreshCcw size={14} className={isDemo ? 'animate-spin-slow' : ''} />
                        Demo
                    </button>

                    {/* ACTIONS (Admin Only) */}
                    {isAdmin && (
                        <div className="flex items-center gap-2">
                            <button className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-[#1A1A1A] border border-gray-200 dark:border-[#333] hover:bg-gray-50 dark:hover:bg-[#252525] text-gray-700 dark:text-gray-200 rounded-lg text-xs font-medium transition-all shadow-sm">
                                <Edit size={14} />
                                <span className="hidden sm:inline">Ред.</span>
                            </button>
                            <button className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium transition-colors shadow-sm">
                                <Settings size={14} />
                                <span className="hidden sm:inline">Расширенное</span>
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* HEATMAP CONTAINER */}
            <div className="bg-white dark:bg-[#111] border border-gray-200 dark:border-[#333] rounded-xl p-4 shadow-sm overflow-hidden flex flex-col relative w-full">
                {/* Horizontal Scroll for small screens */}
                <div className="w-full overflow-x-auto custom-scrollbar pb-2">
                    {/* Dynamic height based on rows count to keep cells compact (approx 40px per row + headers) */}
                    <div style={{ height: Math.max(200, scheduleData.length * 40 + 80), minWidth: '1000px' }} className="relative">
                        <ResponsiveHeatMap
                            data={scheduleData}
                            margin={{ top: 50, right: 30, bottom: 20, left: 180 }}
                            valueFormat=">-.2s" // Not used but required
                            axisTop={{
                                tickSize: 0,
                                tickPadding: 12,
                                tickRotation: 0,
                                legend: '',
                                legendOffset: 36,
                                truncateTickAt: 0
                            }}
                            axisRight={null}
                            axisLeft={{
                                tickSize: 0,
                                tickPadding: 0,
                                tickRotation: 0,
                                renderTick: ({ x, y, value }) => (
                                    <g transform={`translate(${x},${y})`}>
                                        <text
                                            x={-170}
                                            y={0}
                                            dy={0}
                                            dominantBaseline="middle"
                                            textAnchor="start"
                                            fill="#666"
                                            fontSize={12}
                                            fontWeight="500"
                                        >
                                            {value}
                                        </text>
                                    </g>
                                )
                            }}
                            // We use custom rendering, so colors here are just for the scale logic if needed
                            colors={{
                                type: 'quantize',
                                scheme: 'blues',
                                steps: 2
                            }}
                            emptyColor="#f9fafb"
                            borderColor={{ theme: 'background' }}
                            borderWidth={3} // Gap between cells
                            enableLabels={false}

                            // Custom Cell Renderer
                            cellComponent={({ cell, borderWidth }) => {
                                const geoCode = cell.data.geo;
                                const config = GEO_PALETTE[geoCode];

                                // If no Geo, render empty or just nothing
                                if (!geoCode || !config) {
                                    return (
                                        <rect
                                            x={cell.x}
                                            y={cell.y}
                                            width={cell.width}
                                            height={cell.height}
                                            fill={'transparent'}
                                            strokeWidth={0}
                                        />
                                    )
                                }

                                return (
                                    <g transform={`translate(${cell.x}, ${cell.y})`}>
                                        <rect
                                            x={borderWidth / 2}
                                            y={borderWidth / 2}
                                            width={Math.max(cell.width - borderWidth, 0)}
                                            height={Math.max(cell.height - borderWidth, 0)}
                                            rx={4}
                                            ry={4}
                                            fill={config.color}
                                            className="transition-all hover:opacity-80 cursor-pointer"
                                        />
                                        <text
                                            x={cell.width / 2}
                                            y={cell.height / 2}
                                            dy={4}
                                            textAnchor="middle"
                                            fill="#fff"
                                            fontSize={11}
                                            fontWeight="bold"
                                            style={{ pointerEvents: 'none', textShadow: '0 1px 2px rgba(0,0,0,0.2)' }}
                                        >
                                            {config.label}
                                        </text>
                                    </g>
                                );
                            }}
                            theme={{
                                text: {
                                    fill: "#666",
                                    fontSize: 12
                                },
                                axis: {
                                    ticks: {
                                        text: {
                                            fill: "#6b7280", // Gray-500
                                            fontSize: 12,
                                            fontWeight: 500
                                        }
                                    }
                                },
                                grid: {
                                    line: {
                                        stroke: "#f3f4f6", // Very light gray grid
                                        strokeWidth: 1
                                    }
                                }
                            }}
                            // Tooltip
                            tooltip={({ cell }) => {
                                if (!cell.data.geo) return null;
                                const config = GEO_PALETTE[cell.data.geo];
                                return (
                                    <div className="bg-white dark:bg-[#1e293b] py-2 px-3 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 text-xs z-50">
                                        <strong className="block dark:text-white mb-1">{cell.serieId}</strong>
                                        <div className="flex items-center gap-2">
                                            <span className="w-2 h-2 rounded-full" style={{ background: config?.color }}></span>
                                            <span className="text-gray-500 dark:text-gray-400">
                                                {currentDate.getFullYear()}-{String(currentDate.getMonth() + 1).padStart(2, '0')}-{cell.data.x}:
                                                <span className="ml-1 font-bold text-gray-700 dark:text-gray-200">{config?.label}</span>
                                            </span>
                                        </div>
                                    </div>
                                );
                            }}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SchedulePage;
