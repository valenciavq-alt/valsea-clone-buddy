declare module "@vapi-ai/web" {
  export default class Vapi {
    constructor(publicKey: string);
    start(config: Record<string, unknown>): void;
    stop(): void;
    on(event: string, callback: (...args: unknown[]) => void): void;
    removeAllListeners(): void;
  }
}
