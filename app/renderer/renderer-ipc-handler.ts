/* eslint-disable @typescript-eslint/restrict-template-expressions */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-return */
// Copyright (c) 2021 MillenniumEarl
//
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT

// Public modules from npm
import { ipcRenderer as ipc } from "electron";

// Local modules
import IPCLogger from "./ipc-logger";

export default class RendererIPCHandler {
  #validSendChannels: string[] = ["get-window-id"];

  #validReceiveChannels: string[] = [];

  #logger = new IPCLogger();

  get logger() {
    return this.#logger;
  }

  /**
   * Initialize the class.
   */
  public async configure() {
    const id = (await this.invoke("get-window-id")) as number;
    await this.#logger.setWindowName(id);
  }

  /**
   * Send an asynchronous request via IPC and wait for a response.
   * @param channel Communication channel
   * @param data Data to send to main process
   * @returns Result from the main process
   */
  public invoke(channel: string, ...data: any[]): Promise<any> | undefined {
    // Send a custom message
    if (this.#validSendChannels.includes(channel)) {
      return ipc.invoke(channel, data);
    } else {
      void this.#logger.warn(
        `Unauthorized IPC message from renderer process through ${channel}: ${data}`
      );
    }
  }

  /**
   * Send an asynchronous request via IPC.
   * @param channel Communication channel
   * @param data Data to send to main process
   */
  public send(channel: string, ...data: any[]) {
    // Send a custom message
    if (this.#validSendChannels.includes(channel)) {
      ipc.send(channel, data);
    } else {
      void this.#logger.warn(
        `Unauthorized IPC message from renderer process through ${channel}: ${data}`
      );
    }
  }

  /**
   * Receive a message from main process via IPC and execute a method.
   * @param channel Communication channel
   * @param func Method to execute when a message is received
   */
  public receive(channel: string, func: Function) {
    // Receive a custom message
    if (this.#validReceiveChannels.includes(channel)) {
      // Deliberately strip event as it includes `sender`
      ipc.on(channel, (_, ...args) => func(...args));
    } else {
      void this.#logger.warn(`Unauthorized IPC message from main process through ${channel}`);
    }
  }
}
