// Copyright (c) 2021 MillenniumEarl
//
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT

// Core modules
import path from "path";

// Public modules from npm
import similarity from "string-similarity";
import sanitize from "sanitize-filename";
import readdir from "readdir-enhanced";
import fs from "fs-extra";

// Local modules
import { GAME_NAME_SIMILARITY_THRESHOLD } from "../constants";
import { TSupportedPlatform } from "../types";
import Game from "../classes/game";
import shared from "../shared";

/**
 * Gets the save directory of a specific game.
 * If this directory is not found, it returns `null`.
 *
 * It only supports `Ren'Py`, `Unity` and `RPGM`.
 */
export default async function getSavesDirectory(game: Game): Promise<string | null> {
  switch (game.engine) {
    case "Ren'Py":
      return await getRenpySavePath(game.path as string, game.name);
    case "Unity":
      return await getUnitySavePath(game.name);
    case "RPGM":
      return game.path as string; //@todo Check if it's necessary to add "/saves"
    default:
      return null;
  }
}

/**
 * Gets the folder containing the save games of a game developed with Ren'Py.
 * @see https://herculion.zendesk.com/hc/en-us/articles/900000233883-How-do-I-delete-my-save-files
 */
async function getRenpySavePath(gamepath: string, gamename: string): Promise<string | null> {
  // Clean the game's name
  const name = cleanGameName(gamename);

  // The saves could also be present in the same folder of the game, in game/saves
  const gpath = path.join(gamepath, "game", "saves");

  // Prepare the RenPy dir based on the system OS
  const wpath = path.join(shared.paths.APP_DATA, "Roaming", "RenPy", name);
  const lpath = path.join(shared.paths.APP_DATA.replace(".config", ".renpy"), name);
  const mpath = path.join(shared.paths.APP_DATA.replace("Application Support", "RenPy"), name);

  // Get the correct RenPy saves directory
  const map: Record<TSupportedPlatform, string> = {
    darwin: mpath,
    linux: lpath,
    win32: wpath
  };
  const renpydir = (await fs.pathExists(gpath))
    ? gpath // Get the save dir in the game directory
    : map[process.platform as TSupportedPlatform]; // Get the save dir based on the current OS

  // Read all the directories in the RenPy dir
  let bestMatch = 0;
  let returnDir = null;
  const dir = await fs.opendir(renpydir);
  for await (const dirent of dir) {
    // If this entry is not a directory it will be skipped
    if (!dirent.isDirectory()) continue;

    // Sometimes, perhaps to make directory names unique,
    // a random number of 10 digits is added to the end
    // of the name, preceded by -
    const dirname = dirent.name.replace(/-[0-9]{10}$/i, "");

    // Compare the similarity between the game name and the dir name.
    // The result is a value between 0 (no similarity) and 1 (complete match).
    // We want to be pretty sure so we set the threshold to 0.85
    const comparison = similarity.compareTwoStrings(name, dirname);
    if (comparison >= GAME_NAME_SIMILARITY_THRESHOLD && comparison > bestMatch) {
      bestMatch = comparison;
      returnDir = path.join(renpydir, dirname);
    }
  }

  // Close handler
  await dir.close();

  // Return the directory with the best match value
  return returnDir;
}

/**
 * Gets the folder containing the save games of a game developed with Unity.
 * @see https://docs.unity3d.com/ScriptReference/Application-persistentDataPath.html
 */
async function getUnitySavePath(gamename: string): Promise<string | null> {
  // Unity games's saves are stored in APP_DATA/<comapny_name>/<game_name>

  // Prepare the Unity dir based on the system OS
  const wpath = path.join(shared.paths.APP_DATA, "LocalLow");
  const lpath = path.join(shared.paths.APP_DATA, "unity3d");
  const mpath = path.join(shared.paths.APP_DATA);

  // Get the correct RenPy saves directory
  const map: Record<TSupportedPlatform, string> = {
    darwin: mpath,
    linux: lpath,
    win32: wpath
  };
  const unitydir = map[process.platform as TSupportedPlatform];

  // As some developers use a non-standard structure for their games,
  // we will list all files (up to a depth of 3 subdirectories) with
  // an extension containing the string "sav".
  const iterator = readdir.iterator(unitydir, {
    deep: 3,
    filter: /(?<=\.)(.*(sav|dat){1}.*)(?=$)/i,
    stats: true
  });

  // We take all valid save file paths and verify by string
  // similarity which directories could contain game data
  const directories: string[] = [];
  for await (const entry of iterator) {
    // Ignore directories
    if (!entry.isFile()) continue;

    // Get the directory path (@todo check if the path is absolute)
    const dirpath = path.dirname(entry.path);

    // Save the basepath
    if (!directories.includes(dirpath)) directories.push(dirpath);
  }

  // Variables used to memeorize the best comparison match
  let bestMatch = 0;
  let returnDir = null;

  for (const dir of directories) {
    // Initialize the variable
    let temp = dir;

    // Run the loop until we get to the root directory
    while (temp !== unitydir) {
      // We are only interested in the directory name
      const basename = path.basename(temp);

      // Compare and memorize the best result
      const comparison = similarity.compareTwoStrings(basename, gamename);
      if (comparison >= GAME_NAME_SIMILARITY_THRESHOLD && comparison > bestMatch) {
        bestMatch = comparison;
        returnDir = dir;
      }

      // Go to the parent directory
      temp = path.dirname(temp);
    }
  }

  return returnDir;
}

/**
 * Eliminate spaces and unusable characters from a game name.
 */
function cleanGameName(s: string) {
  // Remove various unwanted chars
  let clean = sanitize(s);

  // Remove whitespaces
  clean = clean.replace(/\s+/g, "");

  return clean;
}
