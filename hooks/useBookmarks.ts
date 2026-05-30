import { useState, useEffect } from 'react';
import { useToast } from '../context/ToastContext';

const STORAGE_KEY_BOOKMARKS = 'paqtebi_bookmarks';

export const useBookmarks = () => {
  const [bookmarkedIds, setBookmarkedIds] = useState<string[]>([]);
  const { addToast } = useToast();

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY_BOOKMARKS);
    if (saved) {
      setBookmarkedIds(JSON.parse(saved));
    }
  }, []);

  const isBookmarked = (id: string) => bookmarkedIds.includes(id);

  const toggleBookmark = (id: string) => {
    let newBookmarks;
    if (bookmarkedIds.includes(id)) {
      newBookmarks = bookmarkedIds.filter(bId => bId !== id);
      addToast('სტატია ამოიშალა შენახულებიდან', 'info');
    } else {
      newBookmarks = [...bookmarkedIds, id];
      addToast('სტატია შეინახა', 'success');
    }
    setBookmarkedIds(newBookmarks);
    localStorage.setItem(STORAGE_KEY_BOOKMARKS, JSON.stringify(newBookmarks));
  };

  return {
    bookmarkedIds,
    isBookmarked,
    toggleBookmark
  };
};