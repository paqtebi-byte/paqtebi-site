import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom';
import { Clock, Eye, Mail, MessageSquare, Phone, PlayCircle, Send, TrendingUp, User, X } from 'lucide-react';
import { Article } from '../types';
import { LazyImage } from './LazyImage';
import { SidebarVideoSection } from './SidebarVideoSection';
import { ArticleExcerpt } from './ArticleExcerpt';
import { PollWidget } from './PollWidget';
import { MostReadWidget } from './MostReadWidget';
import { ZodiacWidget } from './ZodiacWidget';
import { getAdPlacement } from '../services/storageService';
import apiService from '../services/apiService';
import { useToast } from '../context/ToastContext';
import { formatDayMonthYear } from '../utils/dateFormat';

interface SidebarProps {
  articles?: Article[];
  customArticles?: Article[];
  videos?: Article[];
  onArticleClick?: (article: Article) => void;
}

const adPlacementCache: { data: ReturnType<typeof getAdPlacement> | null; ts: number } = { data: null, ts: 0 };
const AD_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

const getCachedAdPlacement = async () => {
  if (adPlacementCache.data && Date.now() - adPlacementCache.ts < AD_CACHE_TTL) {
    return adPlacementCache.data;
  }
  const fresh = await apiService.fetchAdPlacement();
  adPlacementCache.data = fresh;
  adPlacementCache.ts = Date.now();
  return fresh;
};

