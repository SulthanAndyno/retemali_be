import {
  buildPaginationMeta,
  parsePagination,
} from "../../utils/pagination";
import { BookmarkRepository } from "./bookmark.repository";
import { BookmarkQueryInput } from "./bookmark.validation";

export class BookmarkService {
  private readonly bookmarkRepository: BookmarkRepository;

  constructor(bookmarkRepository: BookmarkRepository) {
    this.bookmarkRepository = bookmarkRepository;
  }

  async getMyBookmarks(userId: string, query: BookmarkQueryInput) {
    const { skip, take, page, limit } = parsePagination(query);
    const { data, total } = await this.bookmarkRepository.findAllByUser({
      userId,
      skip,
      take,
    });

    return {
      data,
      meta: buildPaginationMeta(total, page, limit),
    };
  }

  async toggleBookmark(userId: string, bookIdentifier: string) {
    return this.bookmarkRepository.toggleOrCreate(userId, bookIdentifier);
  }

  async removeBookmark(userId: string, bookIdentifier: string): Promise<void> {
    await this.bookmarkRepository.deleteByBook(userId, bookIdentifier);
  }
}
