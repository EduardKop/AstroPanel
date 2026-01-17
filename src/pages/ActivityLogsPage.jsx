import React, { useEffect, useState, useRef } from 'react';
import { useAppStore } from '../store/appStore';
import { Activity, Filter, AlertCircle, CheckCircle, Info, User, RefreshCw, Layers } from 'lucide-react';

const ActivityLogsPage = () => {
    const { activityLogs, fetchLogs, isLoading } = useAppStore();
    const [page, setPage] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const [filterImportance, setFilterImportance] = useState('all');
    const [isFetching, setIsFetching] = useState(false);
    const observerTarget = useRef(null);

    // Initial load
    useEffect(() => {
        loadMoreLogs(true);
    }, []);

    // Infinite Scroll Observer
    useEffect(() => {
        const observer = new IntersectionObserver(
            entries => {
                if (entries[0].isIntersecting && hasMore && !isFetching) {
                    loadMoreLogs();
                }
            },
            { threshold: 1.0 }
        );

        if (observerTarget.current) {
            observer.observe(observerTarget.current);
        }

        return () => {
            if (observerTarget.current) {
                observer.unobserve(observerTarget.current);
            }
        };
    }, [hasMore, isFetching, page]);

    const loadMoreLogs = async (reset = false) => {
        if (isFetching) return;
        setIsFetching(true);

        const pageSize = 50;
        const currentPage = reset ? 0 : page;
        const from = currentPage * pageSize;
        const to = from + pageSize - 1;

        console.log(`Fetching logs from ${from} to ${to}`);

        const newLogs = await fetchLogs(from, to);

        if (newLogs && newLogs.length < pageSize) {
            setHasMore(false);
        } else {
            setHasMore(true);
        }

        setPage(currentPage + 1);
        setIsFetching(false);
    };

    // Filter logic (client-side for now, can be server-side if needed)
    const filteredLogs = activityLogs.filter(log => {
        if (filterImportance === 'all') return true;
        return log.importance === filterImportance;
    });

    const getActionColor = (action) => {
        switch (action) {
            case 'create': return 'text-green-500 bg-green-500/10 border-green-500/20';
            case 'delete': return 'text-red-500 bg-red-500/10 border-red-500/20';
            case 'update': return 'text-blue-500 bg-blue-500/10 border-blue-500/20';
            case 'auth': return 'text-purple-500 bg-purple-500/10 border-purple-500/20';
            default: return 'text-gray-500 bg-gray-500/10 border-gray-500/20';
        }
    };

    const getImportanceIcon = (importance) => {
        switch (importance) {
            case 'high': return <AlertCircle size={16} className="text-red-500" />; // 🔴
            case 'medium': return <Info size={16} className="text-blue-500" />; // 🔵
            default: return <CheckCircle size={16} className="text-gray-400" />; // ⚪
        }
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleString('ru-RU', {
            day: '2-digit', month: '2-digit', year: '2-digit',
            hour: '2-digit', minute: '2-digit'
        });
    };

    return (
        <div className="pb-10 w-full max-w-4xl mx-auto">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                <div>
                    <h1 className="text-2xl font-bold dark:text-white flex items-center gap-2">
                        <Activity className="text-cyan-500" />
                        Лента Активности
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
                        Лог действий пользователей системы
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <div className="relative group">
                        <select
                            value={filterImportance}
                            onChange={(e) => setFilterImportance(e.target.value)}
                            className="appearance-none bg-white dark:bg-[#111] border border-gray-200 dark:border-[#333] text-gray-700 dark:text-gray-200 py-2 pl-3 pr-8 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-cyan-500 cursor-pointer"
                        >
                            <option value="all">Все уровни</option>
                            <option value="high">🔴 Высокая важность</option>
                            <option value="medium">🔵 Средняя важность</option>
                            <option value="low">⚪ Низкая важность</option>
                        </select>
                        <Filter size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    </div>
                </div>
            </div>

            {/* Logs List */}
            <div className="bg-white dark:bg-[#111] border border-gray-200 dark:border-[#333] rounded-xl shadow-sm overflow-hidden">
                <div className="divide-y divide-gray-100 dark:divide-[#222]">
                    {filteredLogs.map((log) => (
                        <div key={log.id} className="p-4 hover:bg-gray-50 dark:hover:bg-[#161616] transition-colors flex gap-4 items-start">
                            {/* Icon / Avatar placeholder */}
                            <div className="mt-1 flex-shrink-0">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center bg-gray-100 dark:bg-[#222] border border-gray-200 dark:border-[#333]`}>
                                    <User size={18} className="text-gray-500" />
                                </div>
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="font-bold text-gray-900 dark:text-gray-100 text-sm">
                                        {log.user_name}
                                    </span>
                                    <span className="text-gray-400 text-xs">•</span>
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${getActionColor(log.action_type)}`}>
                                        {log.action_type}
                                    </span>
                                    <span className="text-gray-400 text-xs">•</span>
                                    <span className="text-xs text-gray-500 dark:text-gray-400 font-mono bg-gray-100 dark:bg-[#222] px-1.5 py-0.5 rounded">
                                        {log.entity_type} {log.entity_id ? `#${log.entity_id.slice(0, 4)}` : ''}
                                    </span>
                                </div>

                                {/* Details JSON rendering */}
                                <div className="text-sm text-gray-600 dark:text-gray-300 break-words mt-1">
                                    {log.details && (
                                        Object.keys(log.details).length > 0 ? (
                                            <div className="flex flex-col gap-1">
                                                {/* Special compact display for "settings" entity */}
                                                {log.entity_type === 'settings' ? (
                                                    <div className="text-xs text-gray-500 dark:text-gray-400">
                                                        Изменены настройки: <span className="font-semibold text-blue-600 dark:text-blue-400">
                                                            {log.details.key === 'role_permissions' ? 'Права ролей' :
                                                                log.details.key === 'role_documentation' ? 'Документация ролей' :
                                                                    log.details.key}
                                                        </span>
                                                    </div>
                                                ) : (
                                                    /* Standard display for other entities */
                                                    Object.entries(log.details).map(([key, value]) => {
                                                        // Special handling for 'changes' or other large objects
                                                        if (typeof value === 'object' && value !== null) {
                                                            return (
                                                                <div key={key} className="bg-gray-50 dark:bg-[#1A1A1A] border border-gray-100 dark:border-[#333] rounded-lg p-2 text-xs">
                                                                    <div className="font-semibold text-gray-500 mb-1">{key}:</div>
                                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1">
                                                                        {Object.entries(value).map(([subKey, subValue]) => (
                                                                            // Skip potentially large/irrelevant fields if needed, or just show all
                                                                            <div key={subKey} className="flex items-start gap-1">
                                                                                <span className="text-gray-400 shrink-0">{subKey}:</span>
                                                                                <span className="text-gray-800 dark:text-gray-200 truncate" title={String(subValue)}>
                                                                                    {String(subValue)}
                                                                                </span>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            );
                                                        }

                                                        // Standard simple boolean/string/number
                                                        return (
                                                            <span key={key} className="inline-flex items-center gap-1 text-xs bg-gray-50 dark:bg-[#1A1A1A] border border-gray-100 dark:border-[#333] px-2 py-1 rounded w-fit">
                                                                <span className="font-medium text-gray-500">{key}:</span>
                                                                <span className="font-mono text-gray-800 dark:text-gray-200">
                                                                    {String(value)}
                                                                </span>
                                                            </span>
                                                        );
                                                    })
                                                )}
                                            </div>
                                        ) : (
                                            <span className="italic text-gray-400">Нет деталей</span>
                                        )
                                    )}
                                </div>
                            </div>

                            {/* Right Side: Date & Importance */}
                            <div className="flex flex-col items-end gap-2 flex-shrink-0">
                                <span className="text-xs text-gray-400 font-medium whitespace-nowrap">
                                    {formatDate(log.created_at)}
                                </span>
                                <div title={`Важность: ${log.importance}`}>
                                    {getImportanceIcon(log.importance)}
                                </div>
                            </div>
                        </div>
                    ))}

                    {filteredLogs.length === 0 && !isFetching && (
                        <div className="p-12 text-center text-gray-500 dark:text-gray-400">
                            <Layers size={48} className="mx-auto text-gray-300 dark:text-gray-600 mb-4" />
                            <p>Лента активности пуста</p>
                        </div>
                    )}
                </div>

                {/* Loading Indicator */}
                <div ref={observerTarget} className="p-4 flex justify-center">
                    {isFetching && (
                        <div className="flex items-center gap-2 text-gray-400 text-sm animate-pulse">
                            <RefreshCw size={16} className="animate-spin" />
                            Загрузка...
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ActivityLogsPage;
