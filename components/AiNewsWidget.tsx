import React, { useEffect, useState } from 'react';
import { ArrowUpRight, Bot, Clock, Sparkles } from 'lucide-react';
import { Article } from '../types';
import { fetchAiFocusedNews } from '../services/geminiService';
import { LazyImage } from './LazyImage';

interface AiNewsWidgetProps {
  onArticleClick?: (article: Article) => void;
}

const fallbackAiArticle: Article = {
  id: 'ai-featured-anthropic-claude-2026',
  title: 'Anthropic-მა OpenAI-ს გადაასწრო: რატომ გახდა Claude AI ბაზრის ყველაზე ხმაურიანი მოთამაშე',
  summary:
    'Claude-ზე მოთხოვნის სწრაფმა ზრდამ Anthropic ხელოვნური ინტელექტის ერთ-ერთ ყველაზე ძვირად შეფასებულ კომპანიად აქცია და AI რბოლაში ახალი ძალთა ბალანსი აჩვენა.',
  content: `
    <p>ხელოვნური ინტელექტის ბაზარზე მთავარი ამბავი უკვე მხოლოდ ChatGPT აღარ არის. ბოლო დაფინანსების რაუნდის შემდეგ Anthropic-ის შეფასებამ თითქმის ტრილიონ დოლარს მიუახლოვა, რამაც კომპანია AI ინდუსტრიის ერთ-ერთ ყველაზე გავლენიან მოთამაშედ აქცია. ინვესტორებისთვის მთავარი სიგნალი Claude-ის სწრაფი გავრცელებაა: მოდელი სულ უფრო ხშირად გამოიყენება კოდირებაში, ანალიტიკაში, დოკუმენტებთან მუშაობასა და კორპორაციულ პროცესებში.</p>
    <p>Anthropic-ის ზრდა საინტერესოა არა მხოლოდ ფინანსური რიცხვებით. კომპანია ცდილობს თავი წარმოაჩინოს, როგორც უფრო ფრთხილი და უსაფრთხო AI ლაბორატორია, რომელიც მოდელების შესაძლებლობებს ეთიკურ კონტროლთან და ბიზნესისთვის სტაბილურ პროდუქტებთან აერთიანებს. სწორედ ამან გახადა Claude განსაკუთრებით მიმზიდველი მსხვილი კომპანიებისთვის, რომლებსაც სურთ AI ყოველდღიურ სამუშაოში ჩართონ, მაგრამ რისკების გარეშე.</p>
    <p>ეს ამბავი AI ბაზარზე ძალთა განლაგებასაც ცვლის. OpenAI კვლავ ყველაზე ცნობად ბრენდად რჩება, Google და Meta კი საკუთარი მოდელებით აქტიურად აწვებიან ბაზარს, თუმცა Anthropic-ის ასეთი სწრაფი ნახტომი აჩვენებს, რომ მომდევნო ეტაპი მხოლოდ უკეთეს ჩატბოტებზე აღარ იქნება. გამარჯვებული ის კომპანია გახდება, ვინც AI-ს რეალურ სამუშაო პროცესებში ყველაზე საიმედოდ ჩასვამს.</p>
  `,
  author: 'Paqtebi AI Desk',
  category: 'AI სიახლეები',
  date: '2026-05-29',
  imageUrl:
    'https://images.unsplash.com/photo-1677442136019-21780ecad995?auto=format&fit=crop&w=900&q=80',
  layout: 'standard',
  contentType: 'article',
};

export const AiNewsWidget: React.FC<AiNewsWidgetProps> = ({ onArticleClick }) => {
  const [featuredAiArticle, setFeaturedAiArticle] = useState<Article>(fallbackAiArticle);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const cacheKey = 'paqtebi_ai_featured_daily_cache_v2';
    const today = new Date().toLocaleDateString('ka-GE');
    const cached = localStorage.getItem(cacheKey);

    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (parsed.date === today && parsed.article) {
          setFeaturedAiArticle(parsed.article);
          setLoading(false);
          return;
        }
      } catch (error) {
        localStorage.removeItem(cacheKey);
      }
    }

    const loadDailyArticle = async () => {
      setLoading(true);
      const articles = await fetchAiFocusedNews();
      const article = articles[0] || fallbackAiArticle;

      if (!mounted) return;

      setFeaturedAiArticle(article);
      setLoading(false);
      localStorage.setItem(cacheKey, JSON.stringify({ date: today, article }));
    };

    loadDailyArticle();

    return () => {
      mounted = false;
    };
  }, []);

  const openArticle = () => {
    onArticleClick?.(featuredAiArticle);
  };

  if (loading) {
    return (
      <section className="bg-white dark:bg-gray-900 rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-800 shadow-sm p-5">
        <div className="flex items-center gap-2 mb-4">
          <span className="w-7 h-7 rounded-lg bg-gray-200 dark:bg-gray-800 animate-pulse" />
          <span className="h-4 w-24 rounded bg-gray-200 dark:bg-gray-800 animate-pulse" />
        </div>
        <div className="aspect-[16/10] rounded-xl bg-gray-200 dark:bg-gray-800 animate-pulse" />
        <div className="mt-5 space-y-3">
          <div className="h-4 rounded bg-gray-200 dark:bg-gray-800 animate-pulse" />
          <div className="h-4 w-10/12 rounded bg-gray-200 dark:bg-gray-800 animate-pulse" />
          <div className="h-3 w-9/12 rounded bg-gray-200 dark:bg-gray-800 animate-pulse" />
        </div>
      </section>
    );
  }

  return (
    <section className="bg-white dark:bg-gray-900 rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-800 shadow-sm">
      <div className="px-5 py-4 flex items-center justify-between border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-2">
          <span className="w-7 h-7 rounded-lg bg-gray-950 dark:bg-white text-white dark:text-gray-950 flex items-center justify-center">
            <Bot size={15} />
          </span>
          <h3 className="font-black text-sm text-gray-950 dark:text-white tracking-tight">
            AI ამბავი
          </h3>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full bg-red-50 dark:bg-red-950/30 px-2.5 py-1 text-[10px] font-bold text-news-accent uppercase tracking-wide">
          <Sparkles size={11} />
          მთავარი
        </span>
      </div>

      <article
        className="group cursor-pointer"
        onClick={openArticle}
      >
        <div className="relative aspect-[16/10] overflow-hidden bg-gray-100 dark:bg-gray-800">
          <LazyImage
            src={featuredAiArticle.imageUrl}
            alt={featuredAiArticle.title}
            className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-500"
          />
          <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/70 to-transparent" />
          <div className="absolute left-4 bottom-4">
            <span className="inline-flex items-center rounded-md bg-white/95 px-2.5 py-1 text-[10px] font-black text-gray-950 shadow-sm">
              {featuredAiArticle.category}
            </span>
          </div>
        </div>

        <div className="p-5">
          <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 mb-2">
            <Clock size={12} />
            <span>{featuredAiArticle.date}</span>
          </div>
          <h4 className="text-[17px] font-black text-gray-950 dark:text-white leading-snug group-hover:text-news-accent transition-colors">
            {featuredAiArticle.title}
          </h4>
          <p className="mt-3 text-sm leading-relaxed text-gray-600 dark:text-gray-300 line-clamp-4">
            {featuredAiArticle.summary}
          </p>
          <div className="mt-4 inline-flex items-center gap-1.5 text-xs font-black text-news-accent">
            წაიკითხე სტატია
            <ArrowUpRight size={14} className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </div>
        </div>
      </article>
    </section>
  );
};
