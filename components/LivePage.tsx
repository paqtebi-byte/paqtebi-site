import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, PlayCircle, Radio, Tv } from "lucide-react";
import { Article } from "../types";
import apiService from "../services/apiService";
import { LoadingSkeleton } from "./LoadingSkeleton";
import { NotFound } from "./NotFound";

export const LivePage: React.FC = () => {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const [streams, setStreams] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);

    apiService.fetchArticles("live").then((items) => {
      if (!active) return;
      setStreams(items);
      setLoading(false);
    });

    return () => {
      active = false;
    };
  }, []);

  if (loading) return <LoadingSkeleton />;

  const live = id ? streams.find((item) => item.id === id) : undefined;
  if (id && !live) return <NotFound />;

  return (
    <div className="min-h-screen bg-[#070b14] text-white">
      <header className="border-b border-white/10 bg-[#0b0f19]/95 backdrop-blur">
        <div className="mx-auto flex max-w-screen-xl items-center justify-between px-4 py-4 md:px-6">
          <button
            onClick={() => navigate("/")}
            className="inline-flex items-center gap-2 text-sm font-bold text-gray-300 transition-colors hover:text-white"
          >
            <ArrowLeft size={18} />
            მთავარ გვერდზე
          </button>
          <div className="inline-flex items-center gap-2 rounded-full border border-red-500/40 bg-red-500/10 px-4 py-2 text-xs font-black uppercase tracking-wider text-red-300">
            <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
            Live
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-screen-xl px-4 py-8 md:px-6 md:py-12">
        <div className="mb-6">
          <div className="mb-3 inline-flex items-center gap-2 text-sm font-bold text-red-300">
            <Radio size={17} />
            პირდაპირი ეთერი
          </div>
          <h1 className="max-w-4xl text-3xl font-black leading-tight md:text-5xl">
            {live?.title || "აირჩიე ტელევიზია"}
          </h1>
        </div>

        {streams.length > 0 && (
          <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <div className="mb-4 flex items-center gap-2">
              <Tv size={18} className="text-red-300" />
              <h2 className="text-sm font-black uppercase tracking-wider text-gray-200">
                აირჩიე ტელევიზია
              </h2>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {streams.map((stream) => {
                const isActive = Boolean(live && stream.id === live.id);

                return (
                  <button
                    key={stream.id}
                    type="button"
                    onClick={() => {
                      if (stream.videoUrl) {
                        window.open(stream.videoUrl, "_blank", "noopener,noreferrer");
                      } else if (!isActive) {
                        navigate(`/live/${stream.id}`);
                      }
                    }}
                    className={`group rounded-xl border p-4 text-left transition-all ${
                      isActive
                        ? "border-red-400/70 bg-red-500/15 shadow-lg shadow-red-950/30"
                        : "border-white/10 bg-white/5 hover:border-red-400/50 hover:bg-white/10"
                    }`}
                  >
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${
                          isActive ? "bg-red-500 text-white" : "bg-white/10 text-red-200"
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            isActive ? "animate-pulse bg-white" : "bg-red-400"
                          }`}
                        />
                        {isActive ? "ჩართულია" : "Live"}
                      </span>
                      <span
                        className={`flex h-8 w-8 items-center justify-center rounded-full transition-transform ${
                          isActive
                            ? "bg-red-500 text-white"
                            : "bg-white/10 text-gray-300 group-hover:scale-105 group-hover:text-white"
                        }`}
                      >
                        <PlayCircle size={17} />
                      </span>
                    </div>

                    <div className="line-clamp-2 text-sm font-black leading-snug text-white">
                      {stream.title}
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        )}
      </main>
    </div>
  );
};
