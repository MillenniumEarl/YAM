// Copyright (c) 2021 MillenniumEarl
//
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT

// Core modules
import { spawn } from "child_process";

// Public modules from npm
import { BrowserWindow, ipcMain as ipc, shell } from "electron";
import { CatchAll } from "@magna_shogun/catch-decorator";
import { TOptions } from "i18next";
import { Logger } from "log4js";

// Local modules
import * as localization from "../utility/localization";
import ehandler from "../utility/error-handling";
import { IRendererLog } from "../interfaces";
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
    ipc.on("execute", (_e, ...args) => this.execute(args));
    ipc.on("open-external-url", (_e, ...args) => this.openURL(args));
    ipc.on("show-devtools", (e) => e.sender.openDevTools());
    ipc.on("allow-menubar", (_e, ...args) => this.allowMenubar(args));
    ipc.on("renderer-log", (_e, args: IRendererLog) => shared.appevents.emit("renderer-log", args));
    ipc.handle("translate", (_e, ...args) => this.translate(args));
    ipc.handle("change-language", (_e, ...args) => this.changeLanguage(args));
    ipc.handle("current-language", () => this.getCurrentLanguage());
    ipc.handle("get-window-name", (_e, ...args) => this.getWindowName(args));
    ipc.handle("get-window-id", (e) => e.sender.id);
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
    this.validateArgumentLenght(args, 1, 2);

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
