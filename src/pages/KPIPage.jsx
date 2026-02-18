import React, { useState, useEffect } from 'react';
import {
  Trophy, Target, TrendingUp, Users, Calendar,
  DollarSign, Star, Briefcase, Award, Zap,
  Crown, Rocket, Shield, Clock, CheckCircle2,
  AlertCircle, ChevronRight, Sparkles, Wallet,
  Globe, Edit
} from 'lucide-react';
import { useAppStore } from '../store/appStore';
import ShareModal from '../components/sharing/ShareModal';

const FLAGS = {
  UA: '🇺🇦', PL: '🇵🇱', DE: '🇩🇪', KZ: '🇰🇿',
  TR: '🇹🇷', IT: '🇮🇹', BG: '🇧🇬', CZ: '🇨🇿',
  RO: '🇷🇴', LT: '🇱🇹', FR: '🇫🇷', PT: '🇵🇹',
  US: '🇺🇸', ES: '🇪🇸', SK: '🇸🇰', HU: '🇭🇺'
};

const KPIPage = ({ isPublic = false, publicSettings = {}, lang = 'ru' }) => {
  const { kpiRates, kpiSettings, user, fetchAllData, managers, managerRates, sharedPages } = useAppStore();
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  const baseSalary = kpiSettings?.base_salary || 100;

  const dailyTiers = typeof kpiSettings?.daily_tiers === 'string'
    ? JSON.parse(kpiSettings.daily_tiers)
    : (kpiSettings?.daily_tiers || []);

  const monthlyTiers = typeof kpiSettings?.monthly_tiers === 'string'
    ? JSON.parse(kpiSettings.monthly_tiers)
    : (kpiSettings?.monthly_tiers || []);

  const isAdmin = !isPublic && (user?.role === 'Admin' || user?.role === 'C-level'); // Доступ к кнопке
  const canShare = !isPublic && (user?.role === 'Admin' || user?.role === 'C-level');

  const isShared = sharedPages['kpi']?.is_active;

  // Translations
  const t = {
    ru: {
      title: 'Система Мотивации',
      subtitle: 'Актуальная тарифная сетка и бонусы',
      baseSalary: 'Гарантированный оклад',
      baseSalaryDesc: 'Фиксированная выплата каждую неделю при выполнении минимальных требований активности.',
      forecastRates: 'Тарифы за прогноз',
      dynamic: 'Dynamic',
      teamRace: 'Командная гонка',
      bonus30: '+$30 бонус',
      teamBonusDesc: '* Бонус начисляется каждому участнику победившей группы по итогам недели',
      dailyKpi: 'Дневной KPI',
      sales: 'Продаж',
      monthBonus: 'Бонус месяца',
      noRates: 'Тарифы не настроены',
      noDaily: 'Не настроено',
      noMonthly: 'Не настроено',
      salesPlus: 'продаж',
      group: 'Группа'
    },
    ua: {
      title: 'Система Мотивації',
      subtitle: 'Актуальна тарифна сітка та бонуси',
      baseSalary: 'Гарантований оклад',
      baseSalaryDesc: 'Фіксована виплата щотижня при виконанні мінімальних вимог активності.',
      forecastRates: 'Тарифи за прогноз',
      dynamic: 'Dynamic',
      teamRace: 'Командна гонка',
      bonus30: '+$30 бонус',
      teamBonusDesc: '* Бонус нараховується кожному учаснику групи-переможця за підсумками тижня',
      dailyKpi: 'Денний KPI',
      sales: 'Продажів',
      monthBonus: 'Бонус місяця',
      noRates: 'Тарифи не налаштовані',
      noDaily: 'Не налаштовано',
      noMonthly: 'Не налаштовано',
      salesPlus: 'продажів',
      group: 'Група'
    }
  };

  const text = t[lang] || t.ru;

  return (
    <div className={`animate-in fade-in zoom-in duration-300 ${isPublic ? 'py-10 px-4 md:px-6' : 'pb-10 font-sans'}`}>

      {/* HEADER */}
      {(!isPublic || publicSettings.show_title !== false) && (
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-xl font-bold dark:text-white flex items-center gap-2 tracking-tight">
              <Target className="text-blue-500" size={20} />
              {text.title}
            </h2>
            <p className="text-gray-500 dark:text-gray-400 text-xs mt-1 font-medium">
              {text.subtitle}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* SHARE BUTTON */}
            {canShare && (
              <button
                onClick={() => setIsShareModalOpen(true)}
                className="relative p-2 bg-white dark:bg-[#111] border border-gray-200 dark:border-[#333] hover:border-blue-500 text-gray-500 hover:text-blue-500 rounded-lg transition-colors shadow-sm"
                title={isShared ? "Доступ открыт (Настроить)" : "Настройки доступа"}
              >
                <Globe size={18} />
                {isShared && (
                  <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white dark:border-[#111]"></span>
                )}
              </button>
            )}

            {/* КНОПКА ИЗМЕНИТЬ (Только для Админа) */}
            {isAdmin && (
              <button
                onClick={() => setIsEditOpen(true)}
                className="flex items-center gap-2 bg-black dark:bg-white text-white dark:text-black px-4 py-2 rounded-lg text-xs font-bold hover:opacity-80 transition-opacity shadow-sm"
              >
                <Edit size={14} /> Изменить KPI
              </button>
            )}
          </div>
        </div>
      )}

      {/* 1. HERO BLOCK: BASE SALARY */}
      <div className="relative overflow-hidden rounded-xl bg-white dark:bg-[#111] border border-gray-200 dark:border-gray-800 shadow-xl mb-6 group">
        <div className="absolute inset-0 opacity-10 dark:opacity-20 pointer-events-none"
          style={{ backgroundImage: 'linear-gradient(#333 1px, transparent 1px), linear-gradient(90deg, #333 1px, transparent 1px)', backgroundSize: '20px 20px' }}>
        </div>
        <div className="absolute inset-0 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 pointer-events-none"></div>

        <div className="relative z-10 p-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="p-4 bg-blue-100 dark:bg-blue-600/10 border border-blue-200 dark:border-blue-500/30 rounded-2xl shadow-[0_0_15px_rgba(37,99,235,0.2)]">
              <Wallet size={32} className="text-blue-600 dark:text-blue-500" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest mb-1">{text.baseSalary}</h3>
              <p className="text-gray-500 dark:text-gray-400 text-xs max-w-sm leading-relaxed">
                {text.baseSalaryDesc}
              </p>
            </div>
          </div>
          <div className="flex items-start">
            <span className="text-2xl mt-2 text-gray-400 dark:text-gray-500 font-mono mr-1">$</span>
            <span className="text-6xl font-black text-gray-900 dark:text-white tracking-tighter font-mono drop-shadow-lg">{baseSalary}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* LEFT COLUMN */}
        <div className="lg:col-span-8 space-y-6">

          {/* ТАРИФЫ (Динамические из БД) */}
          <div className="bg-white dark:bg-[#111] rounded-xl border border-gray-200 dark:border-[#333] shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-200 dark:border-[#333] flex items-center justify-between bg-gray-50/50 dark:bg-[#161616]">
              <div className="flex items-center gap-2">
                <Sparkles size={16} className="text-purple-500" />
                <h3 className="text-sm font-bold dark:text-white uppercase tracking-wide">{text.forecastRates}</h3>
              </div>
              <span className="text-[10px] bg-purple-500/10 text-purple-400 px-2 py-0.5 rounded font-bold uppercase">{text.dynamic}</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2">
              {kpiRates.map((rate) => (
                <BonusItem
                  key={rate.id}
                  title={rate.product_name}
                  // subtitle={rate.subtitle} 
                  price={Number(rate.rate).toFixed(2)}
                  isHighlight={rate.is_highlight}
                />
              ))}
              {kpiRates.length === 0 && (
                <div className="p-6 text-center text-xs text-gray-400 col-span-2">{text.noRates}</div>
              )}
            </div>
          </div>

          {/* КОМАНДНАЯ ПРЕМИЯ (Статика для визуализации, пока нет логики команд в БД) */}
          <div className="bg-white dark:bg-[#111] rounded-xl border border-gray-200 dark:border-[#333] shadow-sm p-5">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <Trophy size={16} className="text-amber-500" />
                <h3 className="text-sm font-bold dark:text-white uppercase tracking-wide">{text.teamRace}</h3>
              </div>
              <div className="flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/20 text-amber-500 text-xs font-bold px-3 py-1 rounded-full">
                <Zap size={12} fill="currentColor" /> {text.bonus30}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <TeamCard number="I" countries={["UA", "PL", "IT", "HR"]} color="border-blue-500/30 bg-blue-500/5 text-blue-400" groupText={text.group} />
              <TeamCard number="II" countries={["BG", "CZ", "RO", "LT"]} color="border-purple-500/30 bg-purple-500/5 text-purple-400" groupText={text.group} />
              <TeamCard number="III" countries={["TR", "FR", "PT", "DE"]} color="border-emerald-500/30 bg-emerald-500/5 text-emerald-400" groupText={text.group} />
            </div>
            <p className="text-[10px] text-gray-500 mt-3 text-center opacity-70">
              {text.teamBonusDesc}
            </p>
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div className="lg:col-span-4 space-y-6">

          {/* ДНЕВНЫЕ ЦЕЛИ (Динамические из БД) */}
          <div className="bg-white dark:bg-[#111] rounded-xl border border-gray-200 dark:border-[#333] shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-200 dark:border-[#333] bg-gray-50/50 dark:bg-[#161616] flex items-center gap-2">
              <TrendingUp size={16} className="text-emerald-500" />
              <h3 className="text-sm font-bold dark:text-white uppercase tracking-wide">{text.dailyKpi}</h3>
            </div>

            <div className="p-4 space-y-3">
              {dailyTiers.map((tier, idx) => (
                <DailyTier
                  key={idx}
                  count={`${tier.min}${tier.max > 100 ? '+' : ' – ' + tier.max} `}
                  reward={tier.reward}
                  isMax={tier.reward >= 10}
                  salesText={text.sales}
                />
              ))}
              {dailyTiers.length === 0 && <div className="text-xs text-gray-400 text-center">{text.noDaily}</div>}
            </div>
          </div>

          {/* ИТОГИ МЕСЯЦА (Динамические из БД) */}
          <div className="relative overflow-hidden rounded-xl bg-white dark:bg-[#09090b] border border-gray-200 dark:border-gray-800 shadow-md">
            <div className="absolute inset-0 bg-gradient-to-b from-gray-50/50 to-gray-100/80 dark:from-gray-800/50 dark:to-black/80 pointer-events-none"></div>
            <div className="relative z-10 p-5">
              <div className="flex items-center gap-2 mb-5">
                <Calendar size={16} className="text-blue-500 dark:text-blue-400" />
                <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wide">{text.monthBonus}</h3>
              </div>

              <div className="space-y-0">
                {monthlyTiers.map((tier, idx) => (
                  <MonthTier
                    key={idx}
                    label={tier.max > 1000 ? `${tier.min} + ${text.salesPlus}` : `${tier.min} - ${tier.max} ${text.salesPlus}`}
                    reward={tier.reward}
                    isHighlight={tier.reward >= 100}
                    isDim={tier.reward < 75}
                  />
                ))}
                {monthlyTiers.length === 0 && <div className="text-xs text-gray-500 text-center">{text.noMonthly}</div>}
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* МОДАЛКА РЕДАКТИРОВАНИЯ */}
      {isEditOpen && (
        <EditKPIModal
          onClose={() => setIsEditOpen(false)}
          onUpdate={fetchAllData}
          kpiRates={kpiRates}
          kpiSettings={kpiSettings}
          managers={managers}
          managerRates={managerRates}
        />
      )}

      {/* SHARE MODAL */}
      {isShareModalOpen && (
        <ShareModal
          pageKey="kpi"
          pageTitle="Система Мотивации"
          onClose={() => setIsShareModalOpen(false)}
        />
      )}
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

