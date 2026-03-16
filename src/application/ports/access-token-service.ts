export interface AccessTokenPayload {
  userId: string;
}

export interface IssuedAccessToken {
  token: string;
  expiresInSeconds: number;
}

export interface IAccessTokenService {
  issue(payload: AccessTokenPayload): Promise<IssuedAccessToken>;
  verify(token: string): Promise<AccessTokenPayload>;
}
