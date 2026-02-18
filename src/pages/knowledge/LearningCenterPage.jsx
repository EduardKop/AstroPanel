import React, { useState, useMemo, useRef } from 'react';
import { useAppStore } from '../../store/appStore';
import { supabase } from '../../services/supabaseClient';
import {
    BookOpen, Search, ChevronRight, X, Trash2, Plus, Edit3, Save, Loader2,
    GraduationCap, Clock, Tag, Star, Filter, Play, ExternalLink,
    Bold, Heading1, Heading2, Heading3, List, Minus, Youtube, Link2, Globe
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// --- EMOJI OPTIONS ---
const EMOJI_OPTIONS = ['📚', '🎓', '💡', '🚀', '⭐', '🎯', '📝', '🔥', '💎', '🏆', '📖', '🧠', '✨', '🌟', '📌'];

// --- CATEGORY OPTIONS ---
const CATEGORIES = [
    { value: 'all', label: 'Все' },
    { value: 'general', label: 'Общее' },
    { value: 'sales', label: 'Продажи' },
    { value: 'product', label: 'Продукт' },
    { value: 'scripts', label: 'Скрипты' },
    { value: 'onboarding', label: 'Онбординг' },
];

// --- RICH TEXT TOOLBAR ---
const RichTextToolbar = ({ textareaRef, value, onChange }) => {
    // Insert text at cursor position
    const insertAtCursor = (before, after = '', placeholder = '') => {
        const textarea = textareaRef.current;
        if (!textarea) return;

        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const selectedText = value.substring(start, end);
        const textToInsert = selectedText || placeholder;

        const newValue =
            value.substring(0, start) +
            before + textToInsert + after +
            value.substring(end);

        onChange(newValue);

        // Set cursor position after insertion
        setTimeout(() => {
            textarea.focus();
            const newCursorPos = start + before.length + textToInsert.length + after.length;
            textarea.setSelectionRange(newCursorPos, newCursorPos);
        }, 0);
    };

    // Insert at new line
    const insertAtNewLine = (prefix, placeholder = '') => {
        const textarea = textareaRef.current;
        if (!textarea) return;

        const start = textarea.selectionStart;
        const needsNewLine = start > 0 && value[start - 1] !== '\n';
        const linePrefix = needsNewLine ? '\n' : '';

        insertAtCursor(linePrefix + prefix, '', placeholder);
    };

    const buttons = [
        {
            icon: Bold,
            label: 'Жирный',
            action: () => insertAtCursor('**', '**', 'жирный текст'),
            separator: false
        },
        {
            icon: Heading1,
            label: 'Заголовок 1',
            action: () => insertAtNewLine('# ', 'Заголовок'),
            separator: false
        },
        {
            icon: Heading2,
            label: 'Заголовок 2',
            action: () => insertAtNewLine('## ', 'Подзаголовок'),
            separator: false
        },
        {
            icon: Heading3,
            label: 'Заголовок 3',
            action: () => insertAtNewLine('### ', 'Малый заголовок'),
            separator: true
        },
        {
            icon: List,
            label: 'Список',
            action: () => insertAtNewLine('- ', 'Пункт списка'),
            separator: false
        },
        {
            icon: Minus,
            label: 'Разделитель',
            action: () => insertAtNewLine('\n---\n', ''),
            separator: true
        },
        {
            icon: Youtube,
            label: 'YouTube видео',
            action: () => {
                const url = prompt('Вставьте ссылку на YouTube видео:');
                if (url) insertAtNewLine(url + '\n', '');
            },
            separator: false
        },
        {
            icon: Link2,
            label: 'Ссылка',
            action: () => {
                const url = prompt('Вставьте URL ссылки:');
                if (url) insertAtCursor('🔗 ' + url, '', '');
            },
            separator: false
        },
    ];

    return (
        <div className="flex flex-wrap gap-1 p-2 bg-gray-100 dark:bg-[#1A1A1A] border border-gray-200 dark:border-[#333] rounded-t-lg border-b-0">
            {buttons.map((btn, idx) => (
                <React.Fragment key={idx}>
                    <button
                        type="button"
                        onClick={btn.action}
                        className="p-2 rounded hover:bg-white dark:hover:bg-[#333] text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                        title={btn.label}
                    >
                        <btn.icon size={18} />
                    </button>
                    {btn.separator && (
                        <div className="w-px h-6 self-center bg-gray-300 dark:bg-[#444] mx-1" />
                    )}
                </React.Fragment>
            ))}
        </div>
    );
};

// --- YOUTUBE EMBED COMPONENT ---
const YouTubeEmbed = ({ videoId }) => {
    return (
        <div className="my-4 rounded-xl overflow-hidden border border-gray-200 dark:border-[#333] shadow-lg">
            <div className="relative pb-[56.25%] h-0">
                <iframe
                    className="absolute top-0 left-0 w-full h-full"
                    src={`https://www.youtube.com/embed/${videoId}`}
                    title="YouTube video"
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                />
            </div>
        </div>
    );
};

// --- YOUTUBE THUMBNAIL COMPONENT ---
const YouTubeThumbnail = ({ videoId, url }) => {
    return (
        <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="block my-4 group"
        >
            <div className="relative rounded-xl overflow-hidden border border-gray-200 dark:border-[#333] shadow-lg hover:shadow-xl transition-all">
                <img
                    src={`https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`}
                    alt="YouTube video"
                    className="w-full aspect-video object-cover group-hover:scale-105 transition-transform duration-300"
                    onError={(e) => {
                        e.target.src = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
                    }}
                />
                <div className="absolute inset-0 bg-black/30 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                    <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                        <Play size={28} className="text-white ml-1" fill="white" />
                    </div>
                </div>
                <div className="absolute bottom-3 right-3 bg-black/70 text-white text-xs px-2 py-1 rounded flex items-center gap-1">
                    <ExternalLink size={12} /> YouTube
                </div>
            </div>
        </a>
    );
};

// --- MARKDOWN RENDERER ---
const MarkdownContent = ({ content }) => {
    if (!content) return <p className="text-gray-400">Контент статьи не добавлен.</p>;

    // Extract YouTube video ID from various URL formats
    const extractYouTubeId = (url) => {
        const patterns = [
            /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
            /youtube\.com\/watch\?.*v=([a-zA-Z0-9_-]{11})/,
        ];
        for (const pattern of patterns) {
            const match = url.match(pattern);
            if (match) return match[1];
        }
        return null;
    };

    // Parse and render markdown-like content
    const renderContent = () => {
        const lines = content.split('\n');
        const elements = [];
        let currentList = [];
        let listType = null;

        const flushList = () => {
            if (currentList.length > 0) {
                elements.push(
                    <ul key={`list-${elements.length}`} className="space-y-1.5 my-3 pl-4">
                        {currentList.map((item, idx) => (
                            <li key={idx} className="flex gap-2 text-gray-700 dark:text-gray-300">
                                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-2 shrink-0" />
                                <span>{item}</span>
                            </li>
                        ))}
                    </ul>
                );
                currentList = [];
            }
        };

        lines.forEach((line, idx) => {
            const trimmedLine = line.trim();

            // Skip empty lines
            if (!trimmedLine) {
                flushList();
                elements.push(<div key={idx} className="h-2" />);
                return;
            }

            // Headers
            if (trimmedLine.startsWith('# ')) {
                flushList();
                elements.push(
                    <h1 key={idx} className="text-2xl font-bold text-gray-900 dark:text-white mt-6 mb-3">
                        {trimmedLine.slice(2)}
                    </h1>
                );
                return;
            }

            if (trimmedLine.startsWith('## ')) {
                flushList();
                elements.push(
                    <h2 key={idx} className="text-xl font-bold text-gray-900 dark:text-white mt-5 mb-2 flex items-center gap-2">
                        {trimmedLine.slice(3)}
                    </h2>
                );
                return;
            }

            if (trimmedLine.startsWith('### ')) {
                flushList();
                elements.push(
                    <h3 key={idx} className="text-lg font-semibold text-gray-800 dark:text-gray-200 mt-4 mb-2">
                        {trimmedLine.slice(4)}
                    </h3>
                );
                return;
            }

            // Horizontal rule
            if (trimmedLine === '---' || trimmedLine === '***') {
                flushList();
                elements.push(
                    <hr key={idx} className="my-6 border-gray-200 dark:border-[#333]" />
                );
                return;
            }

            // YouTube links - show thumbnail with preview
            const youtubeMatch = trimmedLine.match(/(https?:\/\/(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)[\w-]+)/);
            if (youtubeMatch) {
                flushList();
                const videoId = extractYouTubeId(youtubeMatch[1]);
                if (videoId) {
                    elements.push(
                        <YouTubeThumbnail key={idx} videoId={videoId} url={youtubeMatch[1]} />
                    );
                    // Render remaining text after the URL
                    const remainingText = trimmedLine.replace(youtubeMatch[0], '').trim();
                    if (remainingText) {
                        elements.push(
                            <p key={`${idx}-text`} className="text-gray-700 dark:text-gray-300 mb-2">
                                {renderInlineStyles(remainingText)}
                            </p>
                        );
                    }
                    return;
                }
            }

            // Regular links - make clickable
            const linkMatch = trimmedLine.match(/^🔗\s*(https?:\/\/\S+)/);
            if (linkMatch) {
                flushList();
                const videoId = extractYouTubeId(linkMatch[1]);
                if (videoId) {
                    elements.push(
                        <YouTubeThumbnail key={idx} videoId={videoId} url={linkMatch[1]} />
                    );
                } else {
                    elements.push(
                        <a
                            key={idx}
                            href={linkMatch[1]}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 hover:underline my-2"
                        >
                            <ExternalLink size={14} /> {linkMatch[1]}
                        </a>
                    );
                }
                return;
            }

            // List items
            if (trimmedLine.startsWith('- ') || trimmedLine.startsWith('• ')) {
                currentList.push(renderInlineStyles(trimmedLine.slice(2)));
                return;
            }

            // Numbered list
            const numberedMatch = trimmedLine.match(/^\d+\.\s+(.+)/);
            if (numberedMatch) {
                flushList();
                elements.push(
                    <div key={idx} className="flex gap-3 text-gray-700 dark:text-gray-300 my-1.5">
                        <span className="text-indigo-500 font-bold">{trimmedLine.match(/^\d+/)[0]}.</span>
                        <span>{renderInlineStyles(numberedMatch[1])}</span>
                    </div>
                );
                return;
            }

            // Regular paragraph
            flushList();
            elements.push(
                <p key={idx} className="text-gray-700 dark:text-gray-300 leading-relaxed my-2">
                    {renderInlineStyles(trimmedLine)}
                </p>
            );
        });

        flushList();
        return elements;
    };

    // Render inline styles (bold, links, etc.)
    const renderInlineStyles = (text) => {
        // Bold text **text**
        let result = text;
        const boldParts = result.split(/\*\*(.+?)\*\*/g);
        if (boldParts.length > 1) {
            return boldParts.map((part, idx) =>
                idx % 2 === 1 ? <strong key={idx} className="font-bold text-gray-900 dark:text-white">{part}</strong> : part
            );
        }
        return result;
    };

    return <div className="space-y-1">{renderContent()}</div>;
};

import ShareModal from '../../components/sharing/ShareModal';
// ... existing imports ...

// --- MAIN COMPONENT ---
const LearningCenterPage = ({ isPublic = false, publicSettings = {}, lang = 'ru' }) => {
    const { learningArticles, user, fetchAllData, sharedPages } = useAppStore();
    const [selectedArticle, setSelectedArticle] = useState(null);
    const [editingArticle, setEditingArticle] = useState(null);
    const [isEditorOpen, setIsEditorOpen] = useState(false);
    const [isShareModalOpen, setIsShareModalOpen] = useState(false);
    const [search, setSearch] = useState('');
    const [activeCategory, setActiveCategory] = useState('all');

    const isAdmin = !isPublic && user && ['Admin', 'C-level', 'SeniorSales'].includes(user.role);
    const canShare = !isPublic && user && ['Admin', 'C-level'].includes(user.role);

    const isShared = sharedPages['learning']?.is_active;

    // Helper to get localized content
    const getLocalizedContent = (article, field) => {
        if (lang === 'ua') {
            return article[`${field}_ua`] || article[field];
        }
        return article[field];
    };

    // Filter articles
    const filteredArticles = useMemo(() => {
        return learningArticles.filter(article => {
            const title = getLocalizedContent(article, 'title');
            const desc = getLocalizedContent(article, 'description');

            const matchesSearch =
                title?.toLowerCase().includes(search.toLowerCase()) ||
                desc?.toLowerCase().includes(search.toLowerCase());
            const matchesCategory = activeCategory === 'all' || article.category === activeCategory;
            return matchesSearch && matchesCategory;
        });
    }, [learningArticles, search, activeCategory, lang]);

    // Featured articles first
    const sortedArticles = useMemo(() => {
        return [...filteredArticles].sort((a, b) => {
            if (a.is_featured && !b.is_featured) return -1;
            if (!a.is_featured && b.is_featured) return 1;
            return new Date(b.created_at) - new Date(a.created_at);
        });
    }, [filteredArticles]);

    // Delete article
    const handleDelete = async (id, e) => {
        e.stopPropagation();
        if (!window.confirm('Удалить эту статью?')) return;
        const { error } = await supabase.from('knowledge_learning').delete().eq('id', id);
        if (!error) fetchAllData(true);
    };

    // Open editor
    const handleOpenEditor = (article = null, e = null) => {
        if (e) e.stopPropagation();
        setEditingArticle(article);
        setIsEditorOpen(true);
    };

    return (
        <div className={`animate-in fade-in zoom-in duration-300 ${isPublic ? 'py-10 px-6 md:px-10' : 'pb-10'}`}>

            {/* HEADER */}
            {(!isPublic || publicSettings.show_title !== false) && (
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
                    <div>
                        <h2 className="text-xl font-bold dark:text-white flex items-center gap-2">
                            <GraduationCap className="text-indigo-500" size={24} />
                            Центр обучения
                        </h2>
                        {!isPublic && (
                            <p className="text-gray-500 dark:text-gray-400 text-xs mt-1">
                                Обучающие материалы, скрипты и гайды
                            </p>
                        )}
                    </div>

                    <div className="flex items-center gap-3 w-full md:w-auto">
                        <div className="relative flex-1 md:w-64">
                            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Поиск статей..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full bg-white dark:bg-[#111] border border-gray-200 dark:border-[#333] rounded-lg pl-9 pr-4 py-2 text-sm focus:outline-none focus:border-indigo-500 dark:text-white transition-colors"
                            />
                        </div>

                        {/* SHARE BUTTON */}
                        {canShare && (
                            <button
                                onClick={() => setIsShareModalOpen(true)}
                                className="relative p-2 bg-white dark:bg-[#111] border border-gray-200 dark:border-[#333] hover:border-blue-500 text-gray-500 hover:text-blue-500 rounded-lg transition-colors"
                                title={isShared ? "Доступ открыт (Настроить)" : "Настройки доступа"}
                            >
                                <Globe size={18} />
                                {isShared && (
                                    <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white dark:border-[#111]"></span>
                                )}
                            </button>
                        )}

                        {/* Add button (Admin only) */}
                        {isAdmin && (
                            <button
                                onClick={() => handleOpenEditor(null)}
                                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-bold transition-all shadow-lg shadow-indigo-500/20"
                            >
                                <Plus size={18} /> <span className="hidden sm:inline">Добавить</span>
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* CATEGORY TABS */}
            <div className="flex gap-2 mb-6 overflow-x-auto pb-2 -mx-3 px-3 custom-scrollbar">
                {CATEGORIES.map(cat => (
                    <button
                        key={cat.value}
                        onClick={() => setActiveCategory(cat.value)}
                        className={`px-4 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${activeCategory === cat.value
                            ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20'
                            : 'bg-white dark:bg-[#111] border border-gray-200 dark:border-[#333] text-gray-600 dark:text-gray-400 hover:border-indigo-400 dark:hover:border-indigo-600'
                            }`}
                    >
                        {cat.label}
                    </button>
                ))}
            </div>

            {/* ARTICLES GRID */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                {sortedArticles.map(article => (
                    <div
                        key={article.id}
                        onClick={() => setSelectedArticle(article)}
                        className="group bg-white dark:bg-[#111] border border-gray-200 dark:border-[#333] hover:border-indigo-400 dark:hover:border-indigo-600 rounded-xl p-5 cursor-pointer shadow-sm hover:shadow-md transition-all duration-200 relative overflow-hidden"
                    >
                        {/* Featured badge */}
                        {article.is_featured && (
                            <div className="absolute top-3 right-3">
                                <Star size={16} className="text-yellow-500 fill-yellow-500" />
                            </div>
                        )}

                        <div className="flex justify-between items-start mb-4">
                            <div className="p-3 bg-gray-50 dark:bg-[#1A1A1A] rounded-xl border border-gray-100 dark:border-[#222] text-3xl">
                                {article.emoji || '📚'}
                            </div>

                            {/* Admin actions */}
                            {isAdmin && (
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={(e) => handleOpenEditor(article, e)}
                                        className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                                        title="Редактировать"
                                    >
                                        <Edit3 size={16} />
                                    </button>
                                    <button
                                        onClick={(e) => handleDelete(article.id, e)}
                                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                        title="Удалить"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            )}
                        </div>

                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors line-clamp-2">
                            {getLocalizedContent(article, 'title')}
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 mb-4">
                            {getLocalizedContent(article, 'description')}
                        </p>

                        {/* Tags */}
                        {article.tags && article.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mb-4">
                                {(lang === 'ua' && article.tags_ua?.length > 0 ? article.tags_ua : article.tags).slice(0, 3).map((tag, idx) => (
                                    <span
                                        key={idx}
                                        className="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 text-[10px] font-bold rounded-full"
                                    >
                                        {tag}
                                    </span>
                                ))}
                                {(lang === 'ua' && article.tags_ua?.length > 0 ? article.tags_ua : article.tags).length > 3 && (
                                    <span className="px-2 py-0.5 text-gray-400 text-[10px]">
                                        +{(lang === 'ua' && article.tags_ua?.length > 0 ? article.tags_ua : article.tags).length - 3}
                                    </span>
                                )}
                            </div>
                        )}

                        <div className="flex items-center justify-between">
                            <span className="text-[10px] text-gray-400 flex items-center gap-1">
                                <Clock size={12} /> {article.read_time || '5 min'}
                            </span>
                            <div className="flex items-center text-indigo-600 dark:text-indigo-400 text-xs font-bold uppercase tracking-wider">
                                {lang === 'ua' ? 'Читати' : 'Читать'} <ChevronRight size={14} className="ml-1 group-hover:translate-x-1 transition-transform" />
                            </div>
                        </div>
                    </div>
                ))}

                {sortedArticles.length === 0 && (
                    <div className="col-span-full py-16 text-center">
                        <GraduationCap size={48} className="mx-auto text-gray-300 dark:text-gray-700 mb-4" />
                        <p className="text-gray-400 text-sm">
                            {search || activeCategory !== 'all' ? (lang === 'ua' ? 'Статті не знайдені' : 'Статьи не найдены') : (lang === 'ua' ? 'Додайте першу статтю' : 'Добавьте первую статью')}
                        </p>
                    </div>
                )}
            </div>

            {/* MODAL: ARTICLE VIEW */}
            <AnimatePresence>
                {selectedArticle && (
                    <ArticleViewModal
                        article={selectedArticle}
                        lang={lang}
                        onClose={() => setSelectedArticle(null)}
                    />
                )}
            </AnimatePresence>

            {/* MODAL: EDITOR */}
            <AnimatePresence>
                {isEditorOpen && (
                    <ArticleEditorModal
                        article={editingArticle}
                        user={user}
                        onClose={() => setIsEditorOpen(false)}
                        onSave={() => {
                            setIsEditorOpen(false);
                            fetchAllData(true);
                        }}
                    />
                )}
            </AnimatePresence>

            {/* SHARE MODAL */}
            {isShareModalOpen && (
                <ShareModal
                    pageKey="learning"
                    pageTitle="Центр Обучения"
                    onClose={() => setIsShareModalOpen(false)}
                />
            )}
        </div>
    );
};

// --- ARTICLE VIEW MODAL (WIDER - 80%) ---
const ArticleViewModal = ({ article, onClose, lang = 'ru' }) => {
    // Determine content based on language
    const title = (lang === 'ua' && article.title_ua) ? article.title_ua : article.title;
    const description = (lang === 'ua' && article.description_ua) ? article.description_ua : article.description;
    const content = (lang === 'ua' && article.content_ua) ? article.content_ua : article.content;
    const tags = (lang === 'ua' && article.tags_ua?.length > 0) ? article.tags_ua : article.tags;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white dark:bg-[#09090b] w-[90%] max-w-5xl max-h-[90vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col border border-gray-200 dark:border-[#333]"
            >
                {/* HEADER */}
                <div className="p-6 border-b border-gray-100 dark:border-[#222] flex justify-between items-start bg-gray-50 dark:bg-[#111]">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-white dark:bg-[#222] rounded-xl border border-gray-200 dark:border-[#333] shadow-sm text-3xl">
                            {article.emoji || '📚'}
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white">{title}</h2>
                            <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                                {article.author_name && <span>👤 {article.author_name}</span>}
                                {article.read_time && <span className="flex items-center gap-1"><Clock size={12} /> {article.read_time}</span>}
                            </div>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-200 dark:hover:bg-[#222] rounded-full text-gray-500 transition-colors">
                        <X size={24} />
                    </button>
                </div>

                {/* SCROLLABLE CONTENT */}
                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                    {/* Tags */}
                    {tags && tags.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-6">
                            {tags.map((tag, idx) => (
                                <span
                                    key={idx}
                                    className="px-3 py-1 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 text-xs font-semibold rounded-full"
                                >
                                    #{tag}
                                </span>
                            ))}
                        </div>
                    )}

                    {/* Description */}
                    {description && (
                        <p className="text-gray-600 dark:text-gray-400 mb-6 pb-6 border-b border-gray-100 dark:border-[#222] text-lg">
                            {description}
                        </p>
                    )}

                    {/* Content with Markdown rendering */}
                    <MarkdownContent content={content} />
                </div>
            </motion.div>
        </div>
    );
};

// --- ARTICLE EDITOR MODAL (WIDER - 80%) ---
const ArticleEditorModal = ({ article, user, onClose, onSave }) => {
    const [loading, setLoading] = useState(false);
    const textareaRef = useRef(null);
    const [lang, setLang] = useState('ru'); // 'ru' or 'ua'

    const [form, setForm] = useState({
        // RU Fields
        title: article?.title || '',
        emoji: article?.emoji || '📚',
        description: article?.description || '',
        content: article?.content || '',

        // Settings
        category: article?.category || 'general',
        tags: article?.tags?.join(', ') || '',
        is_featured: article?.is_featured || false,
        read_time: article?.read_time || '5 min',

        // UA Fields
        title_ua: article?.title_ua || '',
        description_ua: article?.description_ua || '',
        content_ua: article?.content_ua || '',
        tags_ua: article?.tags_ua?.join(', ') || '',
    });

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setForm({ ...form, [name]: type === 'checkbox' ? checked : value });
    };

    const handleContentChange = (value) => {
        if (lang === 'ru') {
            setForm({ ...form, content: value });
        } else {
            setForm({ ...form, content_ua: value });
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.title.trim() && !form.title_ua.trim()) return alert('Введите название статьи');

        setLoading(true);
        try {
            const tagsArray = form.tags
                .split(',')
                .map(t => t.trim())
                .filter(Boolean);

            const tagsArrayUA = form.tags_ua
                .split(',')
                .map(t => t.trim())
                .filter(Boolean);

            const payload = {
                title: form.title,
                emoji: form.emoji,
                description: form.description,
                content: form.content,
                category: form.category,
                tags: tagsArray,
                is_featured: form.is_featured,
                read_time: form.read_time,
                author_id: user?.id,
                author_name: user?.name || 'Unknown',
                updated_at: new Date().toISOString(),
                // UA
                title_ua: form.title_ua,
                description_ua: form.description_ua,
                content_ua: form.content_ua,
                tags_ua: tagsArrayUA,
            };

            if (article?.id) {
                await supabase.from('knowledge_learning').update(payload).eq('id', article.id);
            } else {
                await supabase.from('knowledge_learning').insert([payload]);
            }

            onSave();
        } catch (error) {
            console.error(error);
            alert('Ошибка при сохранении');
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
                className="bg-white dark:bg-[#09090b] w-[90%] max-w-5xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col border border-gray-200 dark:border-[#333]"
            >
                <div className="p-6 border-b border-gray-100 dark:border-[#222] flex justify-between items-center bg-gray-50 dark:bg-[#111]">
                    <div className="flex items-center gap-4">
                        <h2 className="text-xl font-bold dark:text-white">
                            {article ? 'Редактировать статью' : 'Новая статья'}
                        </h2>
                        {/* Language Toggle */}
                        <div className="flex bg-gray-200 dark:bg-[#222] rounded-lg p-1">
                            <button
                                onClick={() => setLang('ru')}
                                className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${lang === 'ru' ? 'bg-white dark:bg-[#333] shadow text-blue-600' : 'text-gray-500'}`}
                            >
                                RU 🇷🇺
                            </button>
                            <button
                                onClick={() => setLang('ua')}
                                className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${lang === 'ua' ? 'bg-white dark:bg-[#333] shadow text-blue-600' : 'text-gray-500'}`}
                            >
                                UA 🇺🇦
                            </button>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-200 dark:hover:bg-[#222] rounded-full text-gray-500"><X size={24} /></button>
                </div>

                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 custom-scrollbar space-y-5">

                    {/* Title & Emoji */}
                    <div className="grid grid-cols-6 gap-4">
                        <div className="col-span-5">
                            <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wider">
                                Название {lang === 'ua' && '(UA)'}
                            </label>
                            <input
                                required={lang === 'ru'}
                                name={lang === 'ru' ? 'title' : 'title_ua'}
                                value={lang === 'ru' ? form.title : form.title_ua}
                                onChange={handleChange}
                                className="w-full bg-gray-50 dark:bg-[#1A1A1A] border border-gray-200 dark:border-[#333] rounded-lg px-4 py-2.5 text-sm dark:text-white outline-none focus:border-indigo-500"
                                placeholder={lang === 'ru' ? "Как продавать эффективно..." : "Як продавати ефективно..."}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wider">Emoji</label>
                            <select
                                name="emoji"
                                value={form.emoji}
                                onChange={handleChange}
                                className="w-full bg-gray-50 dark:bg-[#1A1A1A] border border-gray-200 dark:border-[#333] rounded-lg px-3 py-2.5 text-lg dark:text-white outline-none focus:border-indigo-500 cursor-pointer"
                            >
                                {EMOJI_OPTIONS.map(em => (
                                    <option key={em} value={em}>{em}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Category & Read Time (Shared) */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wider">Категория</label>
                            <select
                                name="category"
                                value={form.category}
                                onChange={handleChange}
                                className="w-full bg-gray-50 dark:bg-[#1A1A1A] border border-gray-200 dark:border-[#333] rounded-lg px-4 py-2.5 text-sm dark:text-white outline-none focus:border-indigo-500 cursor-pointer"
                            >
                                {CATEGORIES.map(cat => (
                                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wider">Время чтения</label>
                            <input
                                name="read_time"
                                value={form.read_time}
                                onChange={handleChange}
                                className="w-full bg-gray-50 dark:bg-[#1A1A1A] border border-gray-200 dark:border-[#333] rounded-lg px-4 py-2.5 text-sm dark:text-white outline-none focus:border-indigo-500"
                                placeholder="5 min"
                            />
                        </div>
                    </div>

                    {/* Tags */}
                    <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wider">
                            Теги {lang === 'ua' && '(UA)'}
                        </label>
                        <p className="text-[10px] text-gray-400 mb-1">Через запятую: продажи, скрипты, новичкам</p>
                        <input
                            name={lang === 'ru' ? 'tags' : 'tags_ua'}
                            value={lang === 'ru' ? form.tags : form.tags_ua}
                            onChange={handleChange}
                            className="w-full bg-gray-50 dark:bg-[#1A1A1A] border border-gray-200 dark:border-[#333] rounded-lg px-4 py-2.5 text-sm dark:text-white outline-none focus:border-indigo-500"
                            placeholder="продажи, скрипты, новички (через запятую)"
                        />
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wider">
                            Краткое описание {lang === 'ua' && '(UA)'}
                        </label>
                        <textarea
                            name={lang === 'ru' ? 'description' : 'description_ua'}
                            value={lang === 'ru' ? form.description : form.description_ua}
                            onChange={handleChange}
                            rows={3}
                            className="w-full bg-gray-50 dark:bg-[#1A1A1A] border border-gray-200 dark:border-[#333] rounded-lg px-4 py-2.5 text-sm dark:text-white outline-none focus:border-indigo-500 resize-none"
                            placeholder={lang === 'ru' ? "О чем эта статья..." : "Про що ця стаття..."}
                        />
                    </div>

                    {/* Content Editor */}
                    <div className="flex-1 flex flex-col min-h-[400px]">
                        <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wider">
                            Содержание статьи {lang === 'ua' && '(UA)'} (Markdown)
                        </label>
                        <div className="flex-1 flex flex-col border border-gray-200 dark:border-[#333] rounded-lg overflow-hidden bg-gray-50 dark:bg-[#1A1A1A]">
                            <RichTextToolbar
                                textareaRef={textareaRef}
                                value={lang === 'ru' ? form.content : form.content_ua}
                                onChange={handleContentChange}
                            />
                            <textarea
                                ref={textareaRef}
                                name={lang === 'ru' ? 'content' : 'content_ua'}
                                value={lang === 'ru' ? form.content : form.content_ua}
                                onChange={handleChange}
                                className="flex-1 w-full p-4 bg-transparent outline-none text-sm dark:text-white font-mono resize-none leading-relaxed"
                                placeholder="# Заголовок..."
                            />
                        </div>
                    </div>

                    {/* Featured */}
                    <label className="flex items-center gap-3 cursor-pointer p-3 bg-yellow-50 dark:bg-yellow-900/10 rounded-lg border border-yellow-200 dark:border-yellow-900/30">
                        <input
                            type="checkbox"
                            name="is_featured"
                            checked={form.is_featured}
                            onChange={handleChange}
                            className="w-5 h-5 rounded border-gray-300 text-yellow-600 focus:ring-yellow-500"
                        />
                        <div>
                            <span className="text-sm font-semibold text-yellow-800 dark:text-yellow-300 flex items-center gap-1">
                                <Star size={14} className="text-yellow-500" /> Избранная статья
                            </span>
                            <p className="text-[10px] text-yellow-600/80 dark:text-yellow-400/60">Будет отображаться первой в списке</p>
                        </div>
                    </label>

                </form>

                <div className="p-6 border-t border-gray-100 dark:border-[#222] bg-gray-50 dark:bg-[#111]">
                    <button
                        onClick={handleSubmit}
                        disabled={loading}
                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl shadow-lg flex items-center justify-center gap-2 transition-transform active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        {loading ? <Loader2 className="animate-spin" /> : <><Save size={20} /> Сохранить статью</>}
                    </button>
                </div>
            </motion.div>
        </div>
    );
};

export default LearningCenterPage;
