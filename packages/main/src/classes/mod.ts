// Copyright (c) 2022 MillenniumEarl
//
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT

// Core modules
import path from "path";

// Public modules from npm
import sanitize from "sanitize-filename";
import readdir from "readdir-enhanced";
import uniqid from "uniqid";
import fs from "fs-extra";

// Local modules
import type { IModOperationRecord } from "../../../common/interfaces";
import type { TModOperationType } from "../../../common/types";
import shared from "../../../common/shared";
import type Game from "./game";

export default class Mod {
  /**
   * ID of this mod in the database.
   */
  #dbid: string = (uniqid as () => string)();

  /**
   * ID in the database of the `Game` associated with this `Mod`.
   */
  #gameid: string | undefined;

  /**
   * Path to the folder containing the mod's files.
   */
  #path: string | undefined;

  /**
   * Folder containing the files to restore when the mod is uninstalled..
   */
  #rollback: string | undefined;

  /**
   * Indicates if the mod is installed in the game.
   */
  #installed = false;

  /**
   * Unique name of the mod.
   */
  #name: string;

  /**
   * List of operations performed during the installation of a mod.
   */
  #operations: IModOperationRecord[] = [];

  /**
   * ID in the database of the `Game` associated with this `Mod`.
   */
  public get associatedGameID() {
    return this.#gameid;
  }

  /**
   * Indicates if the mod is installed in the game.
   */
  public get installed() {
    return this.#installed;
  }

  constructor(name: string) {
    this.#name = name;
  }

