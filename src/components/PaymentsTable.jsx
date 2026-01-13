import React from 'react';
import { DollarSign, Coins } from 'lucide-react';

const FLAGS = {
  UA: '🇺🇦', PL: '🇵🇱', IT: '🇮🇹', HR: '🇭🇷',
  BG: '🇧🇬', CZ: '🇨🇿', RO: '🇷🇴', LT: '🇱🇹',
  TR: '🇹🇷', FR: '🇫🇷', PT: '🇵🇹', DE: '🇩🇪',
  US: '🇺🇸', ES: '🇪🇸', SK: '🇸🇰', HU: '🇭🇺',
  KZ: '🇰🇿', UZ: '🇺🇿', MD: '🇲🇩'
};
const getFlag = (code) => FLAGS[code] || '🏳️';

const getPaymentBadgeStyle = (type) => {
  const t = (type || '').toLowerCase();
  if (t.includes('lava')) return 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20';
  if (t.includes('jet') || t.includes('fex')) return 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20';
  if (t.includes('iban')) return 'bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20';
  if (t.includes('req') || t.includes('рек') || t.includes('прям')) return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20';
  return 'bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/20';
};

const PaymentsTable = ({ payments, loading }) => {
  return (
    <div className="bg-white dark:bg-[#111] border border-gray-200 dark:border-[#333] rounded-lg overflow-hidden shadow-sm w-full min-w-0">
      <div className="overflow-x-auto w-full min-w-0">
        <table className="w-full text-left text-xs text-gray-600 dark:text-[#888] whitespace-nowrap">
          <thead className="bg-gray-50 dark:bg-[#161616] font-medium border-b border-gray-200 dark:border-[#333] text-gray-500 dark:text-[#666]">
            <tr>
              <th className="px-4 py-3">ID</th>
              <th className="px-4 py-3">Дата</th>
              <th className="px-4 py-3">Менеджер</th>
              <th className="px-4 py-3">ГЕО</th>
              <th className="px-4 py-3">Продукт</th>
              <th className="px-4 py-3">Метод</th>
              {/* ✅ ДВЕ ОТДЕЛЬНЫЕ КОЛОНКИ ДЛЯ СУММ */}
              <th className="px-4 py-3 text-right">Сумма (Local)</th>
              <th className="px-4 py-3 text-right">Сумма (EUR)</th>
              <th className="px-4 py-3 text-right">Статус</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-[#222]">
            {loading ? (
              <tr><td colSpan="9" className="px-4 py-8 text-center">Загрузка...</td></tr>
            ) : payments.length === 0 ? (
              <tr><td colSpan="9" className="px-4 py-8 text-center">Нет данных</td></tr>
            ) : (
              payments.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-[#1A1A1A] transition-colors group">
                  <td className="px-4 py-2 font-mono text-[10px] text-gray-400 max-w-[80px] truncate" title={p.id}>
                    #{p.id.slice(0, 8)}
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex flex-col">
                      <span className="font-medium text-gray-700 dark:text-gray-300">
                        {new Date(p.transactionDate).toLocaleDateString('ru-RU')}
                      </span>
                      <span className="text-[10px] text-gray-400">
                        {new Date(p.transactionDate).toLocaleTimeString('ru-RU', { hour: '2-digit', minute:'2-digit' })}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-2 font-bold text-gray-800 dark:text-gray-200">
                    {p.manager}
                  </td>
                  <td className="px-4 py-2">
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-gray-100 dark:bg-[#222] border border-gray-200 dark:border-[#333] text-[10px] font-bold text-gray-600 dark:text-gray-300">
                      {getFlag(p.country)} {p.country}
                    </span>
                  </td>
                  <td className="px-4 py-2">
                    <span className="text-gray-900 dark:text-white font-medium">{p.product}</span>
                  </td>
                  <td className="px-4 py-2">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${getPaymentBadgeStyle(p.type)}`}>
                      {p.type || 'Other'}
                    </span>
                  </td>
                  
                  {/* ✅ КОЛОНКА 1: LOCAL */}
                  <td className="px-4 py-2 text-right">
                    <div className="flex items-center justify-end gap-1 font-bold text-gray-900 dark:text-white">
                        <Coins size={10} className="text-gray-400" />
                        {(p.amountLocal || 0).toLocaleString('ru-RU', { maximumFractionDigits: 0 })}
                    </div>
                  </td>

                  {/* ✅ КОЛОНКА 2: EUR */}
                  <td className="px-4 py-2 text-right">
                    <div className="flex items-center justify-end gap-1 font-bold text-gray-900 dark:text-white">
                        <DollarSign size={10} className="text-gray-400" />
                        {Number(p.amountEUR).toLocaleString('ru-RU', { maximumFractionDigits: 2 })}
                    </div>
                  </td>

                  <td className="px-4 py-2 text-right">
                    <span className="text-emerald-500 text-[10px] font-bold uppercase bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                      {p.status}
                    </span>
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