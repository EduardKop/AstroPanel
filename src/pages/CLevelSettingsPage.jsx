import React, { useState, useEffect } from 'react';
import { useAppStore } from '../store/appStore';
import {
    Settings, Save, Info, Shield, CheckCircle, XCircle,
    LayoutDashboard, Users, Globe, CreditCard,
    BarChart3, Moon, Sun, RefreshCcw, LineChart, Briefcase,
    Headphones, Contact, LogOut, ChevronDown, ChevronRight, Gift, LayoutGrid,
    BookOpen, Coins, Calendar, Clock, Lock, CheckSquare, Square, PieChart, Eye, ShieldAlert, Activity
} from 'lucide-react';

const ROLES = ['C-level', 'Admin', 'HR', 'SeniorSales', 'Sales', 'SalesTaro', 'Consultant'];

// Configuration mapping sections to permissions with Icons
const SECTIONS = [
    {
        id: 'dashboards',
        label: 'Общие дешборды',
        icon: LayoutDashboard,
        items: [
            { key: 'dashboard_view', label: 'Обзор', icon: LayoutDashboard },
            { key: 'stats', label: 'Аналитика', icon: LineChart },
            { key: 'quick_stats', label: 'Сравн. Анализ', icon: BarChart3 },
            { key: 'geo', label: 'География', icon: Globe },
            { key: 'geo_matrix', label: 'Матрица ГЕО', icon: LayoutGrid },
            { key: 'transactions_view', editKey: 'transactions_edit', label: 'Транзакции', icon: CreditCard },
        ]
    },
    {
        id: 'sales_dept',
        label: 'Отдел Продаж',
        icon: Briefcase,
        items: [
            { key: 'sales_dashboard', label: 'Дашборд', icon: LayoutDashboard },
            { key: 'sales_payments', label: 'Транзакции', icon: CreditCard },
            { key: 'sales_quick_stats', label: 'Сравн. Анализ', icon: BarChart3 },
            { key: 'sales_matrix', label: 'Матрица', icon: LayoutGrid },
            { key: 'sales_geo', label: 'География', icon: Globe },
            { key: 'sales_stats', label: 'Аналитика', icon: LineChart },
        ]
    },
    {
        id: 'consultations',
        label: 'Консультации',
        icon: Headphones,
        items: [
            { key: 'cons_dashboard', label: 'Дашборд', icon: LayoutDashboard },
            { key: 'cons_payments', label: 'Транзакции', icon: CreditCard },
            { key: 'cons_quick_stats', label: 'Сравн. Анализ', icon: BarChart3 },
            { key: 'cons_matrix', label: 'Матрица', icon: LayoutGrid },
            { key: 'cons_geo', label: 'География', icon: Globe },
            { key: 'cons_stats', label: 'Аналитика', icon: LineChart },
            { key: 'cons_conversions', label: 'Конверсии', icon: PieChart },
        ]
    },
    {
        id: 'people',
        label: 'Люди',
        icon: Users,
        items: [
            { key: 'employees_list', editKey: 'employees_manage', label: 'Сотрудники', icon: Contact },
            { key: 'salaries', label: 'Зарплаты', icon: Coins },
            { key: 'schedule', editKey: 'schedule_edit', label: 'График', icon: Calendar },
            { key: 'time_log', label: 'Учёт Времени', icon: Clock },
            { key: 'efficiency_view', label: 'Эффективность', icon: LineChart },
            { key: 'hr_dashboard', label: 'HR Дашборд', icon: Users },
            { key: 'kpi', label: 'KPI', icon: BarChart3 },
        ]
    },
    {
        id: 'knowledge',
        label: 'База Знаний',
        icon: BookOpen,
        items: [
            { key: 'knowledge_base', label: 'Доступ к Базе', icon: BookOpen },
            { key: 'products_manage', label: 'Управление Продуктами', icon: Settings },
            { key: 'rules_manage', label: 'Управление Правилами', icon: Shield },
        ]
    },
    {
        id: 'finance',
        label: 'Финансы и Прочее',
        icon: CreditCard,
        items: [
            { key: 'manual_payment', label: 'Ручное добавление оплат', icon: CreditCard },
        ]
    },
    {
        id: 'admin',
        label: 'Admin',
        icon: ShieldAlert,
        items: [
            { key: 'activity_logs', label: 'Логирование', icon: Activity },
            { key: 'payment_audit', label: 'Проверка ошибок', icon: ShieldAlert },
        ]
    }
];


