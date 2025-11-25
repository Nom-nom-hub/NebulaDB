declare module 'better-sqlite3' {
  interface Statement<T = any> {
    all(...params: any[]): T[];
    get(...params: any[]): T | undefined;
    run(...params: any[]): any;
  }

  class Database {
    constructor(filename: string, options?: any);
    prepare(sql: string): Statement;
    transaction(fn: () => void): () => void;
    close(): void;
    exec(sql: string): void;
  }

  export = Database;
}
