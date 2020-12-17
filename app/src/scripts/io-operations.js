"use strict";

// Core modules
const path = require("path");
const fs = require("fs");
const spawn = require("child_process").spawn;
const promisify = require("util").promisify;

// Public modules from npm
const shell = require("electron").shell;
const logger = require("electron-log");

// Modules from file
const reportError = require("./error-manger.js").reportError;

// Promisifed functions
const areaddir = promisify(fs.readdir);
const alstat = promisify(fs.lstat);
const aunlink = promisify(fs.unlink);
const armdir = promisify(fs.rmdir);

/**
 * @protected
 * Run a file from disk as an independent process.
 * @param {String} filename Path of the application to run
 */
module.exports.run = function run(filename) {
    const child = spawn(filename, [], {
        detached: true,
    });

    // Unreference the child, now it will 
    // run as an independent process
    child.unref();
    return child;
};

/**
 * @protected
 * Opens a directory in the default manner for your OS or a URL with the default browser.
 * @param {String} path Directory path or URL
 */
module.exports.openLink = async function openLink(path) {
    const result =  await shell.openPath(path);
    if(result !== "") logger.error(`Error while opening ${path} in openLink: ${result}`);
};

/**
 * @protected
 * Recursively delete a folder.
 * @param {String} dirpath Path to the directory to be deleted
 */
module.exports.deleteFolderRecursive = async function deleteFolderRecursive(dirpath) {
    // First check if the path exists
    if (fs.existsSync(dirpath)) {
        // Foreach element in dir, delete (file) or recurse (folder)
        const nodes = await areaddir(dirpath);

        for(const file of nodes) {
            const p = path.join(dirpath, file);

            // Remove subdir
            const isDir = (await alstat(p)).isDirectory();
            if (isDir) exports.deleteFolderRecursive(p)
                .catch(e => reportError(e, "30700", "exports.deleteFolderRecursive", "exports.deleteFolderRecursive", `Path: ${p}`));
            // ...or remove single file
            else await aunlink(p)
                .catch(e => reportError(e, "30701", "aunlink", "exports.deleteFolderRecursive", `Path: ${p}`));
        }

        // Remove main dir
        await armdir(dirpath);
    }
};

/**
 * @protected
 * Read a file from disk.
 * @param {String} filename Path to the file
 * @returns {String} Text read or `null` if the file doesn't exists
 */
module.exports.readFileSync = function readFileSync(filename) {
    let returnValue = null;
    if (fs.existsSync(filename)) {
        returnValue = fs.readFileSync(filename, "utf-8");
    }
    return returnValue;
};

/**
 * @protected
 * Check if a file/directory exists on disk.
 * @param {String} filename Path to the file/directory
 */
module.exports.exists = async function exists(filename) {
    return fs.existsSync(filename);
};
