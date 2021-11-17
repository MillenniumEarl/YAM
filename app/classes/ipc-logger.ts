// Copyright (c) 2022 MillenniumEarl
//
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT

// Public modules from npm
import { ipcRenderer as ipc } from "electron";

// Local modules
import { IRendererLog } from "../common/interfaces";

/**
 * Wrapper class that allows you to send log messages
 * from a renderer process to the main one via IPC.
 */
export default class IPCLogger {
  /**
   * Name of the window that uses this renderer process.
   */
  #wname: string = "Unknown";

  /**
   * Gets the name of the window that is trying to send
   * the log message and save it in the `#wname` property.
   */
  private async getWindowName(wid: number) {
    const result = (await ipc.invoke("get-window-name", wid)) as string;
    this.#wname = result ?? "Unknown";
  }

  /**
   * Sets the name of the window this logger is using, thus allowing easier debugging.
   */
  public async setWindowName(id: number) {
    await this.getWindowName(id);
  }

  /**
   * Send an `info` type log via event.
   */
  public info(message: string) {
    const data: IRendererLog = {
      wname: this.#wname,
      type: "info",
      message: message
    };

    ipc.send("renderer-log", data);
  }

  /**
   * Send an `warn` type log via event.
   */
  public warn(message: string) {
    const data: IRendererLog = {
      wname: this.#wname,
      type: "warn",
      message: message
    };

    ipc.send("renderer-log", data);
  }

  /**
   * Send an `error` type log via event.
   */
  public error(message: string) {
    const data: IRendererLog = {
      wname: this.#wname,
      type: "error",
      message: message
    };

    ipc.send("renderer-log", data);
  }
}
