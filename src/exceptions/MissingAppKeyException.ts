/**
 * Thrown when the application encryption key is not configured.
 */
export class MissingAppKeyException extends Error {
  public constructor() {
    super('No application encryption key has been specified.\n' + 'Run: atlex key:generate')
    this.name = 'MissingAppKeyException'
  }
}
