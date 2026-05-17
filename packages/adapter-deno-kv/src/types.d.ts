declare namespace Deno {
  interface Kv {
    list(options: { prefix: string[] }): AsyncIterable<{ key: string[], value: any }>;
    set(key: string[], value: any): Promise<void>;
    delete(key: string[]): Promise<void>;
    close(): Promise<void>;
  }
  function kv(): Promise<Kv>;
}