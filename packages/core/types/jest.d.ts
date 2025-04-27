// This file declares Jest globals for TypeScript
declare global {
  function describe(name: string, fn: () => void): void;
  function test(name: string, fn: (done?: any) => any): void;
  function expect(actual: any): any;
  const beforeEach: (fn: () => any) => void;
  const afterEach: (fn: () => any) => void;
  const beforeAll: (fn: () => any) => void;
  const afterAll: (fn: () => any) => void;
}

export {};