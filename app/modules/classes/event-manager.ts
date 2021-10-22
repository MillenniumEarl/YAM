// Copyright (c) 2021 MillenniumEarl
//
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT

// Local modules
import { IPathContext, IRendererLog } from "../interfaces";
import { get } from "../utility/logging";
import shared from "../shared";

export default class EventManager {
  /**
   * Logger used by the renderer processes.
   */
  readonly #rlogger = get("renderer");

  public initialize(): void {
    shared.appevents.on("renderer-log", (data: IRendererLog) => {
      const map = {
        info: (message: string) => this.#rlogger.info(message),
        warn: (message: string) => this.#rlogger.warn(message),
        error: (message: string) => this.#rlogger.error(message)
      };

      map[data.type](`(From '${data.wname}' window) ${data.message}`);
    });

    shared.appevents.on("received-paths", (paths: IPathContext[]) => {
      paths.map((o) => {
        // Parse context to determine if this is a game or a mod
        const checkIfPathIsGame = (n: number) => !!n;
        const isThisAGame = checkIfPathIsGame(o.context);

        if (isThisAGame) {
          const addGame = (s: string) => s;
          addGame(o.path);
        } else {
          const addMod = (s: string) => s;
          addMod(o.path);
        }
      });
    });
  }
}
