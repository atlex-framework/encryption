import { describe, expect, it } from 'vitest'

import { DecryptException } from '../src/exceptions/DecryptException.js'
import { MissingAppKeyException } from '../src/exceptions/MissingAppKeyException.js'

describe('@atlex/encryption examples', () => {
  it('DecryptException message', () => {
    const e = new DecryptException('bad')
    expect(e.message).toContain('bad')
  })

  it('MissingAppKeyException message', () => {
    const e = new MissingAppKeyException()
    expect(e.message.length).toBeGreaterThan(0)
  })

  it('DecryptException is Error', () => {
    expect(new DecryptException('x')).toBeInstanceOf(Error)
  })

  it('MissingAppKeyException is Error', () => {
    expect(new MissingAppKeyException()).toBeInstanceOf(Error)
  })

  it('DecryptException name', () => {
    expect(new DecryptException('m').name).toContain('Decrypt')
  })
})
