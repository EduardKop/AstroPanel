import React, { useState } from 'react';
import { useAppStore } from '../../store/appStore';
import { supabase } from '../../services/supabaseClient';
import {
  BookOpen, Star, Heart, Zap, Search, ChevronRight, X,
  Trash2, Globe, CheckCircle2, Users, DollarSign, Plus, Edit3, Save, Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// --- ИКОНКИ ---
const ICONS = {
  Star: <Star className="text-yellow-500" size={24} fill="currentColor" />,
  Heart: <Heart className="text-pink-500" size={24} fill="currentColor" />,
  Zap: <Zap className="text-blue-500" size={24} fill="currentColor" />,
  Book: <BookOpen className="text-purple-500" size={24} />,
};

// --- ГЛАВНЫЙ КОМПОНЕНТ ---
const ProductsPage = () => {
  const { products, user, fetchAllData } = useAppStore();
  const [selectedProduct, setSelectedProduct] = useState(null); // Для просмотра
  const [editingProduct, setEditingProduct] = useState(null);   // Для редактирования
  const [isEditorOpen, setIsEditorOpen] = useState(false);      // Открыт ли редактор
  const [search, setSearch] = useState('');

  const isAdmin = user && ['Admin', 'C-level', 'SeniorSales'].includes(user.role);

  const filteredProducts = products.filter(p =>
    p.title.toLowerCase().includes(search.toLowerCase()) ||
    p.short_description?.toLowerCase().includes(search.toLowerCase())
  );

  // Удаление
  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm('Удалить этот продукт из базы?')) return;
    const { error } = await supabase.from('knowledge_products').delete().eq('id', id);
    if (!error) fetchAllData(true);
  };

  // Открытие редактора (Создание или Редактирование)
  const handleOpenEditor = (product = null, e = null) => {
    if (e) e.stopPropagation();
    setEditingProduct(product); // Если null, значит создаем новый
    setIsEditorOpen(true);
  };

  return (
    <div className="animate-in fade-in zoom-in duration-300 pb-10">

      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
        <div>
          <h2 className="text-xl font-bold dark:text-white flex items-center gap-2">
            <BookOpen className="text-purple-500" size={24} />
            Продуктовая линейка
          </h2>
          <p className="text-gray-500 dark:text-gray-400 text-xs mt-1">Информация, цены и скрипты для продаж</p>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Поиск продукта..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-white dark:bg-[#111] border border-gray-200 dark:border-[#333] rounded-lg pl-9 pr-4 py-2 text-sm focus:outline-none focus:border-purple-500 dark:text-white transition-colors"
            />
          </div>

          {/* Кнопка добавления (Только Админ) */}
          {isAdmin && (
            <button
              onClick={() => handleOpenEditor(null)}
              className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-bold transition-all shadow-lg shadow-purple-500/20"
            >
              <Plus size={18} /> <span className="hidden sm:inline">Добавить</span>
            </button>
          )}
        </div>
      </div>

      {/* GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {filteredProducts.map(product => (
          <div
            key={product.id}
            onClick={() => setSelectedProduct(product)}
            className="group bg-white dark:bg-[#111] border border-gray-200 dark:border-[#333] hover:border-purple-400 dark:hover:border-purple-600 rounded-xl p-5 cursor-pointer shadow-sm hover:shadow-md transition-all duration-200 relative overflow-hidden"
          >
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-gray-50 dark:bg-[#1A1A1A] rounded-xl border border-gray-100 dark:border-[#222]">
                {ICONS[product.icon] || ICONS.Star}
              </div>

              {/* Действия Админа */}
              {isAdmin && (
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => handleOpenEditor(product, e)}
                    className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                    title="Редактировать"
                  >
                    <Edit3 size={16} />
                  </button>
                  <button
                    onClick={(e) => handleDelete(product.id, e)}
                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                    title="Удалить"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              )}
            </div>

            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
              {product.title}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-3 mb-4">
              {product.short_description}
            </p>

            <div className="flex items-center text-purple-600 dark:text-purple-400 text-xs font-bold uppercase tracking-wider">
              Подробнее <ChevronRight size={14} className="ml-1 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        ))}

        {filteredProducts.length === 0 && (
          <div className="col-span-full py-10 text-center text-gray-400 text-sm">
            Продукты не найдены
          </div>
        )}
      </div>

      {/* MODAL: PROMO VIEW */}
      <AnimatePresence>
        {selectedProduct && (
          <ProductViewModal
            product={selectedProduct}
            onClose={() => setSelectedProduct(null)}
          />
        )}
      </AnimatePresence>

      {/* MODAL: EDITOR */}
      <AnimatePresence>
        {isEditorOpen && (
          <ProductEditorModal
            product={editingProduct}
            onClose={() => setIsEditorOpen(false)}
            onSave={() => {
              setIsEditorOpen(false);
              fetchAllData(true);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

// --- КОМПОНЕНТ ПРОСМОТРА (VIEW ONLY) ---
const ProductViewModal = ({ product, onClose }) => {
  const content = product.content || {};

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-[#09090b] w-full max-w-4xl max-h-[90vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col border border-gray-200 dark:border-[#333]"
      >
        {/* HEADER */}
        <div className="p-6 border-b border-gray-100 dark:border-[#222] flex justify-between items-start bg-gray-50 dark:bg-[#111]">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white dark:bg-[#222] rounded-xl border border-gray-200 dark:border-[#333] shadow-sm">
              {ICONS[product.icon] || ICONS.Star}
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{product.title}</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Детальное описание продукта</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 dark:hover:bg-[#222] rounded-full text-gray-500 transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* SCROLLABLE CONTENT */}
        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar space-y-8">
          {/* 1. ЧТО ЭТО */}
          <section>
            <h3 className="text-sm font-bold uppercase text-purple-600 dark:text-purple-400 tracking-wider mb-3 flex items-center gap-2">
              <BookOpen size={16} /> О продукте
            </h3>
            <div className="text-gray-700 dark:text-gray-300 leading-relaxed text-sm whitespace-pre-wrap">
              {content.what_is_it}
            </div>
            {content.includes && content.includes.length > 0 && (
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                {content.includes.map((item, idx) => (
                  <div key={idx} className="flex items-start gap-2 bg-purple-50 dark:bg-purple-900/10 p-3 rounded-lg border border-purple-100 dark:border-purple-900/20">
                    <CheckCircle2 size={16} className="text-purple-600 dark:text-purple-400 shrink-0 mt-0.5" />
                    <span className="text-xs font-medium text-gray-800 dark:text-gray-200">{item}</span>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* 2. ДЛЯ КОГО */}
          <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-sm font-bold uppercase text-blue-600 dark:text-blue-400 tracking-wider mb-3 flex items-center gap-2">
                <Users size={16} /> Целевая аудитория
              </h3>
              <ul className="space-y-2">
                {content.for_whom?.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1.5 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-bold uppercase text-emerald-600 dark:text-emerald-400 tracking-wider mb-3 flex items-center gap-2">
                <Star size={16} /> Ценность
              </h3>
              <ul className="space-y-2">
                {content.value?.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </section>

          {/* 3. ПРОЦЕСС */}
          <section className="bg-gray-50 dark:bg-[#161616] p-5 rounded-xl border border-gray-200 dark:border-[#333]">
            <h3 className="text-sm font-bold uppercase text-orange-600 dark:text-orange-400 tracking-wider mb-3 flex items-center gap-2">
              <Zap size={16} /> Процесс продажи
            </h3>
            <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
              {content.sales_process}
            </p>
          </section>

          {/* 4. ЦЕНЫ */}
          <section>
            <h3 className="text-sm font-bold uppercase text-gray-900 dark:text-white tracking-wider mb-4 flex items-center gap-2">
              <DollarSign size={16} className="text-green-500" /> Прайс-лист по ГЕО
            </h3>
            <div className="overflow-hidden border border-gray-200 dark:border-[#333] rounded-lg">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-100 dark:bg-[#222] text-xs uppercase font-bold text-gray-500 dark:text-gray-400">
                  <tr>
                    <th className="px-4 py-3"><Globe size={14} className="inline mr-1" /> ГЕО</th>
                    <th className="px-4 py-3">Прайс 1</th>
                    <th className="px-4 py-3">Прайс 2</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-[#222] bg-white dark:bg-[#111]">
                  {content.pricing?.map((row, idx) => (
                    <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-[#1A1A1A]">
                      <td className="px-4 py-2 font-bold text-gray-800 dark:text-gray-200">{row.geo}</td>
                      <td className="px-4 py-2 text-gray-600 dark:text-gray-400 font-mono">{row.price1}</td>
                      <td className="px-4 py-2 text-gray-600 dark:text-gray-400 font-mono">{row.price5}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* 5. ИТОГ */}
          <section className="p-4 bg-purple-50/50 dark:bg-purple-900/5 border border-purple-100 dark:border-purple-900/20 rounded-xl">
            <h4 className="font-bold text-purple-700 dark:text-purple-300 text-sm mb-1">Что получает клиент:</h4>
            <p className="text-sm text-purple-900/70 dark:text-purple-200/70">{content.deliverables}</p>
          </section>
        </div>
      </motion.div>
    </div>
  );
};

// --- КОМПОНЕНТ РЕДАКТОРА (ADD / EDIT) ---
const ProductEditorModal = ({ product, onClose, onSave }) => {
  const [loading, setLoading] = useState(false);

  // Инициализация формы (если product передан - заполняем, иначе пусто)
  const [form, setForm] = useState({
    title: product?.title || '',
    short_description: product?.short_description || '',
    icon: product?.icon || 'Star',
    // Сложные поля (конвертируем массив в строку с переносами для textarea)
    what_is_it: product?.content?.what_is_it || '',
    includes: product?.content?.includes?.join('\n') || '',
    for_whom: product?.content?.for_whom?.join('\n') || '',
    value: product?.content?.value?.join('\n') || '',
    sales_process: product?.content?.sales_process || '',
    deliverables: product?.content?.deliverables || '',
    // Цены (храним как массив объектов)
    pricing: product?.content?.pricing || []
  });

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  // Управление ценами
  const addPriceRow = () => {
    setForm(prev => ({
      ...prev,
      pricing: [...prev.pricing, { geo: '', price1: '', price5: '' }]
    }));
  };

  const removePriceRow = (index) => {
    setForm(prev => ({
      ...prev,
      pricing: prev.pricing.filter((_, i) => i !== index)
    }));
  };

  const updatePriceRow = (index, field, val) => {
    const newPricing = [...form.pricing];
    newPricing[index][field] = val;
    setForm({ ...form, pricing: newPricing });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Собираем сложный объект content
      const content = {
        what_is_it: form.what_is_it,
        sales_process: form.sales_process,
        deliverables: form.deliverables,
        pricing: form.pricing,
        // Разбиваем строки по Enter и убираем пустые
        includes: form.includes.split('\n').map(s => s.trim()).filter(Boolean),
        for_whom: form.for_whom.split('\n').map(s => s.trim()).filter(Boolean),
        value: form.value.split('\n').map(s => s.trim()).filter(Boolean),
      };

      const payload = {
        title: form.title,
        short_description: form.short_description,
        icon: form.icon,
        content
      };

      if (product?.id) {
        // UPDATE
        await supabase.from('knowledge_products').update(payload).eq('id', product.id);
      } else {
        // INSERT
        await supabase.from('knowledge_products').insert([payload]);
      }

      onSave();
    } catch (error) {
      console.error(error);
      showToast('Ошибка при сохранении', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-[#09090b] w-full max-w-4xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col border border-gray-200 dark:border-[#333]"
      >
        <div className="p-6 border-b border-gray-100 dark:border-[#222] flex justify-between items-center bg-gray-50 dark:bg-[#111]">
          <h2 className="text-xl font-bold dark:text-white">
            {product ? 'Редактировать продукт' : 'Новый продукт'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 dark:hover:bg-[#222] rounded-full text-gray-500"><X size={24} /></button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-8 custom-scrollbar space-y-6">

          {/* MAIN INFO */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1">Название продукта</label>
              <input required name="title" value={form.title} onChange={handleChange} className="w-full bg-gray-50 dark:bg-[#1A1A1A] border border-gray-200 dark:border-[#333] rounded-lg px-4 py-2 text-sm dark:text-white outline-none focus:border-purple-500" placeholder="Личный разбор..." />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1">Иконка</label>
              <select name="icon" value={form.icon} onChange={handleChange} className="w-full bg-gray-50 dark:bg-[#1A1A1A] border border-gray-200 dark:border-[#333] rounded-lg px-4 py-2 text-sm dark:text-white outline-none focus:border-purple-500">
                <option value="Star">Звезда</option>
                <option value="Heart">Сердце</option>
                <option value="Zap">Молния</option>
                <option value="Book">Книга</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1">Краткое описание (для карточки)</label>
            <input name="short_description" value={form.short_description} onChange={handleChange} className="w-full bg-gray-50 dark:bg-[#1A1A1A] border border-gray-200 dark:border-[#333] rounded-lg px-4 py-2 text-sm dark:text-white outline-none focus:border-purple-500" placeholder="Пару предложений о сути..." />
          </div>

          <div className="h-px bg-gray-200 dark:bg-[#222] my-4"></div>

          {/* DETAILS */}
          <div>
            <label className="block text-xs font-bold text-purple-500 mb-1 uppercase tracking-wider">Подробное описание (Что это?)</label>
            <textarea name="what_is_it" value={form.what_is_it} onChange={handleChange} rows={4} className="w-full bg-gray-50 dark:bg-[#1A1A1A] border border-gray-200 dark:border-[#333] rounded-lg px-4 py-2 text-sm dark:text-white outline-none focus:border-purple-500" placeholder="Полное описание продукта..." />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold text-purple-500 mb-1 uppercase tracking-wider">Что включено (список)</label>
              <p className="text-[10px] text-gray-400 mb-1">Каждый пункт с новой строки</p>
              <textarea name="includes" value={form.includes} onChange={handleChange} rows={5} className="w-full bg-gray-50 dark:bg-[#1A1A1A] border border-gray-200 dark:border-[#333] rounded-lg px-4 py-2 text-sm dark:text-white outline-none focus:border-purple-500" placeholder="Пункт 1&#10;Пункт 2&#10;Пункт 3" />
            </div>
            <div>
              <label className="block text-xs font-bold text-blue-500 mb-1 uppercase tracking-wider">Целевая аудитория (Для кого)</label>
              <p className="text-[10px] text-gray-400 mb-1">Каждый пункт с новой строки</p>
              <textarea name="for_whom" value={form.for_whom} onChange={handleChange} rows={5} className="w-full bg-gray-50 dark:bg-[#1A1A1A] border border-gray-200 dark:border-[#333] rounded-lg px-4 py-2 text-sm dark:text-white outline-none focus:border-blue-500" placeholder="Для тех кто...&#10;Для тех кто..." />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-emerald-500 mb-1 uppercase tracking-wider">Ценность продукта</label>
            <p className="text-[10px] text-gray-400 mb-1">Каждый пункт с новой строки</p>
            <textarea name="value" value={form.value} onChange={handleChange} rows={4} className="w-full bg-gray-50 dark:bg-[#1A1A1A] border border-gray-200 dark:border-[#333] rounded-lg px-4 py-2 text-sm dark:text-white outline-none focus:border-emerald-500" placeholder="Понимание себя...&#10;Экономия времени..." />
          </div>

          <div>
            <label className="block text-xs font-bold text-orange-500 mb-1 uppercase tracking-wider">Процесс продажи и скрипт</label>
            <textarea name="sales_process" value={form.sales_process} onChange={handleChange} rows={4} className="w-full bg-gray-50 dark:bg-[#1A1A1A] border border-gray-200 dark:border-[#333] rounded-lg px-4 py-2 text-sm dark:text-white outline-none focus:border-orange-500" placeholder="Этапы продажи..." />
          </div>

          {/* PRICING TABLE EDITOR */}
          <div className="bg-gray-50 dark:bg-[#1A1A1A] p-4 rounded-xl border border-gray-200 dark:border-[#333]">
            <div className="flex justify-between items-center mb-2">
              <label className="block text-xs font-bold text-green-500 uppercase tracking-wider">Прайс-лист</label>
              <button type="button" onClick={addPriceRow} className="text-xs bg-green-500 text-white px-2 py-1 rounded hover:bg-green-600 flex items-center gap-1"><Plus size={12} /> Добавить строку</button>
            </div>
            <div className="space-y-2">
              {form.pricing.map((row, idx) => (
                <div key={idx} className="flex gap-2 items-center">
                  <input value={row.geo} onChange={(e) => updatePriceRow(idx, 'geo', e.target.value)} placeholder="ГЕО (Страна)" className="flex-1 bg-white dark:bg-[#111] border border-gray-200 dark:border-[#333] rounded px-2 py-1 text-sm dark:text-white" />
                  <input value={row.price1} onChange={(e) => updatePriceRow(idx, 'price1', e.target.value)} placeholder="Цена 1" className="w-24 bg-white dark:bg-[#111] border border-gray-200 dark:border-[#333] rounded px-2 py-1 text-sm dark:text-white" />
                  <input value={row.price5} onChange={(e) => updatePriceRow(idx, 'price5', e.target.value)} placeholder="Цена 2" className="w-24 bg-white dark:bg-[#111] border border-gray-200 dark:border-[#333] rounded px-2 py-1 text-sm dark:text-white" />
                  <button type="button" onClick={() => removePriceRow(idx)} className="text-red-400 hover:text-red-600"><Trash2 size={16} /></button>
                </div>
              ))}
              {form.pricing.length === 0 && <div className="text-xs text-gray-400 text-center py-2">Нет цен</div>}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-purple-500 mb-1 uppercase tracking-wider">Что получает клиент (Итог)</label>
            <textarea name="deliverables" value={form.deliverables} onChange={handleChange} rows={2} className="w-full bg-gray-50 dark:bg-[#1A1A1A] border border-gray-200 dark:border-[#333] rounded-lg px-4 py-2 text-sm dark:text-white outline-none focus:border-purple-500" placeholder="PDF файл + консультация..." />
          </div>

        </form>

        <div className="p-6 border-t border-gray-100 dark:border-[#222] bg-gray-50 dark:bg-[#111]">
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 rounded-xl shadow-lg flex items-center justify-center gap-2 transition-transform active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {loading ? <Loader2 className="animate-spin" /> : <><Save size={20} /> Сохранить продукт</>}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default ProductsPage;