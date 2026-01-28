import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Link, useLocation, Navigate, useParams } from 'react-router-dom'
import {
  LayoutDashboard, Users, Globe, CreditCard,
  BarChart3, Moon, Sun, RefreshCcw, LineChart, Briefcase,
  Headphones, Contact, LogOut, ChevronDown, ChevronRight, Gift, LayoutGrid,
  BookOpen, Shield, Menu, X, Coins, Calendar, Clock, Settings, Activity, ShieldAlert, FileText, PieChart,
} from 'lucide-react'

import ThemeToggle from './components/ThemeToggle';
import Toast from './components/ui/Toast';

import { supabase } from './services/supabaseClient';
import { useAppStore } from './store/appStore';

import LoginPage from './pages/LoginPage';
import PaymentsPage from './pages/PaymentsPage';
import DashboardPage from './pages/DashboardPage'
import QuickStatsPage from './pages/QuickStatsPage'
import KPIPage from './pages/KPIPage'
import GeoPage from './pages/GeoPage';
import ManagersPage from './pages/ManagersPage';
import StatsPage from './pages/StatsPage';
import EmployeesPage from './pages/EmployeesPage';
import AddEmployeePage from './pages/AddEmployeePage';
import EditEmployeePage from './pages/EditEmployeePage';
import BirthdaysPage from './pages/BirthdaysPage';
import GeoMatrixPage from './pages/GeoMatrixPage';
import ProductsPage from './pages/knowledge/ProductsPage';
import RulesPage from './pages/knowledge/RulesPage';
import LearningCenterPage from './pages/knowledge/LearningCenterPage';
import SalariesPage from './pages/SalariesPage';
import SchedulePage from './pages/SchedulePage';
// TimerWidget removed - feature in development
import TimeLogPage from './pages/TimeLogPage';
import CLevelSettingsPage from './pages/CLevelSettingsPage';
import ActivityLogsPage from './pages/ActivityLogsPage';
import PaymentTimesPage from './pages/PaymentTimesPage';

// Sales Department Pages
import SalesDashboardPage from './pages/sales/SalesDashboardPage';
import SalesPaymentsPage from './pages/sales/SalesPaymentsPage';
import SalesQuickStatsPage from './pages/sales/SalesQuickStatsPage';
import SalesMatrixPage from './pages/sales/SalesMatrixPage';
import SalesGeoPage from './pages/sales/SalesGeoPage';
import SalesStatsPage from './pages/sales/SalesStatsPage';

// Consultations Department Pages
import ConsDashboardPage from './pages/consultations/ConsDashboardPage';
import ConsPaymentsPage from './pages/consultations/ConsPaymentsPage';
import ConsQuickStatsPage from './pages/consultations/ConsQuickStatsPage';
import ConsMatrixPage from './pages/consultations/ConsMatrixPage';
import ConsGeoPage from './pages/consultations/ConsGeoPage';
import ConsStatsPage from './pages/consultations/ConsStatsPage';
import ConsConversionsPage from './pages/consultations/ConsConversionsPage';

import GeoSettingsPage from './pages/GeoSettingsPage';
import AddPaymentButton from './components/payments/AddPaymentButton';


const SidebarItem = ({ icon: Icon, label, path, className, onClick, isChild, children, isOpen, onToggle }) => {
  const location = useLocation();
  const isActive = location.pathname === path;
  const baseClasses = `group w-full flex items-center gap-2.5 px-3 py-2.5 md:py-1.5 rounded-[6px] transition-all duration-150 mb-0.5 text-sm md:text-xs font-medium ${isChild ? 'pl-8' : ''}`;
  const stateClasses = isActive ? 'bg-gray-200 text-black dark:bg-[#2A2A2A] dark:text-white font-semibold' : 'text-gray-600 dark:text-[#888888] hover:bg-gray-100 dark:hover:bg-[#1A1A1A] hover:text-black dark:hover:text-[#EAEAEA]';

  if (children) {
    return (
      <>
        <button onClick={onToggle} className={`w-full flex items-center justify-between px-3 py-1.5 rounded-[6px] transition-all duration-150 mb-0.5 text-xs font-medium ${isOpen ? 'text-black dark:text-white bg-gray-100 dark:bg-[#1A1A1A]' : 'text-gray-600 dark:text-[#888] hover:text-black dark:hover:text-white hover:bg-gray-100 dark:hover:bg-[#1A1A1A]'}`}>
          <div className="flex items-center gap-2.5"><Icon size={16} /><span>{label}</span></div>
          <ChevronRight size={12} className={`transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`} />
        </button>
        <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
          {children}
        </div>
      </>
    );
  }

  return (
    <Link to={path} onClick={onClick} className={`${baseClasses} ${stateClasses} ${className || ''}`}>
      <Icon size={isChild ? 16 : 18} className={isActive ? 'opacity-100' : 'opacity-70 group-hover:opacity-100'} />
      <span>{label}</span>
    </Link>
  )
}

