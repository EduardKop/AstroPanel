import React from 'react';

// Maps project color names to Tailwind classes
const COLOR_MAP = {
    blue:   { bg: 'bg-blue-100 dark:bg-blue-900/30',   text: 'text-blue-700 dark:text-blue-300',   dot: 'bg-blue-500' },
    purple: { bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-700 dark:text-purple-300', dot: 'bg-purple-500' },
    green:  { bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-700 dark:text-emerald-300', dot: 'bg-emerald-500' },
    orange: { bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-700 dark:text-orange-300', dot: 'bg-orange-500' },
    red:    { bg: 'bg-red-100 dark:bg-red-900/30',   text: 'text-red-700 dark:text-red-300',   dot: 'bg-red-500' },
    pink:   { bg: 'bg-pink-100 dark:bg-pink-900/30', text: 'text-pink-700 dark:text-pink-300',  dot: 'bg-pink-500' },
    yellow: { bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-700 dark:text-yellow-300', dot: 'bg-yellow-500' },
    cyan:   { bg: 'bg-cyan-100 dark:bg-cyan-900/30', text: 'text-cyan-700 dark:text-cyan-300',  dot: 'bg-cyan-500' },
};

export const getProjectColors = (color) => COLOR_MAP[color] || COLOR_MAP.blue;

const ProjectBadge = ({ project, size = 'sm' }) => {
    if (!project) return null;
    const colors = getProjectColors(project.color);
    const isXs = size === 'xs';

    return (
        <span className={`inline-flex items-center gap-1 rounded-full font-semibold whitespace-nowrap
            ${colors.bg} ${colors.text}
            ${isXs ? 'text-[9px] px-1.5 py-0.5' : 'text-[10px] px-2 py-0.5'}`}>
            <span className={`rounded-full shrink-0 ${colors.dot} ${isXs ? 'w-1 h-1' : 'w-1.5 h-1.5'}`} />
            {project.name}
        </span>
    );
};

export default ProjectBadge;
