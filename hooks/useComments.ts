import { useState, useEffect } from "react";
import { Comment } from "../types";
import apiService from "../services/apiService";

export const useComments = (articleId?: string) => {
  const [comments, setComments] = useState<Comment[]>([]);

  const refreshComments = async () => {
    if (articleId) {
      setComments(await apiService.fetchComments(articleId));
    } else {
      setComments(await apiService.fetchComments());
    }
  };

  useEffect(() => {
    refreshComments();
  }, [articleId]);

  const addComment = async (comment: Comment) => {
    await apiService.insertComment(comment);
    await refreshComments();
  };

  const removeComment = async (id: string) => {
    await apiService.deleteComment(id);
    await refreshComments();
  };

  const addReaction = async (id: string, reaction: string) => {
    await apiService.addReaction(id, reaction);
    await refreshComments();
  };

  return {
    comments,
    addComment,
    removeComment,
    addReaction,
    refreshComments,
  };
};
