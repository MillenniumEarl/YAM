"use strict";

// Core modules
const { join } = require("path");

// Public module from npm
const download = require("download-chromium");

/**
 * @protected
 * Install Chromium on the current device in the UserData folder,
 * depending on the current OS.
 * @returns {Promise<String>} Chromium executable path
 */
module.exports.installChromium = async function () {
  // Parse the UserData dir based on the current OS
  const userData =
    process.env.APPDATA ||
    (process.platform === "darwin"
      ? process.env.HOME + "/Library/Preferences"
      : process.env.HOME + "/.local/share");
  const chromiumDirectory = join(userData, "f95-game-updater", "local_chromium");

  // Download Chromium
  const executablePath = await download({
    revision: 800071, // Updated 13/10/2020
    installPath: chromiumDirectory,
  });
  return executablePath;
};
