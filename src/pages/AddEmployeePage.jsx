import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabaseClient';
import { 
  User, Mail, Phone, MapPin, Briefcase, 
  UploadCloud, ArrowLeft, Send, Calendar, Save 
} from 'lucide-react';

const ROLES = ['Sales', 'Consultant', 'Admin', 'C-level', 'Manager'];
const COUNTRIES = ['UA', 'PL', 'DE', 'RO', 'BG', 'CZ', 'IT', 'ES', 'PT', 'TR', 'FR', 'US'];

const AddEmployeePage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  
  const [avatarFile, setAvatarFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    role: 'Sales',
    email: '',
    phone: '',
    telegram_id: '',
    telegram_username: '',
    birth_date: '',
    geo: []
  });

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert('Файл слишком большой! Максимум 2МБ.');
      return;
    }

    setAvatarFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const toggleCountry = (code) => {
    setFormData(prev => {
      const exists = prev.geo.includes(code);
      if (exists) return { ...prev, geo: prev.geo.filter(c => c !== code) };
      return { ...prev, geo: [...prev.geo, code] };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // ✅ ИСПРАВЛЕНИЕ: Добавили проверку !avatarFile
    if (!formData.name || !formData.telegram_id || formData.geo.length === 0 || !avatarFile) {
      alert('Ошибка: Все поля обязательны, включая аватарку и ГЕО!');
      return;
    }

    setLoading(true);

    try {
      let avatarUrl = null;

      // 1. Загружаем аватарку
      if (avatarFile) {
        const fileExt = avatarFile.name.split('.').pop();
        const fileName = `${Date.now()}.${fileExt}`;
        const filePath = `${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(filePath, avatarFile);

        if (uploadError) throw uploadError;

        const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
        avatarUrl = data.publicUrl;
      }

      // 2. Добавляем сотрудника
      const { error: insertError } = await supabase
        .from('managers')
        .insert([{
          name: formData.name,
          role: formData.role,
          email: formData.email,
          phone: formData.phone,
          telegram_id: formData.telegram_id,
          telegram_username: formData.telegram_username,
          birth_date: formData.birth_date || null,
          geo: formData.geo,
          avatar_url: avatarUrl, // Ссылка на загруженный файл
          status: 'active'
        }]);

      if (insertError) throw insertError;

      alert('Сотрудник успешно создан!');
      navigate('/all-employees');

    } catch (error) {
      console.error('Error adding employee:', error);
      alert('Ошибка при создании: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-in fade-in zoom-in duration-300 max-w-4xl mx-auto pb-10">
      
      <div className="flex items-center gap-4 mb-8">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors">
          <ArrowLeft className="text-gray-500" />
        </button>
        <div>
          <h2 className="text-2xl font-bold dark:text-white">Новый сотрудник</h2>
          <p className="text-gray-500 text-sm">Все поля обязательны для заполнения</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-dark-card p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col items-center text-center">
            <div className={`relative w-40 h-40 mb-4 group ${!previewUrl ? 'border-red-200' : ''}`}>
              {previewUrl ? (
                <img src={previewUrl} alt="Preview" className="w-full h-full rounded-full object-cover border-4 border-gray-100 dark:border-gray-700 shadow-md" />
              ) : (
                <div className="w-full h-full rounded-full bg-gray-50 dark:bg-gray-800 flex items-center justify-center border-2 border-dashed border-gray-300 dark:border-gray-600">
                  <User size={48} className="text-gray-300 dark:text-gray-500" />
                </div>
              )}
              
              <label className="absolute inset-0 flex items-center justify-center bg-black/50 text-white opacity-0 group-hover:opacity-100 rounded-full cursor-pointer transition-opacity backdrop-blur-sm">
                <UploadCloud size={24} />
                <span className="text-xs font-bold ml-2">Загрузить</span>
                <input type="file" accept="image/jpeg, image/png, image/webp" onChange={handleFileChange} className="hidden" />
              </label>
            </div>
            
            <p className="text-xs text-gray-400">
              Поддерживаются: JPG, PNG, WEBP<br/>
              {!previewUrl && <span className="text-red-400 font-bold">Фото обязательно!</span>}
            </p>
          </div>
        </div>

        <div className="lg:col-span-2">
          <form onSubmit={handleSubmit} className="bg-white dark:bg-dark-card p-8 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 space-y-6">
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <InputGroup label="Имя и Фамилия" icon={User}>
                <input required name="name" value={formData.name} onChange={handleChange} placeholder="Иван Иванов" className="w-full bg-transparent outline-none text-sm dark:text-white" />
              </InputGroup>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-400 uppercase ml-1">Роль / Отдел</label>
                <div className="relative">
                  <select name="role" value={formData.role} onChange={handleChange} className="w-full appearance-none bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-sm font-medium dark:text-white focus:ring-2 focus:ring-blue-500 outline-none">
                    {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                  <Briefcase size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <InputGroup label="Email" icon={Mail}>
                <input required type="email" name="email" value={formData.email} onChange={handleChange} placeholder="ivan@example.com" className="w-full bg-transparent outline-none text-sm dark:text-white" />
              </InputGroup>
              <InputGroup label="Телефон" icon={Phone}>
                <input required type="tel" name="phone" value={formData.phone} onChange={handleChange} placeholder="+380..." className="w-full bg-transparent outline-none text-sm dark:text-white" />
              </InputGroup>
            </div>

            <div className="p-4 bg-blue-50 dark:bg-blue-900/10 rounded-xl border border-blue-100 dark:border-blue-900/30 space-y-4">
              <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 mb-2">
                <Send size={18} />
                <span className="font-bold text-sm">Настройки Telegram</span>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-gray-500 mb-1 block">Telegram ID (Число) *</label>
                  <input required name="telegram_id" value={formData.telegram_id} onChange={handleChange} placeholder="12345678" className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm dark:text-white" />
                </div>
                <div>
                   <label className="text-xs font-bold text-gray-500 mb-1 block">Никнейм (@username)</label>
                   <input required name="telegram_username" value={formData.telegram_username} onChange={handleChange} placeholder="@username" className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm dark:text-white" />
                </div>
              </div>
            </div>

            <div className="w-full md:w-1/2">
               <InputGroup label="Дата рождения" icon={Calendar}>
                  <input required type="date" name="birth_date" value={formData.birth_date} onChange={handleChange} className="w-full bg-transparent outline-none text-sm dark:text-white" />
               </InputGroup>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase ml-1 flex items-center gap-2">
                <MapPin size={14} /> Доступные ГЕО
              </label>
              <div className="flex flex-wrap gap-2">
                {COUNTRIES.map(c => {
                  const isActive = formData.geo.includes(c);
                  return (
                    <button
                      key={c}
                      type="button"
                      onClick={() => toggleCountry(c)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                        isActive 
                        ? 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-500/30' 
                        : 'bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-blue-400'
                      }`}
                    >
                      {c}
                    </button>
                  )
                })}
              </div>
              {formData.geo.length === 0 && <p className="text-[10px] text-red-500">Выберите хотя бы одну страну</p>}
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full mt-6 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-500/30 flex items-center justify-center gap-2 transition-transform active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading ? 'Создание...' : (
                <>
                  <Save size={20} /> Создать сотрудника
                </>
              )}
            </button>

          </form>
        </div>
      </div>
    </div>
  );
};

const InputGroup = ({ label, icon: Icon, children }) => (
  <div className="space-y-1.5">
    <label className="text-xs font-bold text-gray-400 uppercase ml-1">{label}</label>
    <div className="flex items-center gap-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 focus-within:ring-2 focus-within:ring-blue-500 transition-shadow">
      <Icon size={18} className="text-gray-400 shrink-0" />
      {children}
    </div>
  </div>
);

export default AddEmployeePage;