const ProtectedRoute = ({ allowedRoles, resource, children }) => {
  const { user, permissions } = useAppStore();
  const { id } = useParams(); // Get ID from URL if present

  if (!user) return <Navigate to="/" />;

  // 1. Classic Role Check (Fallback)
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <div className="h-full flex items-center justify-center text-gray-500 text-sm">⛔ Доступ запрещен (Роль)</div>;
  }

  // 2. Dynamic Permission Check
  if (resource) {
    // Basic permission check
    const hasPermission = permissions?.[user.role]?.[resource];

    // Self-Edit Exception: If resource is 'employees_manage' AND id matches user.id, ALLOW.
    const isSelfEdit = resource === 'employees_manage' && String(id) === String(user.id);

    if (!hasPermission && !isSelfEdit) {
      return <div className="h-full flex items-center justify-center text-gray-500 text-sm">⛔ Доступ запрещен (Настройки)</div>;
    }
  }

  return children;
};

function App() {
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('theme');
    return saved ? saved === 'dark' : true; // Default to true (dark)
  })

  const [isEmployeesOpen, setIsEmployeesOpen] = useState(false);
  const [isSalesOpen, setIsSalesOpen] = useState(false);
  const [isConsOpen, setIsConsOpen] = useState(false);
  const [isCLevelOpen, setIsCLevelOpen] = useState(false);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Collapsible sidebar sections with localStorage persistence
  const [sectionStates, setSectionStates] = useState(() => {
    const saved = localStorage.getItem('sidebarSections');
    return saved ? JSON.parse(saved) : {
      dashboards: true,      // Only this one open by default
      sales: false,
      consultations: false,
      knowledge: false,
      people: false,
      admin: false,
      clevel: false
    };
  });

  const toggleSection = (section) => {
    setSectionStates(prev => {
      const newState = { ...prev, [section]: !prev[section] };
      localStorage.setItem('sidebarSections', JSON.stringify(newState));
      return newState;
    });
  };

  const { user, setUser, logout, fetchAllData, isLoading, permissions } = useAppStore();

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark')
      localStorage.setItem('theme', 'dark')
    } else {
      document.documentElement.classList.remove('dark')
      localStorage.setItem('theme', 'light')
    }
  }, [darkMode])

  const toggleTheme = async (e) => {
    // 1. Check if View Transition API is supported
    if (!document.startViewTransition) {
      setDarkMode(!darkMode);
      return;
    }

    // 2. Use top right corner as origin
    const x = window.innerWidth;
    const y = 0;

    // 3. Calculate radius to cover the screen from top right corner
    const endRadius = Math.hypot(
      Math.max(x, window.innerWidth - x),
      Math.max(y, window.innerHeight - y)
    );

    // 4. Start the transition
    const transition = document.startViewTransition(() => {
      setDarkMode(!darkMode);
    });

    // 5. Animate the clip path from top right corner
    await transition.ready;

    const clipPath = [
      `circle(0px at ${x}px ${y}px)`,
      `circle(${endRadius}px at ${x}px ${y}px)`,
    ];

    document.documentElement.animate(
      {
        clipPath: clipPath,
      },
      {
        duration: 500,
        easing: "ease-in-out",
        pseudoElement: "::view-transition-new(root)",
      }
    );
  };


  useEffect(() => {
    const initAuth = async () => {
      // 1. Initialize permissions from LocalStorage (Instant)
      useAppStore.getState().initializeFromCache();

      const savedUserStr = localStorage.getItem('astroUser');
      if (savedUserStr) {
        const parsedUser = JSON.parse(savedUserStr);
        setUser(parsedUser);

        // Refresh user data from DB to get latest Role changes
        try {
          const { data: freshUser } = await supabase
            .from('managers')
            .select('*')
            .eq('id', parsedUser.id)
            .single();

          if (freshUser) {
            setUser(freshUser);
            localStorage.setItem('astroUser', JSON.stringify(freshUser));

            // Start Presence
            useAppStore.getState().subscribeToPresence();
          }
        } catch (e) {
          console.error("User refresh failed", e);
        }

        fetchAllData();
      }
      setIsAuthChecking(false);
    };
    initAuth();
  }, []);

  useEffect(() => {
    if (user) {
      const unsubscribe = useAppStore.getState().subscribeToRealtime();
      return () => unsubscribe();
    }
  }, [user]);

  const handleLoginSuccess = (managerData) => {
    localStorage.setItem('astroUser', JSON.stringify(managerData));
    setUser(managerData);
    fetchAllData();
  }

  // Helper for dynamic access
  const hasAccess = (resource) => {
    if (!user || !permissions[user.role]) return false;
    return permissions[user.role][resource] === true;
  };

  // Special Check for C-level settings (Hardcoded security for safety)
  const isCLevel = user?.role === 'C-level';

  // Global Toast State
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' });

  useEffect(() => {
    const handleShowToast = (e) => {
      setToast({ visible: true, message: e.detail.message, type: e.detail.type });
    };

    window.addEventListener('show-toast', handleShowToast);
    return () => window.removeEventListener('show-toast', handleShowToast);
  }, []);

  const closeToast = () => setToast(prev => ({ ...prev, visible: false }));

  if (isAuthChecking) return <div className="min-h-screen bg-[#0A0A0A]" />
  if (!user) return <LoginPage onLoginSuccess={handleLoginSuccess} />

  return (
    <BrowserRouter>
      <Toast visible={toast.visible} message={toast.message} type={toast.type} onClose={closeToast} />
      <div className="min-h-screen flex bg-[#F5F5F5] dark:bg-[#0A0A0A] font-sans transition-colors duration-300 text-[13px] overflow-x-hidden">
        {/* MOBILE OVERLAY */}
        {isMobileMenuOpen && (
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
          />
        )}

        {/* MOBILE HEADER BAR (visible only on mobile) */}
        <div className="lg:hidden fixed top-0 left-0 right-0 h-14 bg-white dark:bg-[#111111] border-b border-gray-200 dark:border-[#222] z-30 flex items-center justify-between px-4">
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 -ml-2 rounded-lg hover:bg-gray-100 dark:hover:bg-[#1A1A1A] transition-colors"
          >
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 bg-black dark:bg-white rounded flex items-center justify-center text-white dark:text-black font-bold text-[10px]">AP</div>
            <span className="font-bold text-gray-900 dark:text-white tracking-tight">AstroPanel</span>
          </div>
          <div className="w-10" /> {/* Spacer for centering */}
        </div>

        <aside className={`w-[220px] fixed inset-y-0 left-0 h-full bg-white dark:bg-[#111111] border-r border-gray-200 dark:border-[#222] flex flex-col z-50 transition-transform duration-300 ease-in-out lg:translate-x-0 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>

          {/* HEADER */}
          <div className="h-12 flex items-center px-4 border-b border-gray-100 dark:border-[#222]">
            <div className="w-5 h-5 bg-black dark:bg-white rounded flex items-center justify-center text-white dark:text-black font-bold text-[10px] mr-2">AP</div>
            <span className="font-bold text-gray-900 dark:text-white tracking-tight">AstroPanel</span>
            <span className="ml-2 px-1.5 py-0.5 rounded-[4px] bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-500 text-[9px] font-bold uppercase tracking-wider">
              Beta
            </span>
          </div>

          <div className="p-3">
            <Link to={`/edit-employee/${user.id}`} className="group flex items-center gap-2.5 p-2 rounded-lg bg-gray-50 dark:bg-[#1A1A1A] border border-gray-100 dark:border-[#2A2A2A] hover:bg-gray-100 dark:hover:bg-[#222] transition-colors cursor-pointer">
              {user.avatar_url ? (
                <img src={user.avatar_url} className="w-8 h-8 rounded-md object-cover" alt="avatar" />
              ) : (
                <div className="w-8 h-8 rounded-md bg-gray-200 dark:bg-[#333] flex items-center justify-center text-xs font-bold text-gray-500 dark:text-gray-300">{user.name?.[0]}</div>
              )}
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold text-gray-900 dark:text-gray-200 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{user.name}</div>
                <div className="text-[10px] text-gray-500 uppercase tracking-wide">{user.role}</div>
              </div>
            </Link>

          </div>

          <nav className="flex-1 overflow-y-auto custom-scrollbar px-2 space-y-0.5">
            {/* --- ОБЩИЕ ДЕШБОРДЫ --- */}
            <button
              onClick={() => toggleSection('dashboards')}
              className="w-full flex items-center justify-between px-3 py-2 text-[10px] font-bold text-gray-400 dark:text-[#555] uppercase tracking-wider hover:text-gray-600 dark:hover:text-gray-400 transition-colors"
            >
              <span>Общие дешборды</span>
              <ChevronRight size={12} className={`transition-transform duration-200 ${sectionStates.dashboards ? 'rotate-90' : ''}`} />
            </button>
            <div className={`overflow-hidden transition-all duration-300 ease-in-out ${sectionStates.dashboards ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
              <SidebarItem icon={LayoutDashboard} label="Обзор" path="/" />
              {hasAccess('stats') && <SidebarItem icon={LineChart} label="Аналитика" path="/stats" />}
              {hasAccess('geo') && <SidebarItem icon={Globe} label="География" path="/geo" />}
              {hasAccess('geo_matrix') && <SidebarItem icon={LayoutGrid} label="Матрица" path="/geo-matrix" />}
              {hasAccess('stats') && <SidebarItem icon={Clock} label="Время оплат" path="/payment-times" />}
              <SidebarItem icon={CreditCard} label="Транзакции" path="/list" />
            </div>

            {/* --- ОТДЕЛ ПРОДАЖ --- */}
            <button
              onClick={() => toggleSection('sales')}
              className="w-full flex items-center justify-between px-3 py-2 text-[10px] font-bold text-gray-400 dark:text-[#555] uppercase tracking-wider mt-2 hover:text-gray-600 dark:hover:text-gray-400 transition-colors"
            >
              <span>Отдел продаж</span>
              <ChevronRight size={12} className={`transition-transform duration-200 ${sectionStates.sales ? 'rotate-90' : ''}`} />
            </button>
            <div className={`overflow-hidden transition-all duration-300 ease-in-out ${sectionStates.sales ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
              <SidebarItem icon={LayoutDashboard} label="Дашборд" path="/sales/dashboard" />
              <button onClick={() => setIsSalesOpen(!isSalesOpen)} className={`w-full flex items-center justify-between px-3 py-1.5 rounded-[6px] transition-all duration-150 mb-0.5 text-xs font-medium ${isSalesOpen ? 'text-black dark:text-white bg-gray-100 dark:bg-[#1A1A1A]' : 'text-gray-600 dark:text-[#888] hover:text-black dark:hover:text-white hover:bg-gray-100 dark:hover:bg-[#1A1A1A]'}`}>
                <div className="flex items-center gap-2.5"><Briefcase size={16} /><span>Отдел продаж</span></div>
                <ChevronRight size={12} className={`transition-transform duration-200 ${isSalesOpen ? 'rotate-90' : ''}`} />
              </button>
              <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isSalesOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
                <SidebarItem icon={CreditCard} label="Транзакции" path="/sales/payments" isChild />
                <SidebarItem icon={BarChart3} label="Сравн. анализ" path="/sales/quick-stats" isChild />
                <SidebarItem icon={LayoutGrid} label="Матрица" path="/sales/matrix" isChild />
                <SidebarItem icon={Globe} label="География" path="/sales/geo" isChild />
                <SidebarItem icon={LineChart} label="Аналитика" path="/sales/stats" isChild />
              </div>
            </div>

            {/* --- КОНСУЛЬТАЦИИ --- */}
            <button
              onClick={() => toggleSection('consultations')}
              className="w-full flex items-center justify-between px-3 py-2 text-[10px] font-bold text-gray-400 dark:text-[#555] uppercase tracking-wider mt-2 hover:text-gray-600 dark:hover:text-gray-400 transition-colors"
            >
              <span>Консультации</span>
              <ChevronRight size={12} className={`transition-transform duration-200 ${sectionStates.consultations ? 'rotate-90' : ''}`} />
            </button>
            <div className={`overflow-hidden transition-all duration-300 ease-in-out ${sectionStates.consultations ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
              <SidebarItem icon={LayoutDashboard} label="Дашборд" path="/cons/dashboard" />
              <button onClick={() => setIsConsOpen(!isConsOpen)} className={`w-full flex items-center justify-between px-3 py-1.5 rounded-[6px] transition-all duration-150 mb-0.5 text-xs font-medium ${isConsOpen ? 'text-black dark:text-white bg-gray-100 dark:bg-[#1A1A1A]' : 'text-gray-600 dark:text-[#888] hover:text-black dark:hover:text-white hover:bg-gray-100 dark:hover:bg-[#1A1A1A]'}`}>
                <div className="flex items-center gap-2.5"><Headphones size={16} /><span>Консультации</span></div>
                <ChevronRight size={12} className={`transition-transform duration-200 ${isConsOpen ? 'rotate-90' : ''}`} />
              </button>
              <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isConsOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
                <SidebarItem icon={CreditCard} label="Транзакции" path="/cons/payments" isChild />
                <SidebarItem icon={BarChart3} label="Сравн. анализ" path="/cons/quick-stats" isChild />
                <SidebarItem icon={LayoutGrid} label="Матрица" path="/cons/matrix" isChild />
                <SidebarItem icon={Globe} label="География" path="/cons/geo" isChild />
                <SidebarItem icon={LineChart} label="Аналитика" path="/cons/stats" isChild />
                <SidebarItem icon={PieChart} label="Конверсии" path="/cons/conversions" isChild />
              </div>
            </div>

            {/* --- БАЗА ЗНАНИЙ --- */}
            <button
              onClick={() => toggleSection('knowledge')}
              className="w-full flex items-center justify-between px-3 py-2 text-[10px] font-bold text-gray-400 dark:text-[#555] uppercase tracking-wider mt-2 hover:text-gray-600 dark:hover:text-gray-400 transition-colors"
            >
              <span>База знаний</span>
              <ChevronRight size={12} className={`transition-transform duration-200 ${sectionStates.knowledge ? 'rotate-90' : ''}`} />
            </button>
            <div className={`overflow-hidden transition-all duration-300 ease-in-out ${sectionStates.knowledge ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
              <SidebarItem icon={BookOpen} label="Продукты" path="/products" />
              <SidebarItem icon={Shield} label="Правила" path="/rules" />
              <SidebarItem icon={FileText} label="Центр обучения" path="/learning" />
              {hasAccess('kpi') && <SidebarItem icon={BarChart3} label="KPI" path="/kpi" />}
            </div>

            {/* --- ЛЮДИ --- */}
            <button
              onClick={() => toggleSection('people')}
              className="w-full flex items-center justify-between px-3 py-2 text-[10px] font-bold text-gray-400 dark:text-[#555] uppercase tracking-wider mt-2 hover:text-gray-600 dark:hover:text-gray-400 transition-colors"
            >
              <span>Люди</span>
              <ChevronRight size={12} className={`transition-transform duration-200 ${sectionStates.people ? 'rotate-90' : ''}`} />
            </button>
            <div className={`overflow-hidden transition-all duration-300 ease-in-out ${sectionStates.people ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
              {/* ГРАФИК */}
              {hasAccess('schedule') && <SidebarItem icon={Calendar} label="График" path="/schedule" />}
              {hasAccess('time_log') && <SidebarItem icon={Clock} label="Учёт времени" path="/time-log" />}

              {/* УПРАВЛЕНИЕ */}
              {(hasAccess('employees_manage') || hasAccess('employees_list')) && (
                <>
                  <button onClick={() => setIsEmployeesOpen(!isEmployeesOpen)} className={`w-full flex items-center justify-between px-3 py-1.5 rounded-[6px] transition-all duration-150 mb-0.5 text-xs font-medium ${isEmployeesOpen ? 'text-black dark:text-white bg-gray-100 dark:bg-[#1A1A1A]' : 'text-gray-600 dark:text-[#888] hover:text-black dark:hover:text-white hover:bg-gray-100 dark:hover:bg-[#1A1A1A]'}`}>
                    <div className="flex items-center gap-2.5"><Users size={16} /><span>Сотрудники</span></div>
                    <ChevronRight size={12} className={`transition-transform duration-200 ${isEmployeesOpen ? 'rotate-90' : ''}`} />
                  </button>
                  <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isEmployeesOpen ? 'max-h-48 opacity-100' : 'max-h-0 opacity-0'}`}>
                    <SidebarItem icon={Contact} label="Все сотрудники" path="/all-employees" isChild />
                    <SidebarItem icon={Briefcase} label="Отдел Продаж" path="/sales-team" isChild />
                    <SidebarItem icon={Headphones} label="Консультанты" path="/consultants" isChild />
                    <SidebarItem icon={Gift} label="Дни Рождения" path="/birthdays" isChild />
                    {hasAccess('salaries') && (
                      <SidebarItem icon={Coins} label="Зарплаты" path="/salaries" isChild />
                    )}
                  </div>
                  {hasAccess('stats') && <SidebarItem icon={Users} label="Эффективность" path="/managers" />}
                </>
              )}
            </div>

            {/* ✅ ADMIN TOOLS (BLUE) */}
            {(user?.role === 'Admin' || user?.role === 'C-level') && (
              <>
                <button
                  onClick={() => toggleSection('admin')}
                  className="w-full flex items-center justify-between px-3 py-2 text-[10px] font-bold text-cyan-500 uppercase tracking-wider mt-2 border-t border-gray-100 dark:border-[#222] pt-4 hover:text-cyan-400 transition-colors"
                >
                  <span>Admin</span>
                  <ChevronRight size={12} className={`transition-transform duration-200 ${sectionStates.admin ? 'rotate-90' : ''}`} />
                </button>
                <div className={`overflow-hidden transition-all duration-300 ease-in-out ${sectionStates.admin ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
                  <SidebarItem icon={Activity} label="Логирование" path="/activity-logs" className="text-cyan-600 dark:text-cyan-500 hover:bg-cyan-50 dark:hover:bg-cyan-900/10" />
                </div>
              </>
            )}

            {/* ✅ C-LEVEL SETTINGS: ONLY FOR C-LEVEL */}
            {user.role === 'C-level' && (
              <>
                <button
                  onClick={() => toggleSection('clevel')}
                  className="w-full flex items-center justify-between px-3 py-2 text-[10px] font-bold text-amber-500 uppercase tracking-wider mt-2 border-t border-gray-100 dark:border-[#222] pt-4 hover:text-amber-400 transition-colors"
                >
                  <span>C-Level</span>
                  <ChevronRight size={12} className={`transition-transform duration-200 ${sectionStates.clevel ? 'rotate-90' : ''}`} />
                </button>
                <div className={`overflow-hidden transition-all duration-300 ease-in-out ${sectionStates.clevel ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
                  <SidebarItem icon={Settings} label="Настройки ролей" path="/c-level-settings" className="text-amber-600 dark:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/10" />
                  <SidebarItem icon={Globe} label="Управление ГЕО" path="/geo-settings" className="text-amber-600 dark:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/10" />
                </div>
              </>
            )}
          </nav>

          <div className="p-2 border-t border-gray-200 dark:border-[#222]">
            <button onClick={logout} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-[6px] text-xs font-medium text-gray-500 dark:text-[#666] hover:bg-red-50 dark:hover:bg-red-900/10 hover:text-red-600 transition-all">
              <LogOut size={14} /><span>Выйти</span>
            </button>
          </div>
        </aside>

        <main className="flex-1 ml-0 lg:ml-[220px] transition-all duration-300 pt-14 lg:pt-0">
          <header className="h-12 border-b border-gray-200 dark:border-[#222] bg-white/50 dark:bg-[#0A0A0A]/80 backdrop-blur-md sticky top-0 lg:top-0 z-20 hidden lg:flex items-center justify-between px-4 lg:px-6">
            <div className="flex items-center gap-3">
              <div className="text-xs font-medium text-gray-500 dark:text-[#666]">
                {/* Status bar */}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle isDark={darkMode} toggle={toggleTheme} />
              <button onClick={() => fetchAllData(true)} className="p-1.5 bg-gray-100 dark:bg-[#222] text-black dark:text-white rounded hover:opacity-80 transition-opacity">
                <RefreshCcw size={14} className={isLoading ? 'animate-spin' : ''} />
              </button>
            </div>
          </header>

          <div className="p-3 md:p-6 pb-safe">{/* pb-safe for notch devices */}
            <Routes>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/quick-stats" element={<ProtectedRoute resource="quick_stats"><QuickStatsPage /></ProtectedRoute>} />
              <Route path="/stats" element={<ProtectedRoute resource="stats"><StatsPage /></ProtectedRoute>} />
              <Route path="/list" element={<PaymentsPage />} />

              <Route path="/kpi" element={<ProtectedRoute resource="kpi"><KPIPage /></ProtectedRoute>} />
              <Route path="/geo" element={<ProtectedRoute resource="geo"><GeoPage /></ProtectedRoute>} />
              <Route path="/managers" element={<ProtectedRoute resource="stats"><ManagersPage /></ProtectedRoute>} />
              <Route path="/geo-matrix" element={<ProtectedRoute resource="geo_matrix"><GeoMatrixPage /></ProtectedRoute>} />

              {/* ✅ SALES DEPARTMENT ROUTES */}
              <Route path="/sales/dashboard" element={<SalesDashboardPage />} />
              <Route path="/sales/payments" element={<SalesPaymentsPage />} />
              <Route path="/sales/quick-stats" element={<SalesQuickStatsPage />} />
              <Route path="/sales/matrix" element={<SalesMatrixPage />} />
              <Route path="/sales/geo" element={<SalesGeoPage />} />
              <Route path="/sales/stats" element={<SalesStatsPage />} />

              {/* ✅ CONSULTATIONS DEPARTMENT ROUTES */}
              <Route path="/cons/dashboard" element={<ConsDashboardPage />} />
              <Route path="/cons/payments" element={<ConsPaymentsPage />} />
              <Route path="/cons/quick-stats" element={<ConsQuickStatsPage />} />
              <Route path="/cons/matrix" element={<ConsMatrixPage />} />
              <Route path="/cons/geo" element={<ConsGeoPage />} />
              <Route path="/cons/stats" element={<ConsStatsPage />} />
              <Route path="/cons/conversions" element={<ConsConversionsPage />} />

              <Route path="/sales-team" element={<ProtectedRoute resource="employees_list"><EmployeesPage pageTitle="Отдел Продаж" targetRole="Sales" currentUser={user} /></ProtectedRoute>} />
              <Route path="/consultants" element={<ProtectedRoute resource="employees_list"><EmployeesPage pageTitle="Консультанты" targetRole="Consultant" currentUser={user} /></ProtectedRoute>} />
              <Route path="/all-employees" element={<ProtectedRoute resource="employees_list"><EmployeesPage pageTitle="Все сотрудники" excludeRole="C-level" currentUser={user} showAddButton={true} /></ProtectedRoute>} />

              {/* ✅ ГРАФИК */}
              <Route path="/schedule" element={<ProtectedRoute resource="schedule"><SchedulePage /></ProtectedRoute>} />
              <Route path="/time-log" element={<ProtectedRoute resource="time_log"><TimeLogPage /></ProtectedRoute>} />

              <Route path="/add-employee" element={<ProtectedRoute resource="employees_manage"><AddEmployeePage /></ProtectedRoute>} />
              <Route path="/edit-employee/:id" element={<ProtectedRoute resource="employees_manage"><EditEmployeePage /></ProtectedRoute>} />
              <Route path="/birthdays" element={<ProtectedRoute resource="employees_list"><BirthdaysPage /></ProtectedRoute>} />

              {/* ✅ РОУТ ЗАРПЛАТЫ */}
              <Route path="/salaries" element={<ProtectedRoute resource="salaries"><SalariesPage /></ProtectedRoute>} />

              <Route path="/products" element={<ProtectedRoute resource="knowledge_base"><ProductsPage /></ProtectedRoute>} />
              <Route path="/rules" element={<ProtectedRoute resource="knowledge_base"><RulesPage /></ProtectedRoute>} />
              <Route path="/learning" element={<ProtectedRoute resource="knowledge_base"><LearningCenterPage /></ProtectedRoute>} />

              {/* ✅ ADMIN ROUTES */}
              <Route path="/activity-logs" element={<ProtectedRoute allowedRoles={['Admin', 'C-level']}><ActivityLogsPage /></ProtectedRoute>} />

              {/* ✅ C-LEVEL SETTINGS: ТОЛЬКО C-LEVEL */}
              <Route path="/c-level-settings" element={<ProtectedRoute allowedRoles={['C-level']}><CLevelSettingsPage /></ProtectedRoute>} />
              <Route path="/geo-settings" element={<ProtectedRoute allowedRoles={['C-level']}><GeoSettingsPage /></ProtectedRoute>} />

              {/* ✅ NOVELTY: PAYMENT TIMES */}
              <Route path="/payment-times" element={<ProtectedRoute resource="stats"><PaymentTimesPage /></ProtectedRoute>} />

              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
          </div>
        </main>
        <AddPaymentButton />
      </div >
    </BrowserRouter >
  )
}

export default App;