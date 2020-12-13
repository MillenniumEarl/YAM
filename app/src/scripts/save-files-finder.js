"use strict";

// Core modules
const path = require("path");
const fs = require("fs");
const promisify = require("util").promisify;
const {
    glob
} = require("glob");

// Public modules from npm
const stringSimilarity = require("string-similarity");

// Modules from file
const reportError = require("./error-manger.js").reportError;

//#region Promisify methods
const areaddir = promisify(fs.readdir);
//#endregion Promisify methods

//#region Global variables
const userDataDir =
    process.env.APPDATA ||
    (process.platform === "darwin" ?
        path.join(process.env.HOME, "Library/Preferences") :
        path.join(process.env.HOME, ".local/share"));
//#endregion Global variables

/**
 * @protected
 * Get the paths of the saves for a specific game.
 * @param {GameInfoExtended} gameinfo Data of the game
 * @returns {Promise<String[]>} List of paths
 */
module.exports.findSavesPath = async function findSavesPath(gameinfo) {
    // Local variables
    let returnValues = [];

    // Get savegame directory
    const dir = await _getSaveDir(gameinfo)
        .catch(e => reportError(e, "31800", "_getSaveDir", "findSavesPath", 
            `Game: ${gameinfo.name} (${gameinfo.engine}|${gameinfo.gameDirectory})`));
    
    // Get savegame extension
    const extension = _getSaveExtension(gameinfo.engine);
    
    if (dir && extension) {
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
        returnValues = savePaths;
    }
    return returnValues;
};

//#region Private methods
/**
 * @private
 * Obtain the dir containing the saves.
 * @param {GameInfoExtended} gameinfo Data of the game
 * @returns {Promise<String>} Base directory where the saves are stored or `null` if no dir is available
 */
async function _getSaveDir(gameinfo) {
    // Local variables
    let returnValue = null;
    const functionMap = {
        "REN'PY": async function() {
            // Local variables
            let returnValue = null;
            const renpyDir = path.join(userDataDir, "RenPy");
            const gameDirs = await areaddir(renpyDir);
            const temp = gameDirs.map(dir => dir.replace(/[0-9]/g, "")); // Remove numbers from dirs
            const match = stringSimilarity.findBestMatch(gameinfo.name.replace(/[0-9]/g, ""), temp);

            // Must be quite confident in the result
            if (match.bestMatch.rating > 0.75) {
                const bestMatchName = gameDirs[match.bestMatchIndex];
                returnValue = path.join(renpyDir, bestMatchName);
            }
            return returnValue;
        },
        "RPGM": async () => gameinfo.gameDirectory,
    };

    // Get the uppercased game engine
    const engine = gameinfo.engine.toUpperCase();

    // Check if the engine is supported
    const valid = Object.keys(functionMap).includes(engine);
    if(valid) returnValue = await functionMap[engine]();
    return returnValue;
}

/**
 * @private
 * Obtain the file extension of the saves.
 * @param {String} engine Engine used for the game
 * @returns {String} Extension of the saves
 */
function _getSaveExtension(engine) {
    // Local variables
    let returnValue = null;
    const engineMap = {
        "REN'PY": "save",
        "RPGM": "rvdata2",
    };
    const engineU = engine.toUpperCase();

    // Check if the engine is supported
    const valid = Object.keys(engineMap).includes(engineU);
    if (valid) returnValue = engineMap[engineU];
    return returnValue;
}
//#endregion Private methods
