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
import { uploadArticleImage } from '../services/mediaService';
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

/* ── NAV CONFIG ───────────────────────────────────────────────── */
const NAV_CONFIG: { tab: Tab; icon: any; label: string; badge?: string }[] = [
  { tab: 'ANALYTICS',     icon: BarChart3,    label: 'მიმოხილვა' },
  { tab: 'ARTICLES',      icon: FileText,     label: 'Articles' },
  { tab: 'VIDEO_REPORTS', icon: Video,        label: 'ვიდეო რეპორტაჟები' },
  { tab: 'PODCASTS',      icon: Mic,          label: 'პოდკასტები' },
  { tab: 'INTERESTING',   icon: Star,         label: 'საინტერესო' },
  { tab: 'LIVE',          icon: Radio,        label: 'Live Streams' },
  { tab: 'ADS',           icon: Megaphone,    label: 'რეკლამა' },
  { tab: 'USERS',         icon: Users,        label: 'მომხმარებლები' },
  { tab: 'COMMENTS',      icon: MessageSquare,label: 'კომენტარები' },
  { tab: 'POLLS',         icon: CheckCircle,  label: 'გამოკითხვები' },
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
  const [isAvatarDropdownOpen, setIsAvatarDropdownOpen] = useState(false);
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
  }, []);

  useEffect(() => {
    if (activeTab === 'ADS') {
      apiService.fetchAdPlacement().then(setCurrentAd);
      apiService.fetchAdInquiries().then(setAdInquiries);
    }
  }, [activeTab]);

  useEffect(() => {
    const refreshAdInquiries = () => {
      if (activeTab === 'ADS') {
        apiService.fetchAdInquiries().then(setAdInquiries);
      }
    };

    window.addEventListener('storage', refreshAdInquiries);
    window.addEventListener('paqtebi-ad-inquiry-created', refreshAdInquiries);

    return () => {
      window.removeEventListener('storage', refreshAdInquiries);
      window.removeEventListener('paqtebi-ad-inquiry-created', refreshAdInquiries);
    };
  }, [activeTab]);


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
      addToast(error instanceof Error ? error.message : 'ადმინების ჩატვირთვა ვერ მოხერხდა', 'error');
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
      addToast('ადმინი დაემატა', 'success');
    } catch (error) {
      addToast(error instanceof Error ? error.message : 'ადმინის დამატება ვერ მოხერხდა', 'error');
    } finally {
      setIsSavingAdmin(false);
    }
  };

  const handleDeleteAdmin = async (id: string) => {
    if (!isOwner || !window.confirm('წავშალოთ ეს ადმინი?')) return;
    try {
      await deleteAdminUser(id);
      await refreshAdmins();
      addToast('ადმინი წაიშალა', 'success');
    } catch (error) {
      addToast(error instanceof Error ? error.message : 'ადმინის წაშლა ვერ მოხერხდა', 'error');
    }
  };

  const handleAdminRoleChange = async (id: string, role: AdminUserRecord['role']) => {
    if (!isOwner) return;
    try {
      await updateAdminUserRole(id, role);
      await refreshAdmins();
      addToast('როლი განახლდა', 'success');
    } catch (error) {
      addToast(error instanceof Error ? error.message : 'როლის შეცვლა ვერ მოხერხდა', 'error');
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

  const handleLogout = async () => {
    await logoutAdmin();
    addToast('სესია დასრულდა', 'info');
    onLogout();
    navigate('/admin/login', { replace: true });
  };

  /* ── ARTICLE HANDLERS ─────────────────────────────────────── */
  const handleCreateNew = (forcedContentType?: Article['contentType']) => {
    const nextContentType = forcedContentType || getContentTypeForTab(activeTab);
    const isLive = nextContentType === 'live';
    const isVideo = nextContentType === 'video';
    
    const getCategoryForTab = (tab: Tab) => {
      if (tab === 'LIVE') return 'ლაივი';
      if (tab === 'VIDEO_REPORTS') return 'ვიდეო რეპორტაჟები';
      if (tab === 'PODCASTS') return 'პოდკასტები';
      if (tab === 'INTERESTING') return 'საინტერესო';
      return 'პოლიტიკა';
    };

    setCurrentArticle({
      id: Date.now().toString(),
      date: getTodayDayMonthYear(),
      imageUrl: '',
      author: 'ადმინისტრატორი',
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
      if (article.category === 'პოდკასტები') setActiveTab('PODCASTS');
      else if (article.category === 'საინტერესო') setActiveTab('INTERESTING');
      else setActiveTab('VIDEO_REPORTS');
    }
    else if (article.contentType === 'live') setActiveTab('LIVE');
    else setActiveTab('ARTICLES');
    // Store the original ID so handleSave knows to UPDATE instead of INSERT
    setCurrentArticle({ ...article, _originalId: article.id } as any);
    setIsEditing(true);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('ნამდვილად გსურთ წაშლა?')) {
      removeArticle(id);
      addToast('სტატია წაიშალა', 'success');
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
        addToast(!hasVideoUrl ? 'შეავსეთ ლაივის ბმული' : 'შეავსეთ სათაური', 'error');
        return;
      }

      const liveArticle = {
        date: currentArticle.date || getTodayDayMonthYear(),
        author: sanitizeInput(currentArticle.author || 'ადმინისტრატორი'),
        layout,
        title: sanitizeInput(currentArticle.title),
        category: 'ლაივი',
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
        addToast('ლაივი წარმატებით შეინახა', 'success');
        setIsEditing(false);
      } catch (err) {
        addToast('ლაივის შენახვა ვერ მოხერხდა', 'error');
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
        category: sanitizeInput(currentArticle.category || 'მთავარი'),
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
        addToast('სტატია წარმატებით შეინახა', 'success');
        setIsEditing(false);
      } catch (err: any) {
        const detail = err?.message || '';
        const msg = detail.includes('column') ? 'DB სქემის შეცდომა — გთხოვთ დაუკავშირდეთ ადმინს'
          : detail.includes('size') || detail.includes('too large') ? 'სურათი ძალიან დიდია — გთხოვთ შეამციროთ'
          : 'შენახვისას მოხდა შეცდომა';
        addToast(msg, 'error');
        console.error('[AdminDashboard] save error:', err);
      }
    } else {
      addToast(isVideoType && !hasVideoUrl ? 'შეავსეთ ვიდეოს/ლაივის ბმული' : needsArticleBody ? 'შეავსეთ სათაური და სრული შინაარსი' : 'შეავსეთ ბანერის სათაური', 'error');
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      addToast('მხოლოდ სურათის ფაილები დასაშვებია', 'error');
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    const img = new window.Image();

    img.onload = async () => {
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
      try {
        const uploaded = await uploadArticleImage(compressed);
        setCurrentArticle(prev => ({ ...prev, imageUrl: uploaded.secureUrl }));
        addToast('სურათი Cloudinary-ზე აიტვირთა (' + Math.round((uploaded.bytes || compressed.length) / 1024) + ' KB)', 'success');
      } catch (error) {
        addToast(error instanceof Error ? error.message : 'სურათის Cloudinary-ზე ატვირთვა ვერ მოხერხდა', 'error');
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      addToast('სურათის ჩატვირთვა ვერ მოხერხდა', 'error');
    };

    img.src = objectUrl;
  };

  const handleAdImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      addToast('მხოლოდ სურათის ფაილებია დაშვებული', 'error');
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
      addToast('რეკლამის სურათი აიტვირთა', 'success');
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      addToast('სურათის ჩატვირთვა ვერ მოხერხდა', 'error');
    };

    img.src = objectUrl;
  };

  const handleSaveAd = async (e: React.FormEvent) => {
    e.preventDefault();

    if (currentAd.active && !currentAd.imageUrl) {
      addToast('აქტიური რეკლამისთვის საჭიროა სურათი', 'error');
      return;
    }

    if (currentAd.targetUrl && !/^https?:\/\//i.test(currentAd.targetUrl)) {
      addToast('ლინკი უნდა იწყებოდეს http:// ან https://-ით', 'error');
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
    addToast(saved ? 'რეკლამა შენახულია' : 'რეკლამა შენახულია ლოკალურად', 'success');
  };

  const handleClearAd = async () => {
    if (!window.confirm('წავშალოთ რეკლამის ადგილი?')) return;

    await apiService.clearAdPlacement();
    const emptyAd = getAdPlacement();
    setCurrentAd(emptyAd);
    window.dispatchEvent(new Event('paqtebi-ad-placement-updated'));
    addToast('რეკლამა წაიშალა', 'success');
  };

  const handleAddBreakingNews = (e: React.FormEvent) => {
    e.preventDefault();
    if (newBreakingText.trim()) {
      addTickerItem(sanitizeInput(newBreakingText.trim()));
      setNewBreakingText('');
      addToast('სიახლე დაემატა ლენტას', 'success');
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
    else if (activeTab === 'VIDEO_REPORTS') matchesType = articleContentType === 'video' && a.category === 'ვიდეო რეპორტაჟები';
    else if (activeTab === 'PODCASTS') matchesType = articleContentType === 'video' && a.category === 'პოდკასტები';
    else if (activeTab === 'INTERESTING') matchesType = articleContentType === 'video' && a.category === 'საინტერესო';
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
    activeTab === 'VIDEO_REPORTS' ? 'ვიდეო რეპორტაჟები' :
    activeTab === 'PODCASTS' ? 'პოდკასტები' :
    activeTab === 'INTERESTING' ? 'საინტერესო' :
    'Articles';
    
  const contentViewDescription =
    activeTab === 'LIVE' ? 'მართეთ პირდაპირი ეთერის ბმულები და სტატუსი' :
    activeTab === 'VIDEO_REPORTS' ? 'მართეთ ვიდეო რეპორტაჟები და არქივი' :
    activeTab === 'PODCASTS' ? 'მართეთ პოდკასტები' :
    activeTab === 'INTERESTING' ? 'მართეთ საინტერესო ვიდეოები' :
    'მართეთ ახალი ამბები, მთავარი ბანერი და პოპულარული გვერდითი ბლოკი';
    
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

  /* ────────────────────────────────────────────────────────────
     LAYOUT
  ──────────────────────────────────────────────────────────── */
  return (
    <div className="flex h-screen font-sans" style={{ background: '#f0f2f5' }}>

      {/* ── SIDEBAR (Desktop) ──────────────────────────────────── */}
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
            <div className="text-white text-xs font-semibold">ადმინისტრატორი</div>
            <div className="text-gray-600 text-[10px]">სრული წვდომა</div>
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
          <div className="px-4 py-2 text-[10px] text-gray-700 uppercase tracking-widest font-bold">მენიუ</div>
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
            სისტემიდან გასვლა
          </button>
        </div>
      </aside>

      {/* ── MOBILE TOP BAR ────────────────────────────────────── */}
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
              სისტემიდან გასვლა
            </button>
          </nav>
        </div>
      )}

      {/* ── MAIN ──────────────────────────────────────────────── */}
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
                placeholder="ძებნა..."
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
            {/* Avatar dropdown */}
            <div className="relative">
              <button
                onClick={() => setIsAvatarDropdownOpen((o) => !o)}
                className="w-9 h-9 bg-gradient-to-br from-news-accent to-red-700 rounded-xl flex items-center justify-center text-white text-sm font-bold shadow-sm hover:opacity-90 transition-opacity"
                aria-label="პროფილის მენიუ"
              >
                {currentAdmin?.username?.[0]?.toUpperCase() ?? 'A'}
              </button>

              {isAvatarDropdownOpen && (
                <>
                  {/* Backdrop */}
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setIsAvatarDropdownOpen(false)}
                  />
                  {/* Menu */}
                  <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl border border-gray-100 shadow-xl py-1.5 z-50 animate-fade-up">
                    <div className="px-4 py-2.5 border-b border-gray-100">
                      <div className="text-xs font-bold text-gray-800 truncate">
                        {currentAdmin?.username ?? 'ადმინისტრატორი'}
                      </div>
                      <div className="text-[10px] text-gray-400 truncate">
                        {currentAdmin?.email ?? ''}
                      </div>
                    </div>
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors"
                    >
                      <LogOut size={15} />
                      სისტემიდან გასვლა
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8">

          {/* ── ANALYTICS TAB ────────────────────────────────── */}
          {activeTab === 'ANALYTICS' && (
            <div className="space-y-8 animate-fade-up">
              {/* Stat Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 stagger">
                {[
                  { label: 'სტატიები', value: analytics.totalArticles, icon: FileText, color: '#3b82f6', bg: '#eff6ff', change: '+12%', up: true },
                  { label: 'მომხმარებლები', value: analytics.totalUsers, icon: Users, color: '#8b5cf6', bg: '#f5f3ff', change: '+5%', up: true },
                  { label: 'კომენტარები', value: analytics.totalComments, icon: MessageSquare, color: '#f59e0b', bg: '#fffbeb', change: '0%', up: false },
                  { label: 'ნახვები', value: analytics.totalViews.toLocaleString(), icon: Eye, color: '#10b981', bg: '#f0fdf4', change: '+24%', up: true },
                ].map((stat, i) => (
                  <div key={i} className="stat-card animate-fade-up">
                    <div className="flex items-start justify-between mb-4">
                      <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: stat.bg, color: stat.color }}>
                        <stat.icon size={20} />
                      </div>
                      <span className={`badge text-xs font-bold ${stat.up ? 'badge-green' : 'bg-gray-100 text-gray-500'}`}>
                        {stat.up ? '↑' : '→'} {stat.change}
                      </span>
                    </div>
                    <div className="text-3xl font-black text-gray-900 mb-1">{stat.value}</div>
                    <div className="text-sm text-gray-500">{stat.label}</div>
                  </div>
                ))}
              </div>

              {/* Quick actions */}
              <div>
                <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4">სწრაფი მოქმედებები</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {[
                    { icon: Plus, label: 'ახალი სტატია', desc: 'გამოაქვეყნე ახალი მასალა', action: () => { switchTab('ARTICLES'); handleCreateNew('article'); }, color: '#dc2626', bg: '#fef2f2' },
                    { icon: Users, label: 'მომხმარებლები', desc: 'ნახე დარეგისტრირებულები', action: () => switchTab('USERS'), color: '#8b5cf6', bg: '#f5f3ff' },
                    { icon: Activity, label: 'Breaking News', desc: 'განაახლე ახალი ამბები', action: () => switchTab('ARTICLES'), color: '#f59e0b', bg: '#fffbeb' },
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
                    <h3 className="font-bold text-gray-800">ბოლო სტატიები</h3>
                  </div>
                  <button onClick={() => switchTab('ARTICLES')} className="text-xs text-news-accent font-bold hover:underline flex items-center gap-1">
                    ყველა <ChevronRight size={13} />
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
                        <div className="text-xs text-gray-400">{article.category} · {formatDayMonthYear(article.date)}</div>
                      </div>
                      <span className={`badge ${article.layout === 'hero' ? 'badge-hero' : article.layout === 'sidebar' ? 'badge-sidebar' : 'badge-feed'}`}>
                        {article.layout === 'hero' ? 'ბანერი' : article.layout === 'sidebar' ? 'გვერდი' : 'სიახლე'}
                      </span>
                    </div>
                  ))}
                  {articles.length === 0 && (
                    <div className="py-12 text-center text-gray-400 text-sm">სტატიები არ არის</div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── CONTENT MANAGEMENT TABS ───────────────────────── */}
          {isContentTab(activeTab) && (
            isEditing ? (
              /* ── ARTICLE EDITOR ─────────────────────────── */
              <div className="bg-white rounded-2xl overflow-hidden animate-slide-right" style={{ border: '1px solid #e5e7eb' }}>
                <div className="flex items-center justify-between px-8 py-5" style={{ borderBottom: '1px solid #f3f4f6', background: '#fafafa' }}>
                  <div>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-red-50 text-news-accent flex items-center justify-center">
                        {isLiveContent ? <Radio size={19} /> : isVideoContent ? <PlayCircle size={19} /> : isHeroLayout ? <Monitor size={19} /> : isSidebarLayout ? <Columns size={19} /> : <LayoutTemplate size={19} />}
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-gray-900">
                          {isLiveContent ? 'Live Stream-ის მართვა' : isVideoContent ? 'ვიდეო / არქივის მასალა' : isHeroLayout ? 'მთავარი ბანერის მართვა' : isSidebarLayout ? 'გვერდითი ბლოკის მასალა' : 'ახალი ამბის რედაქტირება'}
                        </h3>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {isLiveContent ? 'საჭიროა მხოლოდ სათაური, live URL და სტატუსი' : isVideoContent ? 'დაამატეთ ვიდეოს ბმული, აღწერა და საჭირო ტექსტი' : isHeroLayout ? 'შეავსეთ მხოლოდ ბანერის სათაური და სურათი' : 'შეავსეთ სტატიისთვის საჭირო ველები'}
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
                    <label className="block text-sm font-bold text-gray-700 mb-3">მასალის ტიპი</label>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                      {[
                        { id: 'hero', icon: Monitor, label: 'მთავარი ბანერი', desc: 'ზედა დიდი სტატია' },
                        { id: 'standard', icon: LayoutTemplate, label: 'ბოლო სიახლეები', desc: 'ჩვეულებრივი სტატია' },
                        { id: 'sidebar', icon: Columns, label: 'გვერდითი ბლოკი', desc: 'მარჯვენა სვეტი' },
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
                          <h4 className="text-sm font-bold text-gray-800">{isLiveContent ? 'Live URL და სტატუსი' : 'ვიდეო პარამეტრები'}</h4>
                          <p className="text-xs text-gray-400 mt-0.5">{isLiveContent ? 'ლაივის მთავარი ველია ბმული - აქ ჩასვით სტრიმის მისამართი' : 'ჩასვით YouTube, Facebook ან სხვა ვიდეოს ბმული'}</p>
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
                        {isHeroLayout ? 'ბანერის სათაური *' : 'სათაური *'}
                      </label>
                      <input
                        type="text"
                        required
                        value={currentArticle.title || ''}
                        onChange={(e) => setCurrentArticle({ ...currentArticle, title: e.target.value })}
                        className="form-input"
                        placeholder={isHeroLayout ? 'შეიყვანეთ ბანერის სათაური...' : 'შეიყვანეთ სათაური...'}
                      />
                    </div>
                    {!isHeroLayout && !isLiveContent && (
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">კატეგორია</label>
                        <select
                          value={currentArticle.category || ''}
                          onChange={(e) => setCurrentArticle({ ...currentArticle, category: e.target.value })}
                          required
                          className="form-input"
                        >
                          <option value="" disabled>აირჩიეთ კატეგორია</option>
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
                        მოკლე აღწერა *
                      </label>
                      <textarea
                        required={true}
                        rows={3}
                        value={currentArticle.summary || ''}
                        onChange={(e) => setCurrentArticle({ ...currentArticle, summary: e.target.value })}
                        className="form-input resize-none"
                        placeholder={isHeroLayout ? 'მოკლე ტექსტი მთავარი ბანერისთვის...' : isSidebarLayout ? 'მოკლე ტექსტი გვერდითი ბლოკისთვის...' : 'გამოჩნდება მთავარ გვერდზე...'}
                      />
                    </div>
                  )}

                  {/* Image Upload */}
                  {!isLiveContent && (
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      {isHeroLayout ? 'ბანერის სურათი' : isLiveContent ? 'მთავარი სურათი (სურვილისამებრ)' : 'მთავარი სურათი'}
                    </label>
                    <div className="rounded-xl overflow-hidden" style={{ border: '2px dashed #e5e7eb' }}>
                      {currentArticle.imageUrl ? (
                        <div className="relative group">
                          <img src={currentArticle.imageUrl} alt="Preview" className={`w-full object-cover ${isHeroLayout ? 'h-80' : 'h-56'}`} loading="eager" decoding="async" />
                          {isHeroLayout && (
                            <div className="absolute inset-x-0 bottom-0 p-6 bg-gradient-to-t from-black/80 to-transparent">
                              <div className="max-w-2xl text-white font-black text-2xl leading-tight">
                                {currentArticle.title || 'ბანერის სათაური'}
                              </div>
                            </div>
                          )}
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <button
                              type="button"
                              onClick={() => setCurrentArticle({ ...currentArticle, imageUrl: '' })}
                              className="flex items-center gap-2 bg-white text-red-500 px-4 py-2 rounded-lg text-sm font-bold shadow-lg"
                            >
                              <Trash2 size={16} /> სურათის წაშლა
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className={`${isHeroLayout ? 'py-16' : 'py-10'} flex flex-col items-center justify-center text-center bg-gray-50`}>
                          <UploadCloud size={40} className="text-gray-300 mb-3" />
                          <p className="text-sm font-semibold text-gray-500 mb-4">
                            {isHeroLayout ? 'ატვირთეთ ფართო ბანერის სურათი' : isLiveContent ? 'ლაივისთვის სურათი აუცილებელი არ არის' : 'ატვირთეთ ფოტო ან გამოიყენეთ შემთხვევითი'}
                          </p>
                          <div className="flex gap-3">
                            <label className="btn-primary cursor-pointer text-sm">
                              <ImageIcon size={15} />
                              ფოტოს არჩევა
                              <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                            </label>
                            <button
                              type="button"
                              onClick={() => setCurrentArticle({ ...currentArticle, imageUrl: getRandomNewsImage() })}
                              className="btn-secondary text-sm"
                            >
                              <Zap size={15} />
                              შემთხვევითი
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
                      <label className="block text-sm font-bold text-gray-700 mb-2">სრული შინაარსი</label>
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
                      გაუქმება
                    </button>
                    <button type="submit" className="btn-primary">
                      <Save size={16} />
                      {isHeroLayout ? 'ბანერის შენახვა' : (currentArticle as any)._originalId ? 'სტატიის განახლება' : 'შენახვა და გამოქვეყნება'}
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              /* ── ARTICLES LIST ─────────────────────────────── */
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
                      placeholder="დაამატეთ ახალი ამბავი..."
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
                          <th>სტატუსი</th>
                          <th>სურათი</th>
                          <th>სათაური</th>
                          <th>კატეგორია</th>
                          <th>თარიღი</th>
                          <th style={{ textAlign: 'right' }}>მოქმედება</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredArticles.map((article) => (
                          <tr key={article.id} className="group">
                            <td>
                              <span className={`badge ${article.layout === 'hero' ? 'badge-hero' : article.layout === 'sidebar' ? 'badge-sidebar' : 'badge-feed'}`}>
                                {article.contentType === 'live' ? 'live' : article.contentType === 'video' ? 'video' : article.layout === 'hero' ? 'ბანერი' : article.layout === 'sidebar' ? 'გვერდი' : 'სიახლე'}
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
                              მასალა არ მოიძებნა
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

          {/* ── USERS TAB ─────────────────────────────────────── */}
          {activeTab === 'ADS' && (
            <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_360px] gap-6 animate-fade-up">
              <form onSubmit={handleSaveAd} className="bg-white rounded-2xl overflow-hidden" style={{ border: '1px solid #e5e7eb' }}>
                <div className="flex items-center justify-between px-6 py-5" style={{ borderBottom: '1px solid #f3f4f6', background: '#fafafa' }}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-red-50 text-news-accent flex items-center justify-center">
                      <Megaphone size={18} />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">სარეკლამო ადგილი</h3>
                      <p className="text-xs text-gray-400 mt-0.5">მარჯვენა სვეტში 300 x 250 ბანერის მართვა</p>
                    </div>
                  </div>
                  <span className={`badge ${currentAd.active ? 'badge-green' : 'bg-gray-100 text-gray-500'}`}>
                    {currentAd.active ? 'აქტიური' : 'გამორთული'}
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
                      <div className="font-bold text-gray-800 text-sm">რეკლამის ჩვენება საიტზე</div>
                      <div className="text-xs text-gray-400 mt-0.5">გამორთვისას ისევ placeholder გამოჩნდება</div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">რეკლამის სათაური</label>
                    <input
                      type="text"
                      value={currentAd.title}
                      onChange={(e) => setCurrentAd({ ...currentAd, title: e.target.value })}
                      className="form-input"
                      placeholder="მაგ: პარტნიორის ბანერი"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">რეკლამის ლინკი</label>
                    <input
                      type="url"
                      value={currentAd.targetUrl}
                      onChange={(e) => setCurrentAd({ ...currentAd, targetUrl: e.target.value })}
                      className="form-input"
                      placeholder="https://example.com"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">ბანერის სურათი</label>
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
                              <Trash2 size={16} /> სურათის წაშლა
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="py-10 flex flex-col items-center justify-center text-center bg-gray-50">
                          <UploadCloud size={40} className="text-gray-300 mb-3" />
                          <p className="text-sm font-semibold text-gray-500 mb-4">ატვირთე 300 x 250 ფორმატის რეკლამა</p>
                          <label className="btn-primary cursor-pointer text-sm">
                            <ImageIcon size={15} />
                            სურათის არჩევა
                            <input type="file" accept="image/*" onChange={handleAdImageUpload} className="hidden" />
                          </label>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-3 pt-4" style={{ borderTop: '1px solid #f3f4f6' }}>
                    <button type="button" onClick={handleClearAd} className="btn-secondary text-red-500 hover:text-red-600">
                      <Trash2 size={16} />
                      წაშლა
                    </button>
                    <button type="submit" className="btn-primary">
                      <Save size={16} />
                      შენახვა
                    </button>
                  </div>
                </div>
              </form>

              <div className="bg-white rounded-2xl p-6 h-fit" style={{ border: '1px solid #e5e7eb' }}>
                <div className="flex items-center gap-2 mb-4">
                  <Eye size={16} className="text-news-accent" />
                  <h3 className="font-bold text-gray-800">საიტზე გამოჩენა</h3>
                </div>
                <div className="rounded-2xl p-5 text-center bg-gray-50 border border-dashed border-gray-200">
                  <span className="text-xs text-gray-400 uppercase tracking-widest block mb-3">რეკლამა</span>
                  {currentAd.active && currentAd.imageUrl ? (
                    <div className="overflow-hidden rounded-xl bg-white border border-gray-200 shadow-sm">
                      <img src={currentAd.imageUrl} alt={currentAd.title || 'რეკლამა'} className="aspect-[6/5] w-full object-cover" />
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
                          <div className="mb-3 text-[10px] font-black uppercase tracking-[0.32em] text-red-100/80">სარეკლამო სივრცე</div>
                          <div className="text-sm font-bold text-white/90">თქვენი</div>
                          <div className="mt-1 text-[28px] font-black leading-none text-white">სარეკლამო</div>
                          <div className="mt-1 text-[28px] font-black leading-none text-transparent" style={{ WebkitTextStroke: '1px rgba(255,255,255,0.55)' }}>
                            ადგილი
                          </div>
                        </div>
                        <div className="flex items-end justify-between gap-3">
                          <span className="text-xs font-black text-white/25">paqtebi.ge</span>
                          <button
                            type="button"
                            disabled
                            className="rounded-sm bg-[#e11d24] px-4 py-2 text-xs font-black text-white shadow-lg opacity-80 cursor-not-allowed"
                          >
                            დაგვიკავშირდით
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                <p className="text-xs text-gray-400 mt-4 leading-relaxed">
                  რეკლამა გამოჩნდება მთავარ გვერდზე მარჯვენა სვეტში. ცვლილების შემდეგ საიტზე დაბრუნებისას ახალი ბანერი დაგხვდება.
                </p>
              </div>

              <div className="xl:col-span-2 bg-white rounded-2xl overflow-hidden" style={{ border: '1px solid #e5e7eb' }}>
                <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <div className="flex items-center gap-2">
                    <MessageSquare size={16} className="text-news-accent" />
                    <h3 className="font-bold text-gray-800">რეკლამის მოთხოვნები</h3>
                    <span className="badge badge-green ml-1">{adInquiries.length} სულ</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => apiService.fetchAdInquiries().then(setAdInquiries)}
                    className="text-xs font-bold text-news-accent hover:underline"
                  >
                    განახლება
                  </button>
                </div>

                {adInquiries.length > 0 ? (
                  <div className="divide-y divide-gray-100">
                    {adInquiries.map((inquiry) => (
                      <div key={inquiry.id} className="grid grid-cols-1 gap-4 px-6 py-5 lg:grid-cols-[220px_1fr]">
                        <div>
                          <div className="font-bold text-gray-900">{inquiry.fullName}</div>
                          <div className="mt-2 space-y-1 text-sm text-gray-500">
                            {inquiry.phone && <div>ტელ: {inquiry.phone}</div>}
                            {inquiry.email && <div>იმეილი: {inquiry.email}</div>}
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
                    <div className="text-sm font-medium">რეკლამის მოთხოვნები ჯერ არ არის</div>
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
          {/* ── COMMENTS TAB ──────────────────────────────────── */}
          {activeTab === 'COMMENTS' && (
            <div className="space-y-4 animate-fade-up">
              {comments.length === 0 ? (
                <div className="bg-white rounded-2xl py-20 text-center" style={{ border: '2px dashed #e5e7eb' }}>
                  <MessageSquare size={44} className="mx-auto text-gray-200 mb-4" />
                  <p className="text-gray-400 font-medium">კომენტარები არ არის</p>
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

          {/* ── POLLS TAB ─────────────────────────────────────── */}
          {activeTab === 'POLLS' && (
            isEditingPoll ? (
              <div className="max-w-2xl mx-auto bg-white rounded-2xl overflow-hidden animate-slide-right" style={{ border: '1px solid #e5e7eb' }}>
                <div className="flex items-center justify-between px-8 py-5" style={{ borderBottom: '1px solid #f3f4f6', background: '#fafafa' }}>
                  <h3 className="text-lg font-bold text-gray-900">
                    {currentPoll.id ? 'გამოკითხვის რედაქტირება' : 'ახალი გამოკითხვა'}
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
                      addToast('გამოკითხვა შენახულია', 'success');
                      setIsEditingPoll(false);
                      setPolls(getPolls());
                    } else {
                      addToast('შეავსეთ ყველა ველი', 'error');
                    }
                  }}
                  className="p-8 space-y-6"
                >
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">კითხვა</label>
                    <input
                      type="text"
                      required
                      value={currentPoll.question || ''}
                      onChange={(e) => setCurrentPoll({ ...currentPoll, question: e.target.value })}
                      className="form-input"
                      placeholder="მაგ: მოგწონთ თუ არა..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-3">პასუხები</label>
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
                            placeholder={`პასუხი ${idx + 1}`}
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
                      <Plus size={14} /> პასუხის დამატება
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
                      გააქტიურება
                    </label>
                  </div>
                  <div className="flex gap-3">
                    <button type="button" onClick={() => setIsEditingPoll(false)} className="btn-secondary flex-1">
                      გაუქმება
                    </button>
                    <button type="submit" className="btn-primary flex-1 justify-center">
                      <Save size={16} /> შენახვა
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
                  <h3 className="font-bold text-gray-600 text-sm">ახალი გამოკითხვა</h3>
                </div>

                {polls.map((poll) => (
                  <div key={poll.id} className="bg-white rounded-2xl p-5 relative group animate-fade-up" style={{ border: '1px solid #e5e7eb' }}>
                    <div className="absolute top-4 right-4 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => { setCurrentPoll(poll); setIsEditingPoll(true); }} className="p-1.5 bg-gray-100 rounded-lg hover:bg-blue-50 text-blue-500 transition-colors">
                        <Edit2 size={14} />
                      </button>
                      <button onClick={() => { if (window.confirm('წავშალოთ?')) { deletePoll(poll.id); setPolls(getPolls()); } }} className="p-1.5 bg-gray-100 rounded-lg hover:bg-red-50 text-red-500 transition-colors">
                        <Trash2 size={14} />
                      </button>
                    </div>
                    <div className="flex items-center gap-2 mb-3">
                      {poll.active ? (
                        <span className="badge badge-green flex items-center gap-1"><CheckCircle size={11} /> აქტიური</span>
                      ) : (
                        <button
                          onClick={() => { setActivePoll(poll.id); setPolls(getPolls()); addToast('გააქტიურდა', 'success'); }}
                          className="badge bg-gray-100 text-gray-500 hover:bg-gray-200 cursor-pointer transition-colors"
                        >
                          გააქტიურება
                        </button>
                      )}
                      <span className="text-xs text-gray-400">{poll.totalVotes} ხმა</span>
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
                      {poll.options.length > 3 && <div className="text-xs text-gray-400 pt-1">+ {poll.options.length - 3} სხვა</div>}
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
