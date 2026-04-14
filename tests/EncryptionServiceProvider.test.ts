import { describe, expect, it } from 'vitest'

import { ConfigRepository } from '@atlex/config'
import { Application } from '@atlex/core'

import { Encrypter } from '../src/Encrypter.js'
import { EncryptionServiceProvider } from '../src/EncryptionServiceProvider.js'
import { MissingAppKeyException } from '../src/exceptions/MissingAppKeyException.js'

describe('EncryptionServiceProvider', () => {
  it('registers encrypter singleton with app.key', () => {
    const key = Encrypter.generateKey()
    const app = new Application()
    app.singleton(
      'config',
      () =>
        new ConfigRepository({
          app: {
            key,
            previous_keys: [],
          },
        }),
    )
    const p = new EncryptionServiceProvider()
    p.register(app)
    const enc = app.make<Encrypter>('encrypter')
    expect(enc.encrypt('x')).toBeDefined()
  })

  it('throws MissingAppKeyException when key missing', () => {
    const app = new Application()
    app.singleton(
      'config',
      () =>
        new ConfigRepository({
          app: {
            previous_keys: [],
          },
        }),
    )
    const p = new EncryptionServiceProvider()
    p.register(app)
    expect(() => app.make('encrypter')).toThrow(MissingAppKeyException)
  })
})
