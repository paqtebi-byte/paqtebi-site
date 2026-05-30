import { Comment } from "../types";

const STORAGE_KEY_COMMENTS = 'paqtebi_comments';

export const getAllComments = (): Comment[] => {
  const data = localStorage.getItem(STORAGE_KEY_COMMENTS);
  return data ? JSON.parse(data) : [];
};

export const getCommentsByArticle = (articleId: string): Comment[] => {
  const all = getAllComments();
  return all.filter(c => c.articleId === articleId).sort((a, b) => b.timestamp - a.timestamp);
};

export const addComment = (comment: Comment): void => {
  const all = getAllComments();
  all.unshift(comment);
  localStorage.setItem(STORAGE_KEY_COMMENTS, JSON.stringify(all));
};

export const addReaction = (commentId: string, reaction: string): void => {
  const all = getAllComments();
  const comment = all.find(c => c.id === commentId);
  if (comment) {
    comment.reactions = comment.reactions || {};
    comment.reactions[reaction] = (comment.reactions[reaction] || 0) + 1;
    localStorage.setItem(STORAGE_KEY_COMMENTS, JSON.stringify(all));
  }
};

export const deleteComment = (id: string): void => {
  const all = getAllComments().filter(c => c.id !== id);
  localStorage.setItem(STORAGE_KEY_COMMENTS, JSON.stringify(all));
};