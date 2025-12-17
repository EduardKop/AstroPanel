import React, { useState, useMemo } from 'react';
import { useAppStore } from '../store/appStore'; // ✅ Подключаем Store
import { 
  Filter, Calendar, RotateCcw, XCircle, 
  Users, DollarSign, Percent, CreditCard, LayoutDashboard,
  TrendingUp, ArrowRight, Layers, Trophy, Globe, Activity, Zap
} from 'lucide-react';
import { AreaChart, Area, XAxis, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

// --- КОНФИГУРАЦИЯ ---
const FLAGS = {
  UA: '🇺🇦', PL: '🇵🇱', IT: '🇮🇹', HR: '🇭🇷',
  BG: '🇧🇬', CZ: '🇨🇿', RO: '🇷🇴', LT: '🇱🇹',
  TR: '🇹🇷', FR: '🇫🇷', PT: '🇵🇹', DE: '🇩🇪',
  US: '🇺🇸', ES: '🇪🇸', SK: '🇸🇰', HU: '🇭🇺',
  KZ: '🇰🇿', UZ: '🇺🇿', MD: '🇲🇩'
};
const getFlag = (code) => FLAGS[code] || '🏳️';

const getCRColor = (val) => {
  const num = parseFloat(val);
  if (num >= 10) return 'text-emerald-500'; 
  if (num >= 5) return 'text-amber-500';   
  return 'text-rose-500';                  
};

const getPaymentBadgeStyle = (type) => {
  const t = (type || '').toLowerCase();
  if (t.includes('lava')) return 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20';
  if (t.includes('jet') || t.includes('fex')) return 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20';
  if (t.includes('iban')) return 'bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20';
  if (t.includes('req') || t.includes('рек') || t.includes('прям')) return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20';
  return 'bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/20';
};

const getLastWeekRange = () => {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - 7);
  return [start, end];
};