  //#region Public methods
  /**
   * Associate this mod with the specified `Game` object.
   *
   * @param src
   * Paths of the files that comprise this mod.
   * They **must** be files inside the mod folder.
   */
  public async associate(game: Game, src: string[]) {
    // Check the game and associate it
    if (!game.path) throw new Error("Associated game not installed");
    this.#gameid = game.dbid;

    // Create the mod folder if it doesn't exists
    this.#path = path.join(game.path, ".mods", sanitize(this.#name));
    await fs.ensureDir(this.#path);

    // Initialize the patj for the rollback directory
    // (but do not create it, it will be created when necessary)
    this.#rollback = path.join(this.#path, ".rollback");

    // Copy this mod's files in the specific directory
    for (const s of src) {
      // Check if it is file or directory
      const stats = await fs.lstat(s);

      // If the source is a directory, only its content will
      // be copied so we need to create the directory itself
      const basename = path.basename(s);
      if (stats.isDirectory()) await fs.ensureDir(path.join(this.#path, basename));
      await fs.copy(s, path.join(this.#path, basename));
    }

    // Insert this object into the database
    shared.gamedb.data?.mods.push(this);
    return await shared.gamedb.write();
  }

  /**
   * Install this mod in the associated game.
   *
   * @param cbtype
   * Callback used in case of file conflict to decide whether
   * to overwrite or append files. The `Append` option is only
   * available with games developed with `Ren'Py`.
   */
  public async install(cbtype?: () => Promise<"Overwrite" | "Append">) {
    if (this.#installed) throw new Error("Mod already installed");
    if (!this.#path) throw new Error("This mod is not associate with a game");

    // Get the game from the database
    const game = shared.gamedb.data?.games.find((g) => g.dbid === this.#dbid);
    if (!game) throw new Error(`Cannot find game with ID ${this.#dbid} in the database`);

    // Prepare helper functions
    const onlyModDirectories = (stats: fs.Stats & { path: string }) => {
      // stats.path is the relative path to the base directory (game.path),
      // we need to check if this relative path exists in the mod folder
      const modRelative = path.join(this.#path as string, stats.path);
      return fs.pathExistsSync(modRelative);
    };

    const onlyModFiles = (stats: fs.Stats & { path: string }) => {
      // stats.path is the relative path to the base directory (game.path),
      // we need only the files that are both in the game and in the mod directory
      const modRelative = path.join(this.#path as string, stats.path);
      return stats.isFile() && fs.pathExistsSync(modRelative);
    };

    // For every mod's file, check if it exists in the target path
    const files = await readdir.async(game.path as string, {
      deep: onlyModDirectories,
      filter: onlyModFiles
    });

    // Get the preferred method of installation (if any).
    // ** Merge option available only with Ren'Py engine. **
    let type: TModOperationType = "Overwrite";
    if (files.length > 0 && cbtype && game.engine === "Ren'Py") type = await cbtype();

    // Merge or overwrite all the files
    for (const file of files) {
      // Depending on the type of operation, overwrite or append the files.
      const relativeFinalPath = type === "Append" ? await this.getMergeFilename(file) : file;
      const target = path.join(game.path as string, relativeFinalPath);
      const origin = path.join(this.#path, file);

      // Create the operation
      const op: IModOperationRecord = {
        type: type,
        modpath: origin,
        gamepath: target
      };

      // Save the original file for future rollback
      if (type === "Overwrite") await this.saveRollbackFile(origin);

      // Copy the file
      await fs.ensureDir(path.dirname(op.gamepath));
      await fs.copy(op.modpath, op.gamepath);

      // Add the successful operation to the array
      this.#operations.push(op);
    }

    // Add all the files not copied in the previous cicle
    const onlyNotInstalledFiles = (stats: fs.Stats & { path: string }) => {
      // stats.path is the relative path to the base directory (game.path),
      // we need only the files that are *not* in the game folder
      const isInstalled = this.#operations.find((op) => op.modpath.includes(stats.path));
      return stats.isFile() && !isInstalled;
    };

    const toAddFiles = await readdir.async(this.#path, {
      deep: true,
      filter: onlyNotInstalledFiles
    });

    for (const file of toAddFiles) {
      const target = path.join(game.path as string, file);
      const origin = path.join(this.#path, file);

      // Create the operation
      const op: IModOperationRecord = {
        type: "Add",
        modpath: origin,
        gamepath: target
      };

      // Copy the file
      await fs.ensureDir(path.dirname(op.gamepath));
      await fs.copy(op.modpath, op.gamepath);

      // Add the successful operation to the array
      this.#operations.push(op);
    }

    // Update this object
    this.#installed = true;
    return await shared.gamedb.write();
  }

  /**
   * Remove all files related to this mod from the game folder.
   *
   * This does **not** delete the mod from the system
   * and it may be reinstalled in the future.
   */
  public async uninstall() {
    // Check if the game is installed
    if (!this.#installed) throw new Error("Mod not installed, cannot be removed");

    const rollbackOperation = async (op: IModOperationRecord) => {
      // If the mod was added or appended it can be safely deleted,
      // otherwise it will be necessary to restore the original file
      if (op.type !== "Overwrite") await fs.remove(op.gamepath);
      else await this.rollbackFile(op.gamepath);
    };

    // Remove and/or restore all the files
    const promises = this.#operations.map((op) => rollbackOperation(op));
    await Promise.all(promises);

    // Remove the rollback directory
    await fs.remove(this.#rollback as string);

    // Update this mod in the database
    this.#operations = [];
    this.#installed = false;
    await shared.gamedb.write();
  }

  /**
   * Uninstall the mod and remove every file and reference to it from the application.
   *
   * This delete the mod from the system and it **cannot** be reinstalled in the future.
   */
  public async delete() {
    if (!this.#path) throw new Error("This mod is not associate with a game");

    // Unistall the mod (if installed)
    if (this.#installed) await this.uninstall();

    // Remove all the files in the mod's path
    await fs.remove(this.#path);

    // Find this mod in the database
    const index = shared.gamedb.data?.mods.findIndex((mod) => mod.#dbid === this.#dbid);
    if (!index) throw new Error("Cannot find this mod in the database");

    // Remove from database
    shared.gamedb.data?.mods.splice(index, 1);
    await shared.gamedb.write();
  }
  //#endregion Public methods

  //#region Private methods
  /**
   * Gets a valid name to use for a file when the operation is of type `Append`.
   */
  private async getMergeFilename(src: string): Promise<string> {
    // Local variables
    const basename = path.basename(src);
    const endsWithDigit = /\d+(?=\.)/i;

    // Check if the filename ends with a digit
    const match = basename.match(endsWithDigit);
    const value = match ? parseInt(match.shift() as string, 10) : 0;

    // Use the number to define the new filename
    const filename = `${basename.replace(endsWithDigit, "")}_${value + 1}`;
    const newPath = src.replace(basename, filename);

    // Check if the file exists and if yes, try antoher value
    const exists = await fs.pathExists(newPath);

    return exists ? this.getMergeFilename(newPath) : newPath;
  }

  /**
   * Save a file that will need to be restored later.
   */
  private async saveRollbackFile(src: string) {
    // Get the path of the file relative to the game directory
    const game = shared.gamedb.data?.games.find((g) => g.dbid === this.#dbid) as Game;
    const relativePath = src.replace(game.path as string, "");

    // Get the rollback directory
    const rollbackDir = path.join(this.#rollback as string, relativePath);
    const rollbackFilename = path.join(rollbackDir, path.basename(src));

    // Copy the rollback file
    await fs.ensureDir(rollbackDir);
    await fs.copy(origin, rollbackFilename);

    return rollbackFilename;
  }

  /**
   * Restore a previously saved file.
   */
  private async rollbackFile(from: string) {
    // Get the path of the file relative to the game directory
    const game = shared.gamedb.data?.games.find((g) => g.dbid === this.#dbid) as Game;
    const relativePath = from.replace(game.path as string, "");

    // Get the rollback directory
    const rollbackDir = path.join(this.#rollback as string, relativePath);
    const rollbackFilename = path.join(rollbackDir, path.basename(from));

    // Restore the original file
    await fs.copy(rollbackFilename, from);
  }
  //#endregion Private methods
}
