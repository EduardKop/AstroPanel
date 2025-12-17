import React, { useMemo } from 'react';
import { useAppStore } from '../store/appStore'; // ✅ Подключаем Store
import { Gift, Calendar, Clock, User, PartyPopper, Sparkles } from 'lucide-react';

const BirthdaysPage = () => {
  // ✅ Берем данные сразу из глобального хранилища
  const { managers, isLoading } = useAppStore();

  const processedList = useMemo(() => {
    // 1. Фильтруем только тех, у кого указана дата рождения
    const validManagers = managers.filter(m => m.birth_date);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const currentYear = today.getFullYear();

    return validManagers.map(mgr => {
      const birthDate = new Date(mgr.birth_date);
      let nextBirthday = new Date(currentYear, birthDate.getMonth(), birthDate.getDate());
      let ageTurning = currentYear - birthDate.getFullYear();

      // Если день рождения в этом году уже прошел, смотрим следующий год
      if (nextBirthday < today) {
        nextBirthday.setFullYear(currentYear + 1);
        ageTurning += 1;
      }

      const diffTime = nextBirthday - today;
      const daysUntil = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      // Считаем стаж
      const workStart = new Date(mgr.created_at);
      const workDiff = Math.abs(today - workStart);
      const workDays = Math.ceil(workDiff / (1000 * 60 * 60 * 24));

      return { ...mgr, daysUntil, ageTurning, nextBirthday, workDays };
    }).sort((a, b) => a.daysUntil - b.daysUntil);
  }, [managers]); // Пересчитываем только если изменился список менеджеров

  if (isLoading && processedList.length === 0) {
    return <div className="p-10 text-center text-xs text-gray-500 font-mono">Загрузка календаря...</div>;
  }

  return (
    <div className="pb-10">
      
      {/* HEADER */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold dark:text-white flex items-center gap-2">
            <Gift className="text-pink-500" size={20} /> Календарь праздников
          </h2>
          <p className="text-gray-500 dark:text-gray-400 text-xs mt-1">Ближайшие дни рождения сотрудников</p>
        </div>
      </div>

      {/* TABLE */}
      <div className="bg-white dark:bg-[#111] border border-gray-200 dark:border-[#333] rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-gray-600 dark:text-[#888]">
            <thead className="bg-gray-50 dark:bg-[#161616] font-medium border-b border-gray-200 dark:border-[#333] text-gray-500 dark:text-[#666]">
              <tr>
                <th className="px-6 py-3 font-semibold">Сотрудник</th>
                <th className="px-6 py-3 text-center font-semibold">Возраст</th>
                <th className="px-6 py-3 font-semibold">Дата</th>
                <th className="px-6 py-3 font-semibold">В компании</th>
                <th className="px-6 py-3 text-right font-semibold">Осталось</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-[#222]">
              {processedList.length === 0 ? (
                 <tr>
                   <td colSpan="5" className="px-6 py-8 text-center text-gray-400">
                     Нет данных о днях рождения
                   </td>
                 </tr>
              ) : (
                processedList.map((mgr) => {
                  const isToday = mgr.daysUntil === 0;
                  const isSoon = mgr.daysUntil > 0 && mgr.daysUntil <= 14;

                  return (
                    <tr 
                      key={mgr.id} 
                      className={`transition-colors duration-200 ${
                        isToday 
                          ? 'bg-pink-50/40 dark:bg-pink-900/10 hover:bg-pink-50/60 dark:hover:bg-pink-900/20' 
                          : 'hover:bg-gray-50 dark:hover:bg-[#1A1A1A]'
                      }`}
                    >
                      {/* Сотрудник */}
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            {mgr.avatar_url ? (
                              <img 
                                src={mgr.avatar_url} 
                                className={`w-9 h-9 rounded-lg object-cover border ${isToday ? 'border-pink-300 dark:border-pink-700' : 'border-gray-200 dark:border-[#444]'}`} 
                              />
                            ) : (
                              <div className="w-9 h-9 rounded-lg bg-gray-100 dark:bg-[#222] flex items-center justify-center text-gray-500">
                                  <User size={14}/>
                              </div>
                            )}
                            {isToday && (
                              <div className="absolute -top-1.5 -right-1.5 bg-white dark:bg-[#111] rounded-full p-0.5 shadow-sm">
                                <span className="text-sm">🎂</span>
                              </div>
                            )}
                          </div>
                          <div>
                              <div className={`font-bold flex items-center gap-2 ${isToday ? 'text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-200'}`}>
                                {mgr.name}
                                {isToday && <Sparkles size={12} className="text-yellow-500 fill-yellow-500 animate-pulse" />}
                              </div>
                              <div className="text-[10px] text-gray-400">{mgr.role}</div>
                          </div>
                        </div>
                      </td>
                      
                      {/* Возраст */}
                      <td className="px-6 py-3 text-center">
                        <span className={`px-2 py-1 rounded-md font-mono font-bold ${
                          isToday 
                            ? 'bg-white dark:bg-pink-500/20 text-pink-600 dark:text-pink-300' 
                            : 'text-gray-600 dark:text-gray-400'
                        }`}>
                          {mgr.ageTurning}
                        </span>
                      </td>

                      {/* Дата */}
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-2">
                          <Calendar size={12} className={isToday ? "text-pink-400" : "text-gray-400"} />
                          <span className={isToday ? "font-bold text-gray-900 dark:text-white" : "text-gray-600 dark:text-gray-300"}>
                            {mgr.nextBirthday.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}
                          </span>
                        </div>
                      </td>

                      {/* Стаж */}
                      <td className="px-6 py-3 font-mono text-gray-500 text-[11px]">
                        <div className="flex items-center gap-1.5" title="Дней в компании">
                          <Clock size={12} className="opacity-50" />
                          {mgr.workDays} дн.
                        </div>
                      </td>

                      {/* Таймер */}
                      <td className="px-6 py-3 text-right">
                        {isToday ? (
                          <span className="inline-flex items-center gap-1.5 text-pink-700 dark:text-pink-300 font-bold bg-pink-100 dark:bg-pink-900/30 px-2.5 py-1 rounded-md text-[10px] uppercase tracking-wide border border-pink-200 dark:border-pink-800">
                            <PartyPopper size={12} /> Сегодня
                          </span>
                        ) : isSoon ? (
                          <span className="inline-flex text-purple-600 dark:text-purple-300 font-bold bg-purple-50 dark:bg-purple-900/20 px-2.5 py-1 rounded-md text-[10px] border border-purple-100 dark:border-purple-800/50">
                            Через {mgr.daysUntil} дн.
                          </span>
                        ) : (
                          <span className="text-gray-500 dark:text-gray-200 font-mono text-[11px]">
                            {mgr.daysUntil} дн.
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default BirthdaysPage;