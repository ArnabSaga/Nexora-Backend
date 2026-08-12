import status from "http-status";
import AppError from "../../shared/errors/AppError";
import type { TBookmarkActionResult } from "./bookmark.interface";

type TBookmarkSaveDependencies = {
  findVisiblePost: (
    postId: string,
    requester: Express.AuthenticatedUser,
  ) => Promise<{ id: string } | null>;
  createBookmark: (userId: string, postId: string) => Promise<unknown>;
  isDuplicateBookmarkError: (error: unknown) => boolean;
};

export const createBookmarkSaveService = ({
  findVisiblePost,
  createBookmark,
  isDuplicateBookmarkError,
}: TBookmarkSaveDependencies) => {
  const saveBookmark = async (
    postId: string,
    requester: Express.AuthenticatedUser,
  ): Promise<TBookmarkActionResult> => {
    const post = await findVisiblePost(postId, requester);

    if (!post) {
      throw new AppError(status.NOT_FOUND, "Post not found");
    }

    try {
      await createBookmark(requester.id, post.id);

      return {
        statusCode: status.CREATED,
        message: "Post bookmarked successfully",
        data: { bookmarked: true },
      };
    } catch (error) {
      if (isDuplicateBookmarkError(error)) {
        return {
          statusCode: status.OK,
          message: "Post already bookmarked",
          data: { bookmarked: true },
        };
      }

      throw error;
    }
  };

  return { saveBookmark };
};
