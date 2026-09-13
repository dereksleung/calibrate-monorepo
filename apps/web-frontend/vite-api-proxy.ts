export const DEFAULT_VITE_API_PROXY_TARGET = "http://localhost:3001";

export type ViteApiProxyEnvironment = {
  API_PROXY_TARGET?: string;
};

export function resolveViteApiProxyTarget(environment: ViteApiProxyEnvironment = process.env): string {
  const configured = environment.API_PROXY_TARGET?.trim();
  return configured ? configured : DEFAULT_VITE_API_PROXY_TARGET;
}

export function createViteApiProxy(target = resolveViteApiProxyTarget()) {
  return {
    "/api": {
      target,
      changeOrigin: true,
    },
  } as const;
}
