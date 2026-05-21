import { createApiTransport } from "@calibrate/api-client";

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? "";

export const apiTransport = createApiTransport({
  baseUrl: apiBaseUrl,
  fetch: globalThis.fetch.bind(globalThis),
});
