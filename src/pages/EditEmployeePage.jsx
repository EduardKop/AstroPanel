import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../services/supabaseClient';
import { useAppStore } from '../store/appStore';
import { fetchManagerById, updateManagerProfile } from '../services/dataService';
import {
  User, Mail, Phone, MapPin, Briefcase,
  UploadCloud, ArrowLeft, Send, Calendar, Save, Loader2, ChevronDown, Sparkles
} from 'lucide-react';

const ROLES = ['Sales', 'SalesTaro', 'Consultant', 'SeniorSales', 'Admin', 'C-level', 'Manager'];

const EditEmployeePage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { logActivity, user: currentUser } = useAppStore();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [avatarFile, setAvatarFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);
  const [animationsDisabled, setAnimationsDisabled] = useState(() => {
    return localStorage.getItem('disableAnimations') === 'true';
  });

  const toggleAnimations = () => {
    const newValue = !animationsDisabled;
    setAnimationsDisabled(newValue);
    localStorage.setItem('disableAnimations', newValue.toString());
  };

  // ✅ 1. Список стран из БД
  const [availableCountries, setAvailableCountries] = useState([]);

  const [formData, setFormData] = useState({
    name: '',
    role: 'Sales',
    email: '',
    phone: '',
    telegram_id: '',
    telegram_username: '',
    birth_date: '',
    geo: [],
    avatar_url: null
  });

  // Загрузка данных
  useEffect(() => {
    const load = async () => {
      try {
        // А. Загружаем страны
        const { data: countriesData } = await supabase.from('countries').select('*').order('code').range(0, 9999);
        if (countriesData) setAvailableCountries(countriesData);

        // Б. Загружаем сотрудника
        const data = await fetchManagerById(id);
        if (data) {
          setFormData({
            ...data,
            geo: data.geo || [],
          });
          setPreviewUrl(data.avatar_url);
        } else {
          alert('Сотрудник не найден');
          navigate('/all-employees');
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id, navigate]);

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
    setSaving(true);

    try {
      let finalAvatarUrl = formData.avatar_url;

      if (avatarFile) {
        const fileExt = avatarFile.name.split('.').pop();
        const fileName = `${Date.now()}.${fileExt} `;
        const filePath = `${fileName} `;

        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(filePath, avatarFile);

        if (uploadError) throw uploadError;

        const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
        finalAvatarUrl = data.publicUrl;
      }

      await updateManagerProfile(id, {
        name: formData.name,
        role: formData.role,
        email: formData.email,
        phone: formData.phone,
        telegram_id: formData.telegram_id,
        telegram_username: formData.telegram_username,
        birth_date: formData.birth_date || null,
        geo: formData.geo,
        avatar_url: finalAvatarUrl
      });

      // 📝 LOG ACTIVITY
      await logActivity({
        action: 'update',
        entity: 'manager',
        entityId: id,
        details: { changes: formData },
        importance: 'medium'
      });

      alert('Данные обновлены!');
      navigate(-1);

    } catch (error) {
      console.error('Error updating:', error);
      alert('Ошибка при сохранении: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex h-screen items-center justify-center text-gray-500 text-sm">Загрузка...</div>;

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-gray-50 dark:bg-[#0A0A0A] text-gray-900 dark:text-white transition-colors duration-300">
      {/* 🔮 BACKGROUND BLOBS */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-purple-600/10 dark:bg-purple-600/20 rounded-full blur-[120px] pointer-events-none mix-blend-multiply dark:mix-blend-screen" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-600/10 dark:bg-blue-600/20 rounded-full blur-[100px] pointer-events-none mix-blend-multiply dark:mix-blend-screen translate-x-20 translate-y-20" />

      {/* 🌟 CONTENT WRAPPER */}
      <div className="relative z-10 max-w-5xl mx-auto px-6 py-12 animate-in fade-in zoom-in duration-500">

        {/* HEADER */}
        <div className="flex items-center gap-6 mb-12">
          <button
            onClick={() => navigate(-1)}
            className="group p-3 rounded-full bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 hover:bg-gray-100 dark:hover:bg-white/10 hover:border-gray-300 dark:hover:border-white/20 transition-all active:scale-95 shadow-sm dark:shadow-none"
          >
            <ArrowLeft className="text-gray-500 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white transition-colors" size={24} />
          </button>
          <div>
            <h2 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-400 bg-clip-text text-transparent">Редактирование профиля</h2>
            <p className="text-gray-500 dark:text-gray-400 mt-1">Персональные данные и настройки доступа</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

          {/* 🖼 LEFT COLUMN: AVATAR CARD */}
          <div className="lg:col-span-4">
            <div className="bg-white dark:bg-white/5 backdrop-blur-xl border border-gray-200 dark:border-white/10 rounded-3xl p-8 flex flex-col items-center text-center shadow-lg dark:shadow-2xl relative overflow-hidden group">
              {/* Shine Effect */}
              <div className="absolute inset-0 bg-gradient-to-tr from-black/5 dark:from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />

              <div className="relative w-48 h-48 mb-6 group/avatar">
                <div className="absolute inset-0 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 blur-lg opacity-20 dark:opacity-40 group-hover/avatar:opacity-40 dark:group-hover/avatar:opacity-60 transition-opacity" />
                {previewUrl ? (
                  <img src={previewUrl} alt="Preview" className="relative w-full h-full rounded-full object-cover border-4 border-white dark:border-[#1A1A1A] shadow-xl" />
                ) : (
                  <div className="relative w-full h-full rounded-full bg-gray-100 dark:bg-[#1A1A1A] flex items-center justify-center border-4 border-white dark:border-[#2A2A2A] shadow-inner">
                    <User size={64} className="text-gray-400 dark:text-gray-600" />
                  </div>
                )}

                <label className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 text-white opacity-0 group-hover/avatar:opacity-100 rounded-full cursor-pointer transition-all duration-300 backdrop-blur-sm scale-95 group-hover/avatar:scale-100">
                  <UploadCloud size={28} className="mb-2" />
                  <span className="text-xs font-bold uppercase tracking-wider">Изменить</span>
                  <input type="file" accept="image/jpeg, image/png, image/webp" onChange={handleFileChange} className="hidden" />
                </label>
              </div>

              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1">{formData.name || 'Новый сотрудник'}</h3>
              <p className="text-sm font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 px-3 py-1 rounded-full border border-blue-100 dark:border-blue-500/20">
                {formData.role}
              </p>
            </div>

            {/* TIPS CARD */}
            <div className="mt-4 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-600/20 dark:to-purple-600/20 backdrop-blur-xl border border-blue-100 dark:border-white/10 rounded-3xl p-6 shadow-md dark:shadow-xl">
              <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                <Calendar size={14} className="text-blue-500 dark:text-blue-400" /> Совет
              </h4>
              <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
                Фотография профиля отображается в чатах и таблицах. Используйте качественное фото для лучшей узнаваемости.
              </p>
            </div>
          </div>

          {/* 📝 RIGHT COLUMN: FORM */}
          <div className="lg:col-span-8">
            <form onSubmit={handleSubmit} className="bg-white dark:bg-white/5 backdrop-blur-xl rounded-3xl p-8 relative border border-gray-200 dark:border-white/0 shadow-lg dark:shadow-none">

              {/* Section Title */}
              <div className="mb-8 flex items-center justify-between">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <span className="w-1 h-6 bg-blue-500 rounded-full inline-block" />
                  Основная информация
                </h3>
              </div>

              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <GlassInput label="Имя и Фамилия" icon={User} name="name" value={formData.name} onChange={handleChange} required />

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase ml-1">Роль</label>
                    <div className="relative group/select">
                      <select
                        name="role"
                        value={formData.role}
                        onChange={handleChange}
                        className="w-full appearance-none bg-gray-50 dark:bg-black/20 hover:bg-gray-100 dark:hover:bg-black/30 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3.5 text-sm font-medium text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500/50 outline-none transition-all cursor-pointer"
                      >
                        {ROLES.map(r => <option key={r} value={r} className="bg-white dark:bg-[#1A1A1A] text-gray-900 dark:text-gray-300">{r}</option>)}
                      </select>
                      <Briefcase size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 group-hover/select:text-gray-900 dark:group-hover/select:text-white transition-colors pointer-events-none" />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <GlassInput label="Email" icon={Mail} name="email" value={formData.email} onChange={handleChange} type="email" />
                  <GlassInput label="Телефон" icon={Phone} name="phone" value={formData.phone} onChange={handleChange} type="tel" />
                </div>

                {/* TELEGRAM SECTION */}
                <div className="p-1 rounded-2xl bg-gradient-to-r from-blue-500/10 to-purple-500/10 dark:from-blue-500/20 dark:to-purple-500/20 border border-blue-100 dark:border-white/5">
                  <div className="bg-white/60 dark:bg-[#0A0A0A]/60 backdrop-blur-md rounded-xl p-6 border border-white/50 dark:border-white/5">
                    <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 mb-6">
                      <Send size={18} />
                      <span className="font-bold text-sm tracking-wide">TELEGRAM ИНТЕГРАЦИЯ</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <GlassInput label="Telegram ID" name="telegram_id" value={formData.telegram_id} onChange={handleChange} placeholder="Например: 12345678" />
                      <GlassInput label="Username" name="telegram_username" value={formData.telegram_username} onChange={handleChange} placeholder="@username" />
                    </div>
                  </div>
                </div>

                <div className="w-full md:w-1/2">
                  <GlassInput label="Дата рождения" icon={Calendar} name="birth_date" value={formData.birth_date} onChange={handleChange} type="date" />
                </div>

                {/* ✅ 2. ДИНАМИЧЕСКИЙ ВЫБОР СТРАН (Скрываем для Admin/C-level) */}
                {!['Admin', 'C-level'].includes(formData.role) && (
                  <div className="space-y-3 pt-4 border-t border-gray-100 dark:border-white/5">
                    <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase ml-1 flex items-center gap-2">
                      <MapPin size={14} className="text-purple-500 dark:text-purple-400" />
                      География работы
                      {/* Security note if user is editing themselves and is not admin */}
                      {currentUser?.id === id && !['Admin', 'C-level'].includes(currentUser?.role) && (
                        <span className="text-[10px] text-yellow-600 dark:text-yellow-500 normal-case">
                          (Только для просмотра - изменения доступны Администратору)
                        </span>
                      )}
                    </label>

                    {availableCountries.length === 0 ? (
                      <div className="text-xs text-gray-400 animate-pulse">Загрузка доступных стран...</div>
                    ) : (
                      <div className="flex flex-wrap gap-2.5">
                        {availableCountries.map(country => {
                          const isActive = formData.geo.includes(country.code);
                          const isEditingSelfAsNonAdmin = currentUser?.id === id && !['Admin', 'C-level'].includes(currentUser?.role);

                          return (
                            <button
                              key={country.code}
                              type="button"
                              onClick={() => !isEditingSelfAsNonAdmin && toggleCountry(country.code)}
                              disabled={isEditingSelfAsNonAdmin}
                              className={`
                                relative group overflow-hidden px-4 py-2 rounded-xl text-xs font-bold border transition-all duration-300 flex items-center gap-2
                                ${isEditingSelfAsNonAdmin
                                  ? 'cursor-not-allowed opacity-50'
                                  : 'cursor-pointer'
                                }
                                ${isActive
                                  ? 'bg-blue-600 border-blue-500 text-white shadow-md shadow-blue-500/20'
                                  : 'bg-gray-50 dark:bg-black/20 border-gray-200 dark:border-white/5 text-gray-500 dark:text-gray-400 hover:border-gray-300 dark:hover:border-white/20 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5'
                                }
`}
                            >
                              <span className="text-base">{country.emoji}</span>
                              <span className="tracking-wide">{country.code}</span>
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Additional Settings Section */}
              <div className="pt-6 border-t border-gray-100 dark:border-white/5">
                <button
                  type="button"
                  onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
                  className="flex items-center gap-2 text-xs font-medium text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400 transition-colors"
                >
                  <ChevronDown
                    size={14}
                    className={`transition-transform duration-200 ${showAdvancedSettings ? 'rotate-180' : ''}`}
                  />
                  Дополнительные настройки
                </button>

                <div className={`overflow-hidden transition-all duration-300 ease-in-out ${showAdvancedSettings ? 'max-h-48 opacity-100 mt-4' : 'max-h-0 opacity-0'}`}>
                  <div className="bg-gray-50 dark:bg-black/20 rounded-xl p-4 space-y-4 border border-gray-100 dark:border-white/5">
                    {/* Disable Animations Toggle */}
                    <label className="flex items-center justify-between cursor-pointer group">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                          <Sparkles size={16} className="text-purple-600 dark:text-purple-400" />
                        </div>
                        <div>
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Анимации</span>
                          <p className="text-[10px] text-gray-400 dark:text-gray-500">Конфетти при добавлении оплаты</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={toggleAnimations}
                        className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${animationsDisabled ? 'bg-gray-300 dark:bg-gray-600' : 'bg-purple-600'}`}
                      >
                        <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${animationsDisabled ? '' : 'translate-x-5'}`} />
                      </button>
                    </label>
                  </div>
                </div>
              </div>

              {/* SAVE BUTTON */}
              <button
                type="submit"
                disabled={saving}
                className="w-full mt-10 relative overflow-hidden group bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold py-4 rounded-xl shadow-lg transition-all active:scale-[0.98] disabled:opacity-70 disabled:grayscale"
              >
                {/* Button Shine */}
                <div className="absolute top-0 -inset-full h-full w-1/2 z-5 block transform -skew-x-12 bg-gradient-to-r from-transparent to-white opacity-20 group-hover:animate-shine" />

                <div className="relative flex items-center justify-center gap-2">
                  {saving ? <Loader2 className="animate-spin" /> : <Save size={20} />}
                  <span>{saving ? 'Сохранение...' : 'Сохранить изменения'}</span>
                </div>
              </button>

            </form>
          </div>

        </div>
      </div>
    </div>
  );
};

const GlassInput = ({ label, icon: Icon, className, ...props }) => (
  <div className={`space-y-2 ${className}`}>
    <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase ml-1">{label}</label>
    <div className="relative group/input">
      <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10 dark:from-blue-500/20 dark:to-purple-500/20 rounded-xl blur opacity-0 group-focus-within/input:opacity-100 transition-opacity duration-500" />
      <div className="relative flex items-center gap-3 bg-gray-50 dark:bg-black/20 hover:bg-gray-100 dark:hover:bg-black/30 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3.5 focus-within:border-blue-500/50 focus-within:bg-white dark:focus-within:bg-black/40 transition-all">
        {Icon && <Icon size={18} className="text-gray-400 dark:text-gray-500 group-focus-within/input:text-blue-500 dark:group-focus-within/input:text-blue-400 transition-colors shrink-0" />}
        <input
          className="w-full bg-transparent outline-none text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 font-medium"
          {...props}
        />
      </div>
    </div>
  </div>
);

export default EditEmployeePage;