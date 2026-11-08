import { contextBridge, ipcRenderer } from 'electron';

import { eventChannels, invokeChannels } from '@shared/channels';
import type { PreloadApi } from '@shared/contract';

/*
 * The only bridge between the web page and Electron. It exposes a narrow,
 * typed API: the renderer can call the channels listed in the contract and
 * listen to a fixed set of events, nothing else. `ipcRenderer` itself is
 * never exposed.
 */

const invokable = new Set<string>(invokeChannels);
const listenable = new Set<string>(eventChannels);

const api: PreloadApi = {
  invoke: (channel, ...input) => {
    if (!invokable.has(channel)) {
      return Promise.reject(new Error(`Unknown channel: ${channel}`));
    }
    return ipcRenderer.invoke(channel, input[0]);
  },

  on: (event, listener) => {
    if (!listenable.has(event)) {
      throw new Error(`Unknown event: ${event}`);
    }
    // Don't pass the IpcRendererEvent through: it exposes `sender`.
    const handler = (_event: Electron.IpcRendererEvent, payload: unknown): void => listener(payload as never);
    ipcRenderer.on(event, handler);
    return () => {
      ipcRenderer.removeListener(event, handler);
    };
  },

  platform: process.platform,
};

contextBridge.exposeInMainWorld('api', api);
