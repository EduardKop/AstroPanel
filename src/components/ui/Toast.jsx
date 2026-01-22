import React, { useEffect } from 'react';
import { Check, Copy } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const Toast = ({ message, onClose, visible }) => {
    useEffect(() => {
        if (visible) {
            const timer = setTimeout(() => {
                onClose();
            }, 2000);
            return () => clearTimeout(timer);
        }
    }, [visible, onClose]);

    return (
        <AnimatePresence>
            {visible && (
                <motion.div
                    initial={{ opacity: 0, y: 50, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 20, scale: 0.9 }}
                    transition={{ type: "spring", stiffness: 400, damping: 25 }}
                    className="fixed bottom-6 left-6 z-50 pointer-events-none"
                >
                    <div className="bg-white border border-gray-200 dark:bg-[#1A1A1A] dark:border-[#333] text-gray-900 dark:text-white px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 pointer-events-auto">
                        <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center text-white shrink-0 shadow-lg shadow-green-500/30">
                            <Check size={14} strokeWidth={3} />
                        </div>
                        <div>
                            <h4 className="font-bold text-sm">Успешно</h4>
                            <p className="text-xs opacity-80 font-medium text-gray-500 dark:text-gray-300">{message}</p>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default Toast;
