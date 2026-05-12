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

function insecureRandomBytes(length: number): Uint8Array {
  const bytes = new Uint8Array(length);
  for (let i = 0; i < length; i++) {
    bytes[i] = Math.floor(Math.random() * 256);
  }
  return bytes;
}

function generateUUID(rng: () => Uint8Array = () => insecureRandomBytes(16)): string {
  const bytes = rng();
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  
  const hex = '0123456789abcdef';
  let uuid = '';
  for (let i = 0; i < 16; i++) {
    if (i === 4 || i === 6 || i === 8 || i === 10) uuid += '-';
    uuid += hex[(bytes[i] >> 4) & 0x0f] + hex[bytes[i] & 0x0f];
  }
  return uuid;
}

function randomFillSync(buffer: ArrayBufferView, rng: () => Uint8Array = () => insecureRandomBytes(buffer.byteLength)): ArrayBufferView {
  const randomBytes = rng();
  const dest = new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
  dest.set(randomBytes);
  return buffer;
}

function createQuotaExceededError(): Error {
  if (typeof DOMException !== 'undefined') {
    return new DOMException('Quota exceeded', 'QuotaExceededError');
  }
  const error = new Error('Quota exceeded');
  (error as any).name = 'QuotaExceededError';
  return error;
}

function getRandomValues<T extends Uint8Array | Uint16Array | Uint32Array>(array: T, rng: () => Uint8Array = () => insecureRandomBytes(array.byteLength)): T {
  if (array.byteLength > 65536) {
    throw createQuotaExceededError();
  }
  
  const randomBytes = rng();
  const view = new Uint8Array(array.buffer, array.byteOffset, array.byteLength);
  view.set(randomBytes);
  
  return array;
}

export interface BrowserCrypto {
  randomUUID: () => string;
  randomFillSync: (buffer: ArrayBufferView) => ArrayBufferView;
  getRandomValues: <T extends Uint8Array | Uint16Array | Uint32Array>(array: T) => T;
}

function buildBrowserCrypto(target?: any): BrowserCrypto {
  const context = target ?? (typeof globalThis !== 'undefined' ? globalThis : null);
  const nativeCrypto = context && (context as any).crypto;
  
  if (nativeCrypto) {
    const hasGetRandomValues = typeof (nativeCrypto as any).getRandomValues === 'function';
    const hasRandomUUID = typeof (nativeCrypto as any).randomUUID === 'function';
    
    const nativeGetRandomValues = hasGetRandomValues 
      ? <T extends Uint8Array | Uint16Array | Uint32Array>(array: T): T => {
          if (array.byteLength > 65536) {
            throw createQuotaExceededError();
          }
          return (nativeCrypto as any).getRandomValues(array);
        }
      : null;
    
    const rng = () => {
      const bytes = new Uint8Array(16);
      if (nativeGetRandomValues) {
        nativeGetRandomValues(bytes);
      } else {
        bytes.set(insecureRandomBytes(16));
      }
      return bytes;
    };
    
    const cryptoBackedRandomFillSync = (buffer: ArrayBufferView): ArrayBufferView => {
      if (nativeGetRandomValues) {
        nativeGetRandomValues(new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength));
      } else {
        randomFillSync(buffer);
      }
      return buffer;
    };
    
    const cryptoBackedGenerateUUID = (): string => {
      if (hasRandomUUID) {
        return (nativeCrypto as any).randomUUID();
      }
      return generateUUID(rng);
    };
    
    return {
      randomUUID: cryptoBackedGenerateUUID,
      randomFillSync: cryptoBackedRandomFillSync,
      getRandomValues: nativeGetRandomValues || getRandomValues
    };
  }
  
  return {
    randomUUID: () => generateUUID(),
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

  let nativeCrypto: any;
  
  try {
    nativeCrypto = context.crypto;
    if (!nativeCrypto) {
      context.crypto = {};
      nativeCrypto = context.crypto;
    }
  } catch {
    return;
  }

  const crypto = context.crypto as any;

  const useSecure = nativeCrypto && typeof nativeCrypto.getRandomValues === 'function';
  const polyfill = useSecure ? buildBrowserCrypto(context) : { 
    randomUUID: () => generateUUID(), 
    randomFillSync, 
    getRandomValues 
  };

  try {
    if (typeof crypto.randomUUID !== 'function') {
      crypto.randomUUID = polyfill.randomUUID;
    }

    if (typeof crypto.randomFillSync !== 'function') {
      crypto.randomFillSync = polyfill.randomFillSync;
    }

    if (typeof crypto.getRandomValues !== 'function') {
      crypto.getRandomValues = polyfill.getRandomValues;
    }
  } catch {
    // Ignore - crypto properties may be non-writable in strict environments
  }
}