const PermissionItem = ({ label, icon: Icon, isEnabled, onChange, isLocked, editKey, isEditEnabled, onEditChange }) => (
    <div className={`w-full flex items-center justify-between px-2 py-1.5 rounded-md text-xs transition-all group ${isEnabled
        ? 'bg-blue-50/50 text-blue-900 dark:bg-blue-900/10 dark:text-blue-300'
        : 'text-gray-500 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-[#222]'
        } ${isLocked ? 'opacity-50' : ''}`}>

        <div className="flex items-center gap-2.5 overflow-hidden">
            <Icon size={14} className={isEnabled ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400'} />
            <span className="font-medium truncate">{label}</span>
        </div>

        <div className="flex items-center gap-1.5">
            {/* Edit Permission (Optional) */}
            {editKey && (
                <button
                    onClick={onEditChange}
                    disabled={isLocked || !isEnabled} // Disable edit if view is disabled? Usually yes.
                    title="Разрешить редактирование"
                    className={`w-4 h-4 rounded flex items-center justify-center transition-colors ${isEditEnabled
                        ? 'bg-purple-600 text-white'
                        : 'bg-transparent border border-gray-300 dark:border-gray-600 hover:border-purple-400'
                        } ${(isLocked || !isEnabled) ? 'cursor-not-allowed opacity-30' : 'cursor-pointer'}`}
                >
                    {isEditEnabled && <CheckSquare size={10} />}
                </button>
            )}

            {/* View Permission (Main) */}
            <button
                onClick={onChange}
                disabled={isLocked}
                title="Разрешить просмотр"
                className={`w-4 h-4 rounded flex items-center justify-center transition-colors ${isEnabled
                    ? 'bg-blue-600 text-white'
                    : 'bg-transparent border border-gray-300 dark:border-gray-600 hover:border-blue-400'
                    } ${isLocked ? 'cursor-not-allowed' : 'cursor-pointer'}`}
            >
                {isEnabled && <CheckSquare size={10} />}
            </button>
        </div>
    </div>
);

const PermissionSection = ({ section, permissions, onToggle, onToggleSection, isLocked }) => {
    const [isOpen, setIsOpen] = useState(true);

    // Check if all items in this section are enabled
    const allEnabled = section.items.every(item => permissions[item.key]);
    const someEnabled = section.items.some(item => permissions[item.key]);

    return (
        <div className="mb-1.5">
            <div className="flex items-center justify-between px-2 py-0.5 mb-0.5 group">
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="flex items-center gap-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                >
                    <ChevronRight size={10} className={`transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`} />
                    <span>{section.label}</span>
                </button>
                <button
                    onClick={() => !isLocked && onToggleSection(section)}
                    disabled={isLocked}
                    className={`p-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity ${isLocked ? 'hidden' : ''}`}
                    title={allEnabled ? "Снять все" : "Выбрать все"}
                >
                    {allEnabled ? (
                        <CheckSquare size={12} className="text-blue-600 dark:text-blue-400" />
                    ) : (
                        <Square size={12} className="text-gray-300 dark:text-gray-600" />
                    )}
                </button>
            </div>

            <div className={`space-y-0.5 transition-all duration-300 overflow-hidden pl-1 ${isOpen ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}`}>
                {section.items.map(item => (
                    <PermissionItem
                        key={item.key}
                        label={item.label}
                        icon={item.icon}
                        isEnabled={!!permissions[item.key]}
                        onChange={() => !isLocked && onToggle(item.key)}

                        editKey={item.editKey}
                        isEditEnabled={item.editKey ? !!permissions[item.editKey] : false}
                        onEditChange={() => !isLocked && onToggle(item.editKey)}

                        isLocked={isLocked}
                    />
                ))}
            </div>
        </div>
    );
};

const RoleCard = ({ role, permissions = {}, onToggle, onToggleSection, description, onDescriptionChange }) => {
    const isCLevel = role === 'C-level';
    const isLocked = isCLevel;

    return (
        <div className={`bg-white dark:bg-[#111] rounded-lg border flex flex-col h-full overflow-hidden ${isCLevel
            ? 'border-amber-200 dark:border-amber-900/30 shadow-md shadow-amber-500/5'
            : 'border-gray-200 dark:border-[#222] shadow-sm hover:shadow transition-shadow'
            }`}>
            {/* Header */}
            <div className={`px-3 py-2 border-b min-h-[50px] flex flex-col justify-center ${isCLevel ? 'bg-amber-50/50 dark:bg-amber-900/10 border-amber-100 dark:border-amber-900/20' : 'border-gray-100 dark:border-[#222]'}`}>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <h3 className="font-bold text-sm text-gray-900 dark:text-white flex items-center gap-1.5">
                            {role}
                            {isCLevel && <Lock size={12} className="text-amber-500" />}
                        </h3>
                        <span className={`px-1.5 py-0.5 rounded-[4px] text-[9px] font-bold uppercase tracking-wider ${isCLevel
                            ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                            : role === 'Admin'
                                ? 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400'
                                : 'bg-gray-100 text-gray-600 dark:bg-[#222] dark:text-gray-400'
                            }`}>
                            {isCLevel ? 'Super Admin' : 'Role'}
                        </span>
                    </div>

                    {/* Impersonation Button */}
                    {!isCLevel && (
                        <button
                            onClick={() => useAppStore.getState().impersonateRole(role)}
                            title={`Просмотреть как ${role}`}
                            className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-[#222] text-gray-500 hover:text-black dark:text-gray-400 dark:hover:text-white transition-colors"
                        >
                            <Eye size={14} />
                        </button>
                    )}
                </div>
                {!isCLevel && (
                    <input
                        value={description || ''}
                        onChange={(e) => onDescriptionChange(e.target.value)}
                        placeholder="Описание..."
                        className="w-full text-[10px] bg-transparent border-none p-0 text-gray-400 focus:ring-0 placeholder:text-gray-200 mt-0.5"
                    />
                )}
            </div>

            {/* Content */}
            <div className="p-2 flex-1 overflow-y-auto custom-scrollbar">
                {SECTIONS.map(section => (
                    <PermissionSection
                        key={section.id}
                        section={section}
                        permissions={permissions}
                        onToggle={onToggle}
                        onToggleSection={onToggleSection}
                        isLocked={isLocked}
                    />
                ))}
            </div>
        </div>
    );
};

const CLevelSettingsPage = () => {
    const { permissions, roleDocs, updateSettings, fetchAllData } = useAppStore();
    const [localPermissions, setLocalPermissions] = useState({});
    const [localDocs, setLocalDocs] = useState({});
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (permissions) {
            const newPerms = JSON.parse(JSON.stringify(permissions));

            // Force C-level to have all permissions
            if (!newPerms['C-level']) newPerms['C-level'] = {};

            SECTIONS.forEach(section => {
                section.items.forEach(item => {
                    // Exception: Do not force manual_payment for C-level (User Request)
                    if (item.key === 'manual_payment') {
                        newPerms['C-level'][item.key] = false;
                    } else {
                        newPerms['C-level'][item.key] = true;
                    }

                    if (item.editKey) {
                        newPerms['C-level'][item.editKey] = true;
                    }
                });
            });

            setLocalPermissions(newPerms);
        }
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

    const handleSectionToggle = (role, section) => {
        const currentRolePerms = localPermissions[role] || {};
        const sectionKeys = section.items.map(i => i.key);
        const allEnabled = sectionKeys.every(key => currentRolePerms[key]);

        const newPermissions = { ...currentRolePerms };
        sectionKeys.forEach(key => {
            newPermissions[key] = !allEnabled;
        });

        setLocalPermissions(prev => ({
            ...prev,
            [role]: newPermissions
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
        // Save both permissions and docs
        await updateSettings('role_permissions', localPermissions);
        await updateSettings('role_documentation', localDocs);
        await fetchAllData(true);
        setIsSaving(false);
    };

    return (
        <div className="p-6 max-w-[1920px] mx-auto">
            <div className="flex items-center justify-between mb-8 sticky top-0 z-10 bg-[#F5F5F5] dark:bg-[#0A0A0A] py-4 -mt-4">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-3 dark:text-white">
                        <Settings className="text-amber-500" />
                        Настройка Ролей
                    </h1>
                    <p className="text-gray-500 text-sm mt-1">Управление доступами и функционалом для каждой роли</p>
                </div>

                <div className="flex items-center gap-4">
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="flex items-center gap-2 px-6 py-2.5 bg-black dark:bg-white text-white dark:text-black rounded-lg hover:opacity-80 transition-all font-medium disabled:opacity-50 shadow-lg shadow-black/10"
                    >
                        {isSaving ? <span className="animate-spin">⏳</span> : <Save size={18} />}
                        <span>Сохранить изменения</span>
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-6 pb-10">
                {ROLES.map(role => (
                    <RoleCard
                        key={role}
                        role={role}
                        permissions={localPermissions[role]}
                        description={localDocs[role]}
                        onDescriptionChange={(text) => handleDocChange(role, text)}
                        onToggle={(key) => handlePermissionChange(role, key)}
                        onToggleSection={(section) => handleSectionToggle(role, section)}
                    />
                ))}
            </div>
        </div>
    );
};

export default CLevelSettingsPage;
