import React, { useState, useEffect } from 'react';
import { useAppStore } from '../store/appStore';
import { Settings, Save, Info, Shield, CheckCircle, XCircle } from 'lucide-react';

const ROLES = ['C-level', 'Admin', 'SeniorSales', 'Sales', 'Consultant'];

const PERMISSION_KEYS = [
    { key: 'stats', label: 'Аналитика (Основная)' },
    { key: 'quick_stats', label: 'Сравнит. Анализ' },
    { key: 'geo', label: 'География' },
    { key: 'geo_matrix', label: 'Матрица ГЕО' },
    { key: 'kpi', label: 'KPI' },
    { key: 'employees_list', label: 'Список Сотрудников' },
    { key: 'employees_manage', label: 'Управление Сотрудниками' },
    { key: 'salaries', label: 'Зарплаты' },
    { key: 'schedule', label: 'График' },
    { key: 'time_log', label: 'Учёт Времени' },
    { key: 'knowledge_base', label: 'База Знаний (Просмотр)' },
    { key: 'products_manage', label: 'Продукты (Редактирование)' },
    { key: 'rules_manage', label: 'Правила (Редактирование)' },
];

const CLevelSettingsPage = () => {
    const { permissions, roleDocs, updateSettings, fetchAllData } = useAppStore();
    const [activeTab, setActiveTab] = useState('roles');
    const [localPermissions, setLocalPermissions] = useState({});
    const [localDocs, setLocalDocs] = useState({});
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (permissions) setLocalPermissions(permissions);
        if (roleDocs) setLocalDocs(roleDocs);
    }, [permissions, roleDocs]);

    const handlePermissionChange = (role, key) => {
        setLocalPermissions(prev => ({
            ...prev,
            [role]: {
                ...prev[role],
                [key]: !prev[role]?.[key]
            }
        }));
    };

    const handleDocChange = (role, text) => {
        setLocalDocs(prev => ({
            ...prev,
            [role]: text
        }));
    };

    const handleSave = async () => {
        setIsSaving(true);
        if (activeTab === 'roles') {
            await updateSettings('role_permissions', localPermissions);
        } else {
            await updateSettings('role_documentation', localDocs);
        }
        await fetchAllData(true);
        setIsSaving(false);
    };

    return (
        <div className="p-6 max-w-[1600px] mx-auto">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-3 dark:text-white">
                        <Settings className="text-amber-500" />
                        C-Level Настройки
                    </h1>
                    <p className="text-gray-500 text-sm mt-1">Глобальное управление ролями и доступами</p>
                </div>

                <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="flex items-center gap-2 px-6 py-2.5 bg-black dark:bg-white text-white dark:text-black rounded-lg hover:opacity-80 transition-all font-medium disabled:opacity-50"
                >
                    {isSaving ? <span className="animate-spin">⏳</span> : <Save size={18} />}
                    <span>Сохранить изменения</span>
                </button>
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-4 mb-8 border-b border-gray-200 dark:border-[#222]">
                <button
                    onClick={() => setActiveTab('roles')}
                    className={`pb-4 px-2 font-medium text-sm transition-all relative ${activeTab === 'roles' ? 'text-amber-600 dark:text-amber-500' : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-300'}`}
                >
                    <div className="flex items-center gap-2"><Shield size={16} /> Настройка Ролей</div>
                    {activeTab === 'roles' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-amber-500" />}
                </button>
                <button
                    onClick={() => setActiveTab('docs')}
                    className={`pb-4 px-2 font-medium text-sm transition-all relative ${activeTab === 'docs' ? 'text-amber-600 dark:text-amber-500' : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-300'}`}
                >
                    <div className="flex items-center gap-2"><Info size={16} /> Документация</div>
                    {activeTab === 'docs' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-amber-500" />}
                </button>
            </div>

            {activeTab === 'roles' && (
                <div className="bg-white dark:bg-[#111] rounded-xl border border-gray-200 dark:border-[#222] overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-gray-50 dark:bg-[#1A1A1A] border-b border-gray-200 dark:border-[#222]">
                                <tr>
                                    <th className="px-6 py-4 font-semibold text-gray-900 dark:text-white min-w-[200px]">Раздел / Доступ</th>
                                    {ROLES.map(role => (
                                        <th key={role} className="px-6 py-4 font-semibold text-gray-900 dark:text-white text-center min-w-[120px]">
                                            <span className={`px-2 py-1 rounded text-xs ${role === 'Admin' ? 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400' :
                                                role === 'C-level' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400' :
                                                    'bg-gray-100 text-gray-700 dark:bg-[#222] dark:text-gray-400'
                                                }`}>
                                                {role === 'C-level' ? 'C-level (Ваша роль)' : role}
                                            </span>
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-[#222]">
                                {PERMISSION_KEYS.map((perm) => (
                                    <tr key={perm.key} className="hover:bg-gray-50 dark:hover:bg-[#1A1A1A]/50 transition-colors">
                                        <td className="px-6 py-4 font-medium text-gray-700 dark:text-gray-300">{perm.label}</td>
                                        {ROLES.map(role => {
                                            const isEnabled = localPermissions[role]?.[perm.key] || false;
                                            // C-level always has full access (visual lock)
                                            const isLocked = role === 'C-level';

                                            return (
                                                <td key={role} className="px-6 py-4 text-center">
                                                    <button
                                                        onClick={() => !isLocked && handlePermissionChange(role, perm.key)}
                                                        disabled={isLocked}
                                                        className={`w-6 h-6 rounded flex items-center justify-center transition-all mx-auto ${isEnabled || isLocked // Ensure visual check for locked C-level
                                                            ? 'bg-green-500 text-white shadow-sm hover:bg-green-600'
                                                            : 'bg-gray-200 dark:bg-[#333] text-gray-400 hover:bg-gray-300 dark:hover:bg-[#444]'
                                                            } ${isLocked ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                    >
                                                        {(isEnabled || isLocked) ? <CheckCircle size={14} /> : <div className="w-1.5 h-1.5 rounded-full bg-gray-400" />}
                                                    </button>
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {activeTab === 'docs' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {ROLES.map(role => (
                        <div key={role} className="bg-white dark:bg-[#111] p-6 rounded-xl border border-gray-200 dark:border-[#222]">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="font-semibold text-lg dark:text-white flex items-center gap-2">
                                    {role}
                                    {role === 'C-level' && <span className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">Top Level</span>}
                                </h3>
                            </div>
                            <textarea
                                value={localDocs[role] || ''}
                                onChange={(e) => handleDocChange(role, e.target.value)}
                                placeholder={`Описание роли ${role}...`}
                                className="w-full h-32 p-3 text-sm bg-gray-50 dark:bg-[#1A1A1A] border border-gray-200 dark:border-[#333] rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 resize-none"
                            />
                            <div className="mt-3 flex justify-end">
                                <span className="text-xs text-gray-400">
                                    {localDocs[role]?.length || 0} characters
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default CLevelSettingsPage;