export const Sidebar: React.FC<SidebarProps> = React.memo(({ articles = [], customArticles = [], videos = [], onArticleClick }) => {
  const [adPlacement, setAdPlacement] = useState(() => getAdPlacement());
  const [isAdFormOpen, setIsAdFormOpen] = useState(false);
  const [adInquiryForm, setAdInquiryForm] = useState({ fullName: '', phone: '', email: '', message: '' });
  const [isSubmittingAdInquiry, setIsSubmittingAdInquiry] = useState(false);
  const { addToast } = useToast();

  useEffect(() => {
    const refreshAd = () => {
      adPlacementCache.data = null; // invalidate cache on storage event
      getCachedAdPlacement().then((ad) => {
        setAdPlacement(ad);
      });
    };

    getCachedAdPlacement().then(setAdPlacement);

    window.addEventListener('storage', refreshAd);
    window.addEventListener('paqtebi-ad-placement-updated', refreshAd);

    return () => {
      window.removeEventListener('storage', refreshAd);
      window.removeEventListener('paqtebi-ad-placement-updated', refreshAd);
    };
  }, []);


  const [mostDiscussed, setMostDiscussed] = useState<{ article: Article, commentCount: number }[]>([]);

  useEffect(() => {
    let active = true;
    const fetchMostDiscussed = async () => {
      try {
        const comments = await apiService.fetchComments();
        const counts: Record<string, number> = {};
        
        comments.forEach(c => {
          if (c.author !== '__paqtebi_view__' && !c.text.startsWith('[[paqtebi-')) {
            counts[c.articleId] = (counts[c.articleId] || 0) + 1;
          }
        });
        
        const sortedIds = Object.keys(counts).sort((a, b) => counts[b] - counts[a]);
        const result: { article: Article, commentCount: number }[] = [];
        
        for (const id of sortedIds) {
          if (result.length >= 4) break;
          let article = articles.find(a => a.id === id);
          if (!article) {
            article = await apiService.fetchArticleById(id) || undefined;
          }
          if (article) {
            result.push({ article, commentCount: counts[id] });
          }
        }
        
        if (result.length < 4) {
          const needed = 4 - result.length;
          const recent = articles.filter(a => {
            if (result.some(r => r.article.id === a.id)) return false;
            
            // Exclude if title is missing, empty, or exactly "Paqtebi.ge"
            const isTitleInvalid = !a.title || a.title.trim() === '' || a.title.trim() === 'Paqtebi.ge';
            
            // Exclude if content/body is missing or empty. 
            // Since `content` isn't always fetched in the list API to save egress, we fall back to checking `summary` as a reliable indicator of an empty draft.
            const isContentInvalid = (!a.content || a.content.trim() === '') && (!a.summary || a.summary.trim() === '');
            
            return !isTitleInvalid && !isContentInvalid;
          }).slice(0, needed);
          
          recent.forEach(r => {
            result.push({ article: r, commentCount: 0 });
          });
        }
        
        if (active) {
          setMostDiscussed(result);
        }
      } catch (err) {
        console.error('Failed to fetch most discussed:', err);
      }
    };
    
    if (articles.length > 0) {
      fetchMostDiscussed();
    }
    
    return () => { active = false; };
  }, [articles.length > 0]);

  const videoReports = videos.filter(v => v.category === 'ვიდეო რეპორტაჟები').slice(0, 1);
  const podcasts = videos.filter(v => v.category === 'პოდკასტები').slice(0, 1);
  const interesting = videos.filter(v => v.category === 'საინტერესო').slice(0, 1);

  const handleAdInquirySubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!adInquiryForm.fullName.trim() || !adInquiryForm.message.trim()) {
      addToast('შეავსეთ სახელი და რეკლამის დეტალები', 'error');
      return;
    }

    setIsSubmittingAdInquiry(true);
    const saved = await apiService.insertAdInquiry({
      fullName: adInquiryForm.fullName.trim(),
      phone: adInquiryForm.phone.trim(),
      email: adInquiryForm.email.trim(),
      message: adInquiryForm.message.trim(),
    });
    setIsSubmittingAdInquiry(false);

    if (saved) {
      setAdInquiryForm({ fullName: '', phone: '', email: '', message: '' });
      setIsAdFormOpen(false);
      window.dispatchEvent(new Event('paqtebi-ad-inquiry-created'));
      addToast('შეტყობინება გაიგზავნა', 'success');
    } else {
      addToast('შეტყობინების გაგზავნა ვერ მოხერხდა', 'error');
    }
  };

  const renderDefaultAdCreative = () => (
    <div className="relative aspect-[6/5] w-full overflow-hidden rounded-xl bg-[#111217] text-left text-white shadow-sm">
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
            onClick={() => setIsAdFormOpen(true)}
            className="rounded-sm bg-[#e11d24] px-4 py-2 text-xs font-black text-white shadow-lg transition-colors hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-white/60"
          >
            დაგვიკავშირდით
          </button>
        </div>
      </div>
    </div>
  );

  const renderAdPlacement = () => (
    <div className="rounded-2xl p-5 text-center bg-gray-50 dark:bg-gray-900 border border-dashed border-gray-200 dark:border-gray-800">
      <span className="text-xs text-gray-400 uppercase tracking-widest block mb-3">თქვენი რეკლამის ადგილი</span>
      {adPlacement.active && adPlacement.imageUrl ? (
        <a
          href={adPlacement.targetUrl || '#'}
          target={adPlacement.targetUrl ? '_blank' : undefined}
          rel={adPlacement.targetUrl ? 'noopener noreferrer sponsored' : undefined}
          aria-label={adPlacement.title || 'რეკლამა'}
          className="block overflow-hidden rounded-xl bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 transition-transform hover:-translate-y-0.5 group"
          onClick={() => apiService.trackAdView()}
        >
          {adPlacement.title && (
            <div className="bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 p-3 text-left">
              <h4 className="text-sm font-bold text-gray-800 dark:text-gray-200 group-hover:text-news-accent transition-colors">{adPlacement.title}</h4>
            </div>
          )}
          <img
            src={adPlacement.imageUrl}
            alt={adPlacement.title || 'რეკლამა'}
            className="aspect-[6/5] w-full object-cover"
            loading="lazy"
            decoding="async"
          />
        </a>
      ) : (
        renderDefaultAdCreative()
      )}
    </div>
  );

  return (
    <div className="space-y-6">

      {/* Ad placement */}
      {renderAdPlacement()}

      {isAdFormOpen && ReactDOM.createPortal(
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          onClick={() => setIsAdFormOpen(false)}
        >
          <div
            className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-gray-950"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setIsAdFormOpen(false)}
              className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800 dark:hover:text-white"
              aria-label="დახურვა"
            >
              <X size={18} className="pointer-events-none" />
            </button>
            <div className="mb-5 pr-8">
              <div className="mb-2 inline-flex rounded-full bg-red-50 px-3 py-1 text-xs font-black uppercase tracking-wide text-news-accent dark:bg-red-950/30">
                რეკლამის განთავსება
              </div>
              <h3 className="text-xl font-black text-gray-950 dark:text-white">დაგვიკავშირდით</h3>
              <p className="mt-1 text-sm leading-relaxed text-gray-500 dark:text-gray-400">
                მოგვწერეთ რეკლამის დეტალები და ადმინისტრატორი დაგიკავშირდებათ.
              </p>
            </div>

            <form onSubmit={handleAdInquirySubmit} className="space-y-3">
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={17} />
                <input
                  type="text"
                  required
                  value={adInquiryForm.fullName}
                  onChange={(e) => setAdInquiryForm({ ...adInquiryForm, fullName: e.target.value })}
                  className="w-full rounded-lg border border-gray-200 py-3 pl-10 pr-3 text-sm outline-none transition-shadow focus:ring-2 focus:ring-news-accent/30 dark:border-gray-800 dark:bg-gray-900 dark:text-white"
                  placeholder="სახელი და გვარი"
                />
              </div>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={17} />
                <input
                  type="tel"
                  value={adInquiryForm.phone}
                  onChange={(e) => setAdInquiryForm({ ...adInquiryForm, phone: e.target.value })}
                  className="w-full rounded-lg border border-gray-200 py-3 pl-10 pr-3 text-sm outline-none transition-shadow focus:ring-2 focus:ring-news-accent/30 dark:border-gray-800 dark:bg-gray-900 dark:text-white"
                  placeholder="ტელეფონი"
                />
              </div>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={17} />
                <input
                  type="email"
                  value={adInquiryForm.email}
                  onChange={(e) => setAdInquiryForm({ ...adInquiryForm, email: e.target.value })}
                  className="w-full rounded-lg border border-gray-200 py-3 pl-10 pr-3 text-sm outline-none transition-shadow focus:ring-2 focus:ring-news-accent/30 dark:border-gray-800 dark:bg-gray-900 dark:text-white"
                  placeholder="იმეილი"
                />
              </div>
              <div className="relative">
                <MessageSquare className="absolute left-3 top-3 text-gray-400" size={17} />
                <textarea
                  required
                  rows={4}
                  value={adInquiryForm.message}
                  onChange={(e) => setAdInquiryForm({ ...adInquiryForm, message: e.target.value })}
                  className="w-full resize-none rounded-lg border border-gray-200 py-3 pl-10 pr-3 text-sm outline-none transition-shadow focus:ring-2 focus:ring-news-accent/30 dark:border-gray-800 dark:bg-gray-900 dark:text-white"
                  placeholder="მოგვწერეთ რეკლამის განთავსების დეტალები"
                />
              </div>
              <button
                type="submit"
                disabled={isSubmittingAdInquiry}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-news-accent py-3 text-sm font-black text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Send size={16} />
                {isSubmittingAdInquiry ? 'იგზავნება...' : 'გაგზავნა'}
              </button>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Poll Widget */}
      <PollWidget />

      {/* Most Read */}
      <MostReadWidget onArticleClick={onArticleClick} />

      {/* Zodiac */}
      <ZodiacWidget />

      {/* Admin-Added Sidebar Articles */}
      {customArticles.length > 0 && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-800">
          <div className="px-5 py-4 flex items-center gap-2 border-b border-gray-100 dark:border-gray-800">
            <TrendingUp size={16} className="text-news-accent" />
            <h3 className="section-title text-sm">რჩეული პოსტები</h3>
          </div>
          <div className="p-4 space-y-5">
            {customArticles.map((article) => (
              <article
                key={article.id}
                className="group cursor-pointer rounded-xl overflow-hidden border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-950 hover:shadow-lg transition-all"
                onClick={() => onArticleClick && onArticleClick(article)}
              >
                <div className="relative aspect-[16/10] overflow-hidden bg-gray-100 dark:bg-gray-800">
                  <LazyImage
                    src={article.imageUrl}
                    alt={article.title}
                    className="w-full h-full transform group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute bottom-3 left-3">
                    <span className="category-badge">{article.category || 'რჩეული'}</span>
                  </div>
                </div>
                <div className="p-4">
                  <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-2">
                    <Clock size={11} />
                    <span>{formatDayMonthYear(article.date)}</span>
                  </div>
                  <h4 className="text-base font-bold text-gray-900 dark:text-white leading-snug group-hover:text-news-accent transition-colors line-clamp-2">
                    {article.title}
                  </h4>
                  {article.summary && (
                    <ArticleExcerpt summary={article.summary} className="mt-2" />
                  )}
                </div>
              </article>
            ))}
          </div>
        </div>
      )}

      {/* Most Discussed Articles */}
      {!customArticles.length && mostDiscussed.length > 0 && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-800">
          <div className="px-5 py-4 flex items-center gap-2 border-b border-gray-100 dark:border-gray-800">
            <MessageSquare size={16} className="text-news-accent" />
            <h3 className="section-title text-sm">ცხელი განხილვები</h3>
          </div>
          <ul className="divide-y divide-gray-50 dark:divide-gray-800">
            {mostDiscussed.map((item, index) => (
              <li key={item.article.id} onClick={() => onArticleClick?.(item.article)} className="group cursor-pointer p-4 hover:bg-gray-50 dark:hover:bg-gray-800/60 transition-colors">
                <div className="flex gap-3 items-start">
                  <span className="text-2xl font-black leading-none mt-0.5 flex-shrink-0" style={{ color: index === 0 ? '#dc2626' : '#e5e7eb' }}>
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-100 leading-snug mb-1 group-hover:text-news-accent transition-colors line-clamp-2">
                      {item.article.title}
                    </h4>
                    <div className="flex items-center gap-3 text-xs text-gray-400">
                      {item.commentCount > 0 ? (
                        <span className="flex items-center gap-1 text-news-accent font-semibold">
                          <MessageSquare size={11} />
                          {item.commentCount} კომენტარი
                        </span>
                      ) : (
                        <span className="flex items-center gap-1">
                          <Clock size={11} />
                          ახალი
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Eye size={11} />
                        <span>{item.article.viewCount || 0} ნახვა</span>
                      </span>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Sidebar Video Sections */}
      <div className="space-y-6">
        <SidebarVideoSection title="ვიდეო რეპორტაჟები" items={videoReports} onArticleClick={onArticleClick} />
        <SidebarVideoSection title="პოდკასტები" items={podcasts} onArticleClick={onArticleClick} />
        <SidebarVideoSection title="საინტერესო" items={interesting} onArticleClick={onArticleClick} />
      </div>

    </div>
  );
});
