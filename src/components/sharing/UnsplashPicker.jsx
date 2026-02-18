import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, X, AlertTriangle, Loader2, ImageOff, Shuffle } from 'lucide-react';
import { searchPhotos, getRandomPhoto, normalizePhoto, UnsplashRateLimitError } from '../../services/unsplashService';

// Rate limit error modal
const RateLimitModal = ({ onClose }) => (
    <>
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200]" onClick={onClose} />
        <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[201] w-full max-w-sm bg-white dark:bg-[#1A1A1A] rounded-2xl shadow-2xl border border-gray-200 dark:border-[#333] p-6 text-center">
            <div className="w-14 h-14 bg-orange-100 dark:bg-orange-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle size={28} className="text-orange-500" />
            </div>
            <h3 className="font-bold text-base text-gray-900 dark:text-white mb-2">Лимит Unsplash исчерпан</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
                Вы использовали все 50 запросов в час. Попробуйте снова через час или введите URL изображения вручную.
            </p>
            <button
                onClick={onClose}
                className="w-full py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-bold text-sm transition-colors"
            >
                Понятно
            </button>
        </div>
    </>
);

const UnsplashPicker = ({ onSelect, onClose, currentImage }) => {
    const [query, setQuery] = useState('');
    const [photos, setPhotos] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [showRateLimit, setShowRateLimit] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);
    const debounceRef = useRef(null);

    const handleError = (err) => {
        if (err instanceof UnsplashRateLimitError) {
            setShowRateLimit(true);
        } else {
            console.error('Unsplash error:', err);
        }
    };

    const doSearch = useCallback(async (q) => {
        if (!q.trim()) return;
        setIsLoading(true);
        setHasSearched(true);
        try {
            const data = await searchPhotos(q);
            setPhotos((data.results || []).map(normalizePhoto));
        } catch (err) {
            handleError(err);
        } finally {
            setIsLoading(false);
        }
    }, []);

    const handleRandom = async () => {
        setIsLoading(true);
        setHasSearched(true);
        try {
            const photo = await getRandomPhoto(query);
            setPhotos([normalizePhoto(photo)]);
        } catch (err) {
            handleError(err);
        } finally {
            setIsLoading(false);
        }
    };

    // Debounced search on query change
    useEffect(() => {
        if (!query.trim()) {
            setPhotos([]);
            setHasSearched(false);
            return;
        }
        clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => doSearch(query), 600);
        return () => clearTimeout(debounceRef.current);
    }, [query, doSearch]);

    return (
        <>
            {showRateLimit && <RateLimitModal onClose={() => setShowRateLimit(false)} />}

            <div className="flex flex-col h-full">
                {/* Search Bar */}
                <div className="flex gap-2 mb-3">
                    <div className="relative flex-1">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            autoFocus
                            type="text"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && doSearch(query)}
                            placeholder="Поиск фото (nature, space, minimal...)"
                            className="w-full pl-8 pr-3 py-2 bg-gray-100 dark:bg-[#222] border border-gray-200 dark:border-[#333] rounded-lg text-xs text-gray-900 dark:text-white outline-none focus:border-blue-500 transition-colors"
                        />
                    </div>
                    <button
                        onClick={handleRandom}
                        title="Случайное фото"
                        className="px-3 py-2 bg-gray-100 dark:bg-[#222] border border-gray-200 dark:border-[#333] rounded-lg text-gray-600 dark:text-gray-400 hover:text-blue-500 hover:border-blue-400 transition-colors"
                    >
                        <Shuffle size={14} />
                    </button>
                </div>

                {/* Results Grid */}
                <div className="flex-1 overflow-y-auto custom-scrollbar min-h-[200px]">
                    {isLoading ? (
                        <div className="flex items-center justify-center h-40">
                            <Loader2 size={24} className="animate-spin text-blue-500" />
                        </div>
                    ) : photos.length > 0 ? (
                        <div className="grid grid-cols-2 gap-2">
                            {photos.map((photo) => (
                                <button
                                    key={photo.id}
                                    onClick={() => { onSelect(photo); onClose(); }}
                                    className={`relative group rounded-lg overflow-hidden aspect-video border-2 transition-all ${currentImage?.id === photo.id ? 'border-blue-500' : 'border-transparent hover:border-blue-400'}`}
                                >
                                    <img
                                        src={photo.url_thumb}
                                        alt={photo.alt}
                                        className="w-full h-full object-cover"
                                        loading="lazy"
                                    />
                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                                    <div className="absolute bottom-0 left-0 right-0 p-1.5 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                                        <p className="text-white text-[10px] truncate">{photo.photographer}</p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    ) : hasSearched ? (
                        <div className="flex flex-col items-center justify-center h-40 text-gray-400">
                            <ImageOff size={24} className="mb-2" />
                            <p className="text-xs">Ничего не найдено</p>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-40 text-gray-400">
                            <Search size={24} className="mb-2 opacity-40" />
                            <p className="text-xs">Введите запрос для поиска</p>
                            <p className="text-[10px] mt-1 opacity-60">или нажмите 🔀 для случайного фото</p>
                        </div>
                    )}
                </div>

                {/* Unsplash Attribution */}
                <p className="text-[10px] text-gray-400 text-center mt-2">
                    Фото предоставлены{' '}
                    <a href="https://unsplash.com" target="_blank" rel="noopener noreferrer" className="underline hover:text-gray-600">
                        Unsplash
                    </a>
                </p>
            </div>
        </>
    );
};

export default UnsplashPicker;
