import { ipcMain, type IpcMainInvokeEvent } from 'electron';

import { invokeChannels } from '@shared/channels';

import type { Dispatch } from './dispatcher';

/**
 * Binds every contract channel to `ipcMain.handle`. Calls are accepted only
 * from the app's own top-level page, never from an embedded or navigated
 * frame, so a compromised iframe can't reach the main process.
 */
export function registerIpcHandlers(dispatch: Dispatch, isTrustedUrl: (url: string) => boolean): void {
  for (const channel of invokeChannels) {
    ipcMain.handle(channel, (event: IpcMainInvokeEvent, input: unknown) => {
      const frame = event.senderFrame;
      // Reject a missing frame, any child frame, and any page that isn't the app.
      if (frame?.parent !== null || !isTrustedUrl(frame.url)) {
        return { ok: false, error: { code: 'FORBIDDEN', message: 'Untrusted sender.' } };
      }
      return dispatch(channel, input);
    });
  }
}
