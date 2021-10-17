// Copyright (c) 2021 MillenniumEarl
//
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT

// Core modules
import { EventEmitter } from "events";

class AppEmitter extends EventEmitter {}

export default class Shared {
  /**
   * Event emitter common to all modules of the app and
   * used to exchange information following an event.
   */
  public static appevents = new AppEmitter();
}
