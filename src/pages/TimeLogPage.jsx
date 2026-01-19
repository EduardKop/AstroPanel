import React from 'react';
import { Clock, Construction } from 'lucide-react';

const TimeLogPage = () => {
    return (
        <div className="pb-10">
            {/* HEADER */}
            <div className="sticky top-0 z-20 bg-[#F5F5F5] dark:bg-[#0A0A0A] -mx-3 px-3 md:-mx-6 md:px-6 py-3 border-b border-transparent">
                <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold dark:text-white tracking-tight flex items-center gap-2">
                        <Clock size={18} className="text-blue-600 dark:text-blue-500" />
                        <span>Учёт времени</span>
                    </h2>
                </div>
            </div>

            {/* IN DEVELOPMENT MESSAGE */}
            <div className="mt-12 flex flex-col items-center justify-center text-center px-4">
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl p-8 max-w-md">
                    <Construction size={48} className="text-amber-500 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                        В разработке
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        Этот раздел находится в разработке и скоро будет доступен
                    </p>
                </div>
            </div>
        </div>
    );
};

export default TimeLogPage;
