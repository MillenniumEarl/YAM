// Copyright (c) 2021 MillenniumEarl
//
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT

// Core modules
import fs from "fs/promises";

// Public modules from npm
import { Low, JSONFile } from "lowdb";

/**
 * Simple class used to create the databases.
 */
export default class DatabaseFactory {
  /**
   * Create a database from the given JSON path.
   *
   * If the path does not exists, a new JSON file will be created,
   * otherwise it will be read.
   *
   * The returned object is ready to use.
   */
  public async create<T>(path: string): Promise<Low<T>> {
    // Check if the file is readable and exists
    await fs.access(path).catch(async (e) => {
      // Write empty JSON file
      if (e.code === "ENOENT") await fs.writeFile(path, "");
      // Retrow unknown error
      else throw e;
    });

    // Create and load database
    const adapter = new JSONFile<T>(path);
    const db = new Low<T>(adapter);
    await db.read();

    return db;
  }
}
