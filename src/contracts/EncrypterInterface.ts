/**
 * Application encrypter contract (AES-256-GCM).
 */
export interface EncrypterInterface {
  encrypt(value: string, serialize?: boolean): string
  decrypt(payload: string, unserialize?: boolean): string
  encryptString(value: string): string
  decryptString(payload: string): string
  getKey(): Buffer
}
