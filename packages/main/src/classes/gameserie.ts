// Copyright (c) 2022 MillenniumEarl
//
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT

// Core modules
import path from "path";

// Public modules from npm
import sanitize from "sanitize-filename";
import uniqid from "uniqid";
import fs from "fs-extra";

// Local modules
import shared from "../../../common/shared";

export default class GameSerie {
  /**
   * ID of this serie in the database.
   */
  #dbid: string = (uniqid as () => string)();

  /**
   * Name of this serie.
   */
  #name: string;

  /**
   * Path of this serie on disk.
   */
  #path: string;

  /**
   * ID of this serie in the database.
   */
  public get dbid() {
    return this.#dbid;
  }

  /**
   * Path on disk of this serie.
   */
  public get path() {
    return this.#path;
  }

  /**
   * @param name Name used to address to this serie.
   */
  constructor(name: string) {
    this.#name = sanitize(name);
    this.#path = path.join(shared.paths.GAME_FOLDER_PATH(), this.#name);
  }

  /**
   * Create the folder that will contain the games
   * associated with the series if it does not exist.
   *
   * @returns `true` if the folder was created, `false` if it already existed.
   */
  public async create(): Promise<boolean> {
    let returnValue = false;

    // Create directory if doesn't exists
    const exists = await fs.pathExists(this.#path);
    if (!exists) {
      await fs.mkdir(this.#path);
      returnValue = true;
    }

    // Add serie to DB
    shared.gamedb.data?.series.push(this);
    await shared.gamedb.write();

    return returnValue;
  }

  /**
   * Removes all references to the series and all related games.
   */
  public async remove() {
    // Get this serie index in the database array
    const index = shared.gamedb.data?.series.findIndex((serie) => serie.#dbid === this.#dbid);
    if (!index) throw new Error("Cannot find this game in the database");

    // First remove all the games associated with this serie,
    // games that are stored inside this.#path
    const games = shared.gamedb.data?.games.filter((game) => game.serieid === this.#dbid) ?? [];

    // Remove all games
    const promises = games.map((game) => game.uninstall());
    await Promise.all(promises);

    // Remove the directory
    await fs.remove(this.#path);

    // Delete this record from database
    shared.gamedb.data?.series.splice(index, 1);
    await shared.gamedb.write();
  }
}