const DenseSelect = ({ label, value, options, onChange }) => (
  <div className="relative group">
    <select 
      value={value} 
      onChange={(e) => onChange(e.target.value)} 
      className="appearance-none bg-white dark:bg-[#111] border border-gray-200 dark:border-[#333] text-gray-700 dark:text-gray-200 py-1.5 pl-2.5 pr-6 rounded-[6px] text-xs font-medium focus:outline-none focus:border-blue-500 hover:border-gray-400 dark:hover:border-[#555] transition-colors cursor-pointer min-w-[100px]"
    >
      <option value="">{label}</option>
      {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
    </select>
    <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400"><Filter size={10} /></div>
  </div>
);

const DashboardPage = () => {
  // ✅ 1. БЕРЕМ ДАННЫЕ ИЗ СТОРА
  const { payments, user: currentUser, isLoading } = useAppStore();

  const [dateRange, setDateRange] = useState(getLastWeekRange());
  const [startDate, endDate] = dateRange;
  const [filters, setFilters] = useState({ manager: '', country: '', product: '', type: '' });

  // Права доступа
  const isRestrictedUser = useMemo(() => {
    if (!currentUser) return false;
    const restrictedRoles = ['Sales', 'Retention', 'Consultant']; 
    return restrictedRoles.includes(currentUser.role);
  }, [currentUser]);

  const uniqueValues = useMemo(() => {
    const getUnique = (key) => [...new Set(payments.map(p => p[key]).filter(Boolean))].sort();
    return {
      managers: getUnique('manager'),
      countries: getUnique('country'),
      products: getUnique('product'),
      types: getUnique('type')
    };
  }, [payments]);

  const filteredData = useMemo(() => {
    let data = payments.filter(item => {
      // 1. Дата (берем transactionDate из стора, она уже готова)
      if (!item.transactionDate) return false;
      
      // Парсим дату безопасно (так как в сторе это может быть строка с T или без)
      const d = new Date(item.transactionDate);
      
      if (startDate && d < new Date(startDate.setHours(0,0,0,0))) return false;
      if (endDate && d > new Date(endDate.setHours(23,59,59,999))) return false;

      // 2. Фильтр по роли
      if (isRestrictedUser) {
        if (item.manager !== currentUser.name) return false;
      } else {
        if (filters.manager && item.manager !== filters.manager) return false;
      }

      // 3. Остальные фильтры
      if (filters.country && item.country !== filters.country) return false;
      if (filters.product && item.product !== filters.product) return false;
      if (filters.type && item.type !== filters.type) return false;
      
      return true;
    });
    // Сортировка (новые сначала)
    return data.sort((a, b) => new Date(b.transactionDate) - new Date(a.transactionDate));
  }, [payments, startDate, endDate, filters, isRestrictedUser, currentUser]);

  const stats = useMemo(() => {
    const totalEur = filteredData.reduce((sum, item) => sum + (item.amountEUR || 0), 0);
    const count = filteredData.length;
    const traffic = count * 12; 
    const conversion = "8.45"; 
    return { traffic, conversion, totalEur: totalEur.toFixed(2), count };
  }, [filteredData]);

  const kpiData = useMemo(() => {
    const salesCount = filteredData.length;
    const activeMgrs = new Set(filteredData.map(p => p.manager)).size || (isRestrictedUser ? 1 : 0);
    const totalSum = stats.totalEur;

    return {
      ltc: {
        cr: "12.4",
        active: activeMgrs,
        sales: salesCount,
        depositSum: totalSum
      },
      consultants: {
        cr: "4.2",
        active: Math.max(1, Math.floor(activeMgrs / 2)),
        sales: Math.floor(salesCount * 0.3),
        depositSum: (totalSum * 0.4).toFixed(2)
      }
    };
  }, [filteredData, stats.totalEur, isRestrictedUser]);

  const chartData = useMemo(() => {
    const grouped = {};
    filteredData.forEach(item => {
      // Берем только дату YYYY-MM-DD
      const date = new Date(item.transactionDate).toISOString().split('T')[0];
      if (!grouped[date]) grouped[date] = { date, count: 0 };
      grouped[date].count += 1;
    });
    return Object.values(grouped).sort((a, b) => new Date(a.date) - new Date(b.date));
  }, [filteredData]);

  const topManagers = useMemo(() => {
    const statsByName = {};
    filteredData.forEach(p => {
      const name = p.manager || 'Unknown';
      if (!statsByName[name]) statsByName[name] = { count: 0, sum: 0 };
      statsByName[name].count += 1;
      statsByName[name].sum += (p.amountEUR || 0);
    });
    return Object.entries(statsByName).map(([name, data]) => ({ name, ...data })).sort((a, b) => b.sum - a.sum).slice(0, 5);
  }, [filteredData]);

  const topCountries = useMemo(() => {
    const statsByGeo = {};
    filteredData.forEach(p => {
      const code = p.country || 'Unk';
      if (!statsByGeo[code]) statsByGeo[code] = { count: 0, sum: 0 };
      statsByGeo[code].count += 1;
      statsByGeo[code].sum += (p.amountEUR || 0);
    });
    return Object.entries(statsByGeo).map(([code, data]) => {
        const mockTraffic = data.count * 12;
        const mockCR = ((data.count / mockTraffic) * 100).toFixed(1);
        return { code, salesCount: data.count, salesSum: data.sum, traffic: mockTraffic, cr: mockCR };
      }).sort((a, b) => b.salesSum - a.salesSum).slice(0, 5);
  }, [filteredData]);

  const resetDateRange = () => setDateRange(getLastWeekRange());
  const resetFilters = () => setFilters({ manager: '', country: '', product: '', type: '' });

  return (
    <div className="pb-10 transition-colors duration-200">
      
      {/* HEADER + FILTERS */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between mb-6 gap-4 sticky top-0 z-20 bg-[#F5F5F5] dark:bg-[#0A0A0A] py-2 border-b border-transparent transition-colors duration-200">
        <div>
            <h2 className="text-lg font-bold dark:text-white tracking-tight flex items-center gap-2">
              <LayoutDashboard size={18} className="text-blue-600 dark:text-blue-500"/> Панель отдела продаж
            </h2>
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
             <div className="flex items-center bg-white dark:bg-[#111] border border-gray-200 dark:border-[#333] rounded-[6px] px-2 py-1 shadow-sm min-w-[160px]">
               <Calendar size={14} className="text-gray-400 mr-2"/>
               <DatePicker
                   selectsRange={true} startDate={startDate} endDate={endDate} onChange={(u) => setDateRange(u)}
                   dateFormat="dd.MM.yyyy" placeholderText="Выберите период"
                   className="bg-transparent text-xs font-medium dark:text-white outline-none w-full cursor-pointer text-center"
               />
               <button onClick={resetDateRange} className="ml-1 text-gray-400 hover:text-black dark:hover:text-white"><RotateCcw size={10}/></button>
            </div>
            
            {!isRestrictedUser && (
              <DenseSelect label="Менеджер" value={filters.manager} options={uniqueValues.managers} onChange={(val) => setFilters(p => ({ ...p, manager: val }))} />
            )}
            
            <DenseSelect label="Страна" value={filters.country} options={uniqueValues.countries} onChange={(val) => setFilters(p => ({ ...p, country: val }))} />
            <DenseSelect label="Продукт" value={filters.product} options={uniqueValues.products} onChange={(val) => setFilters(p => ({ ...p, product: val }))} />
            <DenseSelect label="Платежки" value={filters.type} options={uniqueValues.types} onChange={(val) => setFilters(p => ({ ...p, type: val }))} />
            
            {(filters.manager || filters.country || filters.product || filters.type) && (
                <button onClick={resetFilters} className="p-1.5 bg-red-500/10 text-red-500 rounded-[6px] hover:bg-red-500/20"><XCircle size={14}/></button>
            )}
        </div>
      </div>

      {/* --- GRID LAYOUT --- */}
      <div className="grid grid-cols-12 gap-4 mb-6">
        
        {/* 1. ГЛАВНЫЙ БЛОК */}
        <div className="col-span-12 lg:col-span-5 xl:col-span-4 flex flex-col relative group rounded-xl overflow-hidden border border-gray-200 dark:border-[#333] shadow-sm bg-white dark:bg-[#0F0F11] transition-colors duration-200">
            <div className="absolute inset-0 bg-white dark:bg-[#0F0F11] transition-colors duration-200"></div>
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-purple-500/5 pointer-events-none"></div>
            
            <div className="relative z-10 flex flex-col h-full p-5">
                <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-sm font-bold text-gray-900 dark:text-white tracking-wide flex items-center gap-2">
                        <Activity size={16} className="text-blue-500"/> Ключевые метрики
                    </h3>
                </div>
                
                <div className="grid grid-cols-2 gap-px bg-gray-100 dark:bg-[#222] border border-gray-100 dark:border-[#222] rounded-lg overflow-hidden mb-4 transition-colors duration-200">
                    <TechStatItem icon={CreditCard} label="Продажи" value={stats.count} />
                    <TechStatItem icon={DollarSign} label="Оборот" value={`€${Number(stats.totalEur).toLocaleString()}`} highlight />
                    <TechStatItem icon={Users} label="Трафик" value={stats.traffic} />
                    <TechStatItem icon={Percent} label="Конверсия" value={`${stats.conversion}%`} valueColor={getCRColor(stats.conversion)} />
                </div>

                <div className="flex-1 min-h-[100px] w-full">
                   <div className="text-[10px] font-bold text-gray-400 uppercase mb-2">Динамика продаж</div>
                   <div className="h-24 w-full">
                     <ResponsiveContainer width="100%" height="100%">
                       <AreaChart data={chartData}>
                         <defs>
                           <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                             <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                             <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                           </linearGradient>
                         </defs>
                         <XAxis dataKey="date" hide />
                         <RechartsTooltip 
                           contentStyle={{backgroundColor: '#111', borderColor: '#333', fontSize: '12px', color: '#fff'}}
                           itemStyle={{color: '#fff'}}
                           cursor={{stroke: '#555', strokeWidth: 1}}
                         />
                         <Area 
                           type="monotone" 
                           dataKey="count" 
                           stroke="#3B82F6" 
                           fillOpacity={1} 
                           fill="url(#colorCount)" 
                           strokeWidth={2}
                         />
                       </AreaChart>
                     </ResponsiveContainer>
                   </div>
                </div>
            </div>
        </div>

        {/* 2. KPI CARDS */}
        <div className="col-span-12 md:col-span-6 lg:col-span-3 xl:col-span-4 flex flex-col gap-3">
             <ProductCard 
                title="LTC" 
                subtitle="Конверсия в оплату"
                mainValue={kpiData.ltc.cr}
                mainType="percent"
                data={[
                    { label: 'Активных менеджеров', val: kpiData.ltc.active },
                    { label: 'Всего продаж', val: kpiData.ltc.sales },
                    { label: 'Сумма депозитов', val: `€${kpiData.ltc.depositSum}` }
                ]}
             />
             <ProductCard 
                title="Консультанты" 
                subtitle="Повторные депозиты"
                mainValue={kpiData.consultants.cr}
                mainType="percent"
                data={[
                    { label: 'Активных менеджеров', val: kpiData.consultants.active },
                    { label: 'Всего продаж', val: kpiData.consultants.sales },
                    { label: 'Сумма депозитов', val: `€${kpiData.consultants.depositSum}` }
                ]}
             />
        </div>

        {/* 3. LEADERBOARDS */}
        <div className="col-span-12 md:col-span-6 lg:col-span-4 flex flex-col gap-3">
            
            {/* Top Managers */}
            <div className="bg-white dark:bg-[#111] border border-gray-200 dark:border-[#333] rounded-xl overflow-hidden flex-1 shadow-sm transition-colors duration-200">
                <div className="px-4 py-2.5 border-b border-gray-200 dark:border-[#333] flex justify-between items-center bg-gray-50/50 dark:bg-[#161616]">
                    <div className="flex items-center gap-2">
                        <Trophy size={14} className="text-amber-500"/>
                        <span className="text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-400">Топ менеджеры</span>
                    </div>
                </div>
                <div className="p-0">
                    {topManagers.map((mgr, i) => (
                        <div key={mgr.name} className="flex items-center justify-between px-4 py-2 border-b border-gray-100 dark:border-[#222] last:border-0 hover:bg-gray-50 dark:hover:bg-[#1A1A1A]">
                            <div className="flex items-center gap-2">
                                <span className={`text-[10px] w-4 font-bold ${i===0 ? 'text-amber-500' : 'text-gray-400'}`}>{i+1}</span>
                                <span className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate">{mgr.name}</span>
                            </div>
                            <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">€{mgr.sum.toFixed(0)}</span>
                        </div>
                    ))}
                    {topManagers.length === 0 && <div className="text-center py-4 text-xs text-gray-500">Нет данных</div>}
                </div>
            </div>

            {/* Top Geo */}
            <div className="bg-white dark:bg-[#111] border border-gray-200 dark:border-[#333] rounded-xl overflow-hidden flex-1 shadow-sm transition-colors duration-200">
                <div className="px-4 py-2.5 border-b border-gray-200 dark:border-[#333] flex justify-between items-center bg-gray-50/50 dark:bg-[#161616]">
                    <div className="flex items-center gap-2">
                        <Globe size={14} className="text-blue-500"/>
                        <span className="text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-400">Топ ГЕО</span>
                    </div>
                </div>
                <div className="p-0">
                    {topCountries.map((geo, i) => (
                        <div key={geo.code} className="flex items-center justify-between px-4 py-2 border-b border-gray-100 dark:border-[#222] last:border-0 hover:bg-gray-50 dark:hover:bg-[#1A1A1A]">
                            <div className="flex items-center gap-2">
                                <span className="text-sm">{getFlag(geo.code)}</span>
                                <span className="text-xs font-bold text-gray-700 dark:text-gray-200">{geo.code}</span>
                                <span className="text-[10px] text-gray-400">({geo.salesCount})</span>
                            </div>
                            <span className={`text-xs font-mono font-bold ${getCRColor(geo.cr)}`}>
                                CR: {geo.cr}%
                            </span>
                        </div>
                    ))}
                    {topCountries.length === 0 && <div className="text-center py-4 text-xs text-gray-500">Нет данных</div>}
                </div>
            </div>

        </div>
      </div>

      {/* --- BOTTOM TABLE --- */}
      <div className="mt-2 bg-white dark:bg-[#111] border border-gray-200 dark:border-[#333] rounded-xl overflow-hidden shadow-sm transition-colors duration-200">
        <div className="px-4 py-3 border-b border-gray-200 dark:border-[#333] flex items-center gap-2 bg-gray-50/50 dark:bg-[#161616]">
             <Layers size={14} className="text-gray-400"/>
             <span className="text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-400">Последние операции</span>
        </div>
        <div className="overflow-x-auto">
             <table className="w-full text-left text-xs text-gray-600 dark:text-[#888]">
                <thead className="bg-gray-50 dark:bg-[#161616] font-medium border-b border-gray-200 dark:border-[#333]">
                    <tr>
                        <th className="px-4 py-2">ID</th>
                        <th className="px-4 py-2">Дата</th>
                        <th className="px-4 py-2">Менеджер</th>
                        <th className="px-4 py-2">ГЕО</th>
                        <th className="px-4 py-2">Метод</th>
                        <th className="px-4 py-2">Сумма</th>
                        <th className="px-4 py-2 text-right">Статус</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-[#222]">
                    {isLoading ? (
                        <tr><td colSpan="7" className="px-4 py-6 text-center text-xs">Загрузка...</td></tr>
                    ) : filteredData.slice(0, 10).map((p) => (
                        <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-[#1A1A1A] transition-colors">
                            <td className="px-4 py-2 font-mono text-[10px] text-gray-400" title={p.id}>
                                #{p.id.slice(0, 8)}...
                            </td>
                            <td className="px-4 py-2 text-gray-500">
                                {new Date(p.transactionDate).toLocaleDateString('ru-RU')}
                            </td>
                            <td className="px-4 py-2 font-medium text-gray-700 dark:text-gray-300">
                                {p.manager}
                            </td>
                            <td className="px-4 py-2">
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-gray-100 dark:bg-[#222] border border-gray-200 dark:border-[#333] text-[10px] font-bold text-gray-600 dark:text-gray-300">
                                    {getFlag(p.country)} {p.country}
                                </span>
                            </td>
                            <td className="px-4 py-2">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${getPaymentBadgeStyle(p.type)}`}>
                                    {p.type || 'Other'}
                                </span>
                            </td>
                            <td className="px-4 py-2 font-mono font-bold text-gray-900 dark:text-white">€{p.amountEUR}</td>
                            <td className="px-4 py-2 text-right">
                                <span className="text-emerald-500 text-[10px] font-bold uppercase">{p.status}</span>
                            </td>
                        </tr>
                    ))}
                    {!isLoading && filteredData.length === 0 && (
                        <tr><td colSpan="7" className="px-4 py-6 text-center text-xs">Нет данных</td></tr>
                    )}
                </tbody>
             </table>
        </div>
      </div>
    </div>
  );
};

// --- Sub-components ---

const TechStatItem = ({ icon: Icon, label, value, highlight, valueColor }) => (
    <div className="bg-white dark:bg-[#151515] p-3 flex flex-col justify-center transition-colors hover:bg-gray-50 dark:hover:bg-[#1A1A1A]">
        <div className="flex items-center gap-2 mb-1 text-gray-400 dark:text-gray-500">
            <Icon size={14} />
            <span className="text-[10px] font-bold uppercase tracking-wider">{label}</span>
        </div>
        <div className={`text-lg font-mono font-bold leading-none ${valueColor ? valueColor : highlight ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-900 dark:text-white'}`}>
            {value}
        </div>
    </div>
);

const ProductCard = ({ title, subtitle, mainValue, mainType, data }) => (
    <div className="bg-white dark:bg-[#111] border border-gray-200 dark:border-[#333] rounded-xl p-5 flex flex-col justify-between flex-1 shadow-sm transition-all hover:border-gray-300 dark:hover:border-[#444]">
        <div className="flex justify-between items-start mb-3">
            <div>
                <h4 className="font-bold text-sm text-gray-900 dark:text-white flex items-center gap-2">
                    {title} <span className="text-gray-400 font-normal text-[10px]">/ KPI</span>
                </h4>
                <p className="text-[10px] text-gray-500 mt-0.5">{subtitle}</p>
            </div>
            {/* Основная метрика - Конверсия */}
            <span className={`text-xl font-mono font-bold ${getCRColor(mainValue)}`}>
                {mainValue}{mainType === 'percent' ? '%' : ''}
            </span>
        </div>
        
        <div className="space-y-2 pt-3 border-t border-gray-100 dark:border-[#222] flex-1">
            {data.map((item, idx) => (
                <div key={idx} className="flex justify-between text-xs items-center">
                    <span className="text-gray-500">{item.label}</span>
                    <span className="font-medium text-gray-700 dark:text-gray-300 font-mono">{item.val}</span>
                </div>
            ))}
        </div>
    </div>
);

export default DashboardPage;