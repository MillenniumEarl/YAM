// Copyright (c) 2021 MillenniumEarl
//
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT

/**
 * An object that contains all the colors used by the application.
 */
export const Colors = {
  /**
   * Application base color used when loading a window.
   */
  BASE: "#262626"
};

/**
 * An object that contains the minimum size of the application `BrowserWindow`.
 */
export const WindowMinimumSize = {
  /**
   * Minimum size of the main window.
   */
  MAIN: { width: 1024, height: 620 }
};

/**
 * Similarity that the name of a directory must have with
 * that of a game in order to be able to say with certainty
 * that this folder contains the game saves.
 */
export const GAME_NAME_SIMILARITY_THRESHOLD = 0.85;
