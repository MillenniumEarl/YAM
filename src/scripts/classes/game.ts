/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-return */

// Copyright (c) 2022 MillenniumEarl
//
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT

// Core modules
import path from "path";

// Public modules from npm
import { Game as F95Game } from "@millenniumearl/f95api";
import uniqid from "uniqid";
import fs from "fs-extra";

// Local modules
import getSavesDirectory from "../utility/saves-dir";
import GameSerie from "./gameserie";
import shared from "../common/shared";

/**
 * Single game indexed by the application, it contains the main methods for its management.
 *
 * Every game must have an associated `GameSerie`.
 */
export default class Game extends F95Game {
  /**
   * ID of this game in the database.
   */
  #dbid: string = (uniqid as () => string)();

  /**
   * Path to the directory containing the game files.
   */
  #path: string | undefined;

  /**
   * Database ID of the associated serie.
   */
  #serieID: string;

  /**
   * Indicates whether the cover of this game has been downloaded to disk.
   */
  #previewDownloaded: boolean = false;

  /**
   * Path to the folder containing the cache of data for this game.
   */
  #cache: string | undefined;

  /**
   * ID of this game in the database.
   */
  public get dbid() {
    return this.#dbid;
  }

  /**
   * Database ID of the associated serie.
   */
  public get serieid() {
    return this.#serieID;
  }

  /**
   * Path to the directory containing the game files.
   */
  public get path() {
    return this.#path;
  }

  /**
   * Path to the cached cover image.
   */
  public get preview() {
    return this.#cache && this.#previewDownloaded ? path.join(this.#cache, "cover.webp") : null;
  }

  /**
   * @param data Object from which to extract the data to be stored in this class.
   * @param serie `GameSerie` to associate this game with.
   */
  constructor(data: F95Game, serie: GameSerie) {
    super();

    // Merge classes
    this.merge(data);

    // Associate serie
    this.#serieID = serie.dbid;
  }

  //#region Public methods
  /**
   * Install the game in the application.
   * @param src Directory containing the game to be installed
   */
  public async install(src: string) {
    // Check if src is a directory
    const stats = await fs.stat(src);
    if (!stats.isDirectory()) throw new Error("Expected 'src' to be a directory");

    // Load associated serie
    const serie = shared.gamedb.data?.series.find((serie) => serie.dbid === this.#serieID);
    if (!serie) throw new Error("No series associated to this game was found");

    // Prepare the target path
    const name = path.basename(src); // Reuse the src folder name
    const target = path.join(serie.path, name);

    // Check if target already exists
    const exists = await fs.pathExists(target);
    if (exists) throw Error("Target directory already exists");

    // Copy all the files from src to target
    await fs.copy(src, target);

    // Save the target path and memorize the game in database
    this.#path = target;
    shared.gamedb.data?.games.push(this);
    await shared.gamedb.write();

    // Create the cache folder
    this.#cache = path.join(this.#path, ".cache");
    await fs.mkdir(this.#cache);
  }

  /**
   * Remove the game from the application.
   */
  public async uninstall() {
    // Check if there is a gamepath
    if (!this.#path) throw new Error("This game is not installed or the class not initialized");

    // Remove the game from disk
    await fs.remove(this.#path);

    // Find this game in database
    const index = shared.gamedb.data?.games.findIndex((game) => game.#dbid === this.#dbid);
    if (!index) throw new Error("Cannot find this game in the database");

    // Remove from database
    shared.gamedb.data?.games.splice(index, 1);
    await shared.gamedb.write();
  }

  /**
   * Update the game with a different version.
   * @param src Directory containing the update files.
   */
  public async update(src: string) {
    // Check if src is a directory
    const stats = await fs.stat(src);
    if (!stats.isDirectory()) throw new Error("Expected 'src' to be a directory");

    // Check if there is a gamepath
    if (!this.#path) throw new Error("This game is not installed or the class not initialized");

    // Copy and overwrite existing files
    await fs.copy(src, this.#path);
  }

  /**
   * Gets the save file paths for this game if the graphics engine is supported.
   *
   * The supported engines are: `Ren'Py`, `Unity`, `RPGM`.
   */
  public async saves(): Promise<string[]> {
    // First check if the game is installed
    if (!this.#path) throw new Error("This game is not installed or the class not initialized");

    // Get the directory containing all the saves for this game
    const savesDir = await getSavesDirectory(this);
    if (!savesDir) return [];

    // Get the right extension for the name
    const map: Record<string, RegExp> = {
      "Ren'Py": /save/i,
      RPGM: /rvdata2/i,
      Unity: /(?<=\.)(.*(sav|dat){1}.*)(?=$)/i
    };
    if (this.engine in map === false) return []; // Engine not supported
    const rextension = map[this.engine as string];

    // Return the paths of the savefiles
    return await this.filterFileExtensions(savesDir, rextension);
  }

  //#endregion Public methods

  //#region Private methods
  /**
   * Merge an existing F95Game with this class, copying only the common properties.
   */
  private merge(src: F95Game) {
    Object.entries(src) // Obtains all the key from the source object
      .filter(([key]) => key in this) // Get all the keys that are in both the objects
      .forEach(([key, val]) => (this[key as keyof this] = val)); // Save the key in this object
  }

  /**
   * Gets all save files directly contained in a directory
   * and compatible with the engine of this game.
   * @param p Path to directory
   * @param extension Regex expression used to test the files
   */
  private async filterFileExtensions(p: string, extension: RegExp): Promise<string[]> {
    // Search for valid savefiles
    const savefiles: string[] = [];
    const dir = await fs.opendir(p);
    for await (const dirent of dir) {
      // Skip non-files
      if (!dirent.isFile()) continue;

      // Check if the extension is valid and memorize path
      if (extension.test(path.extname(dirent.name))) {
        savefiles.push(path.join(p, dirent.name));
      }
    }

    // Close handle
    await dir.close();

    return savefiles;
  }
  //#endregion Private methods
}
