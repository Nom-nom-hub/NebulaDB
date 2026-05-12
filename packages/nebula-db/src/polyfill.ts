/**
 * Crypto Polyfills for Browser Compatibility
 * 
 * This module provides polyfills for Node.js crypto APIs that may not be
 * available in browser environments.
 * 
 * IMPORTANT: These polyfills are NOT cryptographically secure and should
 * only be used for development/testing. For production, use a proper crypto
 * library or ensure your environment provides secure crypto APIs.
 */

function generateUUID(): string {
  const hex = '0123456789abcdef';
  let uuid = '';
  for (let i = 0; i < 36; i++) {
    if (i === 8 || i === 13 || i === 18 || i === 23) {
      uuid += '-';
    } else if (i === 14) {
      uuid += '4';
    } else if (i === 19) {
      uuid += hex[(Math.random() * 4) | 8];
    } else {
      uuid += hex[(Math.random() * 16) | 0];
    }
  }
  return uuid;
}

function randomFillSync(buffer: Uint8Array): Uint8Array {
  for (let i = 0; i < buffer.length; i++) {
    buffer[i] = Math.floor(Math.random() * 256);
  }
  return buffer;
}

function getRandomValues<T extends Uint8Array | Uint16Array | Uint32Array>(array: T): T {
  const maxValue = array instanceof Uint32Array 
    ? 0xFFFFFFFF 
    : array instanceof Uint16Array 
      ? 0xFFFF 
      : 0xFF;
  
  for (let i = 0; i < array.length; i++) {
    array[i] = Math.floor(Math.random() * (maxValue + 1)) as any;
  }
  return array;
}

export interface BrowserCrypto {
  randomUUID: () => string;
  randomFillSync: (buffer: Uint8Array) => Uint8Array;
  getRandomValues: <T extends Uint8Array | Uint16Array | Uint32Array>(array: T) => T;
}

export function applyCryptoPolyfills(): void {
  const target = (typeof window !== 'undefined' ? window : typeof globalThis !== 'undefined' ? globalThis : null) as any;
  
  if (!target) {
    return;
  }

  target.crypto = target.crypto || {};

  const crypto = target.crypto as Partial<BrowserCrypto>;

  if (typeof crypto.randomUUID !== 'function') {
    crypto.randomUUID = generateUUID;
  }

  if (typeof crypto.randomFillSync !== 'function') {
    crypto.randomFillSync = randomFillSync;
  }

  if (typeof crypto.getRandomValues !== 'function') {
    crypto.getRandomValues = getRandomValues;
  }
}

export const browserCrypto: BrowserCrypto = {
  randomUUID: generateUUID,
  randomFillSync,
  getRandomValues
};