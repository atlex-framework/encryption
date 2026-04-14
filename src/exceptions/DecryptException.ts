/**
 * Thrown when ciphertext cannot be decrypted or fails authentication.
 */
export class DecryptException extends Error {
  public constructor(message = 'The payload could not be decrypted.') {
    super(message)
    this.name = 'DecryptException'
  }
}
