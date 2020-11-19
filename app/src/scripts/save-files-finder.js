"use strict";

// Core modules
const path = require("path");
const fs = require("fs");
const util = require("util");
const {
    glob
} = require("glob");

// Public modules from npm
const stringSimilarity = require("string-similarity");

//#region Promisify methods
const readDirPromisify = util.promisify(fs.readdir);
//#endregion Promisify methods

//#region Global variables
const userDataDir =
    process.env.APPDATA ||
    (process.platform === "darwin" ?
        process.env.HOME + "/Library/Preferences" :
        process.env.HOME + "/.local/share");
//#endregion Global variables

/**
 * @protected
 * Get the paths of the saves for a specific game.
 * @param {GameInfoExtended} gameinfo Data of the game
 * @returns {Promise<String[]>} List of paths
 */
module.exports.findSavesPath = async function findSavesPath(gameinfo) {
    // Get savegame directory
    const dir = await _getSaveDir(gameinfo);
    if (!dir) return [];

    // Get savegame extension
    const extension = _getSaveExtension(gameinfo.engine);
    if (!extension) return [];

    // Get path to saves
    const saveNames = glob.sync(`*.${extension}`, {
        cwd: dir,
    });

    // Complete the paths
    const savePaths = [];
    saveNames.forEach((name) => {
        const filename = path.join(dir, name);
        savePaths.push(filename);
    });

    return savePaths;
};

/**
 * @private
 * Obtain the dir containing the saves.
 * @param {GameInfoExtended} gameinfo Data of the game
 * @returns {Promise<String>} Base directory where the saves are stored or `null` if no dir is available
 */
async function _getSaveDir(gameinfo) {
    switch (gameinfo.engine.toUpperCase()) {
    case "REN'PY": {
        const renpyDir = path.join(userDataDir, "RenPy");
        const gameDirs = await readDirPromisify(renpyDir);
        const temp = gameDirs.map(dir => dir.replace(/[0-9]/g, "")); // Remove numbers from dirs
        const match = stringSimilarity.findBestMatch(gameinfo.name.replace(/[0-9]/g, ""), temp);

        // Must be quite confident in the result
        if (match.bestMatch.rating <= 0.75) return null;

        const bestMatchName = gameDirs[match.bestMatchIndex];
        return path.join(renpyDir, bestMatchName);
    }
    case "RPGM":
        // Saves stored in the same folder
        return gameinfo.gameDirectory;
    default:
        // Unsupported engine or "OTHERS"
        return null;
    }
}

/**
 * @private
 * Obtain the file extension of the saves.
 * @param {String} engine Engine used for the game
 * @returns {String} Extension of the saves
 */
function _getSaveExtension(engine) {
    switch (engine.toUpperCase()) {
    case "REN'PY":
        return "save";
    case "RPGM":
        return "rvdata2";
    default:
        return null;
    }
}