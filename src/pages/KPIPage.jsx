import React from 'react';
import { 
  Wallet, Trophy, Target, Calendar, 
  Users, Sparkles, TrendingUp, DollarSign, 
  Zap, BarChart4, ArrowUpRight
} from 'lucide-react';

// Маппинг флагов для красивого отображения
const FLAGS = {
  UA: '🇺🇦', PL: '🇵🇱', IT: '🇮🇹', HR: '🇭🇷',
  BG: '🇧🇬', CZ: '🇨🇿', RO: '🇷🇴', LT: '🇱🇹',
  TR: '🇹🇷', FR: '🇫🇷', PT: '🇵🇹', DE: '🇩🇪',
  US: '🇺🇸', ES: '🇪🇸', SK: '🇸🇰', HU: '🇭🇺'
};

const KPIPage = () => {
  return (
    <div className="animate-in fade-in zoom-in duration-300 pb-10 font-sans">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold dark:text-white flex items-center gap-2 tracking-tight">
            <Target className="text-blue-500" size={20} />
            Система Мотивации
          </h2>
          <p className="text-gray-500 dark:text-gray-400 text-xs mt-1 font-medium">
            Тарифная сетка и бонусы на <span className="text-gray-900 dark:text-white font-bold">Декабрь 2025</span>
          </p>
        </div>
      </div>

      {/* 1. HERO BLOCK: BASE SALARY (Tech Style) */}
      <div className="relative overflow-hidden rounded-xl bg-[#111] border border-gray-800 shadow-xl mb-6 group">
        {/* Background Grid Pattern */}
        <div className="absolute inset-0 opacity-20 pointer-events-none" 
             style={{ backgroundImage: 'linear-gradient(#333 1px, transparent 1px), linear-gradient(90deg, #333 1px, transparent 1px)', backgroundSize: '20px 20px' }}>
        </div>
        <div className="absolute inset-0 bg-gradient-to-r from-blue-900/20 to-purple-900/20 pointer-events-none"></div>

        <div className="relative z-10 p-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="p-4 bg-blue-600/10 border border-blue-500/30 rounded-2xl shadow-[0_0_15px_rgba(37,99,235,0.2)]">
              <Wallet size={32} className="text-blue-500" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-blue-400 uppercase tracking-widest mb-1">Гарантированный оклад</h3>
              <p className="text-gray-400 text-xs max-w-sm leading-relaxed">
                Фиксированная выплата каждую неделю при выполнении минимальных требований активности.
              </p>
            </div>
          </div>
          <div className="flex items-start">
            <span className="text-2xl mt-2 text-gray-500 font-mono mr-1">$</span>
            <span className="text-6xl font-black text-white tracking-tighter font-mono drop-shadow-lg">350</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN (Wide) */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* ТАРИФЫ (Grid Layout) */}
          <div className="bg-white dark:bg-[#111] rounded-xl border border-gray-200 dark:border-[#333] shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-200 dark:border-[#333] flex items-center justify-between bg-gray-50/50 dark:bg-[#161616]">
              <div className="flex items-center gap-2">
                <Sparkles size={16} className="text-purple-500" />
                <h3 className="text-sm font-bold dark:text-white uppercase tracking-wide">Тарифы за прогноз</h3>
              </div>
              <span className="text-[10px] bg-purple-500/10 text-purple-400 px-2 py-0.5 rounded font-bold uppercase">Basic</span>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2">
              <BonusItem title="Прогноз на 1 год" price="0.70" />
              <BonusItem title="Прогноз на 5 лет" price="1.30" />
              <BonusItem title="Общий (1 год)" subtitle="Любовь + Финансы" price="2.80" isHighlight />
              <BonusItem title="Общий (5 лет)" subtitle="Полный разбор" price="3.30" isHighlight />
            </div>
          </div>

          {/* КОМАНДНАЯ ПРЕМИЯ (Cards) */}
          <div className="bg-white dark:bg-[#111] rounded-xl border border-gray-200 dark:border-[#333] shadow-sm p-5">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <Trophy size={16} className="text-amber-500" />
                <h3 className="text-sm font-bold dark:text-white uppercase tracking-wide">Командная гонка</h3>
              </div>
              <div className="flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/20 text-amber-500 text-xs font-bold px-3 py-1 rounded-full">
                <Zap size={12} fill="currentColor" /> +$30 бонус
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <TeamCard 
                number="I" 
                countries={["UA", "PL", "IT", "HR"]}
                color="border-blue-500/30 bg-blue-500/5 text-blue-400"
              />
              <TeamCard 
                number="II" 
                countries={["BG", "CZ", "RO", "LT"]}
                color="border-purple-500/30 bg-purple-500/5 text-purple-400"
              />
              <TeamCard 
                number="III" 
                countries={["TR", "FR", "PT", "DE"]}
                color="border-emerald-500/30 bg-emerald-500/5 text-emerald-400"
              />
            </div>
            <p className="text-[10px] text-gray-500 mt-3 text-center opacity-70">
              * Бонус начисляется каждому участнику победившей группы по итогам недели
            </p>
          </div>

        </div>

        {/* RIGHT COLUMN (Narrow) */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* ДНЕВНЫЕ ЦЕЛИ */}
          <div className="bg-white dark:bg-[#111] rounded-xl border border-gray-200 dark:border-[#333] shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-200 dark:border-[#333] bg-gray-50/50 dark:bg-[#161616] flex items-center gap-2">
              <TrendingUp size={16} className="text-emerald-500" />
              <h3 className="text-sm font-bold dark:text-white uppercase tracking-wide">Дневной KPI</h3>
            </div>
            
            <div className="p-4 space-y-3">
              <DailyTier count="12 – 13" reward="5" />
              <DailyTier count="14 – 15" reward="8" />
              <DailyTier count="16+" reward="12" isMax />
            </div>
          </div>

          {/* ИТОГИ МЕСЯЦА */}
          <div className="relative overflow-hidden rounded-xl bg-[#09090b] border border-gray-800 shadow-md">
            {/* Gradient Background */}
            <div className="absolute inset-0 bg-gradient-to-b from-gray-800/50 to-black/80 pointer-events-none"></div>
            
            <div className="relative z-10 p-5">
              <div className="flex items-center gap-2 mb-5">
                <Calendar size={16} className="text-blue-400" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wide">Бонус месяца</h3>
              </div>

              <div className="space-y-0">
                <MonthTier label="< 250 продаж" reward="50" isDim />
                <MonthTier label="250 - 400 продаж" reward="75" />
                <MonthTier label="400+ продаж" reward="100" isHighlight />
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

// --- КОМПОНЕНТЫ UI ---

const BonusItem = ({ title, subtitle, price, isHighlight }) => (
  <div className={`
    flex justify-between items-center p-4 border-b sm:border-b-0 sm:odd:border-r border-gray-200 dark:border-[#333] last:border-0 hover:bg-gray-50 dark:hover:bg-[#161616] transition-colors group
    ${isHighlight ? 'bg-purple-50/30 dark:bg-purple-900/5' : ''}
  `}>
    <div>
      <div className={`text-xs font-bold ${isHighlight ? 'text-purple-700 dark:text-purple-300' : 'text-gray-700 dark:text-gray-300'}`}>
        {title}
      </div>
      {subtitle && <div className="text-[10px] text-gray-400 mt-0.5">{subtitle}</div>}
    </div>
    <div className={`text-sm font-mono font-bold flex items-center ${isHighlight ? 'text-purple-600 dark:text-purple-400' : 'text-gray-900 dark:text-white'}`}>
      <span className="text-[10px] mr-0.5 opacity-60">$</span>{price}
    </div>
  </div>
);

const DailyTier = ({ count, reward, isMax }) => (
  <div className={`
    flex justify-between items-center p-3 rounded-lg border transition-all
    ${isMax 
      ? 'bg-emerald-500/10 border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.1)]' 
      : 'bg-gray-50 dark:bg-[#161616] border-gray-200 dark:border-[#333] hover:border-gray-300 dark:hover:border-[#444]'
    }
  `}>
    <div className="flex flex-col">
      <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Продаж</span>
      <span className={`text-sm font-bold ${isMax ? 'text-emerald-400' : 'text-gray-700 dark:text-gray-200'}`}>
        {count}
      </span>
    </div>
    <div className={`flex items-center gap-1 font-mono font-bold text-lg ${isMax ? 'text-emerald-500' : 'text-gray-400 dark:text-gray-500'}`}>
      <span className="text-xs opacity-50">+</span>${reward}
    </div>
  </div>
);

const MonthTier = ({ label, reward, isDim, isHighlight }) => (
  <div className={`
    flex justify-between items-center py-3 border-b border-gray-800 last:border-0
    ${isHighlight ? 'py-4' : ''}
  `}>
    <span className={`text-xs font-medium ${isDim ? 'text-gray-500' : 'text-gray-300'} ${isHighlight ? 'text-white font-bold' : ''}`}>
      {label}
    </span>
    <div className={`
      flex items-center gap-1 font-mono font-bold
      ${isHighlight ? 'text-emerald-400 text-lg drop-shadow-md' : isDim ? 'text-gray-600' : 'text-emerald-600/70'}
    `}>
      <span className="text-xs opacity-50">+</span>${reward}
    </div>
  </div>
);

// ✅ ОБНОВЛЕННАЯ КАРТОЧКА КОМАНДЫ (С ФЛАГАМИ И КОНТРАСТОМ)
const TeamCard = ({ number, countries, color }) => (
  <div className={`p-4 rounded-lg border ${color} flex flex-col items-center text-center relative overflow-hidden`}>
    <div className="text-[10px] font-black opacity-50 uppercase tracking-widest mb-3">Группа {number}</div>
    <div className="flex flex-wrap justify-center gap-2">
      {countries.map(c => (
        <span 
          key={c} 
          className="flex items-center gap-1.5 px-2 py-1 rounded-[6px] bg-black/40 border border-white/10 text-white text-[11px] font-bold shadow-sm"
        >
          <span className="text-sm leading-none">{FLAGS[c] || '🏳️'}</span> 
          {c}
        </span>
      ))}
    </div>
  </div>
);

export default KPIPage;