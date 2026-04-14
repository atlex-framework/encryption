# @atlex/encryption

> AES-256-GCM encryption with automatic key rotation.

[![npm](https://img.shields.io/npm/v/@atlex/encryption.svg?style=flat-square&color=7c3aed)](https://www.npmjs.com/package/@atlex/encryption)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-7c3aed.svg?style=flat-square)](https://www.typescriptlang.org/)

[![Buy Me A Coffee](https://img.shields.io/badge/Buy%20Me%20A%20Coffee-Support-yellow?style=flat-square&logo=buy-me-a-coffee)](https://buymeacoffee.com/khamazaspyan)

## Installation

```bash
npm install @atlex/encryption
# or
yarn add @atlex/encryption
```

## Quick Start

```typescript
import { Encrypter } from '@atlex/encryption'

const encrypter = new Encrypter(process.env.APP_KEY || '')

// Encrypt and decrypt strings
const encrypted = encrypter.encryptString('secret data')
const decrypted = encrypter.decryptString(encrypted)

// Encrypt and decrypt objects
const data = { userId: 123, email: 'user@example.com' }
const encryptedObj = encrypter.encryptObject(data)
const decryptedObj = encrypter.decryptObject(encryptedObj)
```

## Features

- **AES-256-GCM Encryption**: Industry-standard authenticated encryption
- **Key Rotation**: Seamlessly support multiple encryption keys for rotation
- **String Encryption**: Encrypt and decrypt text data with automatic encoding
- **Object Encryption**: Serialize and encrypt complex objects
- **Type Safety**: Full TypeScript support with proper typing
- **Automatic Decryption**: Decrypt with any available key in rotation
- **Exception Handling**: Specific exceptions for decryption failures
- **Base64 Encoding**: Automatic encoding/decoding of encrypted payloads

## Encryption Basics

### Encrypting and Decrypting Strings

```typescript
import { Encrypter } from '@atlex/encryption'

const encrypter = new Encrypter(process.env.APP_KEY || '')

// Encrypt a string
const plaintext = 'This is sensitive data'
const encrypted = encrypter.encryptString(plaintext)

// encrypted will look like: 'base64encodedencrypteddata'

// Decrypt back to original
const decrypted = encrypter.decryptString(encrypted)
console.log(decrypted) // 'This is sensitive data'
```

### Encrypting Objects

```typescript
import { Encrypter } from '@atlex/encryption'

const encrypter = new Encrypter(process.env.APP_KEY || '')

// Encrypt complex objects
const sensitiveData = {
  userId: 12345,
  email: 'user@example.com',
  creditCard: '4111-1111-1111-1111',
  metadata: {
    createdAt: new Date().toISOString(),
    tags: ['vip', 'verified'],
  },
}

const encrypted = encrypter.encryptObject(sensitiveData)

// Decrypt back to original
const decrypted = encrypter.decryptObject(encrypted)
console.log(decrypted.creditCard) // '4111-1111-1111-1111'
```

### Generic Encryption

```typescript
import { Encrypter } from '@atlex/encryption'

const encrypter = new Encrypter(process.env.APP_KEY || '')

// Encrypt buffer/bytes directly
const buffer = Buffer.from('binary data')
const encrypted = encrypter.encrypt(buffer)

// Decrypt back to buffer
const decrypted = encrypter.decrypt(encrypted)
```

## Key Management

### Generating Keys

```typescript
import { Encrypter } from '@atlex/encryption'

// Generate a new encryption key
const newKey = Encrypter.generateKey()
console.log(newKey) // A 32-byte base64-encoded key

// The generated key is ready to use as APP_KEY
```

### Key Format

Keys can be provided in two formats:

```typescript
import { Encrypter } from '@atlex/encryption'

// 1. Raw 32-byte key (base64 encoded)
const key1 = 'aGVsbG8td29ybGQtd2l0aDMyYnl0ZWtraWV5IQ=='
const encrypter1 = new Encrypter(key1)

// 2. With explicit base64 prefix
const key2 = 'base64:aGVsbG8td29ybGQtd2l0aDMyYnl0ZWtraWV5IQ=='
const encrypter2 = new Encrypter(key2)

// Both formats work identically
```

## Key Rotation

Support multiple keys for seamless key rotation:

```typescript
import { Encrypter } from '@atlex/encryption'

// Create encrypter with current key
const currentKey = 'base64:' + Buffer.from('a'.repeat(32)).toString('base64')
const encrypter = new Encrypter(currentKey)

// Add previous keys for rotation
const oldKey1 = 'base64:' + Buffer.from('b'.repeat(32)).toString('base64')
const oldKey2 = 'base64:' + Buffer.from('c'.repeat(32)).toString('base64')

encrypter.addKey(oldKey1)
encrypter.addKey(oldKey2)

// Decrypt works with any key in the rotation chain
const encrypted = encrypter.encryptString('secret')
const decrypted = encrypter.decryptString(encrypted) // Uses currentKey

// Data encrypted with old keys can still be decrypted
const oldEncryptedData = '...' // Encrypted with oldKey1
const decrypted = encrypter.decryptString(oldEncryptedData) // Automatically tries all keys
```

### Getting All Keys

```typescript
import { Encrypter } from '@atlex/encryption'

const encrypter = new Encrypter(process.env.APP_KEY || '')

// Get the current key
const currentKey = encrypter.getKey()

// Get all keys (current + previous)
const allKeys = encrypter.getAllKeys()
```

## Error Handling

```typescript
import { Encrypter, DecryptException, MissingAppKeyException } from '@atlex/encryption'

try {
  const encrypter = new Encrypter('')
  const data = encrypter.decryptString('invalid_data')
} catch (error) {
  if (error instanceof MissingAppKeyException) {
    console.error('Encryption key is not configured')
  } else if (error instanceof DecryptException) {
    console.error('Failed to decrypt data:', error.message)
  }
}
```

### Exception Types

- **MissingAppKeyException**: Thrown when APP_KEY is not configured
- **DecryptException**: Thrown when decryption fails (invalid data, tampered payload, wrong key)

## Validating Key Length

```typescript
import { Encrypter } from '@atlex/encryption'

// Check if a key length is supported
const isValid = Encrypter.supportedKeyLength(32)
console.log(isValid) // true

const isInvalid = Encrypter.supportedKeyLength(16)
console.log(isInvalid) // false - 16 bytes is not supported
```

## Using with Models

```typescript
import { Encrypter } from '@atlex/encryption'
import { Model } from '@atlex/orm'

class User extends Model {
  private encrypter: Encrypter

  constructor() {
    super()
    this.encrypter = new Encrypter(process.env.APP_KEY || '')
  }

  // Automatically encrypt sensitive attributes
  getAttribute(key: string) {
    const value = super.getAttribute(key)

    if (['ssn', 'creditCard', 'apiKey'].includes(key) && value) {
      return this.encrypter.decryptString(value)
    }

    return value
  }

  setAttribute(key: string, value: any) {
    if (['ssn', 'creditCard', 'apiKey'].includes(key) && value) {
      value = this.encrypter.encryptString(value)
    }

    super.setAttribute(key, value)
  }
}
```

## Complete Example

```typescript
import { Encrypter } from '@atlex/encryption'

class EncryptionService {
  private encrypter: Encrypter
  private readonly sensitiveFields = ['ssn', 'creditCard', 'bankAccount', 'apiKey']

  constructor(appKey: string = process.env.APP_KEY || '') {
    this.encrypter = new Encrypter(appKey)

    // Load previous keys for rotation
    if (process.env.PREVIOUS_APP_KEYS) {
      const previousKeys = process.env.PREVIOUS_APP_KEYS.split(',')
      for (const key of previousKeys) {
        this.encrypter.addKey(key.trim())
      }
    }
  }

  /**
   * Encrypt a user object, protecting sensitive fields
   */
  encryptUser(user: Record<string, any>) {
    const encrypted = { ...user }

    for (const field of this.sensitiveFields) {
      if (encrypted[field]) {
        encrypted[field] = this.encrypter.encryptString(encrypted[field])
      }
    }

    return encrypted
  }

  /**
   * Decrypt a user object, restoring sensitive fields
   */
  decryptUser(user: Record<string, any>) {
    const decrypted = { ...user }

    for (const field of this.sensitiveFields) {
      if (decrypted[field]) {
        try {
          decrypted[field] = this.encrypter.decryptString(decrypted[field])
        } catch (error) {
          console.error(`Failed to decrypt field: ${field}`)
          throw error
        }
      }
    }

    return decrypted
  }

  /**
   * Generate a new encryption key
   */
  static generateNewKey(): string {
    return Encrypter.generateKey()
  }

  /**
   * Re-encrypt data with a new key
   */
  reEncryptString(encrypted: string, newEncrypter: Encrypter): string {
    const plaintext = this.encrypter.decryptString(encrypted)
    return newEncrypter.encryptString(plaintext)
  }
}

// Usage
const encryptionService = new EncryptionService()

const user = {
  id: 1,
  name: 'John Doe',
  ssn: '123-45-6789',
  creditCard: '4111-1111-1111-1111',
}

// Encrypt sensitive data
const encryptedUser = encryptionService.encryptUser(user)
console.log(encryptedUser.creditCard) // Encrypted string

// Store in database...

// Retrieve and decrypt
const decryptedUser = encryptionService.decryptUser(encryptedUser)
console.log(decryptedUser.creditCard) // '4111-1111-1111-1111'
```

## Configuration

### Environment Variables

```env
# Primary encryption key (32 bytes, base64 encoded)
APP_KEY=base64:dGhpcyBpcyBhIDMyLWJ5dGUgZW5jcnlwdGlvbiBrZXk=

# Previous keys for rotation (comma-separated)
PREVIOUS_APP_KEYS=base64:b2xkLWtleSAxLTMyLWJ5dGVzLWxvbmctZW5j,base64:b2xkLWtleSAyLTMyLWJ5dGVzLWxvbmctZW5j
```

## API Overview

### Encrypter

| Method                              | Description                       |
| ----------------------------------- | --------------------------------- |
| `encrypt(data)`                     | Encrypt buffer/bytes              |
| `decrypt(data)`                     | Decrypt buffer/bytes              |
| `encryptString(plaintext)`          | Encrypt string (base64 output)    |
| `decryptString(encrypted)`          | Decrypt string (base64 input)     |
| `encryptObject(object)`             | Encrypt serialized object         |
| `decryptObject(encrypted)`          | Decrypt to object                 |
| `getKey()`                          | Get current encryption key        |
| `getAllKeys()`                      | Get all keys (current + previous) |
| `addKey(key)`                       | Add a key for rotation            |
| `static generateKey()`              | Generate new 32-byte key          |
| `static supportedKeyLength(length)` | Check if key length is valid      |

### Exceptions

| Exception                | Description                    |
| ------------------------ | ------------------------------ |
| `DecryptException`       | Thrown when decryption fails   |
| `MissingAppKeyException` | Thrown when APP_KEY is missing |

## Documentation

For complete documentation, visit [https://atlex.dev/guide/encryption](https://atlex.dev/guide/encryption)

## License

MIT
