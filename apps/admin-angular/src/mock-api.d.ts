// @polyapp/mock-api is plain ESM JavaScript without type declarations. The specs use only createMockServer.
declare module '@polyapp/mock-api' {
  export interface MockServer {
    url: string;
    close(): Promise<void>;
  }
  export function createMockServer(opts?: { port?: number; host?: string }): Promise<MockServer>;
}
