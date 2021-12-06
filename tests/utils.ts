// Copyright (c) 2021 MillenniumEarl
//
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT

export interface WindowState {
  isVisible: boolean;
  isDevToolsOpened: boolean;
  isCrashed: boolean;
}

/**
 * Obtains the state of the selected BrowserWindow.
 */
export async function windowState(window: Electron.CrossProcessExports.BrowserWindow): Promise<WindowState> {
  const getState = () => ({
    isVisible: window.isVisible(),
    isDevToolsOpened: window.webContents.isDevToolsOpened(),
    isCrashed: window.webContents.isCrashed()
  });

  return new Promise((resolve) => {
    if (window.isVisible()) resolve(getState());
    else window.once("ready-to-show", () => setTimeout(() => resolve(getState()), 0));
  });
}
