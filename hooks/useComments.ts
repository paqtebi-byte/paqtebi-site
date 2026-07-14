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

  const addComment = async (comment: Omit<Comment, "id" | "timestamp">) => {
    const savedComment = await apiService.insertComment(comment);
    if (!savedComment) {
      throw new Error("Comment was not saved");
    }
    await refreshComments();
    return savedComment;
  };

  const removeComment = async (id: string) => {
    const deleted = await apiService.deleteComment(id);
    if (!deleted) {
      throw new Error("Comment was not deleted");
    }
    await refreshComments();
  };

  const addReaction = async (id: string, reaction: string) => {
    const updated = await apiService.addReaction(id, reaction);
    if (!updated) {
      throw new Error("Reaction was not saved");
    }
    await refreshComments();
  };

  const editComment = async (id: string, text: string) => {
    try {
      const updatedComment = await apiService.updateComment(id, text);
      if (!updatedComment) {
        throw new Error("Comment was not updated");
      }
      setComments((prevComments) =>
        prevComments.map((c) =>
          c.id === id ? { ...c, text: updatedComment.text } : c
        )
      );
    } catch (err) {
      throw err;
    }
  };

  return {
    comments,
    addComment,
    removeComment,
    editComment,
    addReaction,
    refreshComments,
  };
};
