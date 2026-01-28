import { Moon, Sun } from 'lucide-react';

const ThemeToggle = ({ isDark, toggle }) => {
    return (
        <button
            onClick={toggle}
            className={`p-1.5 rounded transition-all duration-300 hover:opacity-80 ${isDark
                ? 'bg-[#222] text-white'
                : 'bg-gray-100 text-black'
                }`}
            title={isDark ? 'Светлая тема' : 'Темная тема'}
        >
            {isDark ? (
                <Moon size={14} />
            ) : (
                <Sun size={14} />
            )}
            <span className="sr-only">Toggle Theme</span>
        </button>
    );
};

export default ThemeToggle;
