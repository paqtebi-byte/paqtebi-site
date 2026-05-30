import React, { useEffect, useState } from "react";
import ReactPlayer from "react-player";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Calendar, MessageCircle, PlayCircle, ThumbsDown, ThumbsUp, User } from "lucide-react";
import { Article, User as UserType } from "../types";
import apiService from "../services/apiService";
import { normalizeArticleHtml } from "../utils/articleHtml";
import { ArticleExcerpt } from "./ArticleExcerpt";
import { CommentSection } from "./CommentSection";
import { LazyImage } from "./LazyImage";
import { LoadingSkeleton } from "./LoadingSkeleton";
import { NotFound } from "./NotFound";

interface VideoPageProps {
  category?: string;
  title?: string;
  currentUser: UserType | null;
  onLoginRequest: () => void;
  isAdmin?: boolean;
}

export const VideoPage: React.FC<VideoPageProps> = ({ category, title, currentUser, onLoginRequest, isAdmin }) => {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const [videos, setVideos] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [reactions, setReactions] = useState({ like: 0, dislike: 0 });

  useEffect(() => {
    let active = true;
    setLoading(true);
    apiService.fetchArticles("video").then((items) => {
      if (!active) return;
      const filtered = category ? items.filter((v) => v.category === category) : items;
      setVideos(filtered);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, []);

  const selectedVideo = id ? videos.find((item) => item.id === id) : undefined;

  useEffect(() => {
    if (!selectedVideo) return;
    try {
      const saved = localStorage.getItem(`paqtebi_video_reactions_${selectedVideo.id}`);
      setReactions(saved ? JSON.parse(saved) : { like: 0, dislike: 0 });
    } catch {
      setReactions({ like: 0, dislike: 0 });
    }
  }, [selectedVideo?.id]);

  if (loading) return <LoadingSkeleton />;
  if (id && !selectedVideo) return <NotFound />;

  const handleReaction = (type: "like" | "dislike") => {
    if (!selectedVideo) return;
    if (!currentUser) {
      onLoginRequest();
      return;
    }
    setReactions((prev) => {
      const next = { ...prev, [type]: prev[type] + 1 };
      localStorage.setItem(`paqtebi_video_reactions_${selectedVideo.id}`, JSON.stringify(next));
      return next;
    });
  };

  if (!selectedVideo) {
    return (
      <div className="min-h-screen bg-white text-news-black dark:bg-[#070b14] dark:text-white">
        <header className="border-b border-gray-100 bg-white/95 px-4 py-4 backdrop-blur dark:border-gray-800 dark:bg-[#0b0f19]/95 md:px-6">
          <div className="mx-auto flex max-w-screen-xl items-center justify-between">
            <button onClick={() => navigate("/")} className="inline-flex items-center gap-2 text-sm font-bold text-gray-600 hover:text-news-accent dark:text-gray-300">
              <ArrowLeft size={18} />
              მთავარ გვერდზე
            </button>
          </div>
        </header>
        <main className="mx-auto max-w-screen-xl px-4 py-10 md:px-6">
          <div className="mb-8">
            <div className="mb-2 inline-flex items-center gap-2 text-sm font-black uppercase tracking-wider text-news-accent">
              <PlayCircle size={18} />
              ვიდეო
            </div>
            <h1 className="text-3xl font-black md:text-5xl">{title || "გადაცემები და არქივი"}</h1>
          </div>

          {videos.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-12 text-center text-gray-500 dark:border-gray-800 dark:bg-gray-900/40">
              ვიდეო მასალა ჯერ არ არის დამატებული.
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {videos.map((video) => (
                <article
                  key={video.id}
                  onClick={() => {
                    const basePath = category === 'პოდკასტები' ? '/podcasts' : category === 'საინტერესო' ? '/interesting' : '/video-reports';
                    navigate(`${basePath}/${video.id}`);
                  }}
                  className="group cursor-pointer overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl dark:border-gray-800 dark:bg-gray-900"
                >
                  <div className="relative aspect-video bg-gray-100 dark:bg-gray-800">
                    <LazyImage src={video.videoThumbnailUrl || video.imageUrl} alt={video.title} className="h-full w-full" />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/25 transition-colors group-hover:bg-black/35">
                      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white text-news-accent shadow-lg">
                        <PlayCircle size={28} />
                      </div>
                    </div>
                  </div>
                  <div className="p-5">
                    <div className="mb-2 text-xs font-bold text-gray-400">{video.date}</div>
                    <h2 className="line-clamp-2 text-lg font-black leading-snug group-hover:text-news-accent">{video.title}</h2>
                    <ArticleExcerpt summary={video.summary} className="mt-3" />
                  </div>
                </article>
              ))}
            </div>
          )}
        </main>
      </div>
    );
  }

  const articleHtml = normalizeArticleHtml(selectedVideo.content);

  return (
    <div className="min-h-screen bg-white text-news-black dark:bg-[#070b14] dark:text-white">
      <header className="sticky top-0 z-20 border-b border-gray-100 bg-white/95 px-4 py-4 backdrop-blur dark:border-gray-800 dark:bg-[#0b0f19]/95 md:px-6">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <button onClick={() => {
            const basePath = category === 'პოდკასტები' ? '/podcasts' : category === 'საინტერესო' ? '/interesting' : '/video-reports';
            navigate(basePath);
          }} className="inline-flex items-center gap-2 text-sm font-bold text-gray-600 hover:text-news-accent dark:text-gray-300">
            <ArrowLeft size={18} />
            {title || "ვიდეო არქივი"}
          </button>
          <a href="#comments" className="inline-flex items-center gap-2 rounded-full border border-gray-200 px-4 py-2 text-sm font-bold text-gray-600 hover:border-news-accent hover:text-news-accent dark:border-gray-700 dark:text-gray-300">
            <MessageCircle size={16} />
            კომენტარები
          </a>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8 pb-20 md:px-0">
        <div className="mb-6">
          <div className="mb-4 inline-flex items-center gap-2 rounded-sm bg-red-50 px-3 py-1 text-xs font-black uppercase tracking-wider text-news-accent dark:bg-red-950/20">
            <PlayCircle size={15} />
            ვიდეო
          </div>
          <h1 className="text-3xl font-black leading-tight md:text-5xl">{selectedVideo.title}</h1>
          <div className="mt-5 flex flex-wrap items-center gap-4 border-b border-gray-100 pb-5 text-sm text-gray-500 dark:border-gray-800 dark:text-gray-400">
            <span className="inline-flex items-center gap-2"><User size={16} />{selectedVideo.author}</span>
            <span className="inline-flex items-center gap-2"><Calendar size={16} />{selectedVideo.date}</span>
          </div>
        </div>

        <section className="overflow-hidden rounded-xl border border-gray-100 bg-black shadow-xl dark:border-gray-800">
          <div className="aspect-video">
            {selectedVideo.videoUrl ? (
              <ReactPlayer src={selectedVideo.videoUrl} controls width="100%" height="100%" />
            ) : (
              <LazyImage src={selectedVideo.videoThumbnailUrl || selectedVideo.imageUrl} alt={selectedVideo.title} className="h-full w-full" />
            )}
          </div>
        </section>

        {selectedVideo.summary && (
          <div className="mt-8 rounded-xl border border-gray-100 bg-gray-50 p-5 text-sm leading-7 text-gray-700 dark:border-gray-800 dark:bg-gray-900/45 dark:text-gray-300">
            {selectedVideo.summary}
          </div>
        )}

        {articleHtml && (
          <div className="article-body prose-lg mt-8 max-w-none" dangerouslySetInnerHTML={{ __html: articleHtml }} />
        )}

        <div className="mt-10 rounded-md border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900/40">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-sm font-bold">როგორ შეაფასებდით ვიდეოს?</div>
              <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">რეაქციის დასატოვებლად საჭიროა შესვლა ან რეგისტრაცია.</div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => handleReaction("like")} className="inline-flex items-center gap-2 rounded-sm border border-gray-200 bg-gray-50 px-4 py-2 text-sm font-bold text-gray-700 transition-colors hover:border-green-300 hover:text-green-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200">
                <ThumbsUp size={16} />
                {reactions.like}
              </button>
              <button onClick={() => handleReaction("dislike")} className="inline-flex items-center gap-2 rounded-sm border border-gray-200 bg-gray-50 px-4 py-2 text-sm font-bold text-gray-700 transition-colors hover:border-red-300 hover:text-news-accent dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200">
                <ThumbsDown size={16} />
                {reactions.dislike}
              </button>
            </div>
          </div>
        </div>

        <CommentSection
          articleId={selectedVideo.id}
          articleTitle={selectedVideo.title}
          currentUser={currentUser}
          onLoginRequest={onLoginRequest}
          isAdmin={isAdmin}
        />
      </main>
    </div>
  );
};
