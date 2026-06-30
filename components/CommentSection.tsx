import React, { useState } from 'react';
import { Comment, User as UserType } from '../types';
import { Send, User, Lock, Trash2, ThumbsUp, ThumbsDown, Heart, MessageCircle } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { useComments } from '../hooks/useComments';
import { sanitizeInput } from '../utils/security';
import { formatDayMonthYear } from '../utils/dateFormat';

const COMMENT_SAVE_SUCCESS = '\u10d9\u10dd\u10db\u10d4\u10dc\u10e2\u10d0\u10e0\u10d8 \u10d3\u10d0\u10d4\u10db\u10d0\u10e2\u10d0';
const COMMENT_SAVE_ERROR = '\u10d9\u10dd\u10db\u10d4\u10dc\u10e2\u10d0\u10e0\u10d8\u10e1 \u10d2\u10d0\u10d2\u10d6\u10d0\u10d5\u10dc\u10d0 \u10d5\u10d4\u10e0 \u10db\u10dd\u10ee\u10d4\u10e0\u10ee\u10d3\u10d0';
const COMMENT_DELETE_ERROR = '\u10d9\u10dd\u10db\u10d4\u10dc\u10e2\u10d0\u10e0\u10d8\u10e1 \u10ec\u10d0\u10e8\u10da\u10d0 \u10d5\u10d4\u10e0 \u10db\u10dd\u10ee\u10d4\u10e0\u10ee\u10d3\u10d0';
const REACTION_SAVE_ERROR = '\u10e0\u10d4\u10d0\u10e5\u10ea\u10d8\u10d8\u10e1 \u10e8\u10d4\u10dc\u10d0\u10ee\u10d5\u10d0 \u10d5\u10d4\u10e0 \u10db\u10dd\u10ee\u10d4\u10e0\u10ee\u10d3\u10d0';

interface CommentSectionProps {
  articleId: string;
  articleTitle: string;
  currentUser: UserType | null;
  onLoginRequest: () => void;
  isAdmin?: boolean;
}

const reactionOptions = [
  { icon: ThumbsUp, label: 'like', title: 'მომწონს' },
  { icon: ThumbsDown, label: 'dislike', title: 'არ მომწონს' },
  { icon: Heart, label: 'heart', title: 'მიყვარს' },
];

