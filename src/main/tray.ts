import { app, Menu, nativeImage, Tray } from 'electron';

interface TrayActions {
  show: () => void;
  newNote: () => void;
  quit: () => void;
}

/**
 * A tray (Windows, Linux) or menu bar (macOS) icon. macOS uses a template
 * image so the system tints it for light and dark menu bars.
 */
export function createTray(iconPath: string, actions: TrayActions): Tray {
  const image = nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 });
  if (process.platform === 'darwin') {
    image.setTemplateImage(true);
  }

  const tray = new Tray(image);
  tray.setToolTip(app.getName());
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: `Open ${app.getName()}`, click: actions.show },
      { label: 'New Note', click: actions.newNote },
      { type: 'separator' },
      { label: 'Quit', click: actions.quit },
    ]),
  );
  // Windows and Linux users expect a click to open the window.
  tray.on('click', actions.show);

  return tray;
}
