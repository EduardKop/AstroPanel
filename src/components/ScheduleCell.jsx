import React, { memo } from 'react';

/**
 * ScheduleCell — supports two cell styles:
 *   'standard'  → left border accent + subtle bg tint
 *   'contrast'  → full solid color fill (bright, like old design)
 */
const ScheduleCell = memo(({
    dayIdx,
    isToday,
    isWeekend,
    isInteractive,
    canEdit,
    canMultiGeoEdit,
    isAdditionalEditing,
    geoConfigs,
    geos,
    countryMap,
    isCompact,
    cellStyle,
    onClick,
}) => {
    const h = isCompact ? 'h-[22px]' : 'h-[34px]';
    const minW = isCompact ? 'min-w-[20px]' : 'min-w-[30px]';
    const baseCell = [
        `${minW} flex-1 ${h} relative flex items-stretch`,
        isInteractive ? 'cursor-pointer' : '',
        isToday ? 'bg-amber-50 dark:bg-amber-900/20' : '',
        'border-r border-gray-100/80 dark:border-zinc-800/40 last:border-r-0',
    ].filter(Boolean).join(' ');

    const isContrast = cellStyle === 'contrast';

    return (
        <div
            data-day-idx={dayIdx}
            className={baseCell}
            onClick={onClick}
        >
            {geoConfigs.length >= 2 ? (
                <DualGeoCell
                    geoConfigs={geoConfigs}
                    geos={geos}
                    countryMap={countryMap}
                    canMultiGeoEdit={canMultiGeoEdit}
                    isCompact={isCompact}
                    isContrast={isContrast}
                />
            ) : geoConfigs.length === 1 ? (
                <SingleGeoCell
                    geoConfig={geoConfigs[0]}
                    geo={geos[0]}
                    countryMap={countryMap}
                    canEdit={canEdit}
                    canMultiGeoEdit={canMultiGeoEdit}
                    isCompact={isCompact}
                    isContrast={isContrast}
                />
            ) : (
                <EmptyCell
                    canEdit={canEdit}
                    canMultiGeoEdit={canMultiGeoEdit}
                    isAdditionalEditing={isAdditionalEditing}
                />
            )}
        </div>
    );
});

/* ── Sub-cells ── */

const SingleGeoCell = memo(({ geoConfig, geo, countryMap, canEdit, canMultiGeoEdit, isCompact, isContrast }) => {
    const flag = countryMap[geo]?.emoji || '';
    const flagSize = isCompact ? 'text-[9px]' : 'text-[11px]';
    const labelSize = isCompact ? 'text-[8px]' : 'text-[10px]';

    if (isContrast) {
        // Full fill style — solid bg, white text
        return (
            <div
                className={`relative flex-1 flex items-center justify-center gap-[3px] overflow-hidden rounded-sm mx-[1px] my-[2px]
                    ${canEdit ? 'hover:brightness-110' : ''}
                    ${canMultiGeoEdit ? 'ring-inset ring-1 ring-white/40' : ''}
                `}
                style={{ backgroundColor: geoConfig.color }}
            >
                <span className={`relative leading-none ${flagSize}`}>{flag}</span>
                <span className={`relative font-bold leading-none uppercase ${labelSize} text-white`}>
                    {geoConfig.label}
                </span>
            </div>
        );
    }

    // Standard style — left border + tint
    return (
        <div
            className={`relative flex-1 flex items-center ${isCompact ? 'justify-center' : 'gap-[3px] pl-[6px] pr-1'} overflow-hidden group/cell
                ${canEdit ? 'hover:brightness-95 dark:hover:brightness-110' : ''}
                ${canMultiGeoEdit ? 'ring-inset ring-1 ring-purple-400/60' : ''}
            `}
        >
            <div
                className={`absolute left-0 top-[2px] bottom-[2px] ${isCompact ? 'w-[2px]' : 'w-[3px] rounded-r-sm'}`}
                style={{ backgroundColor: geoConfig.color }}
            />
            <div
                className="absolute inset-0 opacity-[0.07] dark:opacity-[0.12]"
                style={{ backgroundColor: geoConfig.color }}
            />
            <span className={`relative leading-none ${flagSize}`}>{flag}</span>
            <span
                className={`relative font-semibold leading-none uppercase tracking-wide ${labelSize}`}
                style={{ color: geoConfig.color }}
            >
                {geoConfig.label}
            </span>
        </div>
    );
});

const DualGeoCell = memo(({ geoConfigs, geos, countryMap, canMultiGeoEdit, isCompact, isContrast }) => {
    return (
        <div className={`flex-1 flex flex-col overflow-hidden ${canMultiGeoEdit ? 'ring-inset ring-1 ring-purple-400/60' : ''}`}>
            {[0, 1].map(i => {
                const cfg = geoConfigs[i];
                const flag = countryMap[geos[i]]?.emoji || '';
                const flagSize = isCompact ? 'text-[8px]' : 'text-[9px]';
                const labelSize = isCompact ? 'text-[7px]' : 'text-[9px]';

                if (isContrast) {
                    return (
                        <div
                            key={i}
                            className={`relative flex-1 flex items-center justify-center gap-[2px] overflow-hidden ${i === 0 ? 'rounded-t-sm mt-[1px] mx-[1px]' : 'rounded-b-sm mb-[1px] mx-[1px]'}`}
                            style={{ backgroundColor: cfg.color }}
                        >
                            <span className={`relative leading-none ${flagSize} text-white`}>{flag}</span>
                            <span className={`relative font-bold leading-none uppercase ${labelSize} text-white`}>{cfg.label}</span>
                        </div>
                    );
                }

                return (
                    <div
                        key={i}
                        className={`relative flex-1 flex items-center overflow-hidden ${isCompact ? 'justify-center' : 'gap-[3px] pl-[6px] pr-1'}`}
                        style={{ borderTop: i === 1 ? '1px solid rgba(128,128,128,0.15)' : 'none' }}
                    >
                        <div
                            className={`absolute left-0 top-0 bottom-0 ${isCompact ? 'w-[2px]' : 'w-[3px]'}`}
                            style={{ backgroundColor: cfg.color }}
                        />
                        <div className="absolute inset-0 opacity-[0.07] dark:opacity-[0.12]" style={{ backgroundColor: cfg.color }} />
                        <span className={`relative leading-none ${flagSize}`}>{flag}</span>
                        <span className={`relative font-semibold leading-none uppercase ${labelSize}`} style={{ color: cfg.color }}>{cfg.label}</span>
                    </div>
                );
            })}
        </div>
    );
});

const EmptyCell = memo(({ canEdit, canMultiGeoEdit, isAdditionalEditing }) => {
    if (canEdit) {
        return (
            <div className="flex-1 flex items-center justify-center hover:bg-green-500/10 transition-colors">
                <div className="w-[18px] h-[2px] rounded-full bg-gray-200 dark:bg-zinc-700 group-hover:bg-green-400" />
            </div>
        );
    }
    if (canMultiGeoEdit) return <div className="flex-1 hover:bg-purple-500/10 transition-colors" />;
    if (isAdditionalEditing) return <div className="flex-1 hover:bg-emerald-500/10 transition-colors" />;
    return <div className="flex-1" />;
});

export default ScheduleCell;
