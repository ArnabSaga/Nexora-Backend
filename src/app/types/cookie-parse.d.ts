declare module 'cookie-parse' {
  export function parse(cookieHeader: string): Record<string, string>;
  export function serialize(name: string, value: string, options?: Record<string, unknown>): string;
}
