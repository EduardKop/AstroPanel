import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom'
import {
  LayoutDashboard, Users, Globe, CreditCard,
  BarChart3, Moon, Sun, RefreshCcw, LineChart, Briefcase,
  Headphones, Contact, LogOut, ChevronDown, ChevronRight, Gift, LayoutGrid,
  BookOpen, Shield, Menu, X, Coins, Calendar
} from 'lucide-react'

import { supabase } from './services/supabaseClient';
import { useAppStore } from './store/appStore';

import LoginPage from './pages/LoginPage';
import PaymentsPage from './pages/PaymentsPage';
import DashboardPage from './pages/DashboardPage'
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
import SalariesPage from './pages/SalariesPage';
import SchedulePage from './pages/SchedulePage';

const SidebarItem = ({ icon: Icon, label, path, className, onClick, isChild }) => {
  const location = useLocation();
  const isActive = location.pathname === path;
  const baseClasses = `group w-full flex items-center gap-2.5 px-3 py-1.5 rounded-[6px] transition-all duration-150 mb-0.5 text-xs font-medium ${isChild ? 'pl-8' : ''}`;
  const stateClasses = isActive ? 'bg-gray-200 text-black dark:bg-[#2A2A2A] dark:text-white font-semibold' : 'text-gray-600 dark:text-[#888888] hover:bg-gray-100 dark:hover:bg-[#1A1A1A] hover:text-black dark:hover:text-[#EAEAEA]';
  return (
    <Link to={path} onClick={onClick} className={`${baseClasses} ${stateClasses} ${className || ''}`}>
      <Icon size={isChild ? 14 : 16} className={isActive ? 'opacity-100' : 'opacity-70 group-hover:opacity-100'} />
      <span>{label}</span>
    </Link>
  )
}

const ProtectedRoute = ({ allowedRoles, children }) => {
  const user = useAppStore(state => state.user);
  if (!user) return <Navigate to="/" />;
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <div className="h-full flex items-center justify-center text-gray-500 text-sm">⛔ Доступ запрещен</div>;
  }
  return children;
};

