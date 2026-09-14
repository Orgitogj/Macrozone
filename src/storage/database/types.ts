export type SqlValue = string | number | null;

export type SqlRunResult = {
  changes: number;
};

export type SqlExecutor = {
  execAsync(source: string): Promise<void>;
  runAsync(source: string, params: SqlValue[]): Promise<SqlRunResult>;
  getFirstAsync<T>(source: string, params: SqlValue[]): Promise<T | null>;
  getAllAsync<T>(source: string, params: SqlValue[]): Promise<T[]>;
};

export type SqlDatabase = SqlExecutor & {
  withExclusiveTransactionAsync(task: (transaction: SqlExecutor) => Promise<void>): Promise<void>;
};
