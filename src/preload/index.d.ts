import type { PreloadApi } from '@shared/contract';

declare global {
  interface Window {
    api: PreloadApi;
  }
}

export {};