const DailyTier = ({ count, reward, isMax, salesText = 'Продаж' }) => (
  <div className={`
    flex justify-between items-center p-3 rounded-lg border transition-all
    ${isMax
      ? 'bg-emerald-500/10 border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.1)]'
      : 'bg-gray-50 dark:bg-[#161616] border-gray-200 dark:border-[#333] hover:border-gray-300 dark:hover:border-[#444]'
    }
`}>
    <div className="flex flex-col">
      <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{salesText}</span>
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
    flex justify-between items-center py-3 border-b border-gray-200 dark:border-gray-800 last:border-0
    ${isHighlight ? 'py-4' : ''}
`}>
    <span className={`text-xs font-medium ${isDim ? 'text-gray-400 dark:text-gray-500' : 'text-gray-700 dark:text-gray-300'} ${isHighlight ? 'text-black dark:text-white font-bold' : ''}`}>
      {label}
    </span>
    <div className={`
      flex items-center gap-1 font-mono font-bold
      ${isHighlight ? 'text-emerald-600 dark:text-emerald-400 text-lg drop-shadow-md' : isDim ? 'text-gray-400 dark:text-gray-600' : 'text-emerald-600/70 dark:text-emerald-600/70'}
`}>
      <span className="text-xs opacity-50">+</span>${reward}
    </div>
  </div>
);

const TeamCard = ({ number, countries, color, groupText = 'Группа' }) => (
  <div className={`p-4 rounded-lg border ${color} flex flex-col items-center text-center relative overflow-hidden`}>
    <div className="text-[10px] font-black opacity-50 uppercase tracking-widest mb-3">{groupText} {number}</div>
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