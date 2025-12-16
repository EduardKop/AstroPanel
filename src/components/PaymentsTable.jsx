import React from 'react';

const PaymentsTable = ({ payments = [], loading, limit }) => {
  const displayData = limit ? payments.slice(0, limit) : payments;

  return (
    <div className="bg-white dark:bg-[#111] border border-gray-200 dark:border-[#333] rounded-lg overflow-hidden">
      <div className="px-4 py-2 border-b border-gray-200 dark:border-[#333] bg-gray-50 dark:bg-[#161616] flex justify-between items-center">
        <h3 className="font-semibold text-gray-900 dark:text-gray-200 text-xs uppercase tracking-wide">
          {limit ? 'Последние операции' : 'Транзакции'}
        </h3>
        {limit && <span className="text-[10px] text-gray-500">Топ {limit}</span>}
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-gray-600 dark:text-[#888]">
          <thead className="bg-white dark:bg-[#111] font-medium border-b border-gray-200 dark:border-[#333] text-gray-500 dark:text-[#666]">
            <tr>
              <th className="px-4 py-2 font-medium">Дата</th>
              <th className="px-4 py-2 font-medium">Менеджер</th>
              <th className="px-4 py-2 font-medium">Сумма</th>
              <th className="px-4 py-2 font-medium">Продукт</th>
              <th className="px-4 py-2 font-medium">ГЕО</th>
              <th className="px-4 py-2 font-medium text-right">Тип</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-[#222]">
            {loading ? (
              <tr><td colSpan="6" className="px-4 py-6 text-center">Загрузка...</td></tr>
            ) : displayData.length === 0 ? (
              <tr><td colSpan="6" className="px-4 py-6 text-center">Нет данных</td></tr>
            ) : (
              displayData.map((p, i) => (
                <tr key={i} className="hover:bg-gray-50 dark:hover:bg-[#1A1A1A] transition-colors">
                  <td className="px-4 py-2 font-mono text-gray-700 dark:text-[#AAA]">
                    {p.transactionDate}
                  </td>
                  <td className="px-4 py-2 text-gray-900 dark:text-white">
                    {p.manager}
                  </td>
                  <td className="px-4 py-2">
                    <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      {p.amountEUR} €
                    </span>
                  </td>
                  <td className="px-4 py-2">
                    {p.product}
                  </td>
                  <td className="px-4 py-2">
                    <span className="px-1.5 py-0.5 rounded-[4px] bg-gray-100 dark:bg-[#222] text-gray-600 dark:text-[#999] border border-gray-200 dark:border-[#333] font-bold text-[10px]">
                      {p.country}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-right">
                    {p.type}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PaymentsTable;