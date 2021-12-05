/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-return */
// Copyright (c) 2022 MillenniumEarl
//
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT

// Public modules from npm
import { ipcRenderer as ipc } from "electron";

// Local modules
import IPCLogger from "../../main/src/classes/ipc-logger";

/**
 * Securely manages IPC communication between the renderer process and the main process.
 */
export default class RendererIPCHandler {
  /**
   * List of valid channels for sending messages
   * from the renderer process via `send` or` invoke`.
   */
  #validSendChannels: string[] = ["get-window-id", "received-paths", "open-dialog"];

  /**
   * List of valid channels for receiving messages
   * from the main process via `receive` or` once`.
   */
  #validReceiveChannels: string[] = [];

  #logger = new IPCLogger();

  /**
   * Logger of the renderer process.
   */
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
  public invoke(channel: string, ...data: unknown[]): Promise<unknown> | undefined {
    // Send a custom message
    if (this.#validSendChannels.includes(channel)) {
      return ipc.invoke(channel, ...data);
    } else {
      const json = JSON.stringify(data, null, 4);
      void this.#logger.warn(
        `Unauthorized IPC message from renderer process through '${channel}': ${json}`
      );
    }
  }

  /**
   * Send an asynchronous request via IPC.
   * @param channel Communication channel
   * @param data Data to send to main process
   */
  public send(channel: string, ...data: unknown[]) {
    // Send a custom message
    if (this.#validSendChannels.includes(channel)) {
      ipc.send(channel, ...data);
    } else {
      const json = JSON.stringify(data, null, 4);
      void this.#logger.warn(
        `Unauthorized IPC message from renderer process through '${channel}': ${json}`
      );
    }
  }

  /**
   * Receive a message from main process via IPC and execute a method.
   * @param channel Communication channel
   * @param func Method to execute when a message is received
   */
  // eslint-disable-next-line @typescript-eslint/ban-types
  public receive(channel: string, func: Function) {
    // Receive a custom message
    if (this.#validReceiveChannels.includes(channel)) {
      // Deliberately strip event as it includes `sender`
      ipc.on(channel, (_, ...args) => func(...args));
    } else {
      void this.#logger.warn(`Unauthorized IPC message from main process through '${channel}'`);
    }
  }
}
