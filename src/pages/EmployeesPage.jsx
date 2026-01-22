import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/appStore';
import { toggleManagerStatus } from '../services/dataService';
import {
  Mail, Phone, Clock, Globe, Send, User,
  Briefcase, Search, Filter, XCircle, Plus,
  Pencil, Lock, Unlock, Ban, ShieldCheck
} from 'lucide-react';

const SelectFilter = ({ label, value, options, onChange }) => (
  <div className="relative min-w-[120px] group">
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full appearance-none bg-white dark:bg-[#111] border border-gray-200 dark:border-[#333] text-gray-700 dark:text-gray-200 py-1.5 pl-2.5 pr-7 rounded-[6px] text-xs font-medium focus:outline-none focus:border-blue-500 hover:border-gray-400 dark:hover:border-[#555] transition-all cursor-pointer"
    >
      <option value="">{label}: Все</option>
      {options.map(opt => (
        <option key={opt} value={opt}>{opt}</option>
      ))}
    </select>
    <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
      <Filter size={10} />
    </div>
  </div>
);

const EmployeesPage = ({ pageTitle = "Сотрудники", targetRole, excludeRole, showAddButton = false }) => {
  const navigate = useNavigate();
  const { managers, user: currentUser, fetchAllData, isLoading, onlineUsers } = useAppStore();
  const [filters, setFilters] = useState({ geo: '' });

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
    if (filters.geo) {
      result = result.filter(mgr => mgr.geo && Array.isArray(mgr.geo) && mgr.geo.includes(filters.geo));
    }

    // 2.1 Фильтр по РОЛИ (из выпадающего списка)
    if (filters.role) {
      result = result.filter(m => m.role === filters.role);
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
  }, [managers, targetRole, excludeRole, filters.geo, filters.role, onlineUsers]);

  // Собираем уникальные ГЕО для фильтра
  const uniqueGeos = useMemo(() => {
    return [...new Set(managers.flatMap(m => m.geo || []))].sort();
  }, [managers]);

  // Собираем уникальные Роли для фильтра
  const uniqueRoles = useMemo(() => {
    return [...new Set(managers.map(m => m.role).filter(Boolean))].sort();
  }, [managers]);

  const canManage = currentUser && ['Admin', 'C-level', 'SeniorSales'].includes(currentUser.role);

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

  const calculateWorkDays = (createdAt) => {
    if (!createdAt) return { dateStr: '-', days: 0 };
    const diff = Math.abs(new Date() - new Date(createdAt));
    return {
      dateStr: new Date(createdAt).toLocaleDateString('ru-RU'),
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
            <SelectFilter label="Роль" value={filters.role || ''} options={uniqueRoles} onChange={(val) => setFilters(prev => ({ ...prev, role: val }))} />
            <SelectFilter label="ГЕО" value={filters.geo} options={uniqueGeos} onChange={(val) => setFilters(prev => ({ ...prev, geo: val }))} />
            {(filters.geo || filters.role) && (
              <button
                onClick={() => setFilters({ geo: '', role: '' })}
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
          const workStats = calculateWorkDays(mgr.created_at);
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
                    {age && (
                      <div className="text-[10px] text-gray-400 mt-0.5 font-mono">
                        {age} лет
                      </div>
                    )}
                  </div>
                </div>

                <div className={`flex items-center gap-1.5 px-2 py-1 rounded-[4px] border text-[10px] font-bold uppercase tracking-wider ${isBlocked
                  ? 'bg-red-50 dark:bg-red-900/10 text-red-600 border-red-100 dark:border-red-900/30'
                  : 'bg-emerald-50 dark:bg-emerald-900/10 text-emerald-600 border-emerald-100 dark:border-emerald-900/30'
                  }`}>
                  {isBlocked ? <Ban size={10} /> : <ShieldCheck size={10} />}
                  {isBlocked ? 'Blocked' : 'Active'}
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