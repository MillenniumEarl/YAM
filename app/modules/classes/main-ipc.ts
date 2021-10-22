// Copyright (c) 2021 MillenniumEarl
//
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT

// Core modules
import { spawn } from "child_process";
import fs from "fs/promises";

// Public modules from npm
import { BrowserWindow, ipcMain as ipc, shell, dialog } from "electron";
import { CatchAll } from "@magna_shogun/catch-decorator";
import { TOptions } from "i18next";
import { Logger } from "log4js";

// Local modules
import * as localization from "../utility/localization";
import ehandler from "../utility/error-handling";
import { IPathContext, IRendererLog } from "../interfaces";
import shared from "../shared";

export default class IPCHandler {
  /**
   * Logger used to notify errors or other information.
   */
  #logger: Logger;

  constructor(logger: Logger) {
    // Assign logger
    this.#logger = logger;

    // Define callbacks for IPC
    ipc.on("execute", (_e, ...args: unknown[]) => this.execute(args));
    ipc.on("open-external-url", (_e, ...args: unknown[]) => this.openURL(args));
    ipc.on("show-devtools", (e) => e.sender.openDevTools());
    ipc.on("allow-menubar", (_e, ...args: unknown[]) => this.allowMenubar(args));
    ipc.on("renderer-log", (_e, args: IRendererLog) => shared.appevents.emit("renderer-log", args));
    ipc.on("received-paths", (_e, ...args: unknown[]) => this.receivedDirectoryPaths(args));
    ipc.handle("translate", (_e, ...args: unknown[]) => this.translate(args));
    ipc.handle("change-language", (_e, ...args: unknown[]) => this.changeLanguage(args));
    ipc.handle("current-language", () => this.getCurrentLanguage());
    ipc.handle("get-window-name", (_e, ...args: unknown[]) => this.getWindowName(args));
    ipc.handle("get-window-id", (e) => e.sender.id);
    ipc.handle("open-dialog", (e, ...args: unknown[]) => this.openDialog(e, args));
  }

  //#region Callbacks
  @CatchAll(ehandler)
  private execute(args: unknown[]) {
    // Check parameters
    this.validateArgumentLenght(args, 1);

    // Extract the filepath
    const filepath = args[0] as string;
    this.#logger.info(`Executing ${filepath}`);

    // Create and run child
    const child = spawn(filepath, [], {
      detached: true
    });

    // Write log on child error
    child.on("error", (err: Error) => ehandler(err));

    // Unreference the child, now it will
    // run as an independent process
    child.unref();
  }

  @CatchAll(ehandler)
  private openURL(args: unknown[]) {
    // Check parameters
    this.validateArgumentLenght(args, 1);

    // Extract the URL
    const url = args[0] as string;
    this.#logger.info(`Opening ${url}`);

    // Check URL validity
    const valid = this.isValidURL(url, ["http", "https"]);

    if (valid) void shell.openExternal(url);
    else throw new Error(`Invalid URL: ${url}`);
  }

  @CatchAll(ehandler)
  private allowMenubar(args: unknown[]) {
    // Check parameters
    this.validateArgumentLenght(args, 2);

    // Parse arguments
    const id = args[0] as number;
    const allow = args[1] as boolean;

    // Get the window
    const w = shared.wmanager.get(id);
    if (!w) throw new Error("Cannot find Window with given ID");
    const name = shared.wmanager.getName(w) ?? "Unknown";
    this.#logger.info(`Allow menubar in ${name}: ${String(allow)}`);

    // Save the preference
    shared.store.set(`menubar-${name}`, allow);

    // Show/hide the devtools for the window
    w.setMenuBarVisibility(allow);
  }

  @CatchAll(ehandler)
  private translate(args: unknown[]) {
    // Check parameters
    this.validateArgumentLenght(args, 1, 2);

    const key = args[0] as string;
    const interpolation = args[1] as string | TOptions<object>;
    return localization.getTranslation(key, interpolation);
  }

  @CatchAll(ehandler)
  private changeLanguage(args: unknown[]) {
    // Check parameters
    this.validateArgumentLenght(args, 1);

    const iso = args[0] as string;
    const currentISO = localization.getCurrentLanguage();

    // Save the new ISO into the store
    shared.store.set("language-iso", iso);
    this.#logger.log(`Language changed from ${currentISO} to ${iso}`);
    return localization.changeLanguage(iso);
  }

  @CatchAll(ehandler)
  private getCurrentLanguage() {
    return localization.getCurrentLanguage();
  }

  @CatchAll(ehandler)
  private getWindowName(args: unknown[]) {
    // Check parameters
    this.validateArgumentLenght(args, 1);

    const wid: number = args[0] as number;
    const w = shared.wmanager.get(wid) as BrowserWindow;
    return shared.wmanager.getName(w);
  }

  @CatchAll(ehandler)
  private receivedDirectoryPaths(args: unknown[]) {
    // Check parameters
    this.validateArgumentLenght(args, 2);

    // Extract data
    const data = args[0] as IPathContext[];
    const allowFile = args[1] as boolean;

    // Parse files (remove files if not allowed)
    const valids = data.filter(async (o) => {
      // Get the data of the entry (file or folder)
      const entry = await fs.lstat(o.path);

      // Check if the entry is ok
      const validFile = entry.isFile() && allowFile;
      // @todo: Add file's extension check?

      // Return validation
      return entry.isDirectory() || validFile;
    });

    // Emit event with valid data
    if (valids.length > 0) shared.appevents.emit("received-paths", valids);
  }

  @CatchAll(ehandler)
  private openDialog(e: Electron.IpcMainInvokeEvent, args: unknown[]) {
    // Check parameters
    this.validateArgumentLenght(args, 2);

    // Extract data
    const options = args[0] as Electron.OpenDialogOptions;
    const modal = args[1] as boolean;

    let result = null;
    if (modal) {
      // Get the window
      const w = shared.wmanager.get(e.sender.id) as BrowserWindow;
      result = dialog.showOpenDialog(w, options);
    }
    result = dialog.showOpenDialog(options);

    return result;
  }
  //#endregion Callbacks

  //#region Utility
  private isValidURL(s: string, protocols?: string[]) {
    try {
      const url = new URL(s);
      const validProtocol =
        protocols?.map((x) => `${x.toLowerCase()}:`).includes(url.protocol) ?? true;

      return validProtocol;
    } catch {
      return false;
    }
  }

  private validateArgumentLenght(args: unknown[], min: number, max?: number) {
    // If max is not defined, assign min to it
    max = max ?? min;

    if (args.length < min || args.length > max) {
      const expected = max === min ? `${min}` : `${min}-${max}`;
      throw new Error(`Invalid number of parameters: expected ${expected}, found ${args.length}`);
    }
  }
  //#endregion Utility
}
