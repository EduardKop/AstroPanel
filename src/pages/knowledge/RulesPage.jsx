import React from 'react';
import { Shield } from 'lucide-react';

const RulesPage = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8 animate-in fade-in zoom-in duration-300">
      <div className="w-20 h-20 bg-gray-100 dark:bg-[#1A1A1A] rounded-full flex items-center justify-center mb-6">
        <Shield size={40} className="text-gray-400" />
      </div>
      <h2 className="text-2xl font-bold dark:text-white mb-2">Правила работы</h2>
      <p className="text-gray-500 max-w-md mx-auto">
        Раздел находится в разработке. Здесь будет опубликован регламент работы, скрипты общения и правила безопасности.
      </p>
    </div>
  );
};

export default RulesPage;