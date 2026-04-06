import React from 'react';
import { Monitor } from 'lucide-react';

const ManagerDevicesPage = () => {
    return (
        <div className="pb-10">
            <div className="mb-6 px-1">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <Monitor className="w-6 h-6 text-blue-600" />
                    Устройства
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Мониторинг устройств сотрудников
                </p>
            </div>

            <div className="flex flex-col items-center justify-center py-24 text-center">
                <Monitor className="w-12 h-12 text-gray-300 dark:text-[#333] mb-4" />
                <p className="text-sm text-gray-400 dark:text-[#555]">Раздел в разработке</p>
            </div>
        </div>
    );
};

export default ManagerDevicesPage;
