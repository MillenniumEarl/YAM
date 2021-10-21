/* eslint-disable no-unused-vars */
// Copyright (c) 2021 MillenniumEarl
//
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT

// Local modules
import { IRendererIPCHandler, IRendererLogger } from "../../../modules/interfaces";

export interface IElectronAPI {
  Handler: IRendererIPCHandler;
  Logger: IRendererLogger;
}

declare global {
  interface Window {
    API: IElectronAPI;
  }
}
