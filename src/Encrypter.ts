import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'

import type { EncrypterInterface } from './contracts/EncrypterInterface.js'
import { DecryptException } from './exceptions/DecryptException.js'

interface PayloadShape {
  iv: string
  value: string
  tag: string
}

function assertKeyLength(buf: Buffer, label: string): void {
  if (buf.length !== Encrypter.supportedKeyLength()) {
    throw new Error(`Invalid ${label} length: expected 32 bytes, got ${buf.length}.`)
  }
}

function normalizeKeyInput(key: Buffer | string, label: string): Buffer {
  if (Buffer.isBuffer(key)) {
    assertKeyLength(key, label)
    return key
  }
  if (typeof key === 'string' && key.startsWith('base64:')) {
    const buf = Buffer.from(key.slice(7), 'base64')
    assertKeyLength(buf, label)
    return buf
  }
  const buf = Buffer.from(key, 'utf8')
  assertKeyLength(buf, label)
  return buf
}

/**
 * AES-256-GCM encrypter with optional previous keys for rotation.
 */
export class Encrypter implements EncrypterInterface {
  private readonly key: Buffer
  private readonly previousKeys: Buffer[]
  private static readonly cipher = 'aes-256-gcm' as const
  private static readonly ivLength = 12
  private static readonly tagLength = 16

  /**
   * @param key - 32-byte key or `base64:`-prefixed encoding.
   * @param previousKeys - Older keys tried in order when decrypting rotated ciphertext.
   */
  public constructor(key: Buffer | string, previousKeys?: (Buffer | string)[]) {
    this.key = normalizeKeyInput(key, 'encryption key')
    this.previousKeys = (previousKeys ?? []).map((k, i) =>
      normalizeKeyInput(k, `previous key ${i}`),
    )
  }

  /**
   * Encrypt a value. When `serialize` is true (default), the string is wrapped with `JSON.stringify`
   * before encryption (serialized payload wrapper).
   */
  public encrypt(value: string, serialize = true): string {
    const plainText = serialize ? JSON.stringify(value) : value
    return this.encryptWithKey(plainText, this.key)
  }

  /**
   * Decrypt a payload. When `unserialize` is true (default), the UTF-8 plaintext is `JSON.parse`d.
   *
   * @throws DecryptException when the payload is invalid or keys do not match.
   */
  public decrypt(payload: string, unserialize = true): string {
    let last: DecryptException | undefined
    const keys = [this.key, ...this.previousKeys]
    for (const keyBuf of keys) {
      try {
        return this.decryptWithKey(payload, unserialize, keyBuf)
      } catch (e) {
        if (e instanceof DecryptException) {
          last = e
        } else {
          throw e
        }
      }
    }
    throw last ?? new DecryptException()
  }

  /** @inheritdoc */
  public encryptString(value: string): string {
    return this.encrypt(value, false)
  }

  /** @inheritdoc */
  public decryptString(payload: string): string {
    return this.decrypt(payload, false)
  }

  /**
   * Serialize a value to JSON, then encrypt without a second JSON wrapping.
   */
  public encryptObject(value: unknown): string {
    return this.encrypt(JSON.stringify(value), false)
  }

  /**
   * Decrypt and `JSON.parse` into `T`.
   */
  public decryptObject<T = unknown>(encrypted: string): T {
    const raw = this.decrypt(encrypted, false)
    try {
      return JSON.parse(raw) as T
    } catch {
      throw new DecryptException('Decrypted object payload is not valid JSON.')
    }
  }

  /** Current encryption key. */
  public getKey(): Buffer {
    return this.key
  }

  /** Current key followed by rotation keys. */
  public getAllKeys(): Buffer[] {
    return [this.key, ...this.previousKeys]
  }

  /** Random 32-byte key as `base64:...` (Atlex / APP_KEY format). */
  public static generateKey(): string {
    return `base64:${randomBytes(Encrypter.supportedKeyLength()).toString('base64')}`
  }

  /** Required symmetric key size in bytes. */
  public static supportedKeyLength(): number {
    return 32
  }

  private encryptWithKey(plainText: string, keyBuf: Buffer): string {
    const iv = randomBytes(Encrypter.ivLength)
    const cipher = createCipheriv(Encrypter.cipher, keyBuf, iv)
    const enc = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()])
    const tag = cipher.getAuthTag()
    if (tag.length !== Encrypter.tagLength) {
      throw new Error('Unexpected GCM authentication tag length.')
    }
    const obj: PayloadShape = {
      iv: iv.toString('base64'),
      value: enc.toString('base64'),
      tag: tag.toString('base64'),
    }
    return Buffer.from(JSON.stringify(obj), 'utf8').toString('base64')
  }

  private decryptWithKey(payload: string, unserialize: boolean, keyBuf: Buffer): string {
    let jsonRaw: string
    try {
      jsonRaw = Buffer.from(payload, 'base64').toString('utf8')
    } catch {
      throw new DecryptException('The payload is not valid base64.')
    }

    let parsed: unknown
    try {
      parsed = JSON.parse(jsonRaw) as unknown
    } catch {
      throw new DecryptException('The payload JSON could not be parsed.')
    }

    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new DecryptException('The payload must be a JSON object with "iv", "value", and "tag".')
    }
    const rec = parsed as Record<string, unknown>
    const ivS = rec.iv
    const valS = rec.value
    const tagS = rec.tag
    if (typeof ivS !== 'string' || typeof valS !== 'string' || typeof tagS !== 'string') {
      throw new DecryptException('The payload must include string fields "iv", "value", and "tag".')
    }

    let iv: Buffer
    let cipherBuf: Buffer
    let tag: Buffer
    try {
      iv = Buffer.from(ivS, 'base64')
      cipherBuf = Buffer.from(valS, 'base64')
      tag = Buffer.from(tagS, 'base64')
    } catch {
      throw new DecryptException('The payload contains invalid base64 in iv/value/tag.')
    }

    if (iv.length !== Encrypter.ivLength) {
      throw new DecryptException(`Invalid IV length: expected ${Encrypter.ivLength} bytes.`)
    }
    if (tag.length !== Encrypter.tagLength) {
      throw new DecryptException(
        `Invalid authentication tag length: expected ${Encrypter.tagLength} bytes.`,
      )
    }

    const decipher = createDecipheriv(Encrypter.cipher, keyBuf, iv)
    decipher.setAuthTag(tag)
    let plain: Buffer
    try {
      plain = Buffer.concat([decipher.update(cipherBuf), decipher.final()])
    } catch {
      throw new DecryptException(
        'Could not decrypt payload (wrong key, tampered data, or corrupted ciphertext).',
      )
    }

    const text = plain.toString('utf8')
    if (!unserialize) {
      return text
    }
    try {
      const v = JSON.parse(text) as unknown
      if (typeof v === 'string') {
        return v
      }
      return JSON.stringify(v)
    } catch {
      throw new DecryptException('Decrypted value is not valid JSON.')
    }
  }
}
