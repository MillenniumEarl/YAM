// Copyright (c) 2021 MillenniumEarl
//
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT

// Core modules
import { DefaultCatch } from "catch-decorator-ts";
import { spawn } from "child_process";

// Public modules from npm
import { ipcMain as ipc, shell } from "electron";
import { Logger } from "log4js";
import shared from "../shared";
import ehandler from "../utility/error-handling";

// Local modules
import * as localization from "../utility/localization";

export default class IPCHandler {
  /**
   * Logger used to notify errors or other information.
   */
  #logger: Logger;

  constructor(logger: Logger) {
    // Assign logger
    this.#logger = logger;

    // Define callbacks for IPC
    ipc.on("execute", (_e, args) => this.execute(args));
    ipc.on("open-external-url", (_e, args) => this.openURL(args));
    ipc.on("show-devtools", (e) => e.sender.openDevTools());
    ipc.on("allow-menubar", (_e, args) => this.allowMenubar(args));
    ipc.handle("translate", (_e, args) => this.translate(args));
    ipc.handle("change-language", (_e, args) => this.changeLanguage(args));
    ipc.handle("current-language", this.getCurrentLanguage);
  }

  //#region Callbacks
  @DefaultCatch(ehandler)
  private execute(args: any[]) {
    // Check parameters
    this.validateArgumentLenght(args, 1);

    // Extract the filepath
    const filepath = args[0];
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

  @DefaultCatch(ehandler)
  private openURL(args: any[]) {
    // Check parameters
    this.validateArgumentLenght(args, 1);

    // Extract the URL
    const url = args[0];
    this.#logger.info(`Opening ${url}`);

    // Check URL validity
    const valid = this.isValidURL(url, ["http", "https"]);

    if (valid) shell.openExternal(url);
    else throw new Error(`Invalid URL: ${url}`);
  }

  @DefaultCatch(ehandler)
  private allowMenubar(args: any[]) {
    // Check parameters
    this.validateArgumentLenght(args, 1, 2);

    // Parse arguments
    const id = args[0];
    const allow = args[1];

    // Get the window
    const w = shared.wmanager.get(id);
    if (!w) throw new Error("Cannot find Window with given ID");
    const name = shared.wmanager.getName(w);
    this.#logger.info(`Allow menubar in ${name}: ${allow}`);

    // Save the preference
    shared.store.set(`menubar-${name}`, allow);

    // Show/hide the devtools for the window
    w.setMenuBarVisibility(allow);
  }

  @DefaultCatch(ehandler)
  private translate(args: any[]) {
    // Check parameters
    this.validateArgumentLenght(args, 1, 2);

    const key = args[0];
    const interpolation = args[1] ?? null;
    return localization.getTranslation(key, interpolation);
  }

  @DefaultCatch(ehandler)
  private changeLanguage(args: any[]) {
    // Check parameters
    this.validateArgumentLenght(args, 1);

    const iso = args[0];
    const currentISO = localization.getCurrentLanguage();

    // Save the new ISO into the store
    shared.store.set("language-iso", iso);
    this.#logger.log(`Language changed from ${currentISO} to ${iso}`);
    return localization.changeLanguage(iso);
  }

  @DefaultCatch(ehandler)
  private getCurrentLanguage() {
    return localization.getCurrentLanguage();
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

  private validateArgumentLenght(args: any[], min: number, max?: number) {
    // If max is not defined, assign min to it
    max = max ?? min;

    if (args.length < min || args.length > max) {
      const expected = max === min ? `${min}` : `${min}-${max}`;
      throw new Error(`Invalid number of parameters: expected ${expected}, found ${args.length}`);
    }
  }
  //#endregion Utility
}
