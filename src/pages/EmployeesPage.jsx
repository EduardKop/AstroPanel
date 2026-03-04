import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/appStore';
import { toggleManagerStatus } from '../services/dataService';
import {
  Mail, Phone, Clock, Globe, Send, User,
  Briefcase, Search, XCircle, Plus,
  Pencil, Lock, Unlock, Ban, ShieldCheck, Copy, Check,
  Sparkles, FlaskConical, BadgeCheck
} from 'lucide-react';

import { DenseSelect } from '../components/ui/FilterSelect';

// ── Статус по стажу ───────────────────────────────────────────────────────────
const getEmploymentStatus = (mgr) => {
  const dateStr = mgr.started_at || mgr.created_at;
  if (!dateStr) return null;
  const days = Math.ceil(Math.abs(new Date() - new Date(dateStr)) / (1000 * 3600 * 24));
  if (days <= 7) return { key: 'intern', label: 'Стажер', days, icon: Sparkles, bg: 'bg-violet-50 dark:bg-violet-900/10', text: 'text-violet-600 dark:text-violet-400', border: 'border-violet-200 dark:border-violet-700/40' };
  if (days <= 30) return { key: 'probation', label: 'Исп. период', days, icon: FlaskConical, bg: 'bg-amber-50 dark:bg-amber-900/10', text: 'text-amber-600 dark:text-amber-400', border: 'border-amber-200 dark:border-amber-700/40' };
  return { key: 'employee', label: 'Сотрудник', days, icon: BadgeCheck, bg: 'bg-emerald-50 dark:bg-emerald-900/10', text: 'text-emerald-600 dark:text-emerald-400', border: 'border-emerald-200 dark:border-emerald-700/40' };
};

// Component for displaying copyable telegram username
const CopyableUsername = ({ username }) => {
  const [copied, setCopied] = useState(false);
  const cleanUsername = '@' + (username || '').replace('@', '');

  const handleCopy = async (e) => {
    e.stopPropagation();
    await navigator.clipboard.writeText(cleanUsername);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-1 text-[10px] text-gray-400 hover:text-blue-500 transition-colors mt-0.5"
      title="Копировать @username"
    >
      <span>{cleanUsername}</span>
      {copied ? <Check size={10} className="text-green-500" /> : <Copy size={10} />}
    </button>
  );
};

