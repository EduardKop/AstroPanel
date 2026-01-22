import React, { useEffect } from 'react';
import { Check, Copy, XCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const Toast = ({ message, type = 'success', onClose, visible }) => {
    useEffect(() => {
        if (visible) {
            const timer = setTimeout(() => {
                onClose();
            }, 3000); // 3 seconds
            return () => clearTimeout(timer);
        }
    }, [visible, onClose]);

    const isError = type === 'error';

    return (
        <AnimatePresence>
            {visible && (
                <motion.div
                    initial={{ opacity: 0, y: 50, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 20, scale: 0.9 }}
                    transition={{ type: "spring", stiffness: 400, damping: 25 }}
                    className="fixed bottom-6 left-6 z-[9999] pointer-events-none"
                >
                    <div className={`border ${isError
                        ? 'bg-red-50 border-red-200 dark:bg-red-900/90 dark:border-red-800'
                        : 'bg-white border-gray-200 dark:bg-[#1A1A1A] dark:border-[#333]'
                        } text-gray-900 dark:text-white px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 pointer-events-auto`}>
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white shrink-0 shadow-lg ${isError
                            ? 'bg-red-500 shadow-red-500/30'
                            : 'bg-green-500 shadow-green-500/30'
                            }`}>
                            {isError ? <XCircle size={14} strokeWidth={3} /> : <Check size={14} strokeWidth={3} />}
                        </div>
                        <div>
                            <h4 className={`font-bold text-sm ${isError ? 'text-red-700 dark:text-red-300' : ''}`}>
                                {isError ? 'Ошибка' : 'Успешно'}
                            </h4>
                            <p className="text-xs opacity-80 font-medium text-gray-500 dark:text-gray-300">{message}</p>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default Toast;
