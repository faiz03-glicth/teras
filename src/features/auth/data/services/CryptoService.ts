import * as Crypto from 'expo-crypto';

/** Wraps expo-crypto. */
export interface CryptoService {
  /** 32 random bytes as hex, used as the raw OIDC nonce. */
  randomNonce(): string;
  /** SHA-256 hex digest. */
  sha256(input: string): Promise<string>;
  uuid(): string;
}

export const expoCryptoService: CryptoService = {
  randomNonce: () =>
    Array.from(Crypto.getRandomBytes(32), (byte) => byte.toString(16).padStart(2, '0')).join(''),
  sha256: (input) =>
    Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, input, {
      encoding: Crypto.CryptoEncoding.HEX,
    }),
  uuid: () => Crypto.randomUUID(),
};
