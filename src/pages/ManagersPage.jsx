import React, { useState, useMemo, useEffect } from 'react';
import { useAppStore } from '../store/appStore';
import {
  Filter, Calendar, RotateCcw, XCircle,
  ArrowUpDown, Globe, ShoppingCart, DollarSign,
  Briefcase, Clock, Percent, Wallet
} from 'lucide-react';
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { extractUTCDate, getKyivDateString } from '../utils/kyivTime';

// --- КОМПОНЕНТЫ ---
import { DenseSelect } from '../components/ui/FilterSelect';

const getLastWeekRange = () => {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - 7);
  return [start, end];
};

// Хелпер для дат (Kyiv timezone)
const toYMD = (date) => {
  if (!date) return '';
  return getKyivDateString(date);
};

// Custom Desktop Date Range Picker
const CustomDateRangePicker = ({ startDate, endDate, onChange, onReset }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [viewDate, setViewDate] = useState(startDate || new Date());
  const [selecting, setSelecting] = useState('start');
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0 });
  const triggerRef = React.useRef(null);

  const DAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
  const MONTHS = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];

  const formatDate = (date) => date ? `${String(date.getDate()).padStart(2, '0')}.${String(date.getMonth() + 1).padStart(2, '0')}.${date.getFullYear()}` : '';
  const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year, month) => { const day = new Date(year, month, 1).getDay(); return day === 0 ? 6 : day - 1; };
  const isSameDay = (d1, d2) => d1 && d2 && d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth() && d1.getDate() === d2.getDate();
  const isInRange = (date) => startDate && endDate && date >= startDate && date <= endDate;
  const isToday = (date) => isSameDay(date, new Date());

  const openCalendar = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setDropdownPos({ top: rect.bottom + 8, left: rect.right - 220 });
    }
    setIsOpen(true); setSelecting('start');
  };

  const handleDayClick = (day) => {
    const clickedDate = new Date(viewDate.getFullYear(), viewDate.getMonth(), day);
    if (selecting === 'start') { onChange([clickedDate, null]); setSelecting('end'); }
    else { clickedDate < startDate ? onChange([clickedDate, startDate]) : onChange([startDate, clickedDate]); setSelecting('start'); setIsOpen(false); }
  };

  const setYesterday = () => { const y = new Date(); y.setDate(y.getDate() - 1); onChange([y, y]); setIsOpen(false); };
  const setToday = () => { onChange([new Date(), new Date()]); setIsOpen(false); };
  const setLastWeek = () => {
    const today = new Date(); const dayOfWeek = today.getDay();
    const thisMonday = new Date(today); thisMonday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
    const lastMonday = new Date(thisMonday); lastMonday.setDate(thisMonday.getDate() - 7);
    const lastSunday = new Date(lastMonday); lastSunday.setDate(lastMonday.getDate() + 6);
    onChange([lastMonday, lastSunday]); setIsOpen(false);
  };
  const setCurrentWeek = () => {
    const today = new Date(); const dayOfWeek = today.getDay();
    const monday = new Date(today); monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
    const sunday = new Date(monday); sunday.setDate(monday.getDate() + 6);
    onChange([monday, sunday]); setIsOpen(false);
  };
  const setLastMonth = () => { const t = new Date(); onChange([new Date(t.getFullYear(), t.getMonth() - 1, 1), new Date(t.getFullYear(), t.getMonth(), 0)]); setIsOpen(false); };
  const setCurrentMonth = () => { const t = new Date(); onChange([new Date(t.getFullYear(), t.getMonth(), 1), new Date(t.getFullYear(), t.getMonth() + 1, 0)]); setIsOpen(false); };

  const prevMonth = () => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
  const nextMonth = () => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);

  const displayText = () => {
    if (startDate && endDate) return `${formatDate(startDate)} - ${formatDate(endDate)}`;
    if (startDate) return `${formatDate(startDate)} - ...`;
    return 'Период';
  };

  return (
    <div className="relative flex-1 hidden md:block">
      <div ref={triggerRef} onClick={openCalendar} className="flex items-center bg-white dark:bg-[#111] border border-gray-200 dark:border-[#333] rounded-[6px] px-2 py-0.5 shadow-sm h-[34px] cursor-pointer hover:border-gray-400 dark:hover:border-[#555] transition-colors w-full">
        <Calendar size={12} className="text-gray-400 mr-2 shrink-0" />
        <span className={`flex-1 text-xs font-medium text-center ${startDate ? 'text-gray-900 dark:text-white' : 'text-gray-400'}`}>{displayText()}</span>
        <button onClick={(e) => { e.stopPropagation(); onReset(); }} className="ml-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"><RotateCcw size={10} /></button>
      </div>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-[100]" onClick={() => setIsOpen(false)} />
          <div className="fixed bg-white dark:bg-[#111] border border-gray-200 dark:border-[#333] rounded-xl shadow-xl z-[101] p-2.5 w-[220px]" style={{ top: dropdownPos.top, left: dropdownPos.left }}>
            <div className="space-y-1 mb-2">
              <div className="flex gap-1">
                <button onClick={setYesterday} className="flex-1 text-[10px] font-medium py-1 px-1 rounded-md bg-gray-100 dark:bg-[#222] text-gray-600 dark:text-gray-300 hover:bg-blue-100 dark:hover:bg-blue-900/30 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Вчера</button>
                <button onClick={setToday} className="flex-1 text-[10px] font-medium py-1 px-1 rounded-md bg-gray-100 dark:bg-[#222] text-gray-600 dark:text-gray-300 hover:bg-blue-100 dark:hover:bg-blue-900/30 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Сегодня</button>
              </div>
              <div className="flex gap-1">
                <button onClick={setLastWeek} className="flex-1 text-[10px] font-medium py-1 px-1 rounded-md bg-gray-100 dark:bg-[#222] text-gray-600 dark:text-gray-300 hover:bg-blue-100 dark:hover:bg-blue-900/30 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Пр. нед.</button>
                <button onClick={setCurrentWeek} className="flex-1 text-[10px] font-medium py-1 px-1 rounded-md bg-gray-100 dark:bg-[#222] text-gray-600 dark:text-gray-300 hover:bg-blue-100 dark:hover:bg-blue-900/30 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Тек. нед.</button>
              </div>
              <div className="flex gap-1">
                <button onClick={setLastMonth} className="flex-1 text-[10px] font-medium py-1 px-1 rounded-md bg-gray-100 dark:bg-[#222] text-gray-600 dark:text-gray-300 hover:bg-blue-100 dark:hover:bg-blue-900/30 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Пр. мес.</button>
                <button onClick={setCurrentMonth} className="flex-1 text-[10px] font-medium py-1 px-1 rounded-md bg-gray-100 dark:bg-[#222] text-gray-600 dark:text-gray-300 hover:bg-blue-100 dark:hover:bg-blue-900/30 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Тек. мес.</button>
              </div>
            </div>
            <div className="flex items-center justify-between mb-2">
              <button onClick={prevMonth} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-[#222] text-gray-500 dark:text-gray-400 transition-colors"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg></button>
              <span className="text-xs font-bold text-gray-900 dark:text-white">{MONTHS[month]} {year}</span>
              <button onClick={nextMonth} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-[#222] text-gray-500 dark:text-gray-400 transition-colors"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg></button>
            </div>
            <div className="grid grid-cols-7 gap-0.5 mb-0.5">{DAYS.map(d => <div key={d} className="text-[9px] font-bold text-gray-400 dark:text-gray-500 text-center py-0.5">{d}</div>)}</div>
            <div className="grid grid-cols-7 gap-0.5">
              {Array.from({ length: firstDay }).map((_, i) => <div key={`empty-${i}`} className="w-7 h-7" />)}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1; const date = new Date(year, month, day);
                const isStart = isSameDay(date, startDate); const isEnd = isSameDay(date, endDate);
                const inRange = isInRange(date); const today = isToday(date);
                let cls = 'w-7 h-7 flex items-center justify-center text-[11px] font-medium rounded cursor-pointer transition-all ';
                if (isStart || isEnd) cls += 'bg-blue-500 text-white font-bold ';
                else if (inRange) cls += 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 ';
                else if (today) cls += 'ring-1 ring-blue-400 text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-[#222] ';
                else cls += 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#222] ';
                return <button key={day} onClick={() => handleDayClick(day)} className={cls}>{day}</button>;
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

const ManagersPage = () => {
  const { payments, kpiRates, kpiSettings, managers, managerRates } = useAppStore();

  const [dateRange, setDateRange] = useState(getLastWeekRange());
  const [startDate, endDate] = dateRange;
  const [filters, setFilters] = useState({ country: [], product: [], type: [] });
  const [sortConfig, setSortConfig] = useState({ key: 'salesCount', direction: 'desc' });

  const uniqueValues = useMemo(() => {
    const getUnique = (key) => [...new Set(payments.map(p => p[key]).filter(Boolean))].sort();
    return {
      countries: getUnique('country'),
      products: getUnique('product'),
      types: getUnique('type')
    };
  }, [payments]);

  const resetFilters = () => {
    setFilters({ country: [], product: [], type: [] });
    setDateRange(getLastWeekRange());
  };

  // Строим map индивидуальных ставок
  const mgrRatesMap = useMemo(() => {
    const map = {};
    (managerRates || []).forEach(r => {
      if (!map[r.manager_id]) map[r.manager_id] = {};
      const key = r.month || 'default';
      map[r.manager_id][key] = r;
    });
    return map;
  }, [managerRates]);

  // Основная логика
  const managersStats = useMemo(() => {
    // 1. Фильтрация (Raw Mode)
    const startStr = startDate ? toYMD(startDate) : '0000-00-00';
    const endStr = endDate ? toYMD(endDate) : '9999-99-99';

    const filtered = payments.filter(item => {
      if (!item.transactionDate) return false;
      const dbDateStr = extractUTCDate(item.transactionDate);

      if (dbDateStr < startStr || dbDateStr > endStr) return false;
      if (filters.country.length > 0 && !filters.country.includes(item.country)) return false;
      if (filters.product.length > 0 && !filters.product.includes(item.product)) return false;
      if (filters.type.length > 0 && !filters.type.includes(item.type)) return false;
      return true;
    });

    // Хелпер: получить ставку по ID менеджера
    // Используем дефолтную ставку, т.к. тут диапазон дат (не привязан к конкретному месяцу)
    const getManagerRate = (managerId) => {
      const mRates = mgrRatesMap[managerId] || {};
      const defaultRate = mRates['default'];
      return {
        base_rate: Number(defaultRate?.base_rate || 0),
        bonus: Number(defaultRate?.bonus || 0),
        penalty: Number(defaultRate?.penalty || 0),
        hasIndividualRate: !!defaultRate
      };
    };

    const baseSalary = Number(kpiSettings?.base_salary || 0);

    // 2. Группировка по менеджерам
    const statsByName = {};
    filtered.forEach(p => {
      const name = p.manager || 'Неизвестно';
      if (!statsByName[name]) {
        statsByName[name] = {
          count: 0,
          sum: 0,
          countries: new Set(),
          salaryBonus: 0,
          managerId: p.managerId || null
        };
      }
      statsByName[name].count += 1;
      statsByName[name].sum += (p.amountEUR || 0);
      if (p.country) statsByName[name].countries.add(p.country);
      if (p.managerId) statsByName[name].managerId = p.managerId;

      // Расчет бонуса за продажу
      const rateObj = kpiRates.find(r =>
        p.product.toLowerCase().includes(r.product_name.toLowerCase())
      );
      const bonus = rateObj ? rateObj.rate : 0;
      statsByName[name].salaryBonus += bonus;
    });

    // 3. Формирование списка
    return Object.entries(statsByName).map(([name, data]) => {
      // Индивидуальная ставка
      const individualRate = data.managerId ? getManagerRate(data.managerId) : { base_rate: 0, bonus: 0, penalty: 0, hasIndividualRate: false };
      const effectiveBaseRate = individualRate.hasIndividualRate ? individualRate.base_rate : baseSalary;
      const indBonus = individualRate.bonus;
      const indPenalty = individualRate.penalty;

      const totalSalary = effectiveBaseRate + data.salaryBonus + indBonus - indPenalty;

      // Роль из managers
      const mgrObj = managers.find(m => m.id === data.managerId);
      const role = mgrObj?.role || 'Manager';

      return {
        name,
        role,
        shifts: '-',
        geoDisplay: Array.from(data.countries).slice(0, 3).join(', ') + (data.countries.size > 3 ? '...' : ''),
        salesCount: data.count,
        salesSum: data.sum,
        cr: 0,
        salary: totalSalary,
        baseRate: effectiveBaseRate,
        productBonus: data.salaryBonus,
        individualBonus: indBonus,
        individualPenalty: indPenalty,
        hasIndividualRate: individualRate.hasIndividualRate
      };
    }).sort((a, b) => {
      if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === 'asc' ? -1 : 1;
      if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [payments, startDate, endDate, filters, sortConfig, kpiRates, kpiSettings, mgrRatesMap, managers]);

  const requestSort = (key) => setSortConfig({ key, direction: sortConfig.key === key && sortConfig.direction === 'desc' ? 'asc' : 'desc' });
  const SortIcon = ({ col }) => sortConfig.key === col ? <ArrowUpDown size={10} className={`ml-1 ${sortConfig.direction === 'asc' ? 'rotate-180' : ''}`} /> : <ArrowUpDown size={10} className="ml-1 opacity-20" />;

  return (
    <div className="animate-in fade-in zoom-in duration-300 pb-10">

      {/* HEADER & FILTERS */}
      <div className="flex flex-col md:flex-row items-end justify-between mb-4 gap-3">
        <div>
          <h2 className="text-lg font-bold dark:text-white text-gray-900 tracking-tight flex items-center gap-2">
            <Briefcase size={18} className="text-blue-500" /> Эффективность менеджеров
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <DenseSelect label="ГЕО" value={filters.country} options={uniqueValues.countries} onChange={(val) => setFilters(p => ({ ...p, country: val }))} />
          <DenseSelect label="Продукт" value={filters.product} options={uniqueValues.products} onChange={(val) => setFilters(p => ({ ...p, product: val }))} />
          <DenseSelect label="Тип" value={filters.type} options={uniqueValues.types} onChange={(val) => setFilters(p => ({ ...p, type: val }))} />

          <CustomDateRangePicker
            startDate={startDate}
            endDate={endDate}
            onChange={(u) => setDateRange(u)}
            onReset={() => setDateRange(getLastWeekRange())}
          />

          <button onClick={resetFilters} className="bg-gray-200 dark:bg-[#1A1A1A] hover:bg-gray-300 dark:hover:bg-[#333] text-gray-500 dark:text-gray-400 p-1.5 rounded-[6px] transition-colors h-[34px] w-[34px] flex items-center justify-center" title="Сбросить фильтры">
            <XCircle size={14} />
          </button>
        </div>
      </div>

      {/* TABLE */}
      <div className="bg-white dark:bg-[#111] border border-gray-200 dark:border-[#333] rounded-lg overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-gray-600 dark:text-[#888]">
            <thead className="bg-gray-50 dark:bg-[#161616] font-medium border-b border-gray-200 dark:border-[#333] text-gray-500 dark:text-[#666]">
              <tr>
                <th className="px-4 py-2 cursor-pointer hover:text-black dark:hover:text-white" onClick={() => requestSort('name')}>
                  <div className="flex items-center">Менеджер <SortIcon col="name" /></div>
                </th>
                <th className="px-4 py-2 hidden sm:table-cell"><div className="flex items-center gap-1"><Briefcase size={10} /> Роль</div></th>
                <th className="px-4 py-2"><div className="flex items-center gap-1"><Globe size={10} /> ГЕО</div></th>
                {/* Скрываем смены и CR пока нет реальных данных */}
                {/* <th className="px-4 py-2 text-center hidden sm:table-cell"><div className="flex items-center justify-center gap-1"><Clock size={10}/> Смены</div></th> */}
                {/* <th className="px-4 py-2 text-center cursor-pointer hover:text-black dark:hover:text-white" onClick={() => requestSort('cr')}>
                  <div className="flex items-center justify-center gap-1"><Percent size={10}/> CR <SortIcon col="cr"/></div>
                </th> */}
                <th className="px-4 py-2 text-center cursor-pointer hover:text-black dark:hover:text-white" onClick={() => requestSort('salesCount')}>
                  <div className="flex items-center justify-center gap-1"><ShoppingCart size={10} /> Продаж <SortIcon col="salesCount" /></div>
                </th>
                <th className="px-4 py-2 text-right cursor-pointer hover:text-black dark:hover:text-white" onClick={() => requestSort('salesSum')}>
                  <div className="flex items-center justify-end gap-1"><DollarSign size={10} /> Оборот <SortIcon col="salesSum" /></div>
                </th>
                <th className="px-4 py-2 text-right">Ставка</th>
                <th className="px-4 py-2 text-right text-emerald-600 dark:text-emerald-400">+Надб.</th>
                <th className="px-4 py-2 text-right text-red-400">−Штраф</th>
                <th className="px-4 py-2 text-right cursor-pointer hover:text-black dark:hover:text-white" onClick={() => requestSort('salary')}>
                  <div className="flex items-center justify-end gap-1"><Wallet size={10} /> Итого <SortIcon col="salary" /></div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-[#222]">
              {managersStats.length === 0 ? (
                <tr><td colSpan="10" className="px-4 py-8 text-center">Нет данных</td></tr>
              ) : (
                managersStats.map((mgr) => {
                  return (
                    <tr key={mgr.name} className="hover:bg-gray-50 dark:hover:bg-[#1A1A1A] transition-colors group">

                      <td className="px-4 py-2">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded bg-gray-100 dark:bg-[#222] flex items-center justify-center text-[10px] font-bold text-gray-500 dark:text-[#AAA]">
                            {mgr.name[0]}
                          </div>
                          <span className="font-medium text-gray-900 dark:text-gray-200">{mgr.name}</span>
                        </div>
                      </td>

                      <td className="px-4 py-2 hidden sm:table-cell">
                        <span className="text-[10px] bg-gray-50 dark:bg-[#222] border border-gray-100 dark:border-[#333] px-1.5 py-0.5 rounded text-gray-500">
                          {mgr.role}
                        </span>
                      </td>

                      <td className="px-4 py-2 text-[10px] font-mono text-gray-500">
                        {mgr.geoDisplay || '-'}
                      </td>

                      {/* Скрываем пока нет данных */}
                      {/* <td className="px-4 py-2 text-center font-mono hidden sm:table-cell">{mgr.shifts}</td> */}
                      {/* <td className="px-4 py-2 text-center"><span className="text-xs font-mono text-gray-400">-</span></td> */}

                      <td className="px-4 py-2 text-center">
                        <span className="inline-block min-w-[24px] text-center font-mono font-bold text-gray-900 dark:text-white bg-gray-100 dark:bg-[#222] rounded px-1 py-0.5 text-[11px]">
                          {mgr.salesCount}
                        </span>
                      </td>

                      <td className="px-4 py-2 text-right font-mono text-gray-600 dark:text-gray-400">
                        € {mgr.salesSum.toFixed(0)}
                      </td>

                      <td className="px-4 py-2 text-right font-mono text-gray-500 text-[11px]">
                        <div className="flex flex-col items-end">
                          <span>${mgr.baseRate}</span>
                          {mgr.hasIndividualRate && <span className="text-[9px] text-blue-400">инд.</span>}
                        </div>
                      </td>
                      <td className="px-4 py-2 text-right font-mono text-[11px]">
                        {mgr.individualBonus > 0 ? (
                          <span className="text-emerald-600 dark:text-emerald-400 font-bold">+${mgr.individualBonus}</span>
                        ) : (
                          <span className="text-gray-300 dark:text-gray-600">—</span>
                        )}
                      </td>
                      <td className="px-4 py-2 text-right font-mono text-[11px]">
                        {mgr.individualPenalty > 0 ? (
                          <span className="text-red-500 font-bold">−${mgr.individualPenalty}</span>
                        ) : (
                          <span className="text-gray-300 dark:text-gray-600">—</span>
                        )}
                      </td>

                      <td className="px-4 py-2 text-right">
                        <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          € {mgr.salary.toFixed(0)}
                        </span>
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

export default ManagersPage;