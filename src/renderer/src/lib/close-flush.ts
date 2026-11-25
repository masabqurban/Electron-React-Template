type FlushHandler = () => Promise<void>;

const handlers = new Set<FlushHandler>();

/** Registers an async flush handler to run before the window closes. */
export function registerCloseFlush(handler: FlushHandler): () => void {
  handlers.add(handler);
  return () => {
    handlers.delete(handler);
  };
}

/** Runs all registered flush handlers before confirming window close. */
export async function flushBeforeClose(): Promise<void> {
  await Promise.allSettled(Array.from(handlers, (handler) => handler()));
}
