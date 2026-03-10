import React, { memo, useState, useRef } from 'react';
import ScheduleCell from './ScheduleCell';

/**
 * ManagerRow - compact row for schedule grid.
 * Uses plain div (no framer-motion) for performance.
 * DnD is handled externally via HTML5 draggable props.
 */
const ManagerRow = memo(({
    row,
    countryMap,
    daysInMonth,
    isEditing,
    isMultiGeoEditing,
    isAdditionalEditing,
    canEdit,
    onAutoFillClick,
    onCellClick,
    onNicknameCopy,
    getGeoConfig,
    extraShifts,
    onExtraShiftsSave,
    viewMode,
    cellStyle,
    // drag-and-drop
    onDragStart,
    onDragOver,
    onDrop,
    onDragEnd,
    isDragging,
}) => {
    const isCompact = viewMode === 'compact';
    const rowH = isCompact ? 22 : 34;
    const nameColW = isCompact ? 'w-[120px]' : 'w-[152px]';
    const flagColW = isCompact ? 'w-[16px]' : 'w-[22px]';
    const flagSize = isCompact ? '8px' : (row.geos?.length === 3 ? '9px' : '10px');
    const flagH = isCompact ? '7px' : (row.geos?.length === 3 ? '10px' : '11px');

    const [dopEditing, setDopEditing] = useState(false);
    const [dopValue, setDopValue] = useState('');
    const dopInputRef = useRef(null);

    const openDopEdit = () => {
        setDopValue(String(extraShifts || 0));
        setDopEditing(true);
        setTimeout(() => dopInputRef.current?.select(), 0);
    };

    const saveDop = () => {
        const val = parseInt(dopValue) || 0;
        setDopEditing(false);
        if (onExtraShiftsSave) onExtraShiftsSave(row.id, val);
    };

    const getEmploymentStatus = (mgr) => {
        const dateStr = mgr?.started_at || mgr?.created_at;
        if (!dateStr) return null;
        const days = Math.ceil(Math.abs(new Date() - new Date(dateStr)) / 86400000);
        if (days <= 7)  return { color: '#8b5cf6', title: 'Стажер' };
        if (days <= 30) return { color: '#f59e0b', title: 'Исп. период' };
        return { color: '#10b981', title: 'Сотрудник' };
    };
    const empStatus = getEmploymentStatus(row.rawManager);

    return (
        <div
            draggable={canEdit}
            onDragStart={onDragStart}
            onDragOver={onDragOver}
            onDrop={onDrop}
            onDragEnd={onDragEnd}
            className={[
                'flex border-b border-gray-100/60 dark:border-zinc-800/40',
                'hover:bg-gray-50 dark:hover:bg-zinc-900',
                'transition-colors duration-75 group',
                isDragging ? 'opacity-40' : '',
            ].filter(Boolean).join(' ')}
            style={{ minHeight: rowH }}
        >
            {/* ── Manager name column (sticky) ── */}
            <div className={`${nameColW} flex-shrink-0 flex border-r border-gray-200/60 dark:border-zinc-800/40 sticky left-0 z-30 bg-white dark:bg-[#111] group-hover:bg-gray-50 dark:group-hover:bg-zinc-900 transition-colors duration-75`}>
                {/* Drag handle strip */}
                {canEdit && (
                    <div className="w-[6px] flex-shrink-0 flex items-center justify-center cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-40 transition-opacity">
                        <div className="w-[2px] h-[14px] rounded-full bg-current" />
                    </div>
                )}

                {/* Name + Nickname block */}
                <div className="flex-1 px-2 py-[3px] flex flex-col justify-center min-w-0">
                    <div className="flex items-center gap-1 min-w-0">
                        {/* Employment status dot */}
                        {empStatus && (
                            <div
                                className="w-[5px] h-[5px] rounded-full flex-shrink-0"
                                style={{ backgroundColor: empStatus.color }}
                                title={empStatus.title}
                            />
                        )}
                        <span
                            className={[
                                'text-[11px] font-medium leading-tight truncate',
                                (isEditing || isMultiGeoEditing)
                                    ? 'text-blue-600 dark:text-blue-400 cursor-pointer hover:underline'
                                    : 'text-gray-800 dark:text-gray-200',
                            ].join(' ')}
                            onClick={(e) => {
                                if (isEditing || isMultiGeoEditing) {
                                    e.stopPropagation();
                                    onAutoFillClick(row.id);
                                }
                            }}
                            title={isEditing || isMultiGeoEditing ? 'Автозаполнение' : row.name}
                        >
                            {row.name}
                        </span>
                    </div>
                    {row.nickname && (
                        <span
                            className={`truncate cursor-pointer hover:text-blue-500 transition-colors leading-tight ${isCompact ? 'text-[8px]' : 'text-[9px]'} text-gray-400 dark:text-zinc-500`}
                            onClick={(e) => { e.stopPropagation(); onNicknameCopy(row.nickname); }}
                            onPointerDown={(e) => e.stopPropagation()}
                            title={`Скопировать: ${row.nickname}`}
                        >
                            {row.nickname}
                        </span>
                    )}
                </div>

                {/* GEO flags column */}
                <div className={`${flagColW} flex-shrink-0 flex flex-col items-center justify-center gap-0 relative overflow-visible border-l border-gray-100 dark:border-zinc-800/40`}>
                    {(row.geos || []).slice(0, 3).map((geo, idx) => (
                        <div key={idx} className="relative group/flag flex items-center justify-center" style={{ height: flagH }}>
                            <span className="leading-none cursor-default" style={{ fontSize: flagSize }}>
                                {countryMap[geo]?.emoji || '🌍'}
                            </span>
                            <div className="absolute left-full ml-1.5 top-1/2 -translate-y-1/2 hidden group-hover/flag:flex items-center z-[9999] bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-[9px] font-semibold px-1.5 py-0.5 rounded-md shadow-lg whitespace-nowrap pointer-events-none gap-1">
                                <span>{countryMap[geo]?.emoji}</span>
                                <span>{countryMap[geo]?.name || geo}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* ── Day cells ── */}
            <div className="flex flex-1" onPointerDown={(e) => e.stopPropagation()}>
                {daysInMonth.map((day, dayIdx) => {
                    const y = day.getFullYear();
                    const m = String(day.getMonth() + 1).padStart(2, '0');
                    const d = String(day.getDate()).padStart(2, '0');
                    const dateKey = `${y}-${m}-${d}`;

                    const geo = row.shifts[dateKey];
                    const geos = geo ? geo.split(',').map(g => g.trim()) : [];
                    const geoConfigs = geos.map(g => getGeoConfig(g)).filter(Boolean);
                    const isInteractive = canEdit || isMultiGeoEditing || isAdditionalEditing;
                    const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                    const isToday = day.toDateString() === new Date().toDateString();

                    return (
                        <ScheduleCell
                            key={dayIdx}
                            dayIdx={dayIdx}
                            isToday={isToday}
                            isWeekend={isWeekend}
                            isInteractive={isInteractive}
                            canEdit={isEditing}
                            canMultiGeoEdit={isMultiGeoEditing}
                            isAdditionalEditing={isAdditionalEditing}
                            geoConfigs={geoConfigs}
                            geos={geos}
                            countryMap={countryMap}
                            isCompact={isCompact}
                            cellStyle={cellStyle}
                            onClick={() => onCellClick(row, dateKey, geos)}
                        />
                    );
                })}
            </div>

            {/* ── Summary cells ── */}
            {(() => {
                const shiftsValues = Object.values(row.shifts || {}).filter(Boolean);
                const totalShifts = shiftsValues.length;
                const multiGeoShifts = shiftsValues.filter(v => v.includes(',')).length;
                const dopShifts = extraShifts || 0;
                const cellCls = 'flex-shrink-0 flex items-center justify-center text-[11px] font-semibold border-l border-gray-100 dark:border-zinc-800/40';
                const h = `h-[${rowH}px]`;
                return (
                    <div className="flex flex-shrink-0 border-l border-gray-200/60 dark:border-zinc-800/40">
                        <div className={`w-[48px] ${h} ${cellCls} text-gray-700 dark:text-gray-300`}>{totalShifts || '–'}</div>

                        {/* ДОП — editable in edit mode */}
                        <div
                            className={`w-[40px] ${h} ${cellCls} relative ${
                                isEditing ? 'cursor-pointer' : ''
                            } ${dopShifts > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-gray-400 dark:text-zinc-600'}`}
                            onClick={isEditing && !dopEditing ? openDopEdit : undefined}
                            title={isEditing ? 'Нажмите для редактирования доп. смен' : ''}
                        >
                            {dopEditing ? (
                                <input
                                    ref={dopInputRef}
                                    type="number"
                                    value={dopValue}
                                    onChange={e => setDopValue(e.target.value)}
                                    onBlur={saveDop}
                                    onKeyDown={e => { if (e.key === 'Enter') saveDop(); if (e.key === 'Escape') setDopEditing(false); }}
                                    className="w-full h-full text-center text-[11px] font-semibold bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-0 outline-none focus:ring-1 focus:ring-amber-400 rounded"
                                />
                            ) : (
                                <span className={isEditing ? 'hover:text-amber-500 transition-colors' : ''}>
                                    {dopShifts > 0 ? `+${dopShifts}` : (isEditing ? '0' : '–')}
                                </span>
                            )}
                        </div>

                        <div className={`w-[44px] ${h} ${cellCls} ${multiGeoShifts > 0 ? 'text-purple-600 dark:text-purple-400' : 'text-gray-400 dark:text-zinc-600'}`}>{multiGeoShifts > 0 ? multiGeoShifts : '–'}</div>
                    </div>
                );
            })()}
        </div>
    );
});

export default ManagerRow;
