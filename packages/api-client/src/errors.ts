export interface ApiErrorOptions {
  status: number;
  statusText: string;
  body: unknown;
}

export class ApiError extends Error {
  readonly status: number;
  readonly statusText: string;
  readonly body: unknown;

  constructor({ status, statusText, body }: ApiErrorOptions) {
    super(statusText || `API request failed with status ${status}`);
    this.name = "ApiError";
    this.status = status;
    this.statusText = statusText;
    this.body = body;
  }
}
