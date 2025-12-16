import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom'
import { 
  LayoutDashboard, Users, Globe, CreditCard, 
  BarChart3, Moon, Sun, RefreshCcw, LineChart, Briefcase, 
  Headphones, Contact, LogOut, ChevronDown, ChevronRight, Gift 
} from 'lucide-react'

import { supabase } from './services/supabaseClient'; 
import { fetchPaymentsData } from './services/dataService';

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

const SidebarItem = ({ icon: Icon, label, path, className, onClick, isChild }) => {
  const location = useLocation();
  const isActive = location.pathname === path;

  const baseClasses = `
    group w-full flex items-center gap-2.5 px-3 py-1.5 rounded-[6px] transition-all duration-150 mb-0.5 text-xs font-medium
    ${isChild ? 'pl-8' : ''} 
  `;

  const stateClasses = isActive
    ? 'bg-gray-200 text-black dark:bg-[#2A2A2A] dark:text-white font-semibold' 
    : 'text-gray-600 dark:text-[#888888] hover:bg-gray-100 dark:hover:bg-[#1A1A1A] hover:text-black dark:hover:text-[#EAEAEA]';

  return (
    <Link 
      to={path} 
      onClick={onClick}
      className={`${baseClasses} ${stateClasses} ${className || ''}`}
    >
      <Icon size={isChild ? 14 : 16} className={isActive ? 'opacity-100' : 'opacity-70 group-hover:opacity-100'} />
      <span>{label}</span>
    </Link>
  )
}

const ProtectedRoute = ({ user, allowedRoles, children }) => {
  if (!user) return <Navigate to="/" />; 
  if (!allowedRoles.includes(user.role)) {
    return <div className="h-full flex items-center justify-center text-gray-500 text-sm">⛔ Доступ запрещен</div>;
  }
  return children;
};

