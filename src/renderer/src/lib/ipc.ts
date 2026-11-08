import type { EventChannel, InvokeChannel } from '@shared/channels';
import type { ErrorCode, EventPayloads, Input, Outputs } from '@shared/contract';

/** An IPC failure, with the stable code the main process returned. */
export class IpcError extends Error {
  constructor(
    public readonly code: ErrorCode,
    message: string,
    public readonly issues: string[] = [],
  ) {
    super(message);
    this.name = 'IpcError';
  }
}

/**
 * Calls the main process. Resolves with the data or throws an `IpcError`,
 * so it plugs straight into TanStack Query.
 */
export async function call<C extends InvokeChannel>(
  channel: C,
  ...input: Input<C> extends undefined ? [] : [Input<C>]
): Promise<Outputs[C]> {
  const result = await window.api.invoke(channel, ...input);
  if (!result.ok) {
    throw new IpcError(result.error.code, result.error.message, result.error.issues);
  }
  return result.data;
}

/** Subscribes to an event pushed by the main process. Returns an unsubscribe function. */
export function subscribe<E extends EventChannel>(event: E, listener: (payload: EventPayloads[E]) => void): () => void {
  return window.api.on(event, listener);
}

export const platform = window.api.platform;
export const isMac = platform === 'darwin';
export const modKey = isMac ? '⌘' : 'Ctrl';
