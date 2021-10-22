// Copyright (c) 2021 MillenniumEarl
//
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT

// Local modules
import { IDialogOptions } from "../interfaces";
import RendererIPCHandler from "./renderer-ipc";

/**
 * Manages the dialog boxes that a renderer
 * process can request from the main one.
 */
export default class DialogHandler {
  /**
   * Handler of the IPC communication.
   */
  #ipc: RendererIPCHandler;

  constructor(handler: RendererIPCHandler) {
    this.#ipc = handler;
  }

  /**
   * Select one or more folder from disk.
   * @param options Options of the dialog window.
   */
  public selectFolder(options: IDialogOptions) {
    // Define the options to pass in order to open the dialog
    const data: Electron.OpenDialogOptions = {
      title: options.title,
      properties: ["openDirectory", "dontAddToRecent"],
      defaultPath: options.defaultPath,
      message: options.message
    };

    // Allow the selection of multiple directory
    if (options.multiple) data.properties?.push("multiSelections");

    // Send async request
    return this.#ipc.invoke(
      "open-dialog",
      data,
      options.modal ?? false
    ) as Promise<Electron.OpenDialogReturnValue>;
  }

  /**
   * Select one or more files from disk.
   * @param options Options of the dialog window.
   */
  public async selectFile(options: IDialogOptions) {
    // Define the options to pass in order to open the dialog
    const data: Electron.OpenDialogOptions = {
      title: options.title,
      properties: ["openFile", "dontAddToRecent"],
      defaultPath: options.defaultPath,
      message: options.message,
      filters: options.filters
    };

    // Allow the selection of multiple directory
    if (options.multiple) data.properties?.push("multiSelections");

    // Send async request
    return this.#ipc.invoke(
      "open-dialog",
      data,
      options.modal ?? false
    ) as Promise<Electron.OpenDialogReturnValue>;
  }
}
