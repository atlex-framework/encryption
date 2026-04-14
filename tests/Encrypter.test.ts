import { describe, expect, it } from 'vitest'

import { Encrypter } from '../src/Encrypter.js'
import { DecryptException } from '../src/exceptions/DecryptException.js'

const sampleKey = Encrypter.generateKey()

describe('Encrypter', () => {
  it('encrypts and decrypts a string round-trip', () => {
    const e = new Encrypter(sampleKey)
    const enc = e.encrypt('secret')
    expect(e.decrypt(enc)).toBe('secret')
  })

  it('encrypts and decrypts an object round-trip', () => {
    const e = new Encrypter(sampleKey)
    const enc = e.encryptObject({ id: 1, name: 'a' })
    expect(e.decryptObject<{ id: number; name: string }>(enc)).toEqual({ id: 1, name: 'a' })
  })

  it('produces different ciphertext for same plaintext (unique IV)', () => {
    const e = new Encrypter(sampleKey)
    const a = e.encrypt('x')
    const b = e.encrypt('x')
    expect(a).not.toBe(b)
  })

  it('throws DecryptException on tampered ciphertext', () => {
    const e = new Encrypter(sampleKey)
    const enc = e.encrypt('ok')
    const buf = Buffer.from(enc, 'base64')
    buf[buf.length - 1] ^= 0xff
    const bad = buf.toString('base64')
    expect(() => e.decrypt(bad)).toThrow(DecryptException)
  })

  it('throws DecryptException on wrong key', () => {
    const a = new Encrypter(sampleKey)
    const enc = a.encrypt('data')
    const other = new Encrypter(Encrypter.generateKey())
    expect(() => other.decrypt(enc)).toThrow(DecryptException)
  })

  it('throws DecryptException on invalid base64', () => {
    const e = new Encrypter(sampleKey)
    expect(() => e.decrypt('not-base64!!!')).toThrow(DecryptException)
  })

  it('throws DecryptException on missing iv/value/tag', () => {
    const e = new Encrypter(sampleKey)
    const bad = Buffer.from(JSON.stringify({ iv: 'a', value: 'b' }), 'utf8').toString('base64')
    expect(() => e.decrypt(bad)).toThrow(DecryptException)
  })

  it('supports key rotation (decrypts with previous key)', () => {
    const oldKey = Encrypter.generateKey()
    const newKey = Encrypter.generateKey()
    const oldEnc = new Encrypter(oldKey)
    const payload = oldEnc.encrypt('rotated')
    const rotated = new Encrypter(newKey, [oldKey])
    expect(rotated.decrypt(payload)).toBe('rotated')
  })

  it('generateKey() produces valid 32-byte key', () => {
    const k = Encrypter.generateKey()
    expect(k.startsWith('base64:')).toBe(true)
    const buf = Buffer.from(k.slice(7), 'base64')
    expect(buf.length).toBe(32)
  })

  it('rejects keys that are not 32 bytes', () => {
    expect(() => new Encrypter(Buffer.alloc(16))).toThrow(/32 bytes/)
  })

  it('encryptString/decryptString skip serialization', () => {
    const e = new Encrypter(sampleKey)
    const enc = e.encryptString(`{"raw":true}`)
    expect(e.decryptString(enc)).toBe(`{"raw":true}`)
  })
})