function App() {
  const [darkMode, setDarkMode] = useState(true)
  const [user, setUser] = useState(null)
  const [isAuthChecking, setIsAuthChecking] = useState(true)
  const [isEmployeesOpen, setIsEmployeesOpen] = useState(false);

  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(false)
  const [stats, setStats] = useState({ totalEur: 0, count: 0 })

  useEffect(() => {
    if (darkMode) document.documentElement.classList.add('dark')
    else document.documentElement.classList.remove('dark')
  }, [darkMode])

  useEffect(() => {
    const initUser = async () => {
      const savedUserStr = localStorage.getItem('astroUser');
      let currentUser = null;
      if (savedUserStr) {
        currentUser = JSON.parse(savedUserStr);
        setUser(currentUser);
      }
      setIsAuthChecking(false);
      if (currentUser && currentUser.id) {
        const { data } = await supabase.from('managers').select('*').eq('id', currentUser.id).single();
        if (data) { setUser(data); localStorage.setItem('astroUser', JSON.stringify(data)); }
      }
    };
    initUser();
  }, [])

  const handleLogin = (managerData) => { localStorage.setItem('astroUser', JSON.stringify(managerData)); setUser(managerData); }
  const handleLogout = () => { localStorage.removeItem('astroUser'); setUser(null); }

  const loadData = async (isBackgroundUpdate = false) => {
    if (!user) return; 
    if (!isBackgroundUpdate) setLoading(true)
    try {
      const data = await fetchPaymentsData();
      setPayments(data)
      const total = data.reduce((sum, item) => sum + (item.amountEUR || 0), 0)
      setStats({ totalEur: total.toFixed(2), count: data.length })
    } catch (err) { console.error(err) } finally { if (!isBackgroundUpdate) setLoading(false) }
  }

  useEffect(() => {
    if (user) {
      loadData();
      const ch = supabase.channel('table-db-changes').on('postgres_changes', { event: '*', schema: 'public', table: 'payments' }, () => loadData(true)).subscribe()
      return () => { supabase.removeChannel(ch) }
    }
  }, [user])

  const isAdminAccess = user && ['Admin', 'C-level'].includes(user.role);

  if (isAuthChecking) return <div className="min-h-screen bg-[#0A0A0A]" />
  if (!user) return <LoginPage onLoginSuccess={handleLogin} />

  return (
    <BrowserRouter>
      {/* BACKGROUND: Technical Dark */}
      <div className="min-h-screen flex bg-[#F5F5F5] dark:bg-[#0A0A0A] font-sans transition-colors duration-300 text-[13px]">
        
        {/* SIDEBAR */}
        <aside className="w-[220px] fixed h-full bg-white dark:bg-[#111111] border-r border-gray-200 dark:border-[#222] flex flex-col z-20">
          
          {/* HEADER */}
          <div className="h-12 flex items-center px-4 border-b border-gray-100 dark:border-[#222]">
            <div className="w-5 h-5 bg-black dark:bg-white rounded flex items-center justify-center text-white dark:text-black font-bold text-[10px] mr-2">AP</div>
            <span className="font-bold text-gray-900 dark:text-white tracking-tight">AstroPanel</span>
          </div>

          {/* USER INFO */}
          <div className="p-3">
            <div className="flex items-center gap-2.5 p-2 rounded-lg bg-gray-50 dark:bg-[#1A1A1A] border border-gray-100 dark:border-[#2A2A2A]">
              {user.avatar_url ? (
                 <img src={user.avatar_url} className="w-8 h-8 rounded-md object-cover" />
               ) : (
                 <div className="w-8 h-8 rounded-md bg-gray-200 dark:bg-[#333] flex items-center justify-center text-xs font-bold text-gray-500 dark:text-gray-300">{user.name[0]}</div>
               )}
               <div className="flex-1 min-w-0">
                 <div className="text-xs font-semibold text-gray-900 dark:text-gray-200 truncate">{user.name}</div>
                 <div className="text-[10px] text-gray-500 uppercase tracking-wide">{user.role}</div>
               </div>
            </div>
          </div>

          {/* MENU */}
          <nav className="flex-1 overflow-y-auto custom-scrollbar px-2 space-y-0.5">
            <div className="px-3 py-2 text-[10px] font-bold text-gray-400 dark:text-[#555] uppercase tracking-wider">Дашборды</div>
            <SidebarItem icon={LayoutDashboard} label="Обзор" path="/" />
            <SidebarItem icon={LineChart} label="Аналитика" path="/stats" />
            <SidebarItem icon={CreditCard} label="Транзакции" path="/list" />
            
            {/* ✅ СКРЫВАЕМ ВЕСЬ БЛОК "ЛЮДИ", ВКЛЮЧАЯ ЗАГОЛОВОК */}
            {isAdminAccess && (
              <>
                <div className="px-3 py-2 text-[10px] font-bold text-gray-400 dark:text-[#555] uppercase tracking-wider mt-2">Люди</div>
                
                <button 
                  onClick={() => setIsEmployeesOpen(!isEmployeesOpen)}
                  className={`
                    w-full flex items-center justify-between px-3 py-1.5 rounded-[6px] transition-all duration-150 mb-0.5 text-xs font-medium
                    ${isEmployeesOpen 
                      ? 'text-black dark:text-white bg-gray-100 dark:bg-[#1A1A1A]' 
                      : 'text-gray-600 dark:text-[#888] hover:text-black dark:hover:text-white hover:bg-gray-100 dark:hover:bg-[#1A1A1A]'}
                  `}
                >
                  <div className="flex items-center gap-2.5">
                    <Users size={16} />
                    <span>Сотрудники</span>
                  </div>
                  <ChevronRight size={12} className={`transition-transform duration-200 ${isEmployeesOpen ? 'rotate-90' : ''}`} />
                </button>

                <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isEmployeesOpen ? 'max-h-48 opacity-100' : 'max-h-0 opacity-0'}`}>
                  <SidebarItem icon={Contact} label="Все сотрудники" path="/all-employees" isChild />
                  <SidebarItem icon={Briefcase} label="Отдел Продаж" path="/sales-team" isChild />
                  <SidebarItem icon={Headphones} label="Консультанты" path="/consultants" isChild />
                  <SidebarItem icon={Gift} label="Дни Рождения" path="/birthdays" isChild />
                </div>

                <SidebarItem icon={Users} label="Эффективность" path="/managers" />
                <SidebarItem icon={Globe} label="География" path="/geo" />
                <SidebarItem icon={BarChart3} label="KPI" path="/kpi" />
              </>
            )}
          </nav>

          {/* FOOTER */}
          <div className="p-2 border-t border-gray-200 dark:border-[#222]">
            <button onClick={() => setDarkMode(!darkMode)} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-[6px] text-xs font-medium text-gray-500 dark:text-[#666] hover:bg-gray-100 dark:hover:bg-[#1A1A1A] hover:text-black dark:hover:text-white transition-all">
              {darkMode ? <Sun size={14} /> : <Moon size={14} />}
              <span>{darkMode ? 'Светлая' : 'Темная'}</span>
            </button>
            <button onClick={handleLogout} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-[6px] text-xs font-medium text-gray-500 dark:text-[#666] hover:bg-red-50 dark:hover:bg-red-900/10 hover:text-red-600 transition-all">
              <LogOut size={14} />
              <span>Выйти</span>
            </button>
          </div>
        </aside>

        {/* MAIN */}
        <main className="flex-1 ml-[220px]">
          <header className="h-12 border-b border-gray-200 dark:border-[#222] bg-white/50 dark:bg-[#0A0A0A]/80 backdrop-blur-md sticky top-0 z-10 flex items-center justify-between px-6">
             <div className="text-xs font-medium text-gray-500 dark:text-[#666]">
                {loading ? 'Обновление данных...' : 'Данные актуальны'}
             </div>
             <button onClick={() => loadData(false)} className="p-1.5 bg-gray-100 dark:bg-[#222] text-black dark:text-white rounded hover:opacity-80 transition-opacity">
               <RefreshCcw size={14} className={loading ? 'animate-spin' : ''} />
             </button>
          </header>

          <div className="p-6">
            <Routes>
              {/* ✅ Передаем currentUser */}
              <Route path="/" element={<DashboardPage stats={stats} payments={payments} loading={loading} currentUser={user} />} />
              <Route path="/stats" element={<StatsPage payments={payments} currentUser={user} />} />
              <Route path="/list" element={<PaymentsPage payments={payments} currentUser={user} />} />            
              
              {/* ✅ Защищаем админские роуты */}
              <Route path="/kpi" element={<ProtectedRoute user={user} allowedRoles={['Admin', 'C-level']}><KPIPage /></ProtectedRoute>} />
              <Route path="/geo" element={<ProtectedRoute user={user} allowedRoles={['Admin', 'C-level']}><GeoPage payments={payments} /></ProtectedRoute>} />
              <Route path="/managers" element={<ProtectedRoute user={user} allowedRoles={['Admin', 'C-level']}><ManagersPage payments={payments} /></ProtectedRoute>} />
              
              <Route path="/sales-team" element={<ProtectedRoute user={user} allowedRoles={['Admin', 'C-level']}><EmployeesPage pageTitle="Отдел Продаж" targetRole="Sales" currentUser={user} /></ProtectedRoute>} />
              <Route path="/consultants" element={<ProtectedRoute user={user} allowedRoles={['Admin', 'C-level']}><EmployeesPage pageTitle="Консультанты" targetRole="Consultant" currentUser={user} /></ProtectedRoute>} />
              <Route path="/all-employees" element={<ProtectedRoute user={user} allowedRoles={['Admin', 'C-level']}><EmployeesPage pageTitle="Все сотрудники" excludeRole="C-level" currentUser={user} showAddButton={true} /></ProtectedRoute>} />
              <Route path="/add-employee" element={<ProtectedRoute user={user} allowedRoles={['Admin', 'C-level']}><AddEmployeePage /></ProtectedRoute>} />
              <Route path="/edit-employee/:id" element={<ProtectedRoute user={user} allowedRoles={['Admin', 'C-level']}><EditEmployeePage /></ProtectedRoute>} />
              <Route path="/birthdays" element={<ProtectedRoute user={user} allowedRoles={['Admin', 'C-level']}><BirthdaysPage /></ProtectedRoute>} />
              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
          </div>
        </main>
      </div>
    </BrowserRouter>
  )
}

export default App