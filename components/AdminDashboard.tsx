import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AdInquiry, AdPlacement, Article, AnalyticsData, Poll } from '../types';
import { useArticles } from '../hooks/useArticles';
import { useBreakingNews } from '../hooks/useBreakingNews';
import { useComments } from '../hooks/useComments';
import {
  logoutAdmin,
  getCurrentAdmin,
  listAdminUsers,
  createAdminUser,
  updateAdminUserRole,
  deleteAdminUser,
  AdminUserRecord,
} from '../services/authService';
import { getAdPlacement, getPolls, savePoll, deletePoll, setActivePoll } from '../services/storageService';
import apiService from '../services/apiService';
import {
  Plus, Trash2, Edit2, LogOut, Save, X,
  LayoutDashboard, Monitor, LayoutTemplate, Columns,
  Megaphone, UploadCloud, Image as ImageIcon, Users,
  MessageSquare, BarChart3, FileText, CheckCircle,
  Menu, Search, Bell, TrendingUp, Activity,
  ChevronRight, Eye, ArrowUpRight,
  Shield, Zap, PlayCircle, Radio, Mic, Star, Video
} from 'lucide-react';
import { CATEGORY_GROUPS } from '../config';
import { useToast } from '../context/ToastContext';
import { sanitizeInput } from '../utils/security';
import { normalizeArticleHtml } from '../utils/articleHtml';
import { formatDayMonthYear, getTodayDayMonthYear } from '../utils/dateFormat';
import { LazyImage } from './LazyImage';
import { BrandLogo } from './BrandLogo';
import { LinkedText } from './LinkedText';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';

interface AdminDashboardProps {
  onLogout: () => void;
}

type Tab = 'ANALYTICS' | 'ARTICLES' | 'VIDEO_REPORTS' | 'PODCASTS' | 'INTERESTING' | 'LIVE' | 'ADS' | 'USERS' | 'COMMENTS' | 'POLLS';

const NEWS_PLACEHOLDERS = [
  'https://images.unsplash.com/photo-1504711434969-e33886168f5c?q=80&w=800&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1495020689067-958852a7765e?q=80&w=800&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1526430331032-1ce82989c49a?q=80&w=800&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?q=80&w=800&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1523995462485-3d171b5c8fa9?q=80&w=800&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1432821596592-e2c18b78144f?q=80&w=800&auto=format&fit=crop',
];
const getRandomNewsImage = () => NEWS_PLACEHOLDERS[Math.floor(Math.random() * NEWS_PLACEHOLDERS.length)];