const EmployeesPage = ({ pageTitle = "Сотрудники", targetRole, excludeRole, showAddButton = false }) => {
  const navigate = useNavigate();
  const { managers, user: currentUser, fetchAllData, isLoading, onlineUsers, permissions } = useAppStore();
  const [filters, setFilters] = useState({ geo: [], role: [] });
  const [searchQuery, setSearchQuery] = useState('');

  // Фильтрация
  const processedManagers = useMemo(() => {
    let result = managers;

    // 1. Фильтр по роли (из пропсов роутера)
    if (targetRole) {
      result = result.filter(m => m.role?.toLowerCase() === targetRole.toLowerCase());
    }
    if (excludeRole) {
      result = result.filter(m => m.role?.toLowerCase() !== excludeRole.toLowerCase());
    }

    // 2. Фильтр по ГЕО (из выпадающего списка)
    if (filters.geo.length > 0) {
      result = result.filter(mgr => mgr.geo && Array.isArray(mgr.geo) && mgr.geo.some(g => filters.geo.includes(g)));
    }

    // 2.1 Фильтр по РОЛИ (из выпадающего списка)
    if (filters.role.length > 0) {
      result = result.filter(m => filters.role.includes(m.role));
    }

    // 2.2 Поиск по тексту (telegram username, GEO, telegram_id)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter(m => {
        // Search by telegram username
        if (m.telegram_username && m.telegram_username.toLowerCase().includes(query)) return true;
        // Search by telegram ID
        if (m.telegram_id && String(m.telegram_id).includes(query)) return true;
        // Search by name
        if (m.name && m.name.toLowerCase().includes(query)) return true;
        // Search by GEO
        if (m.geo && Array.isArray(m.geo) && m.geo.some(g => g.toLowerCase().includes(query))) return true;
        return false;
      });
    }

    // 3. Сортировка (Активные выше)
    result.sort((a, b) => {
      // Приоритет 1: Сначала онлайн
      const isOnlineA = onlineUsers?.includes(a.id) ? 1 : 0;
      const isOnlineB = onlineUsers?.includes(b.id) ? 1 : 0;
      if (isOnlineA !== isOnlineB) return isOnlineB - isOnlineA;

      // Приоритет 2: Активные
      if (a.status === 'active' && b.status !== 'active') return -1;
      if (a.status !== 'active' && b.status === 'active') return 1;
      return 0;
    });

    return result;
  }, [managers, targetRole, excludeRole, filters.geo, filters.role, onlineUsers, searchQuery]);

  // Собираем уникальные ГЕО для фильтра
  const uniqueGeos = useMemo(() => {
    return [...new Set(managers.flatMap(m => m.geo || []))].sort();
  }, [managers]);

  // Собираем уникальные Роли для фильтра
  const uniqueRoles = useMemo(() => {
    return [...new Set(managers.map(m => m.role).filter(Boolean))].sort();
  }, [managers]);

  const canManage = useMemo(() => {
    if (!currentUser) return false;
    if (['Admin', 'C-level'].includes(currentUser.role)) return true;
    return permissions?.[currentUser.role]?.employees_manage === true;
  }, [currentUser, permissions]);

  const handleToggleBlock = async (id, currentStatus, name) => {
    const action = currentStatus === 'active' ? 'заблокировать' : 'разблокировать';
    if (!window.confirm(`Вы уверены, что хотите ${action} сотрудника ${name}?`)) return;

    try {
      await toggleManagerStatus(id, currentStatus);
      fetchAllData(true);
    } catch (e) {
      showToast('Ошибка при смене статуса', 'error');
    }
  };

  const calculateAge = (birthDateString) => {
    if (!birthDateString) return null;
    const today = new Date();
    const birthDate = new Date(birthDateString);
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) { age--; }
    return age;
  };

  const calculateWorkDays = (mgr) => {
    // Используем started_at если задана, иначе — created_at (как на HR Dashboard)
    const dateStr = mgr.started_at || mgr.created_at;
    if (!dateStr) return { dateStr: '-', days: 0 };
    const diff = Math.abs(new Date() - new Date(dateStr));
    return {
      dateStr: new Date(dateStr).toLocaleDateString('ru-RU'),
      days: Math.ceil(diff / (1000 * 3600 * 24))
    };
  };

  if (isLoading && managers.length === 0) {
    return <div className="flex justify-center items-center h-64 text-gray-500 animate-pulse text-xs font-mono">Загрузка данных...</div>;
  }

  return (
    <div className="animate-in fade-in zoom-in duration-300 pb-10">

      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-6">
        <div>
          <h2 className="text-lg font-bold dark:text-white flex items-center gap-2 tracking-tight">
            <User className="text-blue-500" size={18} />
            {pageTitle}
          </h2>
          <p className="text-gray-500 dark:text-gray-400 text-xs mt-0.5 font-medium">
            Штат: <span className="text-gray-900 dark:text-white font-mono">{processedManagers.length}</span> чел.
          </p>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
          {canManage && showAddButton && (
            <button
              onClick={() => navigate('/add-employee')}
              className="flex items-center gap-2 bg-white dark:bg-[#1A1A1A] hover:bg-gray-50 dark:hover:bg-[#222] text-gray-900 dark:text-white px-3 py-1.5 rounded-[6px] border border-gray-200 dark:border-[#333] font-medium text-xs transition-all active:scale-95"
            >
              <Plus size={14} /> <span>Добавить</span>
            </button>
          )}

          <div className="flex items-center gap-2">
            {/* Search Input */}
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Поиск по @username / ID / ГЕО..."
                className="pl-8 pr-8 py-1.5 w-[220px] text-xs bg-white dark:bg-[#1A1A1A] border border-gray-200 dark:border-[#333] rounded-[6px] focus:outline-none focus:border-blue-400 dark:focus:border-blue-500 transition-colors"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                >
                  <XCircle size={14} />
                </button>
              )}
            </div>
            <DenseSelect label="Роль" value={filters.role} options={uniqueRoles} onChange={(val) => setFilters(prev => ({ ...prev, role: val }))} />
            <DenseSelect label="ГЕО" value={filters.geo} options={uniqueGeos} onChange={(val) => setFilters(prev => ({ ...prev, geo: val }))} />
            {(filters.geo.length > 0 || filters.role.length > 0 || searchQuery) && (
              <button
                onClick={() => { setFilters({ geo: [], role: [] }); setSearchQuery(''); }}
                className="text-red-500 bg-red-500/10 hover:bg-red-500/20 p-1.5 rounded-[6px] transition-colors"
                title="Сбросить фильтры"
              >
                <XCircle size={14} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {processedManagers.map((mgr) => {
          const age = calculateAge(mgr.birth_date);
          const workStats = calculateWorkDays(mgr);
          const isBlocked = mgr.status === 'blocked';
          const isOnline = onlineUsers?.includes(mgr.id);

          return (
            <div
              key={mgr.id}
              className={`
                relative bg-white dark:bg-[#111] rounded-lg border overflow-hidden transition-all duration-200
                ${isBlocked
                  ? 'border-red-200 dark:border-red-900/30 opacity-75'
                  : 'border-gray-200 dark:border-[#333] hover:border-gray-300 dark:hover:border-[#555] shadow-sm'
                }
              `}
            >

              {/* CARD HEADER */}
              <div className="p-4 flex items-start justify-between border-b border-gray-100 dark:border-[#222] bg-gray-50/50 dark:bg-[#161616]/50">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    {mgr.avatar_url ? (
                      <img
                        src={mgr.avatar_url}
                        alt={mgr.name}
                        className={`w-10 h-10 rounded-[8px] object-cover border ${isBlocked ? 'border-red-200 grayscale' : 'border-gray-200 dark:border-[#444]'}`}
                      />
                    ) : (
                      <div className={`w-10 h-10 rounded-[8px] flex items-center justify-center text-xs font-bold border ${isBlocked ? 'bg-red-50 text-red-400 border-red-100' : 'bg-white dark:bg-[#222] text-gray-500 border-gray-200 dark:border-[#333]'}`}>
                        {mgr.name?.charAt(0)}
                      </div>
                    )}
                    {/* 🟢 ONLINE INDICATOR */}
                    {isOnline && (
                      <span className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 border-2 border-white dark:border-[#1A1A1A] rounded-full animate-pulse z-10" title="Online" />
                    )}
                  </div>

                  <div>
                    <h3 className={`text-sm font-bold leading-tight ${isBlocked ? 'text-gray-500 line-through' : 'text-gray-900 dark:text-white'}`}>
                      {mgr.name}
                    </h3>
                    {mgr.telegram_username && (
                      <CopyableUsername username={mgr.telegram_username} />
                    )}
                    {age && (
                      <div className="text-[10px] text-gray-400 mt-0.5 font-mono">
                        {age} лет
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex flex-col items-end gap-1">
                  {/* Active / Blocked */}
                  <div className={`flex items-center gap-1.5 px-2 py-1 rounded-[4px] border text-[10px] font-bold uppercase tracking-wider ${isBlocked
                    ? 'bg-red-50 dark:bg-red-900/10 text-red-600 border-red-100 dark:border-red-900/30'
                    : 'bg-emerald-50 dark:bg-emerald-900/10 text-emerald-600 border-emerald-100 dark:border-emerald-900/30'
                    }`}>
                    {isBlocked ? <Ban size={10} /> : <ShieldCheck size={10} />}
                    {isBlocked ? 'Blocked' : 'Active'}
                  </div>
                  {/* Employment status */}
                  {(() => {
                    const st = getEmploymentStatus(mgr);
                    if (!st) return null;
                    const Icon = st.icon;
                    return (
                      <div className={`flex items-center gap-1 px-2 py-0.5 rounded-[4px] border text-[9px] font-bold uppercase tracking-wider ${st.bg} ${st.text} ${st.border}`}>
                        <Icon size={9} />
                        {st.label}
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* CARD BODY */}
              <div className="p-4 grid grid-cols-2 gap-y-4 gap-x-2 text-xs">

                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Должность</span>
                  <div className="flex items-center gap-1.5 font-medium text-gray-700 dark:text-gray-300">
                    <Briefcase size={12} className="text-blue-500" />
                    {mgr.role || 'Не указана'}
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Локация (ГЕО)</span>
                  <div className="flex items-center gap-1.5 font-medium text-gray-900 dark:text-white">
                    <Globe size={12} className="text-purple-500" />
                    {['Admin', 'C-level'].includes(mgr.role) ? (
                      <span className="text-gray-500 dark:text-gray-400">Вся компания</span>
                    ) : mgr.geo && mgr.geo.length > 0 ? (
                      <span className="truncate">{mgr.geo.join(', ')}</span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">В команде</span>
                  <div className="flex items-center gap-1.5 font-mono text-gray-600 dark:text-gray-400">
                    <Clock size={12} />
                    {workStats.days} дн.
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Дата начала</span>
                  <div className="font-mono text-gray-600 dark:text-gray-400">
                    {workStats.dateStr}
                  </div>
                </div>

              </div>

              {/* FOOTER */}
              <div className="px-4 py-3 border-t border-gray-100 dark:border-[#222] flex items-center justify-between bg-gray-50/30 dark:bg-[#161616]/30">
                <div className="flex items-center gap-3">
                  {mgr.telegram_username && (
                    <a
                      href={`https://t.me/${mgr.telegram_username.replace('@', '')}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-gray-400 hover:text-[#229ED9] transition-colors"
                      title={mgr.telegram_username}
                    >
                      <Send size={16} />
                    </a>
                  )}
                  {mgr.email && (
                    <a href={`mailto:${mgr.email}`} className="text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors" title={mgr.email}>
                      <Mail size={16} />
                    </a>
                  )}
                  {mgr.phone && (
                    <a href={`tel:${mgr.phone}`} className="text-gray-400 hover:text-green-500 transition-colors" title={mgr.phone}>
                      <Phone size={16} />
                    </a>
                  )}
                </div>

                {canManage && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => navigate(`/edit-employee/${mgr.id}`)}
                      className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-all"
                      title="Редактировать"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => handleToggleBlock(mgr.id, mgr.status, mgr.name)}
                      className={`p-1.5 rounded transition-all ${isBlocked
                        ? 'text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20'
                        : 'text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20'
                        }`}
                      title={isBlocked ? "Разблокировать" : "Заблокировать"}
                    >
                      {isBlocked ? <Unlock size={14} /> : <Lock size={14} />}
                    </button>
                  </div>
                )}
              </div>

            </div>
          );
        })}
      </div>
    </div>
  );
};

export default EmployeesPage;