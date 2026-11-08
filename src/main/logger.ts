import log from 'electron-log/main';

/**
 * Logs go to the console in development and to a rotating file in
 * production: %APPDATA%\<app>\logs on Windows, ~/Library/Logs/<app> on
 * macOS and ~/.config/<app>/logs on Linux.
 */
export function setUpLogging(isDev: boolean): typeof log {
  log.initialize();
  log.transports.file.level = 'info';
  log.transports.file.maxSize = 5 * 1024 * 1024;
  log.transports.console.level = isDev ? 'debug' : 'warn';
  log.errorHandler.startCatching({ showDialog: false });
  return log;
}

export { log };
