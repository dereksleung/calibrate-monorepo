export interface IPasswordHasher {
  hash(password: string): Promise<string>;
}
