import React, { useState, useMemo, useEffect } from 'react';
import { useAppStore } from '../store/appStore';
import {
  Download, Filter, ChevronDown, Check,
  ArrowUpDown, Coins, Trophy, Calendar as CalendarIcon,
  TrendingUp
} from 'lucide-react';

import DatePicker, { registerLocale } from "react-datepicker";
import ru from 'date-fns/locale/ru';
import "react-datepicker/dist/react-datepicker.css";
registerLocale('ru', ru);

// --- ГРУППЫ СТРАН ---
const TEAM_GROUPS = {
  'I': ['UA', 'PL', 'IT', 'HR'],
  'II': ['BG', 'CZ', 'RO', 'LT'],
  'III': ['TR', 'FR', 'PT', 'DE']
};

const getTeamName = (countryCode) => {
  for (const [groupName, countries] of Object.entries(TEAM_GROUPS)) {
    if (countries.includes(countryCode)) return groupName;
  }
  return 'N/A';
};

// --- КОМПОНЕНТЫ ---
const MultiSelectFilter = ({ label, options, selectedValues, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const toggleOption = (value) => {
    const newSelected = selectedValues.includes(value) ? selectedValues.filter(v => v !== value) : [...selectedValues, value];
    onChange(newSelected);
  };
  return (
    <div className="relative group">
      <button onClick={() => setIsOpen(!isOpen)} onBlur={() => setTimeout(() => setIsOpen(false), 200)} className={`flex items-center justify-between min-w-[140px] bg-white dark:bg-[#111] border ${selectedValues.length > 0 ? 'border-blue-500' : 'border-gray-300 dark:border-[#333]'} text-gray-700 dark:text-gray-200 py-1.5 px-3 rounded-[6px] text-xs font-medium hover:border-gray-400 dark:hover:border-[#555] transition-colors`}>
        <span className="truncate max-w-[100px]">{selectedValues.length === 0 ? label : `${label}: ${selectedValues.length}`}</span><ChevronDown size={10} className="ml-2 opacity-50" />
      </button>
      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-[180px] bg-white dark:bg-[#111] border border-gray-200 dark:border-[#333] rounded-lg shadow-xl z-50 max-h-[200px] overflow-y-auto custom-scrollbar p-1">
          {options.map(opt => (
            <div key={opt} onClick={(e) => { e.stopPropagation(); toggleOption(opt); }} className="flex items-center gap-2 px-2 py-1.5 hover:bg-gray-50 dark:hover:bg-[#222] rounded cursor-pointer text-xs dark:text-gray-300">
              <div className={`w-3.5 h-3.5 rounded-[3px] border flex items-center justify-center ${selectedValues.includes(opt) ? 'bg-blue-500 border-blue-500' : 'border-gray-300 dark:border-[#444]'}`}>{selectedValues.includes(opt) && <Check size={10} className="text-white" />}</div>
              <span className="truncate">{opt}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Custom Month Picker (Desktop) with fixed positioning
const CustomMonthPicker = ({ selectedMonth, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [viewYear, setViewYear] = useState(selectedMonth.getFullYear());
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0 });
  const triggerRef = React.useRef(null);

  const MONTHS = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'];
  const MONTH_NAMES = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];

  const openPicker = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setDropdownPos({ top: rect.bottom + 8, left: rect.right - 200 });
    }
    setViewYear(selectedMonth.getFullYear());
    setIsOpen(true);
  };

  const handleMonthClick = (monthIndex) => {
    onChange(new Date(viewYear, monthIndex, 1));
    setIsOpen(false);
  };

  const setLastMonth = () => { const d = new Date(); d.setMonth(d.getMonth() - 1); onChange(new Date(d.getFullYear(), d.getMonth(), 1)); setIsOpen(false); };
  const setCurrentMonth = () => { const d = new Date(); onChange(new Date(d.getFullYear(), d.getMonth(), 1)); setIsOpen(false); };

  const prevYear = () => setViewYear(y => y - 1);
  const nextYear = () => setViewYear(y => y + 1);

  const currentMonth = selectedMonth.getMonth();
  const currentYear = selectedMonth.getFullYear();
  const displayText = `${MONTH_NAMES[currentMonth]} ${currentYear}`;

  return (
    <div className="relative flex-1 hidden md:block">
      <div ref={triggerRef} onClick={openPicker} className="flex items-center bg-white dark:bg-[#111] border border-gray-200 dark:border-[#333] rounded-[6px] px-2 py-0.5 shadow-sm h-[34px] cursor-pointer hover:border-gray-400 dark:hover:border-[#555] transition-colors w-full min-w-[160px]">
        <CalendarIcon size={12} className="text-gray-400 mr-2 shrink-0" />
        <span className="flex-1 text-xs font-bold capitalize text-gray-900 dark:text-white text-center">{displayText}</span>
      </div>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-[100]" onClick={() => setIsOpen(false)} />
          <div className="fixed bg-white dark:bg-[#111] border border-gray-200 dark:border-[#333] rounded-xl shadow-xl z-[101] p-2.5 w-[200px]" style={{ top: dropdownPos.top, left: dropdownPos.left }}>
            <div className="flex gap-1 mb-2">
              <button onClick={setLastMonth} className="flex-1 text-[10px] font-medium py-1 px-1 rounded-md bg-gray-100 dark:bg-[#222] text-gray-600 dark:text-gray-300 hover:bg-blue-100 dark:hover:bg-blue-900/30 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Пр. мес.</button>
              <button onClick={setCurrentMonth} className="flex-1 text-[10px] font-medium py-1 px-1 rounded-md bg-gray-100 dark:bg-[#222] text-gray-600 dark:text-gray-300 hover:bg-blue-100 dark:hover:bg-blue-900/30 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Тек. мес.</button>
            </div>
            <div className="flex items-center justify-between mb-2">
              <button onClick={prevYear} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-[#222] text-gray-500 dark:text-gray-400 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
              </button>
              <span className="text-xs font-bold text-gray-900 dark:text-white">{viewYear}</span>
              <button onClick={nextYear} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-[#222] text-gray-500 dark:text-gray-400 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg>
              </button>
            </div>
            <div className="grid grid-cols-3 gap-1">
              {MONTHS.map((m, i) => {
                const isSelected = viewYear === currentYear && i === currentMonth;
                const isCurrentMonth = viewYear === new Date().getFullYear() && i === new Date().getMonth();
                let cls = 'py-2 px-1 text-[11px] font-medium rounded cursor-pointer transition-all text-center ';
                if (isSelected) cls += 'bg-blue-500 text-white font-bold ';
                else if (isCurrentMonth) cls += 'ring-1 ring-blue-400 text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-[#222] ';
                else cls += 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#222] ';
                return <button key={m} onClick={() => handleMonthClick(i)} className={cls}>{m}</button>;
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

const getInitials = (name) => name ? name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : '??';
const fmt = (num) => num.toLocaleString('ru-RU', { maximumFractionDigits: 2, minimumFractionDigits: 2 });

const SalariesPage = () => {
  const { managers, payments, kpiRates, kpiSettings, trafficStats, fetchTrafficStats } = useAppStore();

  const [selectedMonth, setSelectedMonth] = useState(new Date());

  const [selectedGeos, setSelectedGeos] = useState([]);
  const [selectedManagers, setSelectedManagers] = useState([]);
  const [sortBy, setSortBy] = useState('salary-desc');

  // Подгружаем трафик при смене месяца
  useEffect(() => {
    if (fetchTrafficStats) {
      const start = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), 1);
      const end = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 0);
      end.setHours(23, 59, 59, 999);
      fetchTrafficStats(start.toISOString(), end.toISOString());
    }
  }, [fetchTrafficStats, selectedMonth]);

  const options = useMemo(() => {
    const allGeos = new Set();
    const allNames = new Set();
    managers.filter(m => m.role === 'Sales').forEach(m => {
      allNames.add(m.name);
      const geo = Array.isArray(m.geo) ? m.geo[0] : (m.geo || 'N/A');
      allGeos.add(geo);
    });
    return { geos: [...allGeos].sort(), names: [...allNames].sort() };
  }, [managers]);

  // 🔥 ГЛАВНЫЙ РАСЧЕТ
  const { processedData, winningTeam, teamScores } = useMemo(() => {
    const ratesMap = {};
    if (kpiRates) kpiRates.forEach(r => ratesMap[r.product_name] = Number(r.rate));

    const baseSalary = Number(kpiSettings?.base_salary || 0);

    let dailyTiers = [], monthlyTiers = [];
    try {
      dailyTiers = typeof kpiSettings?.daily_tiers === 'string' ? JSON.parse(kpiSettings.daily_tiers) : (kpiSettings?.daily_tiers || []);
      monthlyTiers = typeof kpiSettings?.monthly_tiers === 'string' ? JSON.parse(kpiSettings.monthly_tiers) : (kpiSettings?.monthly_tiers || []);
    } catch (e) { console.error("KPI Parse Error", e); }

    const startOfMonth = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), 1);
    const endOfMonth = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 0);
    startOfMonth.setHours(0, 0, 0, 0);
    endOfMonth.setHours(23, 59, 59, 999);

    const salesManagers = managers.filter(m => m.role === 'Sales');

    // ШАГ 1: Предварительный расчет
    const preCalcManagers = salesManagers.map(mgr => {
      const mgrPayments = payments.filter(p => {
        if (p.managerId !== mgr.id || !p.transactionDate) return false;
        const tDate = new Date(p.transactionDate);
        return tDate >= startOfMonth && tDate <= endOfMonth;
      });

      const salesCount = mgrPayments.length;
      const primaryGeo = Array.isArray(mgr.geo) ? mgr.geo[0] : (mgr.geo || 'Other');
      const teamGroup = getTeamName(primaryGeo);

      return { mgr, mgrPayments, salesCount, teamGroup, primaryGeo };
    });

    // ШАГ 2: Победитель гонки
    const scores = { 'I': 0, 'II': 0, 'III': 0, 'N/A': 0 };
    preCalcManagers.forEach(item => {
      if (scores[item.teamGroup] !== undefined) {
        scores[item.teamGroup] += item.salesCount;
      }
    });

    let winner = null;
    let maxScore = -1;
    Object.entries(scores).forEach(([team, score]) => {
      if (team !== 'N/A' && score > 0 && score > maxScore) {
        maxScore = score;
        winner = team;
      }
    });

    // ШАГ 3: Финальный расчет
    let data = preCalcManagers.map(({ mgr, mgrPayments, salesCount, teamGroup, primaryGeo }) => {

      // Считаем лиды для формулы CR (но в таблице покажем заглушку)
      let leadsCount = 0;
      if (trafficStats && trafficStats[primaryGeo]) {
        Object.entries(trafficStats[primaryGeo]).forEach(([dateStr, val]) => {
          const d = new Date(dateStr);
          if (d >= startOfMonth && d <= endOfMonth) {
            const num = typeof val === 'object' ? (val.all || 0) : (Number(val) || 0);
            leadsCount += num;
          }
        });
      }

      const conversionRate = leadsCount > 0 ? ((salesCount / leadsCount) * 100).toFixed(2) : "0.00";

      // Бонусы
      let productBonus = 0;
      mgrPayments.forEach(p => {
        productBonus += (ratesMap[p.product] || 0);
      });

      const salesByDate = {};
      mgrPayments.forEach(p => {
        const date = new Date(p.transactionDate).toISOString().split('T')[0];
        salesByDate[date] = (salesByDate[date] || 0) + 1;
      });

      let dailyBonusTotal = 0;
      Object.values(salesByDate).forEach(count => {
        const tier = dailyTiers.find(t => count >= t.min && count <= t.max);
        if (tier) dailyBonusTotal += Number(tier.reward);
      });

      let monthlyBonusTotal = 0;
      if (salesCount > 0) {
        const mTier = monthlyTiers.find(t => salesCount >= (t.min || 0) && salesCount <= (t.max || 99999));
        if (mTier) monthlyBonusTotal = Number(mTier.reward);
      }

      let teamBonus = 0;
      if (winner && teamGroup === winner) {
        teamBonus = 30;
      }

      const totalBonus = productBonus + dailyBonusTotal + monthlyBonusTotal + teamBonus;
      const totalSalary = baseSalary + totalBonus;

      const startDate = mgr.created_at ? new Date(mgr.created_at) : new Date('2024-01-01');
      const role = mgr.role || 'Sales';
      const shifts = Object.keys(salesByDate).length;

      return {
        id: mgr.id,
        name: mgr.name,
        avatar: mgr.avatar_url,
        geo: primaryGeo,
        teamGroup,
        startDate,
        role,
        leadsCount,
        conversionRate,
        salesCount,
        baseRate: baseSalary,
        bonus: totalBonus,
        teamBonus,
        totalSalary,
        shifts
      };
    });

    if (selectedGeos.length > 0) data = data.filter(item => selectedGeos.includes(item.geo));
    if (selectedManagers.length > 0) data = data.filter(item => selectedManagers.includes(item.name));

    data.sort((a, b) => {
      switch (sortBy) {
        case 'salary-desc': return b.totalSalary - a.totalSalary;
        case 'date-desc': return b.startDate - a.startDate;
        case 'date-asc': return a.startDate - b.startDate;
        case 'geo-asc': return a.geo.localeCompare(b.geo);
        default: return 0;
      }
    });

    return { processedData: data, winningTeam: winner, teamScores: scores };
  }, [managers, payments, kpiRates, kpiSettings, trafficStats, selectedGeos, selectedManagers, sortBy, selectedMonth]);

  const handleExport = () => {
    const monthStr = selectedMonth.toLocaleString('ru-RU', { month: 'long', year: 'numeric' });
    const headers = ['Имя', 'ГЕО', 'Группа', 'Дата старта', 'Роль', 'Лиды', 'CR %', 'Продажи', 'Ставка ($)', 'Бонусы ($)', 'Командный ($)', 'Смены', 'Итого ЗП ($)'];
    const rows = processedData.map(d => [
      d.name, d.geo, d.teamGroup, d.startDate.toLocaleDateString('ru-RU'), d.role, d.leadsCount, d.conversionRate, d.salesCount, d.baseRate,
      (d.bonus - d.teamBonus).toFixed(2), d.teamBonus, d.shifts, d.totalSalary.toFixed(2)
    ]);
    const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `salaries_${monthStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="animate-in fade-in zoom-in duration-300 pb-10 w-full max-w-full overflow-x-hidden">

      {/* HEADER */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between mb-6 gap-4">
        <div>
          <h2 className="text-lg font-bold dark:text-white tracking-tight flex items-center gap-2">
            <Coins size={18} className="text-emerald-500" /> Зарплаты и KPI
          </h2>
          <div className="flex items-center gap-3 mt-1">
            <p className="text-gray-500 dark:text-gray-400 text-[10px]">Расчет за <span className="font-bold text-gray-900 dark:text-white capitalize">{selectedMonth.toLocaleString('ru-RU', { month: 'long', year: 'numeric' })}</span></p>

            {winningTeam && (
              <div className="flex items-center gap-1.5 px-2 py-0.5 bg-amber-500/10 border border-amber-500/20 rounded text-[10px] font-bold text-amber-600 dark:text-amber-400 animate-in fade-in zoom-in">
                <Trophy size={10} className="fill-amber-500 text-amber-500" />
                Лидер месяца: Группа {winningTeam}
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full xl:w-auto xl:justify-end">

          {/* MONTH PICKER */}
          <CustomMonthPicker
            selectedMonth={selectedMonth}
            onChange={(date) => setSelectedMonth(date)}
          />

          <div className="relative group">
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="appearance-none bg-white dark:bg-[#111] border border-gray-200 dark:border-[#333] text-gray-700 dark:text-gray-200 py-1.5 pl-3 pr-8 rounded-[6px] text-xs font-medium focus:outline-none cursor-pointer hover:border-gray-400 dark:hover:border-[#555] transition-colors h-[34px]">
              <option value="salary-desc">💰 По зарплате</option>
              <option value="date-desc">📅 По дате (Новые)</option>
              <option value="geo-asc">🌍 По ГЕО</option>
            </select>
            <ArrowUpDown size={10} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>

          <MultiSelectFilter label="ГЕО" options={options.geos} selectedValues={selectedGeos} onChange={setSelectedGeos} />
          <MultiSelectFilter label="Менеджер" options={options.names} selectedValues={selectedManagers} onChange={setSelectedManagers} />

          {(selectedGeos.length > 0 || selectedManagers.length > 0) && (
            <button onClick={() => { setSelectedGeos([]); setSelectedManagers([]); }} className="p-1.5 bg-red-500/10 text-red-500 rounded-[6px] hover:bg-red-500/20 transition-colors h-[34px] w-[34px] flex items-center justify-center"><Filter size={14} /></button>
          )}

          <div className="hidden sm:block w-px h-6 bg-gray-200 dark:bg-[#333] mx-1"></div>

          <button onClick={handleExport} className="flex items-center gap-1.5 bg-black dark:bg-white text-white dark:text-black px-3 py-1.5 rounded-[6px] text-xs font-bold hover:opacity-80 transition-opacity h-[34px]">
            <Download size={12} /> <span className="hidden sm:inline">CSV</span>
          </button>
        </div>
      </div>

      {/* TABLE */}
      <div className="bg-white dark:bg-[#111] border border-gray-200 dark:border-[#333] rounded-lg overflow-hidden shadow-sm w-full min-w-0">
        <div className="overflow-x-auto w-full min-w-0">
          <table className="w-full text-left text-xs text-gray-600 dark:text-[#888] whitespace-nowrap">
            <thead className="bg-gray-50 dark:bg-[#161616] font-medium border-b border-gray-200 dark:border-[#333] text-gray-500 dark:text-[#666]">
              <tr>
                <th className="px-4 py-3">Менеджер</th>
                <th className="px-4 py-3">ГЕО / Группа</th>
                <th className="px-4 py-3">Старт</th>
                <th className="px-4 py-3">Статус</th>
                <th className="px-4 py-3 text-center">Лиды</th>
                <th className="px-4 py-3 text-center">CR</th>
                <th className="px-4 py-3 text-center">Продажи</th>
                <th className="px-4 py-3 text-right">Ставка</th>
                <th className="px-4 py-3 text-right">Бонусы</th>
                <th className="px-4 py-3 text-center">Смены</th>
                <th className="px-4 py-3 text-right text-emerald-600 dark:text-emerald-400 font-bold">Итого</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-[#222]">
              {processedData.length === 0 ? (
                <tr><td colSpan="11" className="px-4 py-10 text-center text-gray-400">Нет данных за выбранный месяц</td></tr>
              ) : (
                processedData.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-[#1A1A1A] transition-colors group">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center text-[10px] font-bold border border-blue-200 dark:border-blue-900/50">
                          {item.avatar ? <img src={item.avatar} alt="" className="w-full h-full rounded-full object-cover" /> : getInitials(item.name)}
                        </div>
                        <div className="flex flex-col">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-gray-900 dark:text-white text-xs">{item.name}</span>
                            {item.teamBonus > 0 && (
                              <Trophy size={10} className="fill-amber-500 text-amber-500" title={`Победа в Группе ${item.teamGroup} (+$30)`} />
                            )}
                          </div>
                          <span className="text-[9px] text-gray-400">ID: {item.id.toString().slice(0, 4)}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col items-start">
                        <span className="inline-flex w-fit items-center px-2 py-0.5 rounded bg-gray-100 dark:bg-[#222] border border-gray-200 dark:border-[#333] text-[10px] font-bold text-gray-700 dark:text-gray-300">
                          {item.geo}
                        </span>
                        {item.teamGroup !== 'N/A' && (
                          <span className="text-[9px] text-gray-400 ml-0.5 mt-0.5">Группа {item.teamGroup}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-[10px]">{item.startDate.toLocaleDateString('ru-RU')}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded border text-[10px] font-bold uppercase bg-emerald-500/10 text-emerald-600 border-emerald-500/20`}>
                        {item.role}
                      </span>
                    </td>

                    {/* ЛИДЫ (ЗАГЛУШКА) */}
                    <td className="px-4 py-3 text-center">
                      <span className="text-[10px] text-gray-400 italic">(будет после внедрения графика)</span>
                    </td>

                    {/* КОНВЕРСИЯ (CR) */}
                    <td className="px-4 py-3 text-center">
                      <div className={`flex items-center justify-center gap-1 text-[10px] font-bold ${item.conversionRate >= 10 ? 'text-emerald-500' : item.conversionRate >= 5 ? 'text-amber-500' : 'text-gray-400'}`}>
                        {item.conversionRate}%
                      </div>
                    </td>

                    {/* ПРОДАЖИ */}
                    <td className="px-4 py-3 text-center text-gray-900 dark:text-white font-bold">{item.salesCount}</td>

                    <td className="px-4 py-3 text-right font-mono text-gray-500">${item.baseRate}</td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-gray-700 dark:text-gray-300">
                      <div className="flex flex-col items-end">
                        <span>${fmt(item.bonus)}</span>
                        {item.teamBonus > 0 && <span className="text-[9px] text-amber-500 font-bold">+${item.teamBonus} team</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center"><span className="bg-gray-100 dark:bg-[#222] px-1.5 py-0.5 rounded text-[10px] text-gray-500 font-mono">{item.shifts}</span></td>
                    <td className="px-4 py-3 text-right"><span className="text-sm font-black text-gray-900 dark:text-white">${fmt(item.totalSalary)}</span></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default SalariesPage;