import { NebulaAdapter } from './nebula';
import { NebulaWasmAdapter } from './nebula-wasm';
import { RxDBAdapter } from './rxdb';
import { PouchDBAdapter } from './pouchdb';
import { DatabaseAdapter } from '../types';

/**
 * Get all database adapters
 */
export function getAdapters(): DatabaseAdapter[] {
  return [
    new NebulaAdapter(),
    new NebulaWasmAdapter(),
    new RxDBAdapter(),
    new PouchDBAdapter()
  ];
}

export { NebulaAdapter, NebulaWasmAdapter, RxDBAdapter, PouchDBAdapter };
