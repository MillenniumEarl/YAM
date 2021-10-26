// Copyright (c) 2021 MillenniumEarl
//
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT

// Public modules from npm
import uniqid from "uniqid";

export default class Mod {
  /**
   * ID of this mod in the database.
   */
  #dbid: string = (uniqid as () => string)();

  /**
   * Relative paths of the files included in this mod.
   */
  #files: string[] = [];
}
