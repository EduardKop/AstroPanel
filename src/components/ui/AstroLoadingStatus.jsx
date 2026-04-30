import React from 'react';
import { CircleDot, Moon, Sparkles, Sun } from 'lucide-react';
import { motion } from 'framer-motion';

export const DEFAULT_ASTRO_LOADING_STEPS = [
    'Загружаем данные',
    'Связываем справочники',
    'Считаем показатели',
    'Готовим страницу',
];

const ZODIAC_MARKS = ['♈', '♌', '♎', '♒'];

const variantClasses = {
    page: 'min-h-[420px] w-full flex items-center justify-center p-4 sm:p-8',
    fullscreen: 'fixed inset-0 z-[120] flex items-center justify-center p-4 sm:p-8 bg-gray-50/90 dark:bg-[#05060A]/90 backdrop-blur-xl',
    card: 'w-full flex items-center justify-center p-4',
    inline: 'inline-flex items-center gap-3',
};

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const AstroGlyph = ({ compact = false }) => {
    const sizeClass = compact ? 'h-12 w-12' : 'h-28 w-28 sm:h-32 sm:w-32';
    const innerSize = compact ? 16 : 24;

    return (
        <div className={`relative shrink-0 ${sizeClass}`} aria-hidden="true">
            <div className="absolute inset-0 rounded-full border border-sky-400/25 dark:border-sky-300/25" />
            <div className="astro-loading-spin absolute inset-[10%] rounded-full border border-dashed border-amber-400/70 dark:border-amber-300/60" />
            <div className="astro-loading-spin-reverse absolute inset-[24%] rounded-full border border-indigo-400/40 dark:border-indigo-300/45" />

            <div className="absolute inset-0 flex items-center justify-center">
                <div className="relative flex h-[44%] w-[44%] items-center justify-center rounded-full border border-white/70 bg-white/85 text-sky-600 shadow-[0_0_28px_rgba(14,165,233,0.22)] dark:border-white/10 dark:bg-[#10131C]/90 dark:text-sky-200">
                    <Moon size={innerSize} strokeWidth={1.8} />
                    <Sparkles
                        size={compact ? 10 : 14}
                        className="absolute -right-1 -top-1 text-amber-400 dark:text-amber-300"
                        strokeWidth={2.2}
                    />
                </div>
            </div>

            {!compact && (
                <div className="astro-loading-orbit absolute inset-0">
                    {ZODIAC_MARKS.map((mark, index) => (
                        <span
                            key={mark}
                            className="absolute flex h-7 w-7 items-center justify-center rounded-full border border-gray-200/80 bg-white/90 text-xs font-semibold text-gray-600 shadow-sm dark:border-white/10 dark:bg-[#111521]/90 dark:text-gray-200"
                            style={{
                                left: `${50 + Math.cos((index * Math.PI) / 2) * 43}%`,
                                top: `${50 + Math.sin((index * Math.PI) / 2) * 43}%`,
                                transform: 'translate(-50%, -50%)',
                            }}
                        >
                            {mark}
                        </span>
                    ))}
                </div>
            )}
        </div>
    );
};

const AstroLoadingStatus = ({
    title = 'Сверяем звёздную карту',
    message = 'Подготавливаем данные панели',
    steps = DEFAULT_ASTRO_LOADING_STEPS,
    activeStep = 0,
    progress,
    variant = 'page',
    showSteps = true,
    className = '',
}) => {
    const safeSteps = Array.isArray(steps) && steps.length > 0 ? steps : DEFAULT_ASTRO_LOADING_STEPS;
    const currentStep = clamp(activeStep, 0, safeSteps.length - 1);
    const hasProgress = typeof progress === 'number' && Number.isFinite(progress);
    const safeProgress = hasProgress ? clamp(progress, 0, 100) : null;
    const isInline = variant === 'inline';
    const wrapperClass = variantClasses[variant] || variantClasses.page;

    if (isInline) {
        return (
            <div role="status" aria-live="polite" className={`${wrapperClass} ${className}`}>
                <AstroGlyph compact />
                <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-gray-900 dark:text-white">{title}</p>
                    <p className="truncate text-xs font-medium text-gray-500 dark:text-gray-400">
                        {safeSteps[currentStep] || message}
                    </p>
                </div>
            </div>
        );
    }

    return (
        <section role="status" aria-live="polite" className={`${wrapperClass} ${className}`}>
            <motion.div
                initial={{ opacity: 0, y: 12, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.35, ease: 'easeOut' }}
                className="relative w-full max-w-[520px] overflow-visible px-2 py-4 sm:px-4 sm:py-6"
            >
                <div className="relative flex flex-col items-center text-center">
                    <div className="mb-5">
                        <AstroGlyph />
                    </div>

                    <h2 className="text-xl font-black text-gray-950 dark:text-white sm:text-2xl">{title}</h2>
                    <p className="mt-2 max-w-sm text-sm font-medium leading-6 text-gray-500 dark:text-gray-400">
                        {message}
                    </p>

                    <div className="mt-7 w-full">
                        <div className="mb-2 flex items-center justify-between gap-3 text-xs font-bold text-gray-500 dark:text-gray-400">
                            <span className="flex min-w-0 items-center gap-2">
                                <Sun size={14} className="shrink-0 text-amber-500 dark:text-amber-300" />
                                <span className="truncate">{safeSteps[currentStep]}</span>
                            </span>
                            <span className="shrink-0 text-gray-400 dark:text-gray-500">
                                {hasProgress ? `${Math.round(safeProgress)}%` : `${currentStep + 1}/${safeSteps.length}`}
                            </span>
                        </div>

                        <div className="h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-white/[0.06]">
                            <div
                                className={`h-full rounded-full bg-gradient-to-r from-sky-500 via-amber-400 to-emerald-400 shadow-[0_0_18px_rgba(14,165,233,0.28)] ${hasProgress ? '' : 'astro-loading-progress'}`}
                                style={hasProgress ? { width: `${safeProgress}%` } : undefined}
                            />
                        </div>
                    </div>

                    {showSteps && (
                        <motion.div
                            initial="hidden"
                            animate="visible"
                            variants={{
                                hidden: {},
                                visible: { transition: { staggerChildren: 0.08, delayChildren: 0.08 } },
                            }}
                            className="mt-5 flex w-full flex-col gap-1.5 text-left"
                        >
                            {safeSteps.map((step, index) => {
                                const isDone = index < currentStep;
                                const isActive = index === currentStep;

                                return (
                                    <motion.div
                                        key={`${step}-${index}`}
                                        variants={{
                                            hidden: { opacity: 0, y: -8 },
                                            visible: { opacity: 1, y: 0 },
                                        }}
                                        transition={{ duration: 0.22, ease: 'easeOut' }}
                                        className={`flex min-h-[34px] items-center gap-3 border-l-2 px-3 py-1.5 text-xs font-bold transition-colors ${
                                            isActive
                                                ? 'border-sky-400 text-sky-700 dark:border-sky-300 dark:text-sky-200'
                                                : isDone
                                                    ? 'border-emerald-400 text-emerald-700 dark:border-emerald-300 dark:text-emerald-200'
                                                    : 'border-gray-200 text-gray-400 dark:border-white/10 dark:text-gray-500'
                                        }`}
                                    >
                                        <CircleDot
                                            size={13}
                                            className={`shrink-0 ${isActive ? 'astro-loading-pulse' : ''}`}
                                        />
                                        <span className="min-w-0 truncate">{step}</span>
                                    </motion.div>
                                );
                            })}
                        </motion.div>
                    )}
                </div>
            </motion.div>
        </section>
    );
};

export default AstroLoadingStatus;
