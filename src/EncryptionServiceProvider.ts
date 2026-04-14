import type { ConfigRepository } from '@atlex/config'
import type { Application } from '@atlex/core'
import { ServiceProvider } from '@atlex/core'

import { Encrypter } from './Encrypter.js'
import { MissingAppKeyException } from './exceptions/MissingAppKeyException.js'

function normalizeAppKeyString(keyString: string): Buffer {
  const buf = keyString.startsWith('base64:')
    ? Buffer.from(keyString.slice(7), 'base64')
    : Buffer.from(keyString, 'utf8')
  if (buf.length !== Encrypter.supportedKeyLength()) {
    throw new Error(`Invalid app key length: expected 32 bytes, got ${buf.length}`)
  }
  return buf
}

/**
 * Registers the `encrypter` singleton from `config('app.key')` and optional `app.previous_keys`.
 */
export class EncryptionServiceProvider extends ServiceProvider {
  /** @inheritdoc */
  public register(app: Application): void {
    app.singleton('encrypter', () => {
      const cfg = app.make<ConfigRepository>('config')
      const keyString = cfg.get('app.key') as string | undefined

      if (keyString === undefined || keyString === null || String(keyString).trim() === '') {
        throw new MissingAppKeyException()
      }

      const key = normalizeAppKeyString(String(keyString))

      const previousRaw = cfg.get('app.previous_keys', []) as unknown
      const previousList = Array.isArray(previousRaw) ? previousRaw : []
      const previousKeys = previousList
        .filter((k): k is string => typeof k === 'string' && k.length > 0)
        .map((k) => normalizeAppKeyString(k))

      return new Encrypter(key, previousKeys)
    })
  }

  /** @inheritdoc */
  public boot(_app: Application): void {
    /* reserved */
  }
}
