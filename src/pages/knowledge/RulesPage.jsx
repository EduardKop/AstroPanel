import React, { useState } from 'react';
import { useAppStore } from '../../store/appStore';
import { supabase } from '../../services/supabaseClient';
import {
  Shield, Clock, Heart, FileText, Check, Plus,
  Edit3, Trash2, X, Save, ToggleLeft, ToggleRight, Loader2, AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Иконки для секций
const ICONS = {
  Shield: <Shield className="text-blue-600" size={20} />,
  Clock: <Clock className="text-orange-500" size={20} />,
  Heart: <Heart className="text-pink-500" size={20} />,
  FileText: <FileText className="text-gray-500" size={20} />,
  Check: <Check className="text-green-500" size={20} />,
  Alert: <AlertCircle className="text-red-500" size={20} />,
};

const RulesPage = () => {
  const { rules, user, fetchAllData } = useAppStore();
  const [isEditMode, setIsEditMode] = useState(false);

  // Состояние модалки: null = закрыто, {} = новый, {id: ...} = редактирование
  const [editingSection, setEditingSection] = useState(null);

  const isAdmin = user && ['Admin', 'C-level', 'SeniorSales'].includes(user.role);

  // Удаление всей секции
  const handleDeleteSection = async (id) => {
    if (!window.confirm('Удалить этот раздел регламента и все пункты внутри?')) return;
    const { error } = await supabase.from('knowledge_rules').delete().eq('id', id);
    if (!error) fetchAllData(true);
  };

  return (
    <div className="animate-in fade-in zoom-in duration-300 pb-20">

      {/* HEADER */}
      <div className="max-w-4xl mx-auto mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold dark:text-white flex items-center gap-3">
            <Shield className="text-blue-600 dark:text-blue-500" size={28} />
            Регламент компании
          </h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Официальный свод правил и стандартов работы</p>
        </div>

        {isAdmin && (
          <div className="flex items-center gap-3 bg-white dark:bg-[#111] p-1.5 rounded-lg border border-gray-200 dark:border-[#333] shadow-sm">
            <button
              onClick={() => setIsEditMode(!isEditMode)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${isEditMode ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400' : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'}`}
            >
              {isEditMode ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
              {isEditMode ? 'Редактор' : 'Просмотр'}
            </button>

            {isEditMode && (
              <button
                // ✅ ИСПРАВЛЕНО: Передаем пустой объект для создания нового
                onClick={() => setEditingSection({ title: '', items: [] })}
                className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-md text-xs font-bold transition-all"
              >
                <Plus size={14} /> Раздел
              </button>
            )}
          </div>
        )}
      </div>

      {/* DOCUMENT LIST LAYOUT (Строгий стиль) */}
      <div className="max-w-4xl mx-auto space-y-6">

        {rules.length === 0 && (
          <div className="text-center py-16 border-2 border-dashed border-gray-200 dark:border-[#333] rounded-xl">
            <p className="text-gray-400">Правила еще не добавлены</p>
          </div>
        )}

        {rules.map((section, index) => (
          <div
            key={section.id}
            className="bg-white dark:bg-[#111] border border-gray-200 dark:border-[#333] rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow"
          >
            {/* Заголовок раздела */}
            <div className="bg-gray-50/50 dark:bg-[#161616] px-6 py-4 border-b border-gray-100 dark:border-[#222] flex justify-between items-center">
              <div className="flex items-center gap-3">
                <span className="text-gray-400 font-mono text-xs">0{index + 1}.</span>
                <div className="flex items-center gap-2">
                  {ICONS[section.icon] || ICONS.FileText}
                  <h3 className="text-base font-bold text-gray-900 dark:text-white uppercase tracking-wide">
                    {section.title}
                  </h3>
                </div>
              </div>

              {/* Кнопки редактора */}
              {isEditMode && isAdmin && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setEditingSection(section)}
                    className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
                    title="Редактировать"
                  >
                    <Edit3 size={16} />
                  </button>
                  <button
                    onClick={() => handleDeleteSection(section.id)}
                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                    title="Удалить"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              )}
            </div>

            {/* Тело раздела (Список) */}
            <div className="p-6">
              <ul className="space-y-3">
                {section.items && Array.isArray(section.items) && section.items.length > 0 ? (
                  section.items.map((item, idx) => (
                    <li key={idx} className="flex gap-4 text-[13px] leading-relaxed text-gray-700 dark:text-gray-300">
                      <span className="shrink-0 w-1.5 h-1.5 rounded-full bg-blue-400 mt-2" />
                      <span>{item}</span>
                    </li>
                  ))
                ) : (
                  <li className="text-sm text-gray-400 italic pl-5">Список пуст...</li>
                )}
              </ul>
            </div>
          </div>
        ))}
      </div>

      {/* MODAL EDITOR */}
      <AnimatePresence>
        {editingSection && (
          <RuleEditorModal
            section={editingSection}
            onClose={() => setEditingSection(null)}
            onSave={() => { setEditingSection(null); fetchAllData(true); }}
          />
        )}
      </AnimatePresence>

    </div>
  );
};

// --- МОДАЛКА РЕДАКТИРОВАНИЯ ---
const RuleEditorModal = ({ section, onClose, onSave }) => {
  const [loading, setLoading] = useState(false);

  // State формы
  const [title, setTitle] = useState(section?.title || '');
  const [icon, setIcon] = useState(section?.icon || 'FileText');
  const [items, setItems] = useState(section?.items || []);
  const [newItemText, setNewItemText] = useState('');

  const handleAddItem = () => {
    if (!newItemText.trim()) return;
    setItems([...items, newItemText.trim()]);
    setNewItemText('');
  };

  const handleRemoveItem = (index) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleUpdateItem = (index, val) => {
    const newItems = [...items];
    newItems[index] = val;
    setItems(newItems);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title) return alert('Введите название раздела');

    setLoading(true);
    try {
      const payload = { title, icon, items };

      if (section?.id) {
        // Обновление
        await supabase.from('knowledge_rules').update(payload).eq('id', section.id);
      } else {
        // Создание
        await supabase.from('knowledge_rules').insert([payload]);
      }
      onSave();
    } catch (error) {
      console.error(error);
      alert('Ошибка сохранения');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-[#09090b] w-full max-w-2xl rounded-xl shadow-2xl flex flex-col border border-gray-200 dark:border-[#333] max-h-[90vh]"
      >
        <div className="p-5 border-b border-gray-100 dark:border-[#222] flex justify-between items-center bg-gray-50 dark:bg-[#111]">
          <h3 className="text-lg font-bold dark:text-white flex items-center gap-2">
            {section?.id ? <Edit3 size={18} /> : <Plus size={18} />}
            {section?.id ? 'Редактировать раздел' : 'Новый раздел'}
          </h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 dark:hover:bg-[#222] rounded-full text-gray-500"><X size={20} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar space-y-6">
          {/* Title & Icon */}
          <div className="grid grid-cols-4 gap-4">
            <div className="col-span-3">
              <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wider">Название раздела</label>
              <input
                value={title}
                onChange={e => setTitle(e.target.value)}
                className="w-full bg-white dark:bg-[#1A1A1A] border border-gray-300 dark:border-[#333] rounded-lg px-4 py-2.5 text-sm dark:text-white outline-none focus:border-blue-500 transition-colors"
                placeholder="Например: График работы"
                autoFocus
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wider">Иконка</label>
              <select
                value={icon}
                onChange={e => setIcon(e.target.value)}
                className="w-full bg-white dark:bg-[#1A1A1A] border border-gray-300 dark:border-[#333] rounded-lg px-3 py-2.5 text-sm dark:text-white outline-none focus:border-blue-500 cursor-pointer"
              >
                <option value="FileText">📄 Текст</option>
                <option value="Clock">⏰ Часы</option>
                <option value="Shield">🛡 Щит</option>
                <option value="Heart">❤ Сердце</option>
                <option value="Check">✅ Чек</option>
                <option value="Alert">❗ Важно</option>
              </select>
            </div>
          </div>

          <hr className="border-gray-100 dark:border-[#222]" />

          {/* Rules List Editor */}
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-3 uppercase tracking-wider">Пункты правил</label>

            <div className="space-y-3 mb-4">
              {items.map((item, idx) => (
                <div key={idx} className="flex gap-3 items-start group">
                  <span className="mt-3 w-1.5 h-1.5 rounded-full bg-gray-300 dark:bg-gray-600 shrink-0"></span>
                  <textarea
                    value={item}
                    onChange={e => handleUpdateItem(idx, e.target.value)}
                    rows={1}
                    className="flex-1 bg-transparent border-b border-gray-200 dark:border-[#333] focus:border-blue-500 dark:text-gray-200 text-sm py-1.5 outline-none resize-none overflow-hidden transition-colors"
                    style={{ minHeight: '34px', height: 'auto' }}
                    onInput={(e) => { e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px'; }}
                  />
                  <button onClick={() => handleRemoveItem(idx)} className="p-1.5 text-gray-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"><Trash2 size={16} /></button>
                </div>
              ))}
            </div>

            {/* Add New Item Input */}
            <div className="flex gap-3 items-center bg-gray-50 dark:bg-[#1A1A1A] p-3 rounded-lg border border-dashed border-gray-300 dark:border-[#333] hover:border-blue-400 transition-colors">
              <Plus size={18} className="text-gray-400" />
              <input
                value={newItemText}
                onChange={e => setNewItemText(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddItem()}
                placeholder="Напишите новый пункт и нажмите Enter..."
                className="flex-1 bg-transparent text-sm outline-none dark:text-white placeholder-gray-400"
              />
              <button
                onClick={handleAddItem}
                disabled={!newItemText.trim()}
                className="text-xs bg-white dark:bg-[#222] border border-gray-200 dark:border-[#333] px-3 py-1.5 rounded-md font-bold hover:bg-gray-100 dark:hover:bg-[#333] transition-colors disabled:opacity-50"
              >
                Добавить
              </button>
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-gray-100 dark:border-[#222] bg-gray-50 dark:bg-[#111] flex justify-end gap-3">
          <button onClick={onClose} className="px-5 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-200 dark:text-gray-300 dark:hover:bg-[#222] transition-colors">
            Отмена
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="px-6 py-2.5 rounded-lg text-sm font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/20 flex items-center gap-2 transition-transform active:scale-95 disabled:opacity-70"
          >
            {loading ? <Loader2 className="animate-spin" size={18} /> : <><Save size={18} /> Сохранить</>}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default RulesPage;