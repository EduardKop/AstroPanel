import React, { useMemo } from 'react';
import { TrendingUp } from 'lucide-react';

const SalaryWidget = ({ 
  baseSalary = 350, 
  currency = '$', 
  period = 'Декабрь 2025',
  kpiList = [] 
}) => {

  const totalPotential = useMemo(() => {
    const kpiSum = kpiList.reduce((acc, item) => acc + item.reward, 0);
    return baseSalary + kpiSum;
  }, [baseSalary, kpiList]);

  return (
    <div className="w-full max-w-md mx-auto bg-white dark:bg-dark-card rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden font-sans transition-all duration-300">
      
      {/* ШАПКА: Базовый оклад */}
      <div className="bg-gradient-to-br from-gray-800 to-gray-900 text-white p-6 text-center relative">
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-white/20 px-3 py-1 rounded-full text-xs font-semibold tracking-wider uppercase backdrop-blur-sm">
          {period}
        </div>
        
        <div className="mt-4 flex flex-col items-center">
          <span className="text-gray-300 text-sm font-medium mb-1">Гарантированный оклад</span>
          <div className="text-5xl font-bold tracking-tight flex items-start">
            <span className="text-2xl mt-2 mr-1 opacity-60">{currency}</span>
            {baseSalary}
          </div>
        </div>
      </div>

      {/* СПИСОК KPI */}
      <div className="p-6 bg-gray-50 dark:bg-gray-800/30">
        <div className="flex items-center gap-2 mb-4 text-gray-500 dark:text-gray-400 text-xs font-bold uppercase tracking-wide">
          <TrendingUp size={16} />
          <span>Актуальные задачи (KPI)</span>
        </div>

        <div className="space-y-3">
          {kpiList.map((item) => (
            <div 
              key={item.id} 
              className="flex justify-between items-center p-4 bg-white dark:bg-dark-card border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm hover:border-blue-500 dark:hover:border-blue-500 transition-colors"
            >
              <div className="flex flex-col text-left">
                <span className="font-semibold text-gray-800 dark:text-gray-200 text-sm">
                  {item.title}
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Цель: {item.target}
                </span>
              </div>
              
              <div className="bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 px-3 py-1.5 rounded-lg font-bold text-sm border border-green-100 dark:border-green-800 whitespace-nowrap">
                +{currency}{item.reward}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ИТОГ */}
      <div className="p-5 border-t border-gray-100 dark:border-gray-700 bg-white dark:bg-dark-card flex justify-between items-center">
        <div className="flex flex-col text-left">
          <span className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase">Итого (OTE)</span>
          <span className="text-[10px] text-gray-400">при 100% выполнении</span>
        </div>
        <div className="text-2xl font-black text-blue-600 dark:text-blue-400">
          {currency}{totalPotential}
        </div>
      </div>
    </div>
  );
};

export default SalaryWidget;