/* â”€â”€ NAV CONFIG â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
const NAV_CONFIG: { tab: Tab; icon: any; label: string; badge?: string }[] = [
  { tab: 'ANALYTICS',     icon: BarChart3,    label: 'áƒ›áƒ˜áƒ›áƒáƒ®áƒ˜áƒšáƒ•áƒ' },
  { tab: 'ARTICLES',      icon: FileText,     label: 'Articles' },
  { tab: 'VIDEO_REPORTS', icon: Video,        label: 'áƒ•áƒ˜áƒ“áƒ”áƒ áƒ áƒ”áƒžáƒáƒ áƒ¢áƒáƒŸáƒ”áƒ‘áƒ˜' },
  { tab: 'PODCASTS',      icon: Mic,          label: 'áƒžáƒáƒ“áƒ™áƒáƒ¡áƒ¢áƒ”áƒ‘áƒ˜' },
  { tab: 'INTERESTING',   icon: Star,         label: 'áƒ¡áƒáƒ˜áƒœáƒ¢áƒ”áƒ áƒ”áƒ¡áƒ' },
  { tab: 'LIVE',          icon: Radio,        label: 'Live Streams' },
  { tab: 'ADS',           icon: Megaphone,    label: 'áƒ áƒ”áƒ™áƒšáƒáƒ›áƒ' },
  { tab: 'USERS',         icon: Users,        label: 'áƒ›áƒáƒ›áƒ®áƒ›áƒáƒ áƒ”áƒ‘áƒšáƒ”áƒ‘áƒ˜' },
  { tab: 'COMMENTS',      icon: MessageSquare,label: 'áƒ™áƒáƒ›áƒ”áƒœáƒ¢áƒáƒ áƒ”áƒ‘áƒ˜' },
  { tab: 'POLLS',         icon: CheckCircle,  label: 'áƒ’áƒáƒ›áƒáƒ™áƒ˜áƒ—áƒ®áƒ•áƒ”áƒ‘áƒ˜' },
];

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onLogout }) => {
  const navigate = useNavigate();
  const { articles, refreshLocalOnly, addArticle, updateArticle, removeArticle } = useArticles();
  const { breakingNews, addTickerItem, removeTickerItem } = useBreakingNews();
  const { comments, removeComment } = useComments();
  const { addToast } = useToast();

  const [activeTab, setActiveTab] = useState<Tab>('ANALYTICS');
  const [users, setUsers] = useState<AdminUserRecord[]>([]);
  const [adminForm, setAdminForm] = useState({ username: '', email: '', password: '', role: 'admin' as AdminUserRecord['role'] });
  const [isLoadingAdmins, setIsLoadingAdmins] = useState(false);
  const [isSavingAdmin, setIsSavingAdmin] = useState(false);
  const currentAdmin = getCurrentAdmin();
  const isOwner = currentAdmin?.role === 'owner';
  const [polls, setPolls] = useState(getPolls());
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [newBreakingText, setNewBreakingText] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [currentArticle, setCurrentArticle] = useState<Partial<Article>>({});
  const [isEditingPoll, setIsEditingPoll] = useState(false);
  const [currentPoll, setCurrentPoll] = useState<Partial<Poll>>({});
  const [currentAd, setCurrentAd] = useState<AdPlacement>(() => getAdPlacement());
  const [adInquiries, setAdInquiries] = useState<AdInquiry[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    refreshLocalOnly();
    apiService.fetchAdPlacement().then(setCurrentAd);
    apiService.fetchAdInquiries().then(setAdInquiries);
  }, []);

  useEffect(() => {
    const refreshAdInquiries = () => {
      apiService.fetchAdInquiries().then(setAdInquiries);
    };

    window.addEventListener('storage', refreshAdInquiries);
    window.addEventListener('paqtebi-ad-inquiry-created', refreshAdInquiries);

    return () => {
      window.removeEventListener('storage', refreshAdInquiries);
      window.removeEventListener('paqtebi-ad-inquiry-created', refreshAdInquiries);
    };
  }, []);

  const getContentTypeForTab = (tab: Tab): Article['contentType'] => {
    if (tab === 'VIDEO_REPORTS' || tab === 'PODCASTS' || tab === 'INTERESTING') return 'video';
    if (tab === 'LIVE') return 'live';
    return 'article';
  };

  const isContentTab = (tab: Tab) => tab === 'ARTICLES' || tab === 'VIDEO_REPORTS' || tab === 'PODCASTS' || tab === 'INTERESTING' || tab === 'LIVE';

  const refreshAdmins = async () => {
    if (!isOwner) return;
    setIsLoadingAdmins(true);
    try {
      setUsers(await listAdminUsers());
    } catch (error) {
      addToast(error instanceof Error ? error.message : 'áƒáƒ“áƒ›áƒ˜áƒœáƒ”áƒ‘áƒ˜áƒ¡ áƒ©áƒáƒ¢áƒ•áƒ˜áƒ áƒ—áƒ•áƒ áƒ•áƒ”áƒ  áƒ›áƒáƒ®áƒ”áƒ áƒ®áƒ“áƒ', 'error');
    } finally {
      setIsLoadingAdmins(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'USERS') {
      refreshAdmins();
    }
  }, [activeTab, isOwner]);

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isOwner) return;
    setIsSavingAdmin(true);
    try {
      await createAdminUser(adminForm);
      setAdminForm({ username: '', email: '', password: '', role: 'admin' });
      await refreshAdmins();
      addToast('áƒáƒ“áƒ›áƒ˜áƒœáƒ˜ áƒ“áƒáƒ”áƒ›áƒáƒ¢áƒ', 'success');
    } catch (error) {
      addToast(error instanceof Error ? error.message : 'áƒáƒ“áƒ›áƒ˜áƒœáƒ˜áƒ¡ áƒ“áƒáƒ›áƒáƒ¢áƒ”áƒ‘áƒ áƒ•áƒ”áƒ  áƒ›áƒáƒ®áƒ”áƒ áƒ®áƒ“áƒ', 'error');
    } finally {
      setIsSavingAdmin(false);
    }
  };

  const handleDeleteAdmin = async (id: string) => {
    if (!isOwner || !window.confirm('áƒ¬áƒáƒ•áƒ¨áƒáƒšáƒáƒ— áƒ”áƒ¡ áƒáƒ“áƒ›áƒ˜áƒœáƒ˜?')) return;
    try {
      await deleteAdminUser(id);
      await refreshAdmins();
      addToast('áƒáƒ“áƒ›áƒ˜áƒœáƒ˜ áƒ¬áƒáƒ˜áƒ¨áƒáƒšáƒ', 'success');
    } catch (error) {
      addToast(error instanceof Error ? error.message : 'áƒáƒ“áƒ›áƒ˜áƒœáƒ˜áƒ¡ áƒ¬áƒáƒ¨áƒšáƒ áƒ•áƒ”áƒ  áƒ›áƒáƒ®áƒ”áƒ áƒ®áƒ“áƒ', 'error');
    }
  };

  const handleAdminRoleChange = async (id: string, role: AdminUserRecord['role']) => {
    if (!isOwner) return;
    try {
      await updateAdminUserRole(id, role);
      await refreshAdmins();
      addToast('áƒ áƒáƒšáƒ˜ áƒ’áƒáƒœáƒáƒ®áƒšáƒ“áƒ', 'success');
    } catch (error) {
      addToast(error instanceof Error ? error.message : 'áƒ áƒáƒšáƒ˜áƒ¡ áƒ¨áƒ”áƒªáƒ•áƒšáƒ áƒ•áƒ”áƒ  áƒ›áƒáƒ®áƒ”áƒ áƒ®áƒ“áƒ', 'error');
    }
  };

  const switchTab = (tab: Tab) => {
    setActiveTab(tab);
    setIsMobileMenuOpen(false);
    if (tab === 'POLLS') setPolls(getPolls());
    if (tab === 'ADS') {
      apiService.fetchAdPlacement().then(setCurrentAd);
      apiService.fetchAdInquiries().then(setAdInquiries);
    }
    if (isContentTab(tab)) {
      setIsEditing(false);
      setCurrentArticle({});
    }
  };

  const handleLogout = () => {
    logoutAdmin();
    addToast('áƒ¡áƒ”áƒ¡áƒ˜áƒ áƒ“áƒáƒ¡áƒ áƒ£áƒšáƒ“áƒ', 'info');
    onLogout();
  };

  /* â”€â”€ ARTICLE HANDLERS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
  const handleCreateNew = (forcedContentType?: Article['contentType']) => {
    const nextContentType = forcedContentType || getContentTypeForTab(activeTab);
    const isLive = nextContentType === 'live';
    const isVideo = nextContentType === 'video';
    
    const getCategoryForTab = (tab: Tab) => {
      if (tab === 'LIVE') return 'áƒšáƒáƒ˜áƒ•áƒ˜';
      if (tab === 'VIDEO_REPORTS') return 'áƒ•áƒ˜áƒ“áƒ”áƒ áƒ áƒ”áƒžáƒáƒ áƒ¢áƒáƒŸáƒ”áƒ‘áƒ˜';
      if (tab === 'PODCASTS') return 'áƒžáƒáƒ“áƒ™áƒáƒ¡áƒ¢áƒ”áƒ‘áƒ˜';
      if (tab === 'INTERESTING') return 'áƒ¡áƒáƒ˜áƒœáƒ¢áƒ”áƒ áƒ”áƒ¡áƒ';
      return 'áƒžáƒáƒšáƒ˜áƒ¢áƒ˜áƒ™áƒ';
    };

    setCurrentArticle({
      id: Date.now().toString(),
      date: getTodayDayMonthYear(),
      imageUrl: '',
      author: 'áƒáƒ“áƒ›áƒ˜áƒœáƒ˜áƒ¡áƒ¢áƒ áƒáƒ¢áƒáƒ áƒ˜',
      layout: 'standard',
      category: getCategoryForTab(activeTab),
      contentType: nextContentType,
      videoProvider: 'youtube',
      isLive,
      liveStatus: isLive ? 'live' : 'scheduled',
      content: '',
    });
    setIsEditing(true);
  };

  const handleEdit = (article: Article) => {
    if (article.contentType === 'video') {
      if (article.category === 'áƒžáƒáƒ“áƒ™áƒáƒ¡áƒ¢áƒ”áƒ‘áƒ˜') setActiveTab('PODCASTS');
      else if (article.category === 'áƒ¡áƒáƒ˜áƒœáƒ¢áƒ”áƒ áƒ”áƒ¡áƒ') setActiveTab('INTERESTING');
      else setActiveTab('VIDEO_REPORTS');
    }
    else if (article.contentType === 'live') setActiveTab('LIVE');
    else setActiveTab('ARTICLES');
    // Store the original ID so handleSave knows to UPDATE instead of INSERT
    setCurrentArticle({ ...article, _originalId: article.id } as any);
    setIsEditing(true);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('áƒœáƒáƒ›áƒ“áƒ•áƒ˜áƒšáƒáƒ“ áƒ’áƒ¡áƒ£áƒ áƒ— áƒ¬áƒáƒ¨áƒšáƒ?')) {
      removeArticle(id);
      addToast('áƒ¡áƒ¢áƒáƒ¢áƒ˜áƒ áƒ¬áƒáƒ˜áƒ¨áƒáƒšáƒ', 'success');
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const layout = currentArticle.layout || 'standard';
    const contentType = currentArticle.contentType || 'article';
    const isVideoType = contentType === 'video' || contentType === 'live';
    const needsArticleBody = layout !== 'hero';
    const hasContent = Boolean(currentArticle.content?.replace(/<[^>]*>/g, '').trim());
    const hasVideoUrl = Boolean(currentArticle.videoUrl?.trim());
    // If _originalId exists, this is an EDIT operation
    const originalId: string | undefined = (currentArticle as any)._originalId;
    const isEditing = Boolean(originalId);

    if (contentType === 'live') {
      if (!currentArticle.title?.trim() || !hasVideoUrl) {
        addToast(!hasVideoUrl ? 'áƒ¨áƒ”áƒáƒ•áƒ¡áƒ”áƒ— áƒšáƒáƒ˜áƒ•áƒ˜áƒ¡ áƒ‘áƒ›áƒ£áƒšáƒ˜' : 'áƒ¨áƒ”áƒáƒ•áƒ¡áƒ”áƒ— áƒ¡áƒáƒ—áƒáƒ£áƒ áƒ˜', 'error');
        return;
      }

      const liveArticle = {
        date: currentArticle.date || getTodayDayMonthYear(),
        author: sanitizeInput(currentArticle.author || 'áƒáƒ“áƒ›áƒ˜áƒœáƒ˜áƒ¡áƒ¢áƒ áƒáƒ¢áƒáƒ áƒ˜'),
        layout,
        title: sanitizeInput(currentArticle.title),
        category: 'áƒšáƒáƒ˜áƒ•áƒ˜',
        contentType: 'live',
        videoUrl: sanitizeInput(currentArticle.videoUrl || ''),
        videoProvider: currentArticle.videoProvider || 'youtube',
        isLive: true,
        liveStatus: currentArticle.liveStatus || 'live',
        imageUrl: '',
        content: '',
        summary: '',
      } as Article;

      try {
        if (isEditing) {
          await updateArticle(originalId!, liveArticle);
        } else {
          await addArticle(liveArticle);
        }
        addToast('áƒšáƒáƒ˜áƒ•áƒ˜ áƒ¬áƒáƒ áƒ›áƒáƒ¢áƒ”áƒ‘áƒ˜áƒ— áƒ¨áƒ”áƒ˜áƒœáƒáƒ®áƒ', 'success');
        setIsEditing(false);
      } catch (err) {
        addToast('áƒšáƒáƒ˜áƒ•áƒ˜áƒ¡ áƒ¨áƒ”áƒœáƒáƒ®áƒ•áƒ áƒ•áƒ”áƒ  áƒ›áƒáƒ®áƒ”áƒ áƒ®áƒ“áƒ', 'error');
      }
      return;
    }

    if (currentArticle.title && (!isVideoType || hasVideoUrl) && (!needsArticleBody || isVideoType || hasContent)) {
      if (!currentArticle.imageUrl && layout !== 'hero') {
        currentArticle.imageUrl = getRandomNewsImage();
      }
      // Remove internal _originalId before saving
      const { _originalId, ...articleData } = currentArticle as any;
      const safeArticle = {
        ...articleData,
        layout,
        imageUrl: currentArticle.imageUrl || '',
        title: sanitizeInput(currentArticle.title),
        summary: sanitizeInput(currentArticle.summary || ''),
        author: sanitizeInput(currentArticle.author || 'Admin'),
        category: sanitizeInput(currentArticle.category || 'áƒ›áƒ—áƒáƒ•áƒáƒ áƒ˜'),
        contentType,
        videoUrl: isVideoType ? sanitizeInput(currentArticle.videoUrl || '') : '',
        videoProvider: isVideoType ? currentArticle.videoProvider || 'youtube' : undefined,
        isLive: Boolean(currentArticle.isLive),
        liveStatus: isVideoType ? (currentArticle.liveStatus || 'scheduled') : undefined,
        content: needsArticleBody
          ? normalizeArticleHtml(currentArticle.content || '')
          : '',
      } as Article;
      try {
        if (isEditing) {
          await updateArticle(originalId!, safeArticle);
        } else {
          await addArticle(safeArticle);
        }
        addToast('áƒ¡áƒ¢áƒáƒ¢áƒ˜áƒ áƒ¬áƒáƒ áƒ›áƒáƒ¢áƒ”áƒ‘áƒ˜áƒ— áƒ¨áƒ”áƒ˜áƒœáƒáƒ®áƒ', 'success');
        setIsEditing(false);
      } catch (err: any) {
        const detail = err?.message || '';
        const msg = detail.includes('column') ? 'DB áƒ¡áƒ¥áƒ”áƒ›áƒ˜áƒ¡ áƒ¨áƒ”áƒªáƒ“áƒáƒ›áƒ â€” áƒ’áƒ—áƒ®áƒáƒ•áƒ— áƒ“áƒáƒ£áƒ™áƒáƒ•áƒ¨áƒ˜áƒ áƒ“áƒ”áƒ— áƒáƒ“áƒ›áƒ˜áƒœáƒ¡'
          : detail.includes('size') || detail.includes('too large') ? 'áƒ¡áƒ£áƒ áƒáƒ—áƒ˜ áƒ«áƒáƒšáƒ˜áƒáƒœ áƒ“áƒ˜áƒ“áƒ˜áƒ â€” áƒ’áƒ—áƒ®áƒáƒ•áƒ— áƒ¨áƒ”áƒáƒ›áƒªáƒ˜áƒ áƒáƒ—'
          : 'áƒ¨áƒ”áƒœáƒáƒ®áƒ•áƒ˜áƒ¡áƒáƒ¡ áƒ›áƒáƒ®áƒ“áƒ áƒ¨áƒ”áƒªáƒ“áƒáƒ›áƒ';
        addToast(msg, 'error');
        console.error('[AdminDashboard] save error:', err);
      }
    } else {
      addToast(isVideoType && !hasVideoUrl ? 'áƒ¨áƒ”áƒáƒ•áƒ¡áƒ”áƒ— áƒ•áƒ˜áƒ“áƒ”áƒáƒ¡/áƒšáƒáƒ˜áƒ•áƒ˜áƒ¡ áƒ‘áƒ›áƒ£áƒšáƒ˜' : needsArticleBody ? 'áƒ¨áƒ”áƒáƒ•áƒ¡áƒ”áƒ— áƒ¡áƒáƒ—áƒáƒ£áƒ áƒ˜ áƒ“áƒ áƒ¡áƒ áƒ£áƒšáƒ˜ áƒ¨áƒ˜áƒœáƒáƒáƒ áƒ¡áƒ˜' : 'áƒ¨áƒ”áƒáƒ•áƒ¡áƒ”áƒ— áƒ‘áƒáƒœáƒ”áƒ áƒ˜áƒ¡ áƒ¡áƒáƒ—áƒáƒ£áƒ áƒ˜', 'error');
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      addToast('áƒ›áƒ®áƒáƒšáƒáƒ“ áƒ¡áƒ£áƒ áƒáƒ—áƒ˜áƒ¡ áƒ¤áƒáƒ˜áƒšáƒ”áƒ‘áƒ˜ áƒ“áƒáƒ¡áƒáƒ¨áƒ•áƒ”áƒ‘áƒ˜áƒ', 'error');
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    const img = new window.Image();

    img.onload = () => {
      // Compress: max 1200x800, JPEG 75%
      const MAX_W = 1200;
      const MAX_H = 800;
      let w = img.naturalWidth;
      let h = img.naturalHeight;

      if (w > MAX_W) { h = Math.round(h * MAX_W / w); w = MAX_W; }
      if (h > MAX_H) { w = Math.round(w * MAX_H / h); h = MAX_H; }

      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, w, h);

      const compressed = canvas.toDataURL('image/jpeg', 0.75);
      URL.revokeObjectURL(objectUrl);
      setCurrentArticle(prev => ({ ...prev, imageUrl: compressed }));
      addToast('áƒ¡áƒ£áƒ áƒáƒ—áƒ˜ áƒáƒ˜áƒ¢áƒ•áƒ˜áƒ áƒ—áƒ (' + Math.round(compressed.length / 1024) + ' KB)', 'success');
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      addToast('áƒ¡áƒ£áƒ áƒáƒ—áƒ˜áƒ¡ áƒ©áƒáƒ¢áƒ•áƒ˜áƒ áƒ—áƒ•áƒ áƒ•áƒ”áƒ  áƒ›áƒáƒ®áƒ”áƒ áƒ®áƒ“áƒ', 'error');
    };

    img.src = objectUrl;
  };

  const handleAdImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      addToast('áƒ›áƒ®áƒáƒšáƒáƒ“ áƒ¡áƒ£áƒ áƒáƒ—áƒ˜áƒ¡ áƒ¤áƒáƒ˜áƒšáƒ”áƒ‘áƒ˜áƒ áƒ“áƒáƒ¨áƒ•áƒ”áƒ‘áƒ£áƒšáƒ˜', 'error');
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    const img = new window.Image();

    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 600;
      canvas.height = 500;
      const ctx = canvas.getContext('2d')!;
      const ratio = Math.max(canvas.width / img.naturalWidth, canvas.height / img.naturalHeight);
      const width = img.naturalWidth * ratio;
      const height = img.naturalHeight * ratio;
      const x = (canvas.width - width) / 2;
      const y = (canvas.height - height) / 2;

      ctx.drawImage(img, x, y, width, height);
      const compressed = canvas.toDataURL('image/webp', 0.85);
      URL.revokeObjectURL(objectUrl);
      setCurrentAd((prev) => ({ ...prev, imageUrl: compressed }));
      addToast('áƒ áƒ”áƒ™áƒšáƒáƒ›áƒ˜áƒ¡ áƒ¡áƒ£áƒ áƒáƒ—áƒ˜ áƒáƒ˜áƒ¢áƒ•áƒ˜áƒ áƒ—áƒ', 'success');
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      addToast('áƒ¡áƒ£áƒ áƒáƒ—áƒ˜áƒ¡ áƒ©áƒáƒ¢áƒ•áƒ˜áƒ áƒ—áƒ•áƒ áƒ•áƒ”áƒ  áƒ›áƒáƒ®áƒ”áƒ áƒ®áƒ“áƒ', 'error');
    };

    img.src = objectUrl;
  };

  const handleSaveAd = async (e: React.FormEvent) => {
    e.preventDefault();

    if (currentAd.active && !currentAd.imageUrl) {
      addToast('áƒáƒ¥áƒ¢áƒ˜áƒ£áƒ áƒ˜ áƒ áƒ”áƒ™áƒšáƒáƒ›áƒ˜áƒ¡áƒ—áƒ•áƒ˜áƒ¡ áƒ¡áƒáƒ­áƒ˜áƒ áƒáƒ áƒ¡áƒ£áƒ áƒáƒ—áƒ˜', 'error');
      return;
    }

    if (currentAd.targetUrl && !/^https?:\/\//i.test(currentAd.targetUrl)) {
      addToast('áƒšáƒ˜áƒœáƒ™áƒ˜ áƒ£áƒœáƒ“áƒ áƒ˜áƒ¬áƒ§áƒ”áƒ‘áƒáƒ“áƒ”áƒ¡ http:// áƒáƒœ https://-áƒ˜áƒ—', 'error');
      return;
    }

    const ad = {
      ...currentAd,
      title: sanitizeInput(currentAd.title || ''),
      targetUrl: sanitizeInput(currentAd.targetUrl || ''),
    };

    const saved = await apiService.saveAdPlacement(ad);
    setCurrentAd(saved || ad);
    window.dispatchEvent(new Event('paqtebi-ad-placement-updated'));
    addToast(saved ? 'áƒ áƒ”áƒ™áƒšáƒáƒ›áƒ áƒ¨áƒ”áƒœáƒáƒ®áƒ£áƒšáƒ˜áƒ' : 'áƒ áƒ”áƒ™áƒšáƒáƒ›áƒ áƒ¨áƒ”áƒœáƒáƒ®áƒ£áƒšáƒ˜áƒ áƒšáƒáƒ™áƒáƒšáƒ£áƒ áƒáƒ“', 'success');
  };

  const handleClearAd = async () => {
    if (!window.confirm('áƒ¬áƒáƒ•áƒ¨áƒáƒšáƒáƒ— áƒ áƒ”áƒ™áƒšáƒáƒ›áƒ˜áƒ¡ áƒáƒ“áƒ’áƒ˜áƒšáƒ˜?')) return;

    await apiService.clearAdPlacement();
    const emptyAd = getAdPlacement();
    setCurrentAd(emptyAd);
    window.dispatchEvent(new Event('paqtebi-ad-placement-updated'));
    addToast('áƒ áƒ”áƒ™áƒšáƒáƒ›áƒ áƒ¬áƒáƒ˜áƒ¨áƒáƒšáƒ', 'success');
  };

  const handleAddBreakingNews = (e: React.FormEvent) => {
    e.preventDefault();
    if (newBreakingText.trim()) {
      addTickerItem(sanitizeInput(newBreakingText.trim()));
      setNewBreakingText('');
      addToast('áƒ¡áƒ˜áƒáƒ®áƒšáƒ” áƒ“áƒáƒ”áƒ›áƒáƒ¢áƒ áƒšáƒ”áƒœáƒ¢áƒáƒ¡', 'success');
    }
  };

  const analytics: AnalyticsData = {
    totalArticles: articles.length,
    totalUsers: users.length,
    totalComments: comments.length,
    totalViews: articles.length * 145 + 500,
  };

  const activeContentType = getContentTypeForTab(activeTab);
  const filteredArticles = articles.filter((a) => {
    const articleContentType = a.contentType || 'article';
    let matchesType = false;
    if (activeTab === 'ARTICLES') matchesType = articleContentType === 'article';
    else if (activeTab === 'LIVE') matchesType = articleContentType === 'live';
    else if (activeTab === 'VIDEO_REPORTS') matchesType = articleContentType === 'video' && a.category === 'áƒ•áƒ˜áƒ“áƒ”áƒ áƒ áƒ”áƒžáƒáƒ áƒ¢áƒáƒŸáƒ”áƒ‘áƒ˜';
    else if (activeTab === 'PODCASTS') matchesType = articleContentType === 'video' && a.category === 'áƒžáƒáƒ“áƒ™áƒáƒ¡áƒ¢áƒ”áƒ‘áƒ˜';
    else if (activeTab === 'INTERESTING') matchesType = articleContentType === 'video' && a.category === 'áƒ¡áƒáƒ˜áƒœáƒ¢áƒ”áƒ áƒ”áƒ¡áƒ';
    else matchesType = !isContentTab(activeTab);
    
    const matchesSearch =
      a.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.category.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesType && matchesSearch;
  });

  const currentLayout = currentArticle.layout || 'standard';
  const currentContentType = currentArticle.contentType || 'article';
  const isVideoType = currentContentType === 'video' || currentContentType === 'live';
  const isLiveContent = currentContentType === 'live';
  const isVideoContent = currentContentType === 'video';
  const isHeroLayout = currentLayout === 'hero';
  const isSidebarLayout = currentLayout === 'sidebar';
  const contentViewTitle =
    activeTab === 'LIVE' ? 'Live Streams' :
    activeTab === 'VIDEO_REPORTS' ? 'áƒ•áƒ˜áƒ“áƒ”áƒ áƒ áƒ”áƒžáƒáƒ áƒ¢áƒáƒŸáƒ”áƒ‘áƒ˜' :
    activeTab === 'PODCASTS' ? 'áƒžáƒáƒ“áƒ™áƒáƒ¡áƒ¢áƒ”áƒ‘áƒ˜' :
    activeTab === 'INTERESTING' ? 'áƒ¡áƒáƒ˜áƒœáƒ¢áƒ”áƒ áƒ”áƒ¡áƒ' :
    'Articles';
    
  const contentViewDescription =
    activeTab === 'LIVE' ? 'áƒ›áƒáƒ áƒ—áƒ”áƒ— áƒžáƒ˜áƒ áƒ“áƒáƒžáƒ˜áƒ áƒ˜ áƒ”áƒ—áƒ”áƒ áƒ˜áƒ¡ áƒ‘áƒ›áƒ£áƒšáƒ”áƒ‘áƒ˜ áƒ“áƒ áƒ¡áƒ¢áƒáƒ¢áƒ£áƒ¡áƒ˜' :
    activeTab === 'VIDEO_REPORTS' ? 'áƒ›áƒáƒ áƒ—áƒ”áƒ— áƒ•áƒ˜áƒ“áƒ”áƒ áƒ áƒ”áƒžáƒáƒ áƒ¢áƒáƒŸáƒ”áƒ‘áƒ˜ áƒ“áƒ áƒáƒ áƒ¥áƒ˜áƒ•áƒ˜' :
    activeTab === 'PODCASTS' ? 'áƒ›áƒáƒ áƒ—áƒ”áƒ— áƒžáƒáƒ“áƒ™áƒáƒ¡áƒ¢áƒ”áƒ‘áƒ˜' :
    activeTab === 'INTERESTING' ? 'áƒ›áƒáƒ áƒ—áƒ”áƒ— áƒ¡áƒáƒ˜áƒœáƒ¢áƒ”áƒ áƒ”áƒ¡áƒ áƒ•áƒ˜áƒ“áƒ”áƒáƒ”áƒ‘áƒ˜' :
    'áƒ›áƒáƒ áƒ—áƒ”áƒ— áƒáƒ®áƒáƒšáƒ˜ áƒáƒ›áƒ‘áƒ”áƒ‘áƒ˜, áƒ›áƒ—áƒáƒ•áƒáƒ áƒ˜ áƒ‘áƒáƒœáƒ”áƒ áƒ˜ áƒ“áƒ áƒžáƒáƒžáƒ£áƒšáƒáƒ áƒ£áƒšáƒ˜ áƒ’áƒ•áƒ”áƒ áƒ“áƒ˜áƒ—áƒ˜ áƒ‘áƒšáƒáƒ™áƒ˜';
    
  const createButtonLabel =
    activeTab === 'LIVE' ? 'New Live Stream' :
    (activeTab === 'VIDEO_REPORTS' || activeTab === 'PODCASTS' || activeTab === 'INTERESTING') ? 'New Video' :
    'New Article';

  const quillModules = {
    toolbar: [
      [{ header: [1, 2, 3, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ list: 'ordered' }, { list: 'bullet' }],
      ['link', 'clean'],
    ],
  };

  const tabLabel = NAV_CONFIG.find((n) => n.tab === activeTab)?.label || '';

  /* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
     LAYOUT
  â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
  return (
    <div className="flex h-screen font-sans" style={{ background: '#f0f2f5' }}>

      {/* â”€â”€ SIDEBAR (Desktop) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <aside
        className="hidden md:flex w-64 flex-col flex-shrink-0 z-20"
        style={{ background: 'linear-gradient(180deg, #0d0d0d 0%, #141414 100%)', borderRight: '1px solid rgba(255,255,255,0.05)' }}
      >
        {/* Logo */}
        <div className="p-6 flex items-center gap-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <BrandLogo className="h-10 w-12 flex-shrink-0" />
          <div>
            <div className="text-white font-black text-base tracking-tight">Paqtebi</div>
            <div className="text-xs text-gray-600 uppercase tracking-widest">Admin</div>
          </div>
        </div>

        {/* Admin badge */}
        <div className="mx-4 mt-4 mb-2 flex items-center gap-2.5 px-3 py-2.5 rounded-xl" style={{ background: 'rgba(220,38,38,0.1)', border: '1px solid rgba(220,38,38,0.15)' }}>
          <Shield size={14} className="text-news-accent flex-shrink-0" />
          <div>
            <div className="text-white text-xs font-semibold">áƒáƒ“áƒ›áƒ˜áƒœáƒ˜áƒ¡áƒ¢áƒ áƒáƒ¢áƒáƒ áƒ˜</div>
            <div className="text-gray-600 text-[10px]">áƒ¡áƒ áƒ£áƒšáƒ˜ áƒ¬áƒ•áƒ“áƒáƒ›áƒ</div>
          </div>
          <div className="ml-auto w-2 h-2 bg-green-400 rounded-full animate-pulse" />
        </div>
        <button
          onClick={() => navigate('/')}
          className="mx-4 mb-3 flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-black uppercase tracking-wide text-white transition-all hover:-translate-y-0.5 hover:border-news-accent hover:bg-news-accent"
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.10)' }}
        >
          <ArrowUpRight size={15} />
          View Site
        </button>

        {/* Nav */}
        <nav className="flex-1 py-3 overflow-y-auto">
          <div className="px-4 py-2 text-[10px] text-gray-700 uppercase tracking-widest font-bold">áƒ›áƒ”áƒœáƒ˜áƒ£</div>
          {NAV_CONFIG.map(({ tab, icon: Icon, label }) => (
            <button
              key={tab}
              onClick={() => switchTab(tab)}
              className={`admin-nav-item w-full text-left ${activeTab === tab ? 'active' : ''}`}
            >
              <Icon size={17} className="flex-shrink-0" />
              <span>{label}</span>
              {activeTab === tab && <ChevronRight size={14} className="ml-auto text-news-accent opacity-60" />}
            </button>
          ))}
        </nav>

        {/* Logout */}
        <div className="p-4" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-sm font-medium text-gray-500 hover:text-red-400 transition-all"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}
          >
            <LogOut size={16} />
            áƒ¡áƒ˜áƒ¡áƒ¢áƒ”áƒ›áƒ˜áƒ“áƒáƒœ áƒ’áƒáƒ¡áƒ•áƒšáƒ
          </button>
        </div>
      </aside>

      {/* â”€â”€ MOBILE TOP BAR â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div
        className="md:hidden fixed top-0 left-0 right-0 z-50 flex justify-between items-center px-4 py-3"
        style={{ background: '#0d0d0d', borderBottom: '1px solid rgba(255,255,255,0.06)' }}
      >
        <div className="flex items-center gap-2.5">
          <BrandLogo className="h-8 w-10 flex-shrink-0" />
          <span className="text-white font-bold text-sm">Paqtebi Admin</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-news-accent"
          >
            <ArrowUpRight size={14} />
            Site
          </button>
          <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="text-gray-400 hover:text-white p-1">
            {isMobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-40 pt-14" style={{ background: '#0d0d0d' }}>
          <nav className="p-4 space-y-1">
            {NAV_CONFIG.map(({ tab, icon: Icon, label }) => (
              <button
                key={tab}
                onClick={() => switchTab(tab)}
                className={`admin-nav-item w-full text-left ${activeTab === tab ? 'active' : ''}`}
              >
                <Icon size={17} />
                <span>{label}</span>
              </button>
            ))}
            <button onClick={handleLogout} className="admin-nav-item w-full text-left text-red-500">
              <LogOut size={17} />
              áƒ¡áƒ˜áƒ¡áƒ¢áƒ”áƒ›áƒ˜áƒ“áƒáƒœ áƒ’áƒáƒ¡áƒ•áƒšáƒ
            </button>
          </nav>
        </div>
      )}

      {/* â”€â”€ MAIN â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <main className="flex-1 flex flex-col overflow-hidden pt-14 md:pt-0">

        {/* Top Bar */}
        <header className="bg-white flex-shrink-0 flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div>
            <h1 className="text-xl font-bold text-gray-900">{tabLabel}</h1>
            <p className="text-xs text-gray-400 mt-0.5">
              {new Date().toLocaleDateString('ka-GE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/')}
              className="hidden sm:flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-xs font-black uppercase tracking-wide text-gray-700 shadow-sm transition-all hover:-translate-y-0.5 hover:border-news-accent hover:bg-news-accent hover:text-white"
            >
              <ArrowUpRight size={15} />
              View Site
            </button>
            <div className="hidden md:flex items-center gap-2 px-3 py-2 rounded-xl text-sm" style={{ background: '#f8fafc', border: '1.5px solid #e5e7eb' }}>
              <Search size={15} className="text-gray-400" />
              <input
                type="text"
                placeholder="áƒ«áƒ”áƒ‘áƒœáƒ..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-transparent outline-none text-gray-700 w-48 text-sm"
                style={{ fontFamily: 'Noto Sans Georgian, sans-serif' }}
              />
            </div>
            <button className="relative w-9 h-9 flex items-center justify-center rounded-xl hover:bg-gray-100 transition-colors text-gray-500">
              <Bell size={17} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-news-accent rounded-full" />
            </button>
            <div className="w-9 h-9 bg-gradient-to-br from-news-accent to-red-700 rounded-xl flex items-center justify-center text-white text-sm font-bold cursor-pointer shadow-sm">
              A
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8">

          {/* â”€â”€ ANALYTICS TAB â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
          {activeTab === 'ANALYTICS' && (
            <div className="space-y-8 animate-fade-up">
              {/* Stat Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 stagger">
                {[
                  { label: 'áƒ¡áƒ¢áƒáƒ¢áƒ˜áƒ”áƒ‘áƒ˜', value: analytics.totalArticles, icon: FileText, color: '#3b82f6', bg: '#eff6ff', change: '+12%', up: true },
                  { label: 'áƒ›áƒáƒ›áƒ®áƒ›áƒáƒ áƒ”áƒ‘áƒšáƒ”áƒ‘áƒ˜', value: analytics.totalUsers, icon: Users, color: '#8b5cf6', bg: '#f5f3ff', change: '+5%', up: true },
                  { label: 'áƒ™áƒáƒ›áƒ”áƒœáƒ¢áƒáƒ áƒ”áƒ‘áƒ˜', value: analytics.totalComments, icon: MessageSquare, color: '#f59e0b', bg: '#fffbeb', change: '0%', up: false },
                  { label: 'áƒœáƒáƒ®áƒ•áƒ”áƒ‘áƒ˜', value: analytics.totalViews.toLocaleString(), icon: Eye, color: '#10b981', bg: '#f0fdf4', change: '+24%', up: true },
                ].map((stat, i) => (
                  <div key={i} className="stat-card animate-fade-up">
                    <div className="flex items-start justify-between mb-4">
                      <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: stat.bg, color: stat.color }}>
                        <stat.icon size={20} />
                      </div>
                      <span className={`badge text-xs font-bold ${stat.up ? 'badge-green' : 'bg-gray-100 text-gray-500'}`}>
                        {stat.up ? 'â†‘' : 'â†’'} {stat.change}
                      </span>
                    </div>
                    <div className="text-3xl font-black text-gray-900 mb-1">{stat.value}</div>
                    <div className="text-sm text-gray-500">{stat.label}</div>
                  </div>
                ))}
              </div>

              {/* Quick actions */}
              <div>
                <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4">áƒ¡áƒ¬áƒ áƒáƒ¤áƒ˜ áƒ›áƒáƒ¥áƒ›áƒ”áƒ“áƒ”áƒ‘áƒ”áƒ‘áƒ˜</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {[
                    { icon: Plus, label: 'áƒáƒ®áƒáƒšáƒ˜ áƒ¡áƒ¢áƒáƒ¢áƒ˜áƒ', desc: 'áƒ’áƒáƒ›áƒáƒáƒ¥áƒ•áƒ”áƒ§áƒœáƒ” áƒáƒ®áƒáƒšáƒ˜ áƒ›áƒáƒ¡áƒáƒšáƒ', action: () => { switchTab('ARTICLES'); handleCreateNew('article'); }, color: '#dc2626', bg: '#fef2f2' },
                    { icon: Users, label: 'áƒ›áƒáƒ›áƒ®áƒ›áƒáƒ áƒ”áƒ‘áƒšáƒ”áƒ‘áƒ˜', desc: 'áƒœáƒáƒ®áƒ” áƒ“áƒáƒ áƒ”áƒ’áƒ˜áƒ¡áƒ¢áƒ áƒ˜áƒ áƒ”áƒ‘áƒ£áƒšáƒ”áƒ‘áƒ˜', action: () => switchTab('USERS'), color: '#8b5cf6', bg: '#f5f3ff' },
                    { icon: Activity, label: 'Breaking News', desc: 'áƒ’áƒáƒœáƒáƒáƒ®áƒšáƒ” áƒáƒ®áƒáƒšáƒ˜ áƒáƒ›áƒ‘áƒ”áƒ‘áƒ˜', action: () => switchTab('ARTICLES'), color: '#f59e0b', bg: '#fffbeb' },
                  ].map((item, i) => (
                    <button
                      key={i}
                      onClick={item.action}
                      className="stat-card text-left group hover:scale-[1.02] transition-transform"
                    >
                      <div className="flex items-center gap-4 mb-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: item.bg, color: item.color }}>
                          <item.icon size={18} />
                        </div>
                        <ArrowUpRight size={16} className="ml-auto text-gray-300 group-hover:text-gray-500 transition-colors" />
                      </div>
                      <div className="font-bold text-gray-800 text-sm">{item.label}</div>
                      <div className="text-xs text-gray-400 mt-0.5">{item.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Recent articles */}
              <div className="bg-white rounded-2xl overflow-hidden" style={{ border: '1px solid #e5e7eb' }}>
                <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <div className="flex items-center gap-2">
                    <TrendingUp size={16} className="text-news-accent" />
                    <h3 className="font-bold text-gray-800">áƒ‘áƒáƒšáƒ áƒ¡áƒ¢áƒáƒ¢áƒ˜áƒ”áƒ‘áƒ˜</h3>
                  </div>
                  <button onClick={() => switchTab('ARTICLES')} className="text-xs text-news-accent font-bold hover:underline flex items-center gap-1">
                    áƒ§áƒ•áƒ”áƒšáƒ <ChevronRight size={13} />
                  </button>
                </div>
                <div className="divide-y divide-gray-50">
                  {articles.slice(0, 5).map((article) => (
                    <div key={article.id} className="flex items-center gap-4 px-6 py-3 hover:bg-gray-50 transition-colors">
                      <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                        {article.imageUrl && <LazyImage src={article.imageUrl} alt={article.title} className="w-full h-full" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-gray-800 truncate">{article.title}</div>
                        <div className="text-xs text-gray-400">{article.category} Â· {formatDayMonthYear(article.date)}</div>
                      </div>
                      <span className={`badge ${article.layout === 'hero' ? 'badge-hero' : article.layout === 'sidebar' ? 'badge-sidebar' : 'badge-feed'}`}>
                        {article.layout === 'hero' ? 'áƒ‘áƒáƒœáƒ”áƒ áƒ˜' : article.layout === 'sidebar' ? 'áƒ’áƒ•áƒ”áƒ áƒ“áƒ˜' : 'áƒ¡áƒ˜áƒáƒ®áƒšáƒ”'}
                      </span>
                    </div>
                  ))}
                  {articles.length === 0 && (
                    <div className="py-12 text-center text-gray-400 text-sm">áƒ¡áƒ¢áƒáƒ¢áƒ˜áƒ”áƒ‘áƒ˜ áƒáƒ  áƒáƒ áƒ˜áƒ¡</div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* â”€â”€ CONTENT MANAGEMENT TABS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
          {isContentTab(activeTab) && (
            isEditing ? (
              /* â”€â”€ ARTICLE EDITOR â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
              <div className="bg-white rounded-2xl overflow-hidden animate-slide-right" style={{ border: '1px solid #e5e7eb' }}>
                <div className="flex items-center justify-between px-8 py-5" style={{ borderBottom: '1px solid #f3f4f6', background: '#fafafa' }}>
                  <div>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-red-50 text-news-accent flex items-center justify-center">
                        {isLiveContent ? <Radio size={19} /> : isVideoContent ? <PlayCircle size={19} /> : isHeroLayout ? <Monitor size={19} /> : isSidebarLayout ? <Columns size={19} /> : <LayoutTemplate size={19} />}
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-gray-900">
                          {isLiveContent ? 'Live Stream-áƒ˜áƒ¡ áƒ›áƒáƒ áƒ—áƒ•áƒ' : isVideoContent ? 'áƒ•áƒ˜áƒ“áƒ”áƒ / áƒáƒ áƒ¥áƒ˜áƒ•áƒ˜áƒ¡ áƒ›áƒáƒ¡áƒáƒšáƒ' : isHeroLayout ? 'áƒ›áƒ—áƒáƒ•áƒáƒ áƒ˜ áƒ‘áƒáƒœáƒ”áƒ áƒ˜áƒ¡ áƒ›áƒáƒ áƒ—áƒ•áƒ' : isSidebarLayout ? 'áƒ’áƒ•áƒ”áƒ áƒ“áƒ˜áƒ—áƒ˜ áƒ‘áƒšáƒáƒ™áƒ˜áƒ¡ áƒ›áƒáƒ¡áƒáƒšáƒ' : 'áƒáƒ®áƒáƒšáƒ˜ áƒáƒ›áƒ‘áƒ˜áƒ¡ áƒ áƒ”áƒ“áƒáƒ¥áƒ¢áƒ˜áƒ áƒ”áƒ‘áƒ'}
                        </h3>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {isLiveContent ? 'áƒ¡áƒáƒ­áƒ˜áƒ áƒáƒ áƒ›áƒ®áƒáƒšáƒáƒ“ áƒ¡áƒáƒ—áƒáƒ£áƒ áƒ˜, live URL áƒ“áƒ áƒ¡áƒ¢áƒáƒ¢áƒ£áƒ¡áƒ˜' : isVideoContent ? 'áƒ“áƒáƒáƒ›áƒáƒ¢áƒ”áƒ— áƒ•áƒ˜áƒ“áƒ”áƒáƒ¡ áƒ‘áƒ›áƒ£áƒšáƒ˜, áƒáƒ¦áƒ¬áƒ”áƒ áƒ áƒ“áƒ áƒ¡áƒáƒ­áƒ˜áƒ áƒ áƒ¢áƒ”áƒ¥áƒ¡áƒ¢áƒ˜' : isHeroLayout ? 'áƒ¨áƒ”áƒáƒ•áƒ¡áƒ”áƒ— áƒ›áƒ®áƒáƒšáƒáƒ“ áƒ‘áƒáƒœáƒ”áƒ áƒ˜áƒ¡ áƒ¡áƒáƒ—áƒáƒ£áƒ áƒ˜ áƒ“áƒ áƒ¡áƒ£áƒ áƒáƒ—áƒ˜' : 'áƒ¨áƒ”áƒáƒ•áƒ¡áƒ”áƒ— áƒ¡áƒ¢áƒáƒ¢áƒ˜áƒ˜áƒ¡áƒ—áƒ•áƒ˜áƒ¡ áƒ¡áƒáƒ­áƒ˜áƒ áƒ áƒ•áƒ”áƒšáƒ”áƒ‘áƒ˜'}
                        </p>
                      </div>
                    </div>
                  </div>
                  <button onClick={() => setIsEditing(false)} className="btn-ghost p-2 text-gray-400 hover:text-red-500">
                    <X size={20} />
                  </button>
                </div>

                <form onSubmit={handleSave} className="p-8 space-y-8">
                  {/* Layout selector */}
                  {activeTab === 'ARTICLES' && currentContentType === 'article' && (
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-3">áƒ›áƒáƒ¡áƒáƒšáƒ˜áƒ¡ áƒ¢áƒ˜áƒžáƒ˜</label>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                      {[
                        { id: 'hero', icon: Monitor, label: 'áƒ›áƒ—áƒáƒ•áƒáƒ áƒ˜ áƒ‘áƒáƒœáƒ”áƒ áƒ˜', desc: 'áƒ–áƒ”áƒ“áƒ áƒ“áƒ˜áƒ“áƒ˜ áƒ¡áƒ¢áƒáƒ¢áƒ˜áƒ' },
                        { id: 'standard', icon: LayoutTemplate, label: 'áƒ‘áƒáƒšáƒ áƒ¡áƒ˜áƒáƒ®áƒšáƒ”áƒ”áƒ‘áƒ˜', desc: 'áƒ©áƒ•áƒ”áƒ£áƒšáƒ”áƒ‘áƒ áƒ˜áƒ•áƒ˜ áƒ¡áƒ¢áƒáƒ¢áƒ˜áƒ' },
                        { id: 'sidebar', icon: Columns, label: 'áƒ’áƒ•áƒ”áƒ áƒ“áƒ˜áƒ—áƒ˜ áƒ‘áƒšáƒáƒ™áƒ˜', desc: 'áƒ›áƒáƒ áƒ¯áƒ•áƒ”áƒœáƒ áƒ¡áƒ•áƒ”áƒ¢áƒ˜' },
                      ].map(({ id, icon: Icon, label, desc }) => (
                        <label
                          key={id}
                          onClick={() => setCurrentArticle({ ...currentArticle, layout: id as any })}
                          className={`cursor-pointer rounded-xl p-5 flex items-center gap-4 text-left transition-all duration-200 min-h-[104px] ${
                            currentLayout === id
                              ? 'bg-red-50 border-2 border-news-accent shadow-sm'
                              : 'border-2 border-gray-100 hover:border-gray-200 hover:bg-gray-50'
                          }`}
                        >
                          <input type="radio" className="sr-only" name="layout" value={id} onChange={() => {}} checked={currentLayout === id} />
                          <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${currentLayout === id ? 'bg-white text-news-accent' : 'bg-gray-50 text-gray-400'}`}>
                            <Icon size={22} />
                          </div>
                          <div className="min-w-0">
                            <span className="block font-bold text-sm text-gray-800">{label}</span>
                            <span className="block text-xs text-gray-400 mt-1 leading-relaxed">{desc}</span>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                  )}

                  {isVideoType && (
                    <div className={`rounded-xl p-5 space-y-5 ${isLiveContent ? 'bg-red-50' : 'bg-gray-50'}`} style={{ border: isLiveContent ? '1.5px solid #fecaca' : '1.5px solid #e5e7eb' }}>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-red-50 text-news-accent flex items-center justify-center">
                          {currentContentType === 'live' ? <Radio size={19} /> : <PlayCircle size={19} />}
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-gray-800">{isLiveContent ? 'Live URL áƒ“áƒ áƒ¡áƒ¢áƒáƒ¢áƒ£áƒ¡áƒ˜' : 'áƒ•áƒ˜áƒ“áƒ”áƒ áƒžáƒáƒ áƒáƒ›áƒ”áƒ¢áƒ áƒ”áƒ‘áƒ˜'}</h4>
                          <p className="text-xs text-gray-400 mt-0.5">{isLiveContent ? 'áƒšáƒáƒ˜áƒ•áƒ˜áƒ¡ áƒ›áƒ—áƒáƒ•áƒáƒ áƒ˜ áƒ•áƒ”áƒšáƒ˜áƒ áƒ‘áƒ›áƒ£áƒšáƒ˜ - áƒáƒ¥ áƒ©áƒáƒ¡áƒ•áƒ˜áƒ— áƒ¡áƒ¢áƒ áƒ˜áƒ›áƒ˜áƒ¡ áƒ›áƒ˜áƒ¡áƒáƒ›áƒáƒ áƒ—áƒ˜' : 'áƒ©áƒáƒ¡áƒ•áƒ˜áƒ— YouTube, Facebook áƒáƒœ áƒ¡áƒ®áƒ•áƒ áƒ•áƒ˜áƒ“áƒ”áƒáƒ¡ áƒ‘áƒ›áƒ£áƒšáƒ˜'}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div className={isLiveContent ? 'md:col-span-2' : ''}>
                          <label className="block text-sm font-bold text-gray-700 mb-2">{isLiveContent ? 'Live URL *' : 'Video URL *'}</label>
                          <input
                            type="url"
                            required={isVideoType}
                            value={currentArticle.videoUrl || ''}
                            onChange={(e) => setCurrentArticle({ ...currentArticle, videoUrl: e.target.value })}
                            className={`form-input ${isLiveContent ? 'text-base font-semibold bg-white border-news-accent' : ''}`}
                            placeholder={isLiveContent ? 'https://www.youtube.com/live/...' : 'https://www.youtube.com/watch?v=...'}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-bold text-gray-700 mb-2">Video Provider</label>
                          <select
                            value={currentArticle.videoProvider || 'youtube'}
                            onChange={(e) => setCurrentArticle({ ...currentArticle, videoProvider: e.target.value as Article['videoProvider'] })}
                            className="form-input"
                          >
                            <option value="youtube">youtube</option>
                            <option value="facebook">facebook</option>
                            <option value="custom">custom</option>
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <label className="flex items-center gap-3 rounded-xl bg-white px-4 py-3 cursor-pointer" style={{ border: '1px solid #e5e7eb' }}>
                          <input
                            type="checkbox"
                            checked={Boolean(currentArticle.isLive) || currentContentType === 'live'}
                            onChange={(e) => setCurrentArticle({ ...currentArticle, isLive: e.target.checked })}
                            className="w-4 h-4 accent-news-accent"
                          />
                          <span className="text-sm font-bold text-gray-700">Is Live</span>
                        </label>
                        <div>
                          <label className="block text-sm font-bold text-gray-700 mb-2">Live Status</label>
                          <select
                            value={currentArticle.liveStatus || (currentContentType === 'live' ? 'live' : 'scheduled')}
                            onChange={(e) => setCurrentArticle({ ...currentArticle, liveStatus: e.target.value as Article['liveStatus'] })}
                            className="form-input"
                          >
                            <option value="scheduled">scheduled</option>
                            <option value="live">live</option>
                            <option value="ended">ended</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Title & Category */}
                  <div className={`grid grid-cols-1 ${isHeroLayout || isLiveContent ? '' : 'md:grid-cols-2'} gap-5`}>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">
                        {isHeroLayout ? 'áƒ‘áƒáƒœáƒ”áƒ áƒ˜áƒ¡ áƒ¡áƒáƒ—áƒáƒ£áƒ áƒ˜ *' : 'áƒ¡áƒáƒ—áƒáƒ£áƒ áƒ˜ *'}
                      </label>
                      <input
                        type="text"
                        required
                        value={currentArticle.title || ''}
                        onChange={(e) => setCurrentArticle({ ...currentArticle, title: e.target.value })}
                        className="form-input"
                        placeholder={isHeroLayout ? 'áƒ¨áƒ”áƒ˜áƒ§áƒ•áƒáƒœáƒ”áƒ— áƒ‘áƒáƒœáƒ”áƒ áƒ˜áƒ¡ áƒ¡áƒáƒ—áƒáƒ£áƒ áƒ˜...' : 'áƒ¨áƒ”áƒ˜áƒ§áƒ•áƒáƒœáƒ”áƒ— áƒ¡áƒáƒ—áƒáƒ£áƒ áƒ˜...'}
                      />
                    </div>
                    {!isHeroLayout && !isLiveContent && (
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">áƒ™áƒáƒ¢áƒ”áƒ’áƒáƒ áƒ˜áƒ</label>
                        <select
                          value={currentArticle.category || ''}
                          onChange={(e) => setCurrentArticle({ ...currentArticle, category: e.target.value })}
                          required
                          className="form-input"
                        >
                          <option value="" disabled>áƒáƒ˜áƒ áƒ©áƒ˜áƒ”áƒ— áƒ™áƒáƒ¢áƒ”áƒ’áƒáƒ áƒ˜áƒ</option>
                          {Object.entries(CATEGORY_GROUPS).map(([group, items]) => (
                            <optgroup key={group} label={group}>
                              {items.map((item) => <option key={item} value={item}>{item}</option>)}
                            </optgroup>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>

                  {/* Summary */}
                  {!isLiveContent && (
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">
                        áƒ›áƒáƒ™áƒšáƒ” áƒáƒ¦áƒ¬áƒ”áƒ áƒ *
                      </label>
                      <textarea
                        required={true}
                        rows={3}
                        value={currentArticle.summary || ''}
                        onChange={(e) => setCurrentArticle({ ...currentArticle, summary: e.target.value })}
                        className="form-input resize-none"
                        placeholder={isHeroLayout ? 'áƒ›áƒáƒ™áƒšáƒ” áƒ¢áƒ”áƒ¥áƒ¡áƒ¢áƒ˜ áƒ›áƒ—áƒáƒ•áƒáƒ áƒ˜ áƒ‘áƒáƒœáƒ”áƒ áƒ˜áƒ¡áƒ—áƒ•áƒ˜áƒ¡...' : isSidebarLayout ? 'áƒ›áƒáƒ™áƒšáƒ” áƒ¢áƒ”áƒ¥áƒ¡áƒ¢áƒ˜ áƒ’áƒ•áƒ”áƒ áƒ“áƒ˜áƒ—áƒ˜ áƒ‘áƒšáƒáƒ™áƒ˜áƒ¡áƒ—áƒ•áƒ˜áƒ¡...' : 'áƒ’áƒáƒ›áƒáƒ©áƒœáƒ“áƒ”áƒ‘áƒ áƒ›áƒ—áƒáƒ•áƒáƒ  áƒ’áƒ•áƒ”áƒ áƒ“áƒ–áƒ”...'}
                      />
                    </div>
                  )}

                  {/* Image Upload */}
                  {!isLiveContent && (
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      {isHeroLayout ? 'áƒ‘áƒáƒœáƒ”áƒ áƒ˜áƒ¡ áƒ¡áƒ£áƒ áƒáƒ—áƒ˜' : isLiveContent ? 'áƒ›áƒ—áƒáƒ•áƒáƒ áƒ˜ áƒ¡áƒ£áƒ áƒáƒ—áƒ˜ (áƒ¡áƒ£áƒ áƒ•áƒ˜áƒšáƒ˜áƒ¡áƒáƒ›áƒ”áƒ‘áƒ )' : 'áƒ›áƒ—áƒáƒ•áƒáƒ áƒ˜ áƒ¡áƒ£áƒ áƒáƒ—áƒ˜'}
                    </label>
                    <div className="rounded-xl overflow-hidden" style={{ border: '2px dashed #e5e7eb' }}>
                      {currentArticle.imageUrl ? (
                        <div className="relative group">
                          <img src={currentArticle.imageUrl} alt="Preview" className={`w-full object-cover ${isHeroLayout ? 'h-80' : 'h-56'}`} loading="eager" decoding="async" />
                          {isHeroLayout && (
                            <div className="absolute inset-x-0 bottom-0 p-6 bg-gradient-to-t from-black/80 to-transparent">
                              <div className="max-w-2xl text-white font-black text-2xl leading-tight">
                                {currentArticle.title || 'áƒ‘áƒáƒœáƒ”áƒ áƒ˜áƒ¡ áƒ¡áƒáƒ—áƒáƒ£áƒ áƒ˜'}
                              </div>
                            </div>
                          )}
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <button
                              type="button"
                              onClick={() => setCurrentArticle({ ...currentArticle, imageUrl: '' })}
                              className="flex items-center gap-2 bg-white text-red-500 px-4 py-2 rounded-lg text-sm font-bold shadow-lg"
                            >
                              <Trash2 size={16} /> áƒ¡áƒ£áƒ áƒáƒ—áƒ˜áƒ¡ áƒ¬áƒáƒ¨áƒšáƒ
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className={`${isHeroLayout ? 'py-16' : 'py-10'} flex flex-col items-center justify-center text-center bg-gray-50`}>
                          <UploadCloud size={40} className="text-gray-300 mb-3" />
                          <p className="text-sm font-semibold text-gray-500 mb-4">
                            {isHeroLayout ? 'áƒáƒ¢áƒ•áƒ˜áƒ áƒ—áƒ”áƒ— áƒ¤áƒáƒ áƒ—áƒ áƒ‘áƒáƒœáƒ”áƒ áƒ˜áƒ¡ áƒ¡áƒ£áƒ áƒáƒ—áƒ˜' : isLiveContent ? 'áƒšáƒáƒ˜áƒ•áƒ˜áƒ¡áƒ—áƒ•áƒ˜áƒ¡ áƒ¡áƒ£áƒ áƒáƒ—áƒ˜ áƒáƒ£áƒªáƒ˜áƒšáƒ”áƒ‘áƒ”áƒšáƒ˜ áƒáƒ  áƒáƒ áƒ˜áƒ¡' : 'áƒáƒ¢áƒ•áƒ˜áƒ áƒ—áƒ”áƒ— áƒ¤áƒáƒ¢áƒ áƒáƒœ áƒ’áƒáƒ›áƒáƒ˜áƒ§áƒ”áƒœáƒ”áƒ— áƒ¨áƒ”áƒ›áƒ—áƒ®áƒ•áƒ”áƒ•áƒ˜áƒ—áƒ˜'}
                          </p>
                          <div className="flex gap-3">
                            <label className="btn-primary cursor-pointer text-sm">
                              <ImageIcon size={15} />
                              áƒ¤áƒáƒ¢áƒáƒ¡ áƒáƒ áƒ©áƒ”áƒ•áƒ
                              <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                            </label>
                            <button
                              type="button"
                              onClick={() => setCurrentArticle({ ...currentArticle, imageUrl: getRandomNewsImage() })}
                              className="btn-secondary text-sm"
                            >
                              <Zap size={15} />
                              áƒ¨áƒ”áƒ›áƒ—áƒ®áƒ•áƒ”áƒ•áƒ˜áƒ—áƒ˜
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  )}

                  {/* Rich Text */}
                  {!isHeroLayout && !isLiveContent && (
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">áƒ¡áƒ áƒ£áƒšáƒ˜ áƒ¨áƒ˜áƒœáƒáƒáƒ áƒ¡áƒ˜</label>
                      <div className="rounded-xl overflow-hidden" style={{ border: '1.5px solid #e5e7eb' }}>
                        <ReactQuill
                          theme="snow"
                          value={currentArticle.content || ''}
                          onChange={(content) => setCurrentArticle({ ...currentArticle, content })}
                          modules={quillModules}
                          className="h-80 mb-12"
                        />
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center justify-between pt-6" style={{ borderTop: '1px solid #f3f4f6' }}>
                    <button type="button" onClick={() => setIsEditing(false)} className="btn-secondary">
                      áƒ’áƒáƒ£áƒ¥áƒ›áƒ”áƒ‘áƒ
                    </button>
                    <button type="submit" className="btn-primary">
                      <Save size={16} />
                      {isHeroLayout ? 'áƒ‘áƒáƒœáƒ”áƒ áƒ˜áƒ¡ áƒ¨áƒ”áƒœáƒáƒ®áƒ•áƒ' : (currentArticle as any)._originalId ? 'áƒ¡áƒ¢áƒáƒ¢áƒ˜áƒ˜áƒ¡ áƒ’áƒáƒœáƒáƒ®áƒšáƒ”áƒ‘áƒ' : 'áƒ¨áƒ”áƒœáƒáƒ®áƒ•áƒ áƒ“áƒ áƒ’áƒáƒ›áƒáƒ¥áƒ•áƒ”áƒ§áƒœáƒ”áƒ‘áƒ'}
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              /* â”€â”€ ARTICLES LIST â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
              <div className="space-y-6 animate-fade-up">
                {/* Breaking News */}
                {activeTab === 'ARTICLES' && (
                <div className="bg-white rounded-2xl p-6" style={{ border: '1px solid #e5e7eb' }}>
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 bg-red-50 rounded-lg flex items-center justify-center">
                      <Megaphone size={16} className="text-news-accent" />
                    </div>
                    <h3 className="font-bold text-gray-800">Breaking News Ticker</h3>
                  </div>
                  <form onSubmit={handleAddBreakingNews} className="flex gap-3 mb-4">
                    <input
                      type="text"
                      value={newBreakingText}
                      onChange={(e) => setNewBreakingText(e.target.value)}
                      placeholder="áƒ“áƒáƒáƒ›áƒáƒ¢áƒ”áƒ— áƒáƒ®áƒáƒšáƒ˜ áƒáƒ›áƒ‘áƒáƒ•áƒ˜..."
                      className="form-input flex-1"
                    />
                    <button type="submit" className="btn-primary px-4">
                      <Plus size={18} />
                    </button>
                  </form>
                  {breakingNews.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {breakingNews.map((item) => (
                        <div key={item.id} className="flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium" style={{ background: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca' }}>
                          <span>
                            <LinkedText
                              text={item.text}
                              linkClassName="font-bold underline underline-offset-2 hover:text-red-900"
                            />
                          </span>
                          <button onClick={() => removeTickerItem(item.id)} className="hover:text-red-900 transition-colors">
                            <X size={13} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                )}

                {/* Articles Table */}
                <div className="bg-white rounded-2xl overflow-hidden" style={{ border: '1px solid #e5e7eb' }}>
                  <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <div>
                      <h3 className="font-bold text-gray-800">{contentViewTitle} <span className="text-gray-400 font-normal text-sm ml-1">({filteredArticles.length})</span></h3>
                      <p className="text-xs text-gray-400 mt-1">{contentViewDescription}</p>
                    </div>
                    <button onClick={() => handleCreateNew()} className="btn-primary text-sm">
                      <Plus size={16} />
                      {createButtonLabel}
                    </button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>áƒ¡áƒ¢áƒáƒ¢áƒ£áƒ¡áƒ˜</th>
                          <th>áƒ¡áƒ£áƒ áƒáƒ—áƒ˜</th>
                          <th>áƒ¡áƒáƒ—áƒáƒ£áƒ áƒ˜</th>
                          <th>áƒ™áƒáƒ¢áƒ”áƒ’áƒáƒ áƒ˜áƒ</th>
                          <th>áƒ—áƒáƒ áƒ˜áƒ¦áƒ˜</th>
                          <th style={{ textAlign: 'right' }}>áƒ›áƒáƒ¥áƒ›áƒ”áƒ“áƒ”áƒ‘áƒ</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredArticles.map((article) => (
                          <tr key={article.id} className="group">
                            <td>
                              <span className={`badge ${article.layout === 'hero' ? 'badge-hero' : article.layout === 'sidebar' ? 'badge-sidebar' : 'badge-feed'}`}>
                                {article.contentType === 'live' ? 'live' : article.contentType === 'video' ? 'video' : article.layout === 'hero' ? 'áƒ‘áƒáƒœáƒ”áƒ áƒ˜' : article.layout === 'sidebar' ? 'áƒ’áƒ•áƒ”áƒ áƒ“áƒ˜' : 'áƒ¡áƒ˜áƒáƒ®áƒšáƒ”'}
                              </span>
                            </td>
                            <td>
                              <div className="w-11 h-11 rounded-lg overflow-hidden bg-gray-100">
                                {article.imageUrl && <LazyImage src={article.imageUrl} alt={article.title} className="w-full h-full" />}
                              </div>
                            </td>
                            <td style={{ maxWidth: '260px' }}>
                              <div className="font-semibold text-gray-800 truncate">{article.title}</div>
                            </td>
                            <td>
                              <span className="text-sm text-gray-500">{article.category}</span>
                            </td>
                            <td>
                              <span className="text-sm text-gray-400">{formatDayMonthYear(article.date)}</span>
                            </td>
                            <td>
                              <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => handleEdit(article)} className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors">
                                  <Edit2 size={15} />
                                </button>
                                <button onClick={() => handleDelete(article.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                                  <Trash2 size={15} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                        {filteredArticles.length === 0 && (
                          <tr>
                            <td colSpan={6} className="py-16 text-center text-gray-400">
                              <FileText size={36} className="mx-auto mb-3 text-gray-200" />
                              áƒ›áƒáƒ¡áƒáƒšáƒ áƒáƒ  áƒ›áƒáƒ˜áƒ«áƒ”áƒ‘áƒœáƒ
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )
          )}

          {/* â”€â”€ USERS TAB â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
          {activeTab === 'ADS' && (
            <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_360px] gap-6 animate-fade-up">
              <form onSubmit={handleSaveAd} className="bg-white rounded-2xl overflow-hidden" style={{ border: '1px solid #e5e7eb' }}>
                <div className="flex items-center justify-between px-6 py-5" style={{ borderBottom: '1px solid #f3f4f6', background: '#fafafa' }}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-red-50 text-news-accent flex items-center justify-center">
                      <Megaphone size={18} />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">áƒ¡áƒáƒ áƒ”áƒ™áƒšáƒáƒ›áƒ áƒáƒ“áƒ’áƒ˜áƒšáƒ˜</h3>
                      <p className="text-xs text-gray-400 mt-0.5">áƒ›áƒáƒ áƒ¯áƒ•áƒ”áƒœáƒ áƒ¡áƒ•áƒ”áƒ¢áƒ¨áƒ˜ 300 x 250 áƒ‘áƒáƒœáƒ”áƒ áƒ˜áƒ¡ áƒ›áƒáƒ áƒ—áƒ•áƒ</p>
                    </div>
                  </div>
                  <span className={`badge ${currentAd.active ? 'badge-green' : 'bg-gray-100 text-gray-500'}`}>
                    {currentAd.active ? 'áƒáƒ¥áƒ¢áƒ˜áƒ£áƒ áƒ˜' : 'áƒ’áƒáƒ›áƒáƒ áƒ—áƒ£áƒšáƒ˜'}
                  </span>
                </div>

                <div className="p-6 space-y-6">
                  <div className="flex items-center gap-3 rounded-xl bg-gray-50 px-4 py-3" style={{ border: '1px solid #e5e7eb' }}>
                    <div
                      className="relative w-11 h-6 rounded-full cursor-pointer transition-colors flex-shrink-0"
                      style={{ background: currentAd.active ? '#dc2626' : '#e5e7eb' }}
                      onClick={() => setCurrentAd({ ...currentAd, active: !currentAd.active })}
                    >
                      <div
                        className="absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform"
                        style={{ left: currentAd.active ? 'calc(100% - 20px)' : '4px' }}
                      />
                    </div>
                    <div>
                      <div className="font-bold text-gray-800 text-sm">áƒ áƒ”áƒ™áƒšáƒáƒ›áƒ˜áƒ¡ áƒ©áƒ•áƒ”áƒœáƒ”áƒ‘áƒ áƒ¡áƒáƒ˜áƒ¢áƒ–áƒ”</div>
                      <div className="text-xs text-gray-400 mt-0.5">áƒ’áƒáƒ›áƒáƒ áƒ—áƒ•áƒ˜áƒ¡áƒáƒ¡ áƒ˜áƒ¡áƒ”áƒ• placeholder áƒ’áƒáƒ›áƒáƒ©áƒœáƒ“áƒ”áƒ‘áƒ</div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">áƒ áƒ”áƒ™áƒšáƒáƒ›áƒ˜áƒ¡ áƒ¡áƒáƒ—áƒáƒ£áƒ áƒ˜</label>
                    <input
                      type="text"
                      value={currentAd.title}
                      onChange={(e) => setCurrentAd({ ...currentAd, title: e.target.value })}
                      className="form-input"
                      placeholder="áƒ›áƒáƒ’: áƒžáƒáƒ áƒ¢áƒœáƒ˜áƒáƒ áƒ˜áƒ¡ áƒ‘áƒáƒœáƒ”áƒ áƒ˜"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">áƒ áƒ”áƒ™áƒšáƒáƒ›áƒ˜áƒ¡ áƒšáƒ˜áƒœáƒ™áƒ˜</label>
                    <input
                      type="url"
                      value={currentAd.targetUrl}
                      onChange={(e) => setCurrentAd({ ...currentAd, targetUrl: e.target.value })}
                      className="form-input"
                      placeholder="https://example.com"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">áƒ‘áƒáƒœáƒ”áƒ áƒ˜áƒ¡ áƒ¡áƒ£áƒ áƒáƒ—áƒ˜</label>
                    <div className="rounded-xl overflow-hidden" style={{ border: '2px dashed #e5e7eb' }}>
                      {currentAd.imageUrl ? (
                        <div className="relative group bg-gray-950">
                          <img src={currentAd.imageUrl} alt="Ad preview" className="aspect-[6/5] w-full object-cover" loading="eager" decoding="async" />
                          <div className="absolute inset-0 bg-black/45 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <button
                              type="button"
                              onClick={() => setCurrentAd({ ...currentAd, imageUrl: '' })}
                              className="flex items-center gap-2 bg-white text-red-500 px-4 py-2 rounded-lg text-sm font-bold shadow-lg"
                            >
                              <Trash2 size={16} /> áƒ¡áƒ£áƒ áƒáƒ—áƒ˜áƒ¡ áƒ¬áƒáƒ¨áƒšáƒ
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="py-10 flex flex-col items-center justify-center text-center bg-gray-50">
                          <UploadCloud size={40} className="text-gray-300 mb-3" />
                          <p className="text-sm font-semibold text-gray-500 mb-4">áƒáƒ¢áƒ•áƒ˜áƒ áƒ—áƒ” 300 x 250 áƒ¤áƒáƒ áƒ›áƒáƒ¢áƒ˜áƒ¡ áƒ áƒ”áƒ™áƒšáƒáƒ›áƒ</p>
                          <label className="btn-primary cursor-pointer text-sm">
                            <ImageIcon size={15} />
                            áƒ¡áƒ£áƒ áƒáƒ—áƒ˜áƒ¡ áƒáƒ áƒ©áƒ”áƒ•áƒ
                            <input type="file" accept="image/*" onChange={handleAdImageUpload} className="hidden" />
                          </label>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-3 pt-4" style={{ borderTop: '1px solid #f3f4f6' }}>
                    <button type="button" onClick={handleClearAd} className="btn-secondary text-red-500 hover:text-red-600">
                      <Trash2 size={16} />
                      áƒ¬áƒáƒ¨áƒšáƒ
                    </button>
                    <button type="submit" className="btn-primary">
                      <Save size={16} />
                      áƒ¨áƒ”áƒœáƒáƒ®áƒ•áƒ
                    </button>
                  </div>
                </div>
              </form>

              <div className="bg-white rounded-2xl p-6 h-fit" style={{ border: '1px solid #e5e7eb' }}>
                <div className="flex items-center gap-2 mb-4">
                  <Eye size={16} className="text-news-accent" />
                  <h3 className="font-bold text-gray-800">áƒ¡áƒáƒ˜áƒ¢áƒ–áƒ” áƒ’áƒáƒ›áƒáƒ©áƒ”áƒœáƒ</h3>
                </div>
                <div className="rounded-2xl p-5 text-center bg-gray-50 border border-dashed border-gray-200">
                  <span className="text-xs text-gray-400 uppercase tracking-widest block mb-3">áƒ áƒ”áƒ™áƒšáƒáƒ›áƒ</span>
                  {currentAd.active && currentAd.imageUrl ? (
                    <div className="overflow-hidden rounded-xl bg-white border border-gray-200 shadow-sm">
                      <img src={currentAd.imageUrl} alt={currentAd.title || 'áƒ áƒ”áƒ™áƒšáƒáƒ›áƒ'} className="aspect-[6/5] w-full object-cover" />
                    </div>
                  ) : (
                    <div className="relative aspect-[6/5] w-full overflow-hidden rounded-xl bg-[#111217] text-left text-white shadow-sm border border-gray-200">
                      <div className="absolute inset-0 bg-[#d71920]" style={{ clipPath: 'polygon(0 0, 62% 0, 48% 100%, 0 100%)' }} />
                      <div className="absolute inset-y-0 right-0 w-1/2 bg-[#0d0d10]" style={{ clipPath: 'polygon(36% 0, 100% 0, 100% 100%, 18% 100%)' }} />
                      <div className="absolute left-[55%] top-0 h-full w-px rotate-[-14deg] bg-white/10" />
                      <div className="absolute right-5 top-8 grid grid-cols-3 gap-2 opacity-40">
                        {Array.from({ length: 9 }).map((_, index) => (
                          <span key={index} className={`h-1.5 w-1.5 rounded-full ${index % 2 === 0 ? 'bg-red-500' : 'bg-white/35'}`} />
                        ))}
                      </div>
                      <div className="relative z-10 flex h-full flex-col justify-between p-5">
                        <div>
                          <div className="mb-3 text-[10px] font-black uppercase tracking-[0.32em] text-red-100/80">áƒ¡áƒáƒ áƒ”áƒ™áƒšáƒáƒ›áƒ áƒ¡áƒ˜áƒ•áƒ áƒªáƒ”</div>
                          <div className="text-sm font-bold text-white/90">áƒ—áƒ¥áƒ•áƒ”áƒœáƒ˜</div>
                          <div className="mt-1 text-[28px] font-black leading-none text-white">áƒ¡áƒáƒ áƒ”áƒ™áƒšáƒáƒ›áƒ</div>
                          <div className="mt-1 text-[28px] font-black leading-none text-transparent" style={{ WebkitTextStroke: '1px rgba(255,255,255,0.55)' }}>
                            áƒáƒ“áƒ’áƒ˜áƒšáƒ˜
                          </div>
                        </div>
                        <div className="flex items-end justify-between gap-3">
                          <span className="text-xs font-black text-white/25">paqtebi.ge</span>
                          <button
                            type="button"
                            disabled
                            className="rounded-sm bg-[#e11d24] px-4 py-2 text-xs font-black text-white shadow-lg opacity-80 cursor-not-allowed"
                          >
                            áƒ“áƒáƒ’áƒ•áƒ˜áƒ™áƒáƒ•áƒ¨áƒ˜áƒ áƒ“áƒ˜áƒ—
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                <p className="text-xs text-gray-400 mt-4 leading-relaxed">
                  áƒ áƒ”áƒ™áƒšáƒáƒ›áƒ áƒ’áƒáƒ›áƒáƒ©áƒœáƒ“áƒ”áƒ‘áƒ áƒ›áƒ—áƒáƒ•áƒáƒ  áƒ’áƒ•áƒ”áƒ áƒ“áƒ–áƒ” áƒ›áƒáƒ áƒ¯áƒ•áƒ”áƒœáƒ áƒ¡áƒ•áƒ”áƒ¢áƒ¨áƒ˜. áƒªáƒ•áƒšáƒ˜áƒšáƒ”áƒ‘áƒ˜áƒ¡ áƒ¨áƒ”áƒ›áƒ“áƒ”áƒ’ áƒ¡áƒáƒ˜áƒ¢áƒ–áƒ” áƒ“áƒáƒ‘áƒ áƒ£áƒœáƒ”áƒ‘áƒ˜áƒ¡áƒáƒ¡ áƒáƒ®áƒáƒšáƒ˜ áƒ‘áƒáƒœáƒ”áƒ áƒ˜ áƒ“áƒáƒ’áƒ®áƒ•áƒ“áƒ”áƒ‘áƒ.
                </p>
              </div>

              <div className="xl:col-span-2 bg-white rounded-2xl overflow-hidden" style={{ border: '1px solid #e5e7eb' }}>
                <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <div className="flex items-center gap-2">
                    <MessageSquare size={16} className="text-news-accent" />
                    <h3 className="font-bold text-gray-800">áƒ áƒ”áƒ™áƒšáƒáƒ›áƒ˜áƒ¡ áƒ›áƒáƒ—áƒ®áƒáƒ•áƒœáƒ”áƒ‘áƒ˜</h3>
                    <span className="badge badge-green ml-1">{adInquiries.length} áƒ¡áƒ£áƒš</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => apiService.fetchAdInquiries().then(setAdInquiries)}
                    className="text-xs font-bold text-news-accent hover:underline"
                  >
                    áƒ’áƒáƒœáƒáƒ®áƒšáƒ”áƒ‘áƒ
                  </button>
                </div>

                {adInquiries.length > 0 ? (
                  <div className="divide-y divide-gray-100">
                    {adInquiries.map((inquiry) => (
                      <div key={inquiry.id} className="grid grid-cols-1 gap-4 px-6 py-5 lg:grid-cols-[220px_1fr]">
                        <div>
                          <div className="font-bold text-gray-900">{inquiry.fullName}</div>
                          <div className="mt-2 space-y-1 text-sm text-gray-500">
                            {inquiry.phone && <div>áƒ¢áƒ”áƒš: {inquiry.phone}</div>}
                            {inquiry.email && <div>áƒ˜áƒ›áƒ”áƒ˜áƒšáƒ˜: {inquiry.email}</div>}
                          </div>
                          <div className="mt-2 text-xs text-gray-400">
                            {new Date(inquiry.createdAt).toLocaleString('ka-GE')}
                          </div>
                        </div>
                        <div className="rounded-xl bg-gray-50 p-4 text-sm leading-relaxed text-gray-700" style={{ border: '1px solid #f3f4f6' }}>
                          {inquiry.message}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-14 text-center text-gray-400">
                    <MessageSquare size={34} className="mx-auto mb-3 text-gray-200" />
                    <div className="text-sm font-medium">áƒ áƒ”áƒ™áƒšáƒáƒ›áƒ˜áƒ¡ áƒ›áƒáƒ—áƒ®áƒáƒ•áƒœáƒ”áƒ‘áƒ˜ áƒ¯áƒ”áƒ  áƒáƒ  áƒáƒ áƒ˜áƒ¡</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'USERS' && (
            <div className="animate-fade-up">
              <div className="bg-white rounded-2xl overflow-hidden" style={{ border: '1px solid #e5e7eb' }}>
                <div className="flex items-center gap-3 px-6 py-4" style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <Users size={18} className="text-news-accent" />
                  <h3 className="font-bold text-gray-800">ადმინების მართვა</h3>
                  <span className="badge badge-green ml-1">{users.length} სულ</span>
                </div>

                {!isOwner && (
                  <div className="m-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm font-medium text-amber-800">
                    ადმინების დამატება და წაშლა შეუძლია მხოლოდ owner-ს.
                  </div>
                )}

                {isOwner && (
                  <form onSubmit={handleCreateAdmin} className="grid gap-3 border-b border-gray-100 p-6 lg:grid-cols-[1fr_1fr_1fr_140px_auto]">
                    <input
                      className="rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-news-accent"
                      placeholder="Username"
                      value={adminForm.username}
                      onChange={(e) => setAdminForm({ ...adminForm, username: e.target.value })}
                    />
                    <input
                      className="rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-news-accent"
                      placeholder="Email"
                      type="email"
                      value={adminForm.email}
                      onChange={(e) => setAdminForm({ ...adminForm, email: e.target.value })}
                    />
                    <input
                      className="rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-news-accent"
                      placeholder="Temporary password"
                      type="password"
                      value={adminForm.password}
                      onChange={(e) => setAdminForm({ ...adminForm, password: e.target.value })}
                    />
                    <select
                      className="rounded-xl border border-gray-200 px-3 py-3 text-sm outline-none focus:border-news-accent"
                      value={adminForm.role}
                      onChange={(e) => setAdminForm({ ...adminForm, role: e.target.value as AdminUserRecord['role'] })}
                    >
                      <option value="admin">admin</option>
                      <option value="owner">owner</option>
                    </select>
                    <button
                      type="submit"
                      disabled={isSavingAdmin}
                      className="rounded-xl bg-news-accent px-5 py-3 text-sm font-bold text-white transition hover:bg-red-700 disabled:opacity-60"
                    >
                      დამატება
                    </button>
                  </form>
                )}

                <table className="data-table">
                  <thead>
                    <tr>
                      <th>მომხმარებელი</th>
                      <th>ელ-ფოსტა</th>
                      <th>როლი</th>
                      <th style={{ textAlign: 'right' }}>მოქმედება</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user, idx) => (
                      <tr key={user.id}>
                        <td>
                          <div className="flex items-center gap-3">
                            <div
                              className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                              style={{ background: `hsl(${(idx * 37 + 200) % 360},60%,45%)` }}
                            >
                              {user.username[0]?.toUpperCase()}
                            </div>
                            <span className="font-semibold text-gray-800">{user.username}</span>
                          </div>
                        </td>
                        <td><span className="text-gray-500">{user.email || '-'}</span></td>
                        <td>
                          {isOwner && user.id !== currentAdmin?.id ? (
                            <select
                              className="rounded-lg border border-gray-200 px-2 py-1 text-sm"
                              value={user.role}
                              onChange={(e) => handleAdminRoleChange(user.id, e.target.value as AdminUserRecord['role'])}
                            >
                              <option value="admin">admin</option>
                              <option value="owner">owner</option>
                            </select>
                          ) : (
                            <span className="badge badge-green">{user.role}</span>
                          )}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          {isOwner && user.id !== currentAdmin?.id ? (
                            <button
                              type="button"
                              onClick={() => handleDeleteAdmin(user.id)}
                              className="btn-ghost text-red-500"
                            >
                              წაშლა
                            </button>
                          ) : (
                            <span className="text-xs text-gray-400">-</span>
                          )}
                        </td>
                      </tr>
                    ))}
                    {(users.length === 0 || isLoadingAdmins) && (
                      <tr>
                        <td colSpan={4} className="py-16 text-center text-gray-400">
                          <Users size={36} className="mx-auto mb-3 text-gray-200" />
                          {isLoadingAdmins ? 'იტვირთება...' : 'ადმინები არ არის'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          {/* â”€â”€ COMMENTS TAB â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
          {activeTab === 'COMMENTS' && (
            <div className="space-y-4 animate-fade-up">
              {comments.length === 0 ? (
                <div className="bg-white rounded-2xl py-20 text-center" style={{ border: '2px dashed #e5e7eb' }}>
                  <MessageSquare size={44} className="mx-auto text-gray-200 mb-4" />
                  <p className="text-gray-400 font-medium">áƒ™áƒáƒ›áƒ”áƒœáƒ¢áƒáƒ áƒ”áƒ‘áƒ˜ áƒáƒ  áƒáƒ áƒ˜áƒ¡</p>
                </div>
              ) : (
                comments.map((comment) => (
                  <div key={comment.id} className="bg-white rounded-2xl p-5 flex gap-4" style={{ border: '1px solid #e5e7eb' }}>
                    <div className="w-10 h-10 bg-blue-50 text-blue-500 rounded-xl flex items-center justify-center flex-shrink-0">
                      <MessageSquare size={18} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="font-bold text-gray-800 text-sm">{comment.author}</h4>
                          <p className="text-xs text-gray-400">{new Date(comment.timestamp).toLocaleString('ka-GE')}</p>
                        </div>
                        <button onClick={() => removeComment(comment.id)} className="btn-ghost p-1.5 text-gray-400 hover:text-red-500">
                          <Trash2 size={15} />
                        </button>
                      </div>
                      <p className="text-sm text-gray-600 leading-relaxed bg-gray-50 rounded-xl p-3" style={{ border: '1px solid #f3f4f6' }}>
                        {comment.text}
                      </p>
                      {comment.articleTitle && (
                        <div className="mt-2 flex items-center gap-1.5 text-xs text-blue-500 font-medium">
                          <FileText size={11} />
                          {comment.articleTitle}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* â”€â”€ POLLS TAB â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
          {activeTab === 'POLLS' && (
            isEditingPoll ? (
              <div className="max-w-2xl mx-auto bg-white rounded-2xl overflow-hidden animate-slide-right" style={{ border: '1px solid #e5e7eb' }}>
                <div className="flex items-center justify-between px-8 py-5" style={{ borderBottom: '1px solid #f3f4f6', background: '#fafafa' }}>
                  <h3 className="text-lg font-bold text-gray-900">
                    {currentPoll.id ? 'áƒ’áƒáƒ›áƒáƒ™áƒ˜áƒ—áƒ®áƒ•áƒ˜áƒ¡ áƒ áƒ”áƒ“áƒáƒ¥áƒ¢áƒ˜áƒ áƒ”áƒ‘áƒ' : 'áƒáƒ®áƒáƒšáƒ˜ áƒ’áƒáƒ›áƒáƒ™áƒ˜áƒ—áƒ®áƒ•áƒ'}
                  </h3>
                  <button onClick={() => setIsEditingPoll(false)} className="btn-ghost p-2 text-gray-400 hover:text-red-500">
                    <X size={20} />
                  </button>
                </div>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (currentPoll.question && currentPoll.options && currentPoll.options.length >= 2) {
                      const poll: Poll = {
                        id: currentPoll.id || Date.now().toString(),
                        question: sanitizeInput(currentPoll.question),
                        options: currentPoll.options.map((opt) => ({
                          id: opt.id || Date.now().toString() + Math.random().toString(36).substr(2, 9),
                          text: sanitizeInput(opt.text),
                          votes: opt.votes || 0,
                        })),
                        totalVotes: currentPoll.totalVotes || 0,
                        active: currentPoll.active || false,
                        createdAt: currentPoll.createdAt || new Date().toISOString(),
                      };
                      savePoll(poll);
                      if (poll.active) setActivePoll(poll.id);
                      addToast('áƒ’áƒáƒ›áƒáƒ™áƒ˜áƒ—áƒ®áƒ•áƒ áƒ¨áƒ”áƒœáƒáƒ®áƒ£áƒšáƒ˜áƒ', 'success');
                      setIsEditingPoll(false);
                      setPolls(getPolls());
                    } else {
                      addToast('áƒ¨áƒ”áƒáƒ•áƒ¡áƒ”áƒ— áƒ§áƒ•áƒ”áƒšáƒ áƒ•áƒ”áƒšáƒ˜', 'error');
                    }
                  }}
                  className="p-8 space-y-6"
                >
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">áƒ™áƒ˜áƒ—áƒ®áƒ•áƒ</label>
                    <input
                      type="text"
                      required
                      value={currentPoll.question || ''}
                      onChange={(e) => setCurrentPoll({ ...currentPoll, question: e.target.value })}
                      className="form-input"
                      placeholder="áƒ›áƒáƒ’: áƒ›áƒáƒ’áƒ¬áƒáƒœáƒ— áƒ—áƒ£ áƒáƒ áƒ..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-3">áƒžáƒáƒ¡áƒ£áƒ®áƒ”áƒ‘áƒ˜</label>
                    <div className="space-y-2.5">
                      {(currentPoll.options || []).map((option, idx) => (
                        <div key={idx} className="flex gap-2">
                          <div className="w-7 h-7 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-2">
                            {idx + 1}
                          </div>
                          <input
                            type="text"
                            required
                            value={option.text}
                            onChange={(e) => {
                              const newOptions = [...(currentPoll.options || [])];
                              newOptions[idx] = { ...option, text: e.target.value };
                              setCurrentPoll({ ...currentPoll, options: newOptions });
                            }}
                            className="form-input flex-1"
                            placeholder={`áƒžáƒáƒ¡áƒ£áƒ®áƒ˜ ${idx + 1}`}
                          />
                          {(currentPoll.options || []).length > 2 && (
                            <button
                              type="button"
                              onClick={() => {
                                const newOptions = (currentPoll.options || []).filter((_, i) => i !== idx);
                                setCurrentPoll({ ...currentPoll, options: newOptions });
                              }}
                              className="btn-ghost p-2 text-red-400 hover:text-red-600 mt-1"
                            >
                              <X size={16} />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const newOptions = [...(currentPoll.options || []), { id: '', text: '', votes: 0 }];
                        setCurrentPoll({ ...currentPoll, options: newOptions });
                      }}
                      className="mt-3 text-sm font-bold text-news-accent hover:underline flex items-center gap-1"
                    >
                      <Plus size={14} /> áƒžáƒáƒ¡áƒ£áƒ®áƒ˜áƒ¡ áƒ“áƒáƒ›áƒáƒ¢áƒ”áƒ‘áƒ
                    </button>
                  </div>
                  <div className="flex items-center gap-3 py-4" style={{ borderTop: '1px solid #f3f4f6' }}>
                    <div
                      className="relative w-11 h-6 rounded-full cursor-pointer transition-colors flex-shrink-0"
                      style={{ background: currentPoll.active ? '#dc2626' : '#e5e7eb' }}
                      onClick={() => setCurrentPoll({ ...currentPoll, active: !currentPoll.active })}
                    >
                      <div
                        className="absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform"
                        style={{ left: currentPoll.active ? 'calc(100% - 20px)' : '4px' }}
                      />
                    </div>
                    <label className="font-medium text-gray-700 text-sm cursor-pointer" onClick={() => setCurrentPoll({ ...currentPoll, active: !currentPoll.active })}>
                      áƒ’áƒáƒáƒ¥áƒ¢áƒ˜áƒ£áƒ áƒ”áƒ‘áƒ
                    </label>
                  </div>
                  <div className="flex gap-3">
                    <button type="button" onClick={() => setIsEditingPoll(false)} className="btn-secondary flex-1">
                      áƒ’áƒáƒ£áƒ¥áƒ›áƒ”áƒ‘áƒ
                    </button>
                    <button type="submit" className="btn-primary flex-1 justify-center">
                      <Save size={16} /> áƒ¨áƒ”áƒœáƒáƒ®áƒ•áƒ
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 animate-fade-up stagger">
                {/* New Poll card */}
                <div
                  onClick={() => {
                    setCurrentPoll({ id: '', question: '', options: [{ id: '', text: '', votes: 0 }, { id: '', text: '', votes: 0 }], totalVotes: 0, active: false });
                    setIsEditingPoll(true);
                  }}
                  className="rounded-2xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-all hover:scale-[1.02] min-h-[160px]"
                  style={{ border: '2px dashed #e5e7eb', background: '#fafafa' }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = '#dc2626'; (e.currentTarget as HTMLElement).style.background = '#fef2f2'; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = '#e5e7eb'; (e.currentTarget as HTMLElement).style.background = '#fafafa'; }}
                >
                  <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-sm mb-3">
                    <Plus size={22} className="text-gray-400" />
                  </div>
                  <h3 className="font-bold text-gray-600 text-sm">áƒáƒ®áƒáƒšáƒ˜ áƒ’áƒáƒ›áƒáƒ™áƒ˜áƒ—áƒ®áƒ•áƒ</h3>
                </div>

                {polls.map((poll) => (
                  <div key={poll.id} className="bg-white rounded-2xl p-5 relative group animate-fade-up" style={{ border: '1px solid #e5e7eb' }}>
                    <div className="absolute top-4 right-4 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => { setCurrentPoll(poll); setIsEditingPoll(true); }} className="p-1.5 bg-gray-100 rounded-lg hover:bg-blue-50 text-blue-500 transition-colors">
                        <Edit2 size={14} />
                      </button>
                      <button onClick={() => { if (window.confirm('áƒ¬áƒáƒ•áƒ¨áƒáƒšáƒáƒ—?')) { deletePoll(poll.id); setPolls(getPolls()); } }} className="p-1.5 bg-gray-100 rounded-lg hover:bg-red-50 text-red-500 transition-colors">
                        <Trash2 size={14} />
                      </button>
                    </div>
                    <div className="flex items-center gap-2 mb-3">
                      {poll.active ? (
                        <span className="badge badge-green flex items-center gap-1"><CheckCircle size={11} /> áƒáƒ¥áƒ¢áƒ˜áƒ£áƒ áƒ˜</span>
                      ) : (
                        <button
                          onClick={() => { setActivePoll(poll.id); setPolls(getPolls()); addToast('áƒ’áƒáƒáƒ¥áƒ¢áƒ˜áƒ£áƒ áƒ“áƒ', 'success'); }}
                          className="badge bg-gray-100 text-gray-500 hover:bg-gray-200 cursor-pointer transition-colors"
                        >
                          áƒ’áƒáƒáƒ¥áƒ¢áƒ˜áƒ£áƒ áƒ”áƒ‘áƒ
                        </button>
                      )}
                      <span className="text-xs text-gray-400">{poll.totalVotes} áƒ®áƒ›áƒ</span>
                    </div>
                    <h3 className="font-bold text-gray-800 text-sm mb-4 line-clamp-2">{poll.question}</h3>
                    <div className="space-y-2">
                      {poll.options.slice(0, 3).map((opt, i) => (
                        <div key={i}>
                          <div className="flex justify-between text-xs text-gray-600 mb-1">
                            <span className="truncate">{opt.text}</span>
                            <span className="font-bold text-gray-800 ml-2">{opt.votes}</span>
                          </div>
                          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-news-accent rounded-full transition-all"
                              style={{ width: poll.totalVotes > 0 ? `${(opt.votes / poll.totalVotes) * 100}%` : '0%' }}
                            />
                          </div>
                        </div>
                      ))}
                      {poll.options.length > 3 && <div className="text-xs text-gray-400 pt-1">+ {poll.options.length - 3} áƒ¡áƒ®áƒ•áƒ</div>}
                    </div>
                  </div>
                ))}
              </div>
            )
          )}

        </div>
      </main>
    </div>
  );
};