function App() {
  const [darkMode, setDarkMode] = useState(true)
  const [isEmployeesOpen, setIsEmployeesOpen] = useState(false);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const { user, setUser, logout, fetchAllData, isLoading } = useAppStore();

  useEffect(() => {
    if (darkMode) document.documentElement.classList.add('dark')
    else document.documentElement.classList.remove('dark')
  }, [darkMode])

  useEffect(() => {
    const initAuth = async () => {
      const savedUserStr = localStorage.getItem('astroUser');
      if (savedUserStr) {
        const parsedUser = JSON.parse(savedUserStr);
        setUser(parsedUser);
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

  // Общий доступ для Админов и C-level (для большинства разделов)
  const isAdminAccess = user && ['Admin', 'C-level'].includes(user.role);

  if (isAuthChecking) return <div className="min-h-screen bg-[#0A0A0A]" />
  if (!user) return <LoginPage onLoginSuccess={handleLoginSuccess} />

  return (
    <BrowserRouter>
      <div className="min-h-screen flex bg-[#F5F5F5] dark:bg-[#0A0A0A] font-sans transition-colors duration-300 text-[13px] overflow-x-hidden">
        {/* MOBILE OVERLAY */}
        {isMobileMenuOpen && (
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
          />
        )}

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
            <div className="flex items-center gap-2.5 p-2 rounded-lg bg-gray-50 dark:bg-[#1A1A1A] border border-gray-100 dark:border-[#2A2A2A]">
              {user.avatar_url ? (
                <img src={user.avatar_url} className="w-8 h-8 rounded-md object-cover" alt="avatar" />
              ) : (
                <div className="w-8 h-8 rounded-md bg-gray-200 dark:bg-[#333] flex items-center justify-center text-xs font-bold text-gray-500 dark:text-gray-300">{user.name?.[0]}</div>
              )}
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold text-gray-900 dark:text-gray-200 truncate">{user.name}</div>
                <div className="text-[10px] text-gray-500 uppercase tracking-wide">{user.role}</div>
              </div>
            </div>
          </div>

          <nav className="flex-1 overflow-y-auto custom-scrollbar px-2 space-y-0.5">
            {/* --- ДАШБОРДЫ --- */}
            <div className="px-3 py-2 text-[10px] font-bold text-gray-400 dark:text-[#555] uppercase tracking-wider">Дашборды</div>
            <SidebarItem icon={LayoutDashboard} label="Обзор" path="/" />
            <SidebarItem icon={LineChart} label="Аналитика" path="/stats" />

            {isAdminAccess && <SidebarItem icon={Globe} label="География" path="/geo" />}
            {isAdminAccess && <SidebarItem icon={LayoutGrid} label="Матрица" path="/geo-matrix" />}

            <SidebarItem icon={CreditCard} label="Транзакции" path="/list" />

            {/* --- БАЗА ЗНАНИЙ --- */}
            <div className="px-3 py-2 text-[10px] font-bold text-gray-400 dark:text-[#555] uppercase tracking-wider mt-2">База знаний</div>
            <SidebarItem icon={BookOpen} label="Продукты" path="/products" />
            <SidebarItem icon={Shield} label="Правила" path="/rules" />

            {isAdminAccess && <SidebarItem icon={BarChart3} label="KPI" path="/kpi" />}

            {/* --- ЛЮДИ (Только Админ и C-level видят раздел) --- */}
            {/* --- ЛЮДИ (Общий раздел) --- */}
            <div className="px-3 py-2 text-[10px] font-bold text-gray-400 dark:text-[#555] uppercase tracking-wider mt-2">Люди</div>

            {/* ГРАФИК (Доступен всем) */}
            <SidebarItem icon={Calendar} label="График" path="/schedule" />

            {/* УПРАВЛЕНИЕ (Только Админ и C-level) */}
            {isAdminAccess && (
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

                  {/* ✅ ЗАРПЛАТЫ: ТОЛЬКО ДЛЯ ADMIN */}
                  {user.role === 'Admin' && (
                    <SidebarItem icon={Coins} label="Зарплаты" path="/salaries" isChild />
                  )}
                </div>
                <SidebarItem icon={Users} label="Эффективность" path="/managers" />
              </>
            )}
          </nav>

          <div className="p-2 border-t border-gray-200 dark:border-[#222]">
            <button onClick={() => setDarkMode(!darkMode)} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-[6px] text-xs font-medium text-gray-500 dark:text-[#666] hover:bg-gray-100 dark:hover:bg-[#1A1A1A] hover:text-black dark:hover:text-white transition-all">
              {darkMode ? <Sun size={14} /> : <Moon size={14} />}<span>{darkMode ? 'Светлая' : 'Темная'}</span>
            </button>
            <button onClick={logout} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-[6px] text-xs font-medium text-gray-500 dark:text-[#666] hover:bg-red-50 dark:hover:bg-red-900/10 hover:text-red-600 transition-all">
              <LogOut size={14} /><span>Выйти</span>
            </button>
          </div>
        </aside>

        <main className="flex-1 ml-0 lg:ml-[220px] transition-all duration-300">
          <header className="h-12 border-b border-gray-200 dark:border-[#222] bg-white/50 dark:bg-[#0A0A0A]/80 backdrop-blur-md sticky top-0 z-40 flex items-center justify-between px-4 lg:px-6">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="lg:hidden p-1.5 -ml-1.5 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#222] rounded-md transition-colors"
              >
                <Menu size={20} />
              </button>
              <div className="text-xs font-medium text-gray-500 dark:text-[#666]">
                {/* Status bar */}
              </div>
            </div>
            <button onClick={() => fetchAllData(true)} className="p-1.5 bg-gray-100 dark:bg-[#222] text-black dark:text-white rounded hover:opacity-80 transition-opacity">
              <RefreshCcw size={14} className={isLoading ? 'animate-spin' : ''} />
            </button>
          </header>

          <div className="p-3 md:p-6">
            <Routes>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/stats" element={<StatsPage />} />
              <Route path="/list" element={<PaymentsPage />} />

              <Route path="/kpi" element={<ProtectedRoute allowedRoles={['Admin', 'C-level']}><KPIPage /></ProtectedRoute>} />
              <Route path="/geo" element={<ProtectedRoute allowedRoles={['Admin', 'C-level']}><GeoPage /></ProtectedRoute>} />
              <Route path="/managers" element={<ProtectedRoute allowedRoles={['Admin', 'C-level']}><ManagersPage /></ProtectedRoute>} />
              <Route path="/geo-matrix" element={<ProtectedRoute allowedRoles={['Admin', 'C-level']}><GeoMatrixPage /></ProtectedRoute>} />

              <Route path="/sales-team" element={<ProtectedRoute allowedRoles={['Admin', 'C-level']}><EmployeesPage pageTitle="Отдел Продаж" targetRole="Sales" currentUser={user} /></ProtectedRoute>} />
              <Route path="/consultants" element={<ProtectedRoute allowedRoles={['Admin', 'C-level']}><EmployeesPage pageTitle="Консультанты" targetRole="Consultant" currentUser={user} /></ProtectedRoute>} />
              <Route path="/all-employees" element={<ProtectedRoute allowedRoles={['Admin', 'C-level']}><EmployeesPage pageTitle="Все сотрудники" excludeRole="C-level" currentUser={user} showAddButton={true} /></ProtectedRoute>} />

              {/* ✅ ГРАФИК: ДОСТУПЕН ВСЕМ */}
              <Route path="/schedule" element={<SchedulePage />} />

              <Route path="/add-employee" element={<ProtectedRoute allowedRoles={['Admin', 'C-level']}><AddEmployeePage /></ProtectedRoute>} />
              <Route path="/edit-employee/:id" element={<ProtectedRoute allowedRoles={['Admin', 'C-level']}><EditEmployeePage /></ProtectedRoute>} />
              <Route path="/birthdays" element={<ProtectedRoute allowedRoles={['Admin', 'C-level']}><BirthdaysPage /></ProtectedRoute>} />

              {/* ✅ РОУТ ЗАРПЛАТЫ: ТОЛЬКО 'Admin' */}
              <Route path="/salaries" element={<ProtectedRoute allowedRoles={['Admin']}><SalariesPage /></ProtectedRoute>} />

              <Route path="/products" element={<ProtectedRoute allowedRoles={['Admin', 'C-level', 'Manager', 'Sales', 'Consultant', 'Retention']}><ProductsPage /></ProtectedRoute>} />
              <Route path="/rules" element={<ProtectedRoute allowedRoles={['Admin', 'C-level', 'Manager', 'Sales', 'Consultant', 'Retention']}><RulesPage /></ProtectedRoute>} />

              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
          </div>
        </main>
      </div>
    </BrowserRouter>
  )
}

export default App;