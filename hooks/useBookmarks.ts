import { useState, useEffect, useCallback, useRef } from 'react';
import { useToast } from '../context/ToastContext';

const STORAGE_KEY_BOOKMARKS = 'paqtebi_bookmarks';
const BOOKMARKS_CHANGED_EVENT = 'paqtebi-bookmarks-changed';

const readBookmarks = (): string[] => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_BOOKMARKS);
    if (!saved) return [];

    const parsed = JSON.parse(saved);
    return Array.isArray(parsed)
      ? [...new Set(parsed.filter((id): id is string => typeof id === 'string' && id.length > 0))]
      : [];
  } catch {
    return [];
  }
};

export const useBookmarks = () => {
  const [bookmarkedIds, setBookmarkedIds] = useState<string[]>(readBookmarks);
  const bookmarkedIdsRef = useRef(bookmarkedIds);
  const { addToast } = useToast();

  useEffect(() => {
    bookmarkedIdsRef.current = bookmarkedIds;
  }, [bookmarkedIds]);

  useEffect(() => {
    const syncBookmarks = (ids: string[]) => {
      bookmarkedIdsRef.current = ids;
      setBookmarkedIds(ids);
    };

    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY_BOOKMARKS || event.key === null) {
        syncBookmarks(readBookmarks());
      }
    };

    const handleLocalChange = (event: Event) => {
      const ids = (event as CustomEvent<string[]>).detail;
      syncBookmarks(Array.isArray(ids) ? ids : readBookmarks());
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener(BOOKMARKS_CHANGED_EVENT, handleLocalChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener(BOOKMARKS_CHANGED_EVENT, handleLocalChange);
    };
  }, []);

  const isBookmarked = (id: string) => bookmarkedIds.includes(id);

  const toggleBookmark = useCallback((id: string) => {
    const currentBookmarks = bookmarkedIdsRef.current;
    let newBookmarks: string[];

    if (currentBookmarks.includes(id)) {
      newBookmarks = currentBookmarks.filter(bId => bId !== id);
      addToast('სტატია ამოიშალა შენახულებიდან', 'info');
    } else {
      newBookmarks = [...currentBookmarks, id];
      addToast('სტატია შეინახა', 'success');
    }

    bookmarkedIdsRef.current = newBookmarks;
    setBookmarkedIds(newBookmarks);
    localStorage.setItem(STORAGE_KEY_BOOKMARKS, JSON.stringify(newBookmarks));
    window.dispatchEvent(new CustomEvent<string[]>(BOOKMARKS_CHANGED_EVENT, { detail: newBookmarks }));
  }, [addToast]);

  return {
    bookmarkedIds,
    isBookmarked,
    toggleBookmark
  };
};
