import { motion } from 'framer-motion';
import { Moon, Sun } from 'lucide-react';

const ThemeToggle = ({ isDark, toggle }) => {
    return (
        <button
            onClick={toggle}
            className={`relative w-full flex items-center p-1 rounded-full border transition-colors duration-300 ${isDark
                ? 'bg-[#1A1A1A] border-[#333]'
                : 'bg-white border-gray-200'
                }`}
        >
            {/* Track Labels */}
            <div className="absolute inset-0 flex items-center justify-between px-1 text-[10px] font-medium z-0">
                <div className={`flex-1 flex items-center justify-center gap-1.5 ${isDark ? 'text-gray-500' : 'text-gray-900'}`}>
                    <Sun size={12} />
                    <span>Светлая</span>
                </div>
                <div className={`flex-1 flex items-center justify-center gap-1.5 ${isDark ? 'text-white' : 'text-gray-400'}`}>
                    <Moon size={12} />
                    <span>Темная</span>
                </div>
            </div>

            {/* Sliding Thumb */}
            <motion.div
                className="relative z-10 w-full flex items-center"
                initial={false}
                animate={{
                    justifyContent: isDark ? 'flex-end' : 'flex-start',
                }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
            >
                <div
                    className={`h-7 w-[50%] rounded-full shadow-sm flex items-center justify-center border transition-colors text-[10px] font-bold gap-1.5 ${isDark
                        ? 'bg-[#2A2A2A] border-[#444] text-white'
                        : 'bg-white border-gray-100 text-black'
                        }`}
                >
                    {isDark ? (
                        <>
                            <Moon size={12} />
                            <span>Темная</span>
                        </>
                    ) : (
                        <>
                            <Sun size={12} />
                            <span>Светлая</span>
                        </>
                    )}
                </div>
            </motion.div>

            <span className="sr-only">Toggle Theme</span>
        </button>
    );
};

export default ThemeToggle;
