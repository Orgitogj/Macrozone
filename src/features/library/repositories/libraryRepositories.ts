import { LIBRARY_MESSAGES } from '@/features/library/constants';
import type {
  Food,
  FoodInput,
  FoodListQuery,
  FoodReferenceCounts,
} from '@/features/library/types';

export type LibraryRepositoryErrorCode =
  | 'read_failed'
  | 'write_failed'
  | 'not_found'
  | 'duplicate'
  | 'id_generation_failed'
  | 'unsupported_version'
  | 'invalid_data';

export class LibraryRepositoryError extends Error {
  readonly code: LibraryRepositoryErrorCode;

  constructor(code: LibraryRepositoryErrorCode, message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'LibraryRepositoryError';
    this.code = code;
  }
}

export function toLibraryRepositoryError(
  error: unknown,
  code: LibraryRepositoryErrorCode,
  message: string,
): LibraryRepositoryError {
  return error instanceof LibraryRepositoryError ? error : new LibraryRepositoryError(code, message, { cause: error });
}

export function notFoundError(): LibraryRepositoryError {
  return new LibraryRepositoryError('not_found', LIBRARY_MESSAGES.notFound);
}

export type FoodRepository = {
  listFoods(query: FoodListQuery): Promise<Food[]>;
  getFood(id: string): Promise<Food | null>;
  getFoodsByIds(ids: readonly string[]): Promise<Food[]>;
  createFood(input: FoodInput): Promise<Food>;
  updateFood(id: string, input: FoodInput): Promise<Food>;
  setFavorite(id: string, favorite: boolean): Promise<Food>;
  countReferences(id: string): Promise<FoodReferenceCounts>;
  deleteFood(id: string): Promise<void>;
};
