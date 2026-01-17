import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../services/supabaseClient';
import { fetchManagerById, updateManagerProfile } from '../services/dataService';
import {
  User, Mail, Phone, MapPin, Briefcase,
  UploadCloud, ArrowLeft, Send, Calendar, Save, Loader2
} from 'lucide-react';

const ROLES = ['Sales', 'Consultant', 'SeniorSales', 'Admin', 'C-level', 'Manager'];

const EditEmployeePage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [avatarFile, setAvatarFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);

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
        const fileName = `${Date.now()}.${fileExt}`;
        const filePath = `${fileName}`;

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

      alert('Данные обновлены!');
      navigate(-1);

    } catch (error) {
      console.error('Error updating:', error);
      alert('Ошибка при сохранении: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex h-screen items-center justify-center text-gray-500">Загрузка...</div>;

  return (
    <div className="animate-in fade-in zoom-in duration-300 max-w-4xl mx-auto pb-10">

      <div className="flex items-center gap-4 mb-8">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors">
          <ArrowLeft className="text-gray-500" />
        </button>
        <div>
          <h2 className="text-2xl font-bold dark:text-white">Редактирование</h2>
          <p className="text-gray-500 text-sm">Измените данные сотрудника</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-dark-card p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col items-center text-center">
            <div className="relative w-40 h-40 mb-4 group">
              {previewUrl ? (
                <img src={previewUrl} alt="Preview" className="w-full h-full rounded-full object-cover border-4 border-gray-100 dark:border-gray-700 shadow-md" />
              ) : (
                <div className="w-full h-full rounded-full bg-gray-50 dark:bg-gray-800 flex items-center justify-center">
                  <User size={48} className="text-gray-300" />
                </div>
              )}
              <label className="absolute inset-0 flex items-center justify-center bg-black/50 text-white opacity-0 group-hover:opacity-100 rounded-full cursor-pointer transition-opacity backdrop-blur-sm">
                <UploadCloud size={24} />
                <span className="text-xs font-bold ml-2">Изменить</span>
                <input type="file" accept="image/jpeg, image/png, image/webp" onChange={handleFileChange} className="hidden" />
              </label>
            </div>
            <p className="text-xs text-gray-400">Нажмите на фото, чтобы изменить</p>
          </div>
        </div>

        <div className="lg:col-span-2">
          <form onSubmit={handleSubmit} className="bg-white dark:bg-dark-card p-8 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 space-y-6">

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <InputGroup label="Имя и Фамилия" icon={User}>
                <input required name="name" value={formData.name} onChange={handleChange} className="w-full bg-transparent outline-none text-sm dark:text-white" />
              </InputGroup>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-400 uppercase ml-1">Роль</label>
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
                <input type="email" name="email" value={formData.email} onChange={handleChange} className="w-full bg-transparent outline-none text-sm dark:text-white" />
              </InputGroup>
              <InputGroup label="Телефон" icon={Phone}>
                <input type="tel" name="phone" value={formData.phone} onChange={handleChange} className="w-full bg-transparent outline-none text-sm dark:text-white" />
              </InputGroup>
            </div>

            <div className="p-4 bg-blue-50 dark:bg-blue-900/10 rounded-xl border border-blue-100 dark:border-blue-900/30 space-y-4">
              <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 mb-2">
                <Send size={18} />
                <span className="font-bold text-sm">Telegram</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-gray-500 mb-1 block">ID</label>
                  <input required name="telegram_id" value={formData.telegram_id} onChange={handleChange} className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm dark:text-white" />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 mb-1 block">Username</label>
                  <input required name="telegram_username" value={formData.telegram_username} onChange={handleChange} className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm dark:text-white" />
                </div>
              </div>
            </div>

            <div className="w-full md:w-1/2">
              <InputGroup label="Дата рождения" icon={Calendar}>
                <input type="date" name="birth_date" value={formData.birth_date} onChange={handleChange} className="w-full bg-transparent outline-none text-sm dark:text-white" />
              </InputGroup>
            </div>

            {/* ✅ 2. ДИНАМИЧЕСКИЙ ВЫБОР СТРАН (Скрываем для Admin/C-level) */}
            {!['Admin', 'C-level'].includes(formData.role) && (
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase ml-1 flex items-center gap-2"><MapPin size={14} /> ГЕО</label>

                {availableCountries.length === 0 ? (
                  <div className="text-xs text-gray-400">Загрузка стран...</div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {availableCountries.map(country => {
                      const isActive = formData.geo.includes(country.code);
                      return (
                        <button
                          key={country.code}
                          type="button"
                          onClick={() => toggleCountry(country.code)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all flex items-center gap-2 ${isActive
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-gray-50 dark:bg-gray-800 text-gray-600 border-gray-200 dark:border-gray-700'
                            }`}
                        >
                          <span>{country.emoji}</span>
                          <span>{country.code}</span>
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            <button type="submit" disabled={saving} className="w-full mt-6 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 text-white font-bold py-4 rounded-xl shadow-lg flex items-center justify-center gap-2 transition-transform active:scale-95 disabled:opacity-70">
              {saving ? <Loader2 className="animate-spin" /> : <><Save size={20} /> Сохранить изменения</>}
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

export default EditEmployeePage;