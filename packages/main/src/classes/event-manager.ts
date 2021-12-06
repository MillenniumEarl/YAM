// Copyright (c) 2022 MillenniumEarl
//
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT

// Core modules
import path from "path";

// Public modules from npm
import F95 from "@millenniumearl/f95api";
import fs from "fs-extra";

// Local modules
import type { IPathContext, IRendererLog } from "../../../common/interfaces";
import { get } from "../utility/logging";
import GameSerie from "./gameserie";
import shared from "../../../common/shared";
import Game from "./game";

/**
 * Handler for all events using `shared.appevents`.
 */
export default class EventManager {
  /**
   * Logger used by the renderer processes.
   */
  readonly #rlogger = get("renderer");

  public initialize(): void {
    shared.appevents.on("renderer-log", this.log.bind(this));
    shared.appevents.on("received-paths", this.install.bind(this));
  }

  //#region Callback methods
  private log(data: IRendererLog) {
    const map = {
      info: (message: string) => this.#rlogger.info(message),
      warn: (message: string) => this.#rlogger.warn(message),
      error: (message: string) => this.#rlogger.error(message)
    };

    map[data.type](`(From '${data.wname}' window) ${data.message}`);
  }

  private install(paths: IPathContext[]) {
    /**
     * @todo
     */
    const installElementInApplication = async (o: IPathContext) => {
      // Parse context to determine if this is a game or a mod
      const context = this.parseDOMContext(o.context);

      if (context === "Game") {
        // Get the serie from the context value
        const serie = new GameSerie("**TEST**");

        await this.installGame(o.path, serie);
      } else await this.installMod(o.path);
    };

    const promises = paths.map(installElementInApplication);
    void Promise.all(promises);
  }
  //#endregion Callback methods

  //#region Private methods
  /**
   * @todo
   */
  private parseDOMContext(c: number | null): "Game" | "Mod" {
    return c && c < 0 ? "Mod" : "Game";
  }

  /**
   * @todo
   */
  private async askUserForMultipleGames(gamelist: F95.Game[]) {
    await new Promise(() => gamelist);
    return new F95.Game();
  }

  private async installGame(src: string, serie: GameSerie) {
    // Check if the source is a directory
    const stats = await fs.lstat(src);
    if (!stats.isDirectory()) throw new Error("Source must be a directory");

    // Get the name of the directory
    const gamename = path.basename(src);

    // Search the game on F95
    const query = new F95.HandiworkSearchQuery();
    query.keywords = gamename;
    query.category = "games";
    const gamelist = await F95.searchHandiwork<F95.Game>(query, F95.Game);

    // Ask the user to select a game if multiple are found
    const f95game =
      gamelist.length > 1 ? await this.askUserForMultipleGames(gamelist) : gamelist[0];

    // Install the game
    const game = new Game(f95game, serie);
    await game.install(src);
  }

  /**
   * @todo
   */
  private async installMod(src: string) {
    await new Promise(() => src);
  }

  //#endregion Private methods
}
