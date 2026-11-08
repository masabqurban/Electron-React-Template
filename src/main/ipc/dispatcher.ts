import type { InvokeChannel } from '@shared/channels';
import { inputSchemas, type IpcResult, type Outputs, type ParsedInput } from '@shared/contract';

import { AppError } from '../errors';

export type Handlers = {
  [C in InvokeChannel]: (input: ParsedInput<C>) => Outputs[C] | Promise<Outputs[C]>;
};

interface Logger {
  error: (...args: unknown[]) => void;
}

/**
 * Validates input against the contract, runs the handler and converts the
 * outcome to an `IpcResult`. Kept free of Electron APIs so it is unit-tested
 * directly. Unexpected errors are logged and reported without details.
 */
export function createDispatcher(handlers: Handlers, logger: Logger) {
  return async function dispatch<C extends InvokeChannel>(
    channel: C,
    rawInput: unknown,
  ): Promise<IpcResult<Outputs[C]>> {
    const schema = inputSchemas[channel];
    const parsed = schema.safeParse(rawInput);

    if (!parsed.success) {
      return {
        ok: false,
        error: {
          code: 'VALIDATION',
          message: 'The request was invalid.',
          issues: parsed.error.issues.map((issue) => `${issue.path.join('.') || 'input'}: ${issue.message}`),
        },
      };
    }

    try {
      const handler = handlers[channel] as (input: unknown) => Outputs[C] | Promise<Outputs[C]>;
      return { ok: true, data: await handler(parsed.data) };
    } catch (error) {
      if (error instanceof AppError) {
        return {
          ok: false,
          error: { code: error.code, message: error.message, ...(error.issues ? { issues: error.issues } : {}) },
        };
      }

      logger.error(`IPC handler "${channel}" failed`, error);
      return { ok: false, error: { code: 'INTERNAL', message: 'Something went wrong. Please try again.' } };
    }
  };
}

export type Dispatch = ReturnType<typeof createDispatcher>;
