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

function randomFillSync(buffer: ArrayBufferView): ArrayBufferView {
  const bytes = new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = Math.floor(Math.random() * 256);
  }
  return buffer;
}

function getRandomValues<T extends Uint8Array | Uint16Array | Uint32Array>(array: T): T {
  if (array.byteLength > 65536) {
    const error = new Error('QuotaExceededError');
    error.name = 'QuotaExceededError';
    throw error;
  }
  
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
  randomFillSync: (buffer: ArrayBufferView) => ArrayBufferView;
  getRandomValues: <T extends Uint8Array | Uint16Array | Uint32Array>(array: T) => T;
}

function buildBrowserCrypto(): BrowserCrypto {
  const target = typeof globalThis !== 'undefined' ? globalThis : null;
  const nativeCrypto = target && (target as any).crypto;
  
  if (nativeCrypto && typeof nativeCrypto.getRandomValues === 'function') {
    const nativeGetRandomValues = <T extends Uint8Array | Uint16Array | Uint32Array>(array: T): T => {
      if (array.byteLength > 65536) {
        const error = new Error('QuotaExceededError');
        error.name = 'QuotaExceededError';
        throw error;
      }
      return nativeCrypto.getRandomValues(array);
    };
    
    const cryptoBackedRandomFillSync = (buffer: ArrayBufferView): ArrayBufferView => {
      nativeGetRandomValues(new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength));
      return buffer;
    };
    
    const cryptoBackedGenerateUUID = (): string => {
      const bytes = new Uint8Array(16);
      nativeGetRandomValues(bytes);
      bytes[6] = (bytes[6] & 0x0f) | 0x40;
      bytes[8] = (bytes[8] & 0x3f) | 0x80;
      
      const hex = '0123456789abcdef';
      let uuid = '';
      for (let i = 0; i < 16; i++) {
        if (i === 4 || i === 6 || i === 8 || i === 10) uuid += '-';
        uuid += hex[(bytes[i] >> 4) & 0x0f] + hex[bytes[i] & 0x0f];
      }
      return uuid;
    };
    
    return {
      randomUUID: cryptoBackedGenerateUUID,
      randomFillSync: cryptoBackedRandomFillSync,
      getRandomValues: nativeGetRandomValues
    };
  }
  
  return {
    randomUUID: generateUUID,
    randomFillSync,
    getRandomValues
  };
}

export const browserCrypto = buildBrowserCrypto();

export function applyCryptoPolyfills(target?: any): void {
  const context = target ?? (typeof window !== 'undefined' ? window : typeof globalThis !== 'undefined' ? globalThis : null);
  
  if (!context) {
    return;
  }

  try {
    if (!context.crypto) {
      context.crypto = {};
    }
  } catch {
    return;
  }

  const crypto = context.crypto as any;

  try {
    if (typeof crypto.randomUUID !== 'function') {
      crypto.randomUUID = generateUUID;
    }

    if (typeof crypto.randomFillSync !== 'function') {
      crypto.randomFillSync = randomFillSync;
    }

    if (typeof crypto.getRandomValues !== 'function') {
      crypto.getRandomValues = getRandomValues;
    }
  } catch {
    // Ignore - crypto properties may be non-writable in strict environments
  }
}