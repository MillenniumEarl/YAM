"use strict";

// Core modules
const path = require("path");
const fs = require("fs");

// Public modules from npm
const { shell } = require("electron");

/**
 * @protected
 * Run a file from disk.
 * @param {String} path Path of the application to run
 */
module.exports.runApplication = async function (path) {
  console.log("Executing " + path);
  shell
    .openPath(path)
    .then((err) => {
      if (err) console.error("Failed to start subprocess: " + err);
    })
    .catch((error) => console.error("Failed to start subprocess: " + error));
};
/**
 * @protected
 * Recursively delete a folder.
 * @param {String} dirpath Path to the directory to be deleted
 */
module.exports.deleteFolderRecursive = async function (dirpath) {
  // First check if the path exists
  if (!fs.existsSync(dirpath)) return;

  // Foreach element in dir, delete (file) or recurse (folder)
  fs.readdirSync(dirpath).forEach((file, index) => {
    let p = path.join(dirpath, file);

    // Remove subdir
    if (fs.lstatSync(p).isDirectory()) deleteFolderRecursive(p);
    // ...or remove single file
    else fs.unlinkSync(p);
  });

  // Remove main dir
  fs.rmdirSync(dirpath);
};

/**
 * Read a file from disk.
 * @param {String} filename Path to the file
 * @returns {String} Text read
 */
module.exports.readFileSync = function (filename) {
  if (!fs.existsSync(filename)) return null;
  else return fs.readFileSync(filename, "utf-8");
};

/**
 * Check if a file/directory exists on disk.
 * @param {String} filename Path to the file/directory
 */
module.exports.exists = async function (filename) {
  return fs.existsSync(filename);
};