export const CommentSection: React.FC<CommentSectionProps> = ({
  articleId,
  articleTitle,
  currentUser,
  onLoginRequest,
  isAdmin,
}) => {
  const { addToast } = useToast();
  const { comments, addComment, removeComment, addReaction } = useComments(articleId);
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !currentUser || isSubmitting) return;

    const cleanText = sanitizeInput(newComment);
    const comment: Omit<Comment, 'id' | 'timestamp'> = {
      articleId,
      articleTitle,
      author: currentUser.username,
      text: cleanText,
    };

    setIsSubmitting(true);
    try {
      await addComment(comment);
      setNewComment('');
    } catch (error) {
      console.error('[CommentSection] submit error:', error);
      addToast(COMMENT_SAVE_ERROR, 'error');
      setIsSubmitting(false);
      return;
    }
    setIsSubmitting(false);
    addToast(COMMENT_SAVE_SUCCESS, 'success');
  };

  return (
    <section id="comments" className="mt-14 pt-10 border-t border-gray-200 dark:border-gray-800">
      <div className="flex items-center justify-between gap-4 mb-6">
        <div>
          <div className="inline-flex items-center gap-2 text-news-accent text-xs font-bold uppercase tracking-wider mb-2">
            <MessageCircle size={15} />
            დისკუსია
          </div>
          <h3 className="text-2xl font-extrabold text-news-black dark:text-white">
            კომენტარები ({comments.length})
          </h3>
        </div>
      </div>

      {currentUser ? (
        <form onSubmit={handleSubmit} className="mb-8 rounded-md border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/50 p-4 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-news-accent text-white flex items-center justify-center font-extrabold">
              {currentUser.username.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="text-xs text-gray-500 dark:text-gray-400">კომენტარს წერს</div>
              <div className="text-sm font-bold text-news-black dark:text-white">{currentUser.username}</div>
            </div>
          </div>
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="დაწერეთ თქვენი აზრი..."
            aria-label="დაწერეთ კომენტარი"
            rows={4}
            className="w-full resize-none rounded-sm border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/70 p-4 text-sm text-news-black dark:text-white outline-none transition-all placeholder-gray-400 focus:border-news-accent focus:bg-white dark:focus:bg-gray-900 focus:ring-4 focus:ring-red-500/10"
          />
          <div className="mt-3 flex justify-end">
            <button
              type="submit"
              disabled={!newComment.trim() || isSubmitting}
              className="inline-flex items-center gap-2 rounded-sm bg-news-accent px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Send size={16} />
              გაგზავნა
            </button>
          </div>
        </form>
      ) : (
        <div className="mb-8 rounded-md border border-red-100 dark:border-red-900/40 bg-red-50/60 dark:bg-red-950/10 p-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-white dark:bg-gray-900 text-news-accent shadow-sm">
            <Lock size={22} aria-hidden="true" />
          </div>
          <h4 className="text-lg font-extrabold text-news-black dark:text-white">კომენტარის დასატოვებლად გაიარეთ ავტორიზაცია</h4>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            შესვლის ან რეგისტრაციის შემდეგ შეძლებთ კომენტარის, ლაიქისა და დისლაიქის დატოვებას.
          </p>
          <button
            onClick={onLoginRequest}
            className="mt-4 inline-flex items-center justify-center rounded-sm bg-news-accent px-6 py-2.5 text-sm font-bold text-white transition-colors hover:bg-red-700"
          >
            შესვლა / რეგისტრაცია
          </button>
        </div>
      )}

      <div className="space-y-4">
        {comments.length === 0 ? (
          <div className="rounded-md border border-dashed border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/30 p-8 text-center">
            <User className="mx-auto mb-3 text-gray-300 dark:text-gray-600" size={34} />
            <div className="font-bold text-news-black dark:text-white">კომენტარები ჯერ არ არის</div>
            <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">იყავით პირველი, ვინც აზრს დატოვებს.</div>
          </div>
        ) : (
          comments.map((comment) => (
            <article key={comment.id} className="group rounded-md border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/45 p-4 shadow-sm">
              <div className="flex gap-4">
                <div className="w-11 h-11 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center flex-shrink-0 text-gray-600 dark:text-gray-300 font-extrabold">
                  {comment.author.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-bold text-sm text-news-black dark:text-gray-100">{comment.author}</div>
                      <time className="text-xs text-gray-400 dark:text-gray-500">
                        {formatDayMonthYear(new Date(comment.timestamp))}
                      </time>
                    </div>
                    {(isAdmin || currentUser?.username === comment.author) && (
                      <button
                        onClick={() => {
                          if (window.confirm('წავშალოთ კომენტარი?')) {
                            removeComment(comment.id).catch((error) => {
                              console.error('[CommentSection] delete error:', error);
                              addToast(COMMENT_DELETE_ERROR, 'error');
                            });
                          }
                        }}
                        className="rounded-sm p-2 text-gray-400 opacity-0 transition-all hover:bg-red-50 hover:text-news-accent group-hover:opacity-100 dark:hover:bg-red-950/20"
                        title="წაშლა"
                        aria-label="კომენტარის წაშლა"
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                  <p className="mt-3 text-sm leading-7 text-gray-700 dark:text-gray-300">{comment.text}</p>
                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    {reactionOptions.map(({ icon: Icon, label, title }) => (
                      <button
                        key={label}
                        onClick={() => {
                          if (!currentUser) {
                            onLoginRequest();
                            return;
                          }
                          addReaction(comment.id, label).catch((error) => {
                            console.error('[CommentSection] reaction error:', error);
                            addToast(REACTION_SAVE_ERROR, 'error');
                          });
                        }}
                        className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3 py-1.5 text-xs font-bold text-gray-600 dark:text-gray-300 transition-colors hover:border-news-accent hover:text-news-accent"
                        title={title}
                      >
                        <Icon size={13} />
                        <span>{comment.reactions?.[label] || 0}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </article>
          ))
        )}
      </div>
    </section>
  );
};
