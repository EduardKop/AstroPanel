import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';

export const DEFAULT_ASTRO_LOADING_STEPS = [
    'Загружаем данные',
    'Связываем справочники',
    'Считаем показатели',
    'Готовим страницу',
];

const variantClasses = {
    page: 'min-h-[420px] w-full flex items-center justify-center p-4 sm:p-8',
    fullscreen: 'fixed inset-0 z-[120] flex items-center justify-center p-4 sm:p-8 bg-gray-50/92 dark:bg-[#080808]/92 backdrop-blur-md',
    card: 'w-full flex items-center justify-center p-4',
    inline: 'inline-flex items-center gap-3',
};

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const AstroGlyph = ({ compact = false }) => {
    const sizeClass = compact ? 'h-5 w-5' : 'h-10 w-10';

    return (
        <span
            className={`astro-loading-spin block shrink-0 rounded-full border-2 border-gray-200 border-t-gray-950 dark:border-white/10 dark:border-t-white ${sizeClass}`}
            aria-hidden="true"
        />
    );
};

const AstroLoadingStatus = ({
    title = 'Сверяем звёздную карту',
    message = 'Подготавливаем данные панели',
    steps = DEFAULT_ASTRO_LOADING_STEPS,
    activeStep = 0,
    variant = 'page',
    className = '',
}) => {
    const safeSteps = Array.isArray(steps) && steps.length > 0 ? steps : DEFAULT_ASTRO_LOADING_STEPS;
    const currentStep = clamp(activeStep, 0, safeSteps.length - 1);
    const statusText = safeSteps[currentStep] || message;
    const isInline = variant === 'inline';
    const wrapperClass = variantClasses[variant] || variantClasses.page;

    if (isInline) {
        return (
            <div
                role="status"
                aria-live="polite"
                aria-label={`${title}. ${statusText}`}
                className={`${wrapperClass} ${className}`}
            >
                <AstroGlyph compact />
                <StatusText text={statusText} compact />
            </div>
        );
    }

    return (
        <section
            role="status"
            aria-live="polite"
            aria-label={`${title}. ${statusText}`}
            className={`${wrapperClass} ${className}`}
        >
            <motion.div
                initial={{ opacity: 0, y: 12, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.35, ease: 'easeOut' }}
                className="relative w-full max-w-[320px] overflow-visible px-2 py-4 sm:px-4 sm:py-6"
            >
                <div className="relative flex flex-col items-center text-center">
                    <AstroGlyph />
                    <div className="mt-4 w-full">
                        <StatusText text={statusText} />
                    </div>
                </div>
            </motion.div>
        </section>
    );
};

const StatusText = ({ text, compact = false }) => (
    <div className={`relative overflow-hidden ${compact ? 'h-5 w-44 min-w-0 max-w-full' : 'h-6 w-full'}`}>
        <AnimatePresence mode="wait" initial={false}>
            <motion.p
                key={text}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.22, ease: 'easeOut' }}
                className={`absolute inset-x-0 truncate font-medium text-gray-500 dark:text-gray-500 ${
                    compact ? 'text-xs leading-5 text-left' : 'text-sm leading-6 text-center'
                }`}
            >
                {text}
            </motion.p>
        </AnimatePresence>
    </div>
);

export default AstroLoadingStatus;
