import React, { useState } from 'react';
import { X, Plus, Trash2, FolderOpen } from 'lucide-react';
import { supabase } from '../../services/supabaseClient';
import { showToast } from '../../utils/toastEvents';

const COLOR_OPTIONS = [
    { value: 'blue',   label: 'Синий',    preview: 'bg-blue-500' },
    { value: 'purple', label: 'Фиолетовый', preview: 'bg-purple-500' },
    { value: 'green',  label: 'Зелёный',  preview: 'bg-emerald-500' },
    { value: 'orange', label: 'Оранжевый', preview: 'bg-orange-500' },
    { value: 'red',    label: 'Красный',  preview: 'bg-red-500' },
    { value: 'pink',   label: 'Розовый',  preview: 'bg-pink-500' },
    { value: 'yellow', label: 'Желтый',   preview: 'bg-yellow-500' },
    { value: 'cyan',   label: 'Голубой',  preview: 'bg-cyan-500' },
];

const ProjectsManagerModal = ({ projects, onClose, onRefresh }) => {
    const [newName, setNewName] = useState('');
    const [newColor, setNewColor] = useState('blue');
    const [saving, setSaving] = useState(false);
    const [deletingId, setDeletingId] = useState(null);

    const handleCreate = async (e) => {
        e.preventDefault();
        if (!newName.trim()) return;
        setSaving(true);
        try {
            const { error } = await supabase
                .from('projects')
                .insert({ name: newName.trim(), color: newColor });
            if (error) throw error;
            showToast('Проект создан', 'success');
            setNewName('');
            setNewColor('blue');
            onRefresh();
        } catch (err) {
            showToast('Ошибка: ' + err.message, 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (project) => {
        // Check if project is used by any country
        const { data: linked } = await supabase
            .from('countries')
            .select('code')
            .eq('project_id', project.id);
        
        if (linked && linked.length > 0) {
            showToast(`Нельзя удалить: ${linked.length} ГЕО привязаны к этому проекту`, 'error');
            return;
        }

        setDeletingId(project.id);
        try {
            const { error } = await supabase.from('projects').delete().eq('id', project.id);
            if (error) throw error;
            showToast('Проект удалён', 'success');
            onRefresh();
        } catch (err) {
            showToast('Ошибка: ' + err.message, 'error');
        } finally {
            setDeletingId(null);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-[#111] w-full max-w-md rounded-2xl shadow-2xl border border-gray-200 dark:border-[#333] overflow-hidden">
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-100 dark:border-[#222] flex items-center justify-between bg-gray-50/50 dark:bg-[#161616]">
                    <div className="flex items-center gap-2">
                        <FolderOpen size={18} className="text-blue-500" />
                        <h2 className="text-base font-bold dark:text-white">Управление проектами</h2>
                    </div>
                    <button onClick={onClose}><X size={18} className="text-gray-400 hover:text-gray-900 dark:hover:text-white" /></button>
                </div>

                <div className="p-5 space-y-5">
                    {/* Existing projects */}
                    <div>
                        <p className="text-xs font-bold text-gray-400 uppercase mb-2">Существующие проекты</p>
                        <div className="space-y-2">
                            {projects.map(p => {
                                const colorOpt = COLOR_OPTIONS.find(c => c.value === p.color) || COLOR_OPTIONS[0];
                                return (
                                    <div key={p.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-[#1A1A1A] rounded-lg border border-gray-100 dark:border-[#2A2A2A]">
                                        <div className="flex items-center gap-2.5">
                                            <div className={`w-3 h-3 rounded-full ${colorOpt.preview}`} />
                                            <span className="text-sm font-semibold dark:text-white">{p.name}</span>
                                        </div>
                                        <button
                                            onClick={() => handleDelete(p)}
                                            disabled={deletingId === p.id}
                                            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-lg transition-colors"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                );
                            })}
                            {projects.length === 0 && (
                                <p className="text-sm text-gray-400 text-center py-3">Нет проектов</p>
                            )}
                        </div>
                    </div>

                    {/* Create new */}
                    <form onSubmit={handleCreate} className="border-t border-gray-100 dark:border-[#222] pt-4 space-y-3">
                        <p className="text-xs font-bold text-gray-400 uppercase">Создать новый проект</p>
                        <input
                            type="text"
                            value={newName}
                            onChange={e => setNewName(e.target.value)}
                            placeholder="Название проекта (напр. Taro)"
                            className="w-full bg-gray-50 dark:bg-[#1A1A1A] border border-gray-200 dark:border-[#333] rounded-lg px-3 py-2 text-sm dark:text-white focus:outline-none focus:border-blue-500"
                        />
                        <div className="flex flex-wrap gap-2">
                            {COLOR_OPTIONS.map(c => (
                                <button
                                    key={c.value}
                                    type="button"
                                    onClick={() => setNewColor(c.value)}
                                    title={c.label}
                                    className={`w-6 h-6 rounded-full ${c.preview} transition-all ${newColor === c.value ? 'ring-2 ring-offset-2 ring-gray-400 dark:ring-offset-[#111] scale-125' : 'opacity-60 hover:opacity-100'}`}
                                />
                            ))}
                        </div>
                        <button
                            type="submit"
                            disabled={saving || !newName.trim()}
                            className="w-full flex items-center justify-center gap-2 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-lg transition-colors disabled:opacity-50"
                        >
                            <Plus size={15} />
                            {saving ? 'Создание...' : 'Создать проект'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default ProjectsManagerModal;
