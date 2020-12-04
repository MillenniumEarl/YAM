"use strict";

// Core modules
const path = require("path");
const fs = require("fs");
const spawn = require("child_process").spawn;

// Public modules from npm
const shell = require("electron").shell;

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
    shell.openPath(path);
};

/**
 * @protected
 * Recursively delete a folder.
 * @param {String} dirpath Path to the directory to be deleted
 */
module.exports.deleteFolderRecursive = async function deleteFolderRecursive(dirpath) {
    // First check if the path exists
    if (!fs.existsSync(dirpath)) return;

    // Foreach element in dir, delete (file) or recurse (folder)
    fs.readdirSync(dirpath).forEach((file) => {
        const p = path.join(dirpath, file);

        // Remove subdir
        if (fs.lstatSync(p).isDirectory()) exports.deleteFolderRecursive(p);
        // ...or remove single file
        else fs.unlinkSync(p);
    });

    // Remove main dir
    fs.rmdirSync(dirpath);
};

/**
 * @protected
 * Read a file from disk.
 * @param {String} filename Path to the file
 * @returns {String} Text read or `null` if the file doesn't exists
 */
module.exports.readFileSync = function readFileSync(filename) {
    if (!fs.existsSync(filename)) return null;
    else return fs.readFileSync(filename, "utf-8");
};

/**
 * @protected
 * Check if a file/directory exists on disk.
 * @param {String} filename Path to the file/directory
 */
module.exports.exists = async function exists(filename) {
    return fs.existsSync(filename);
};
