/* eslint-disable no-unused-vars */
// Copyright (c) 2022 MillenniumEarl
//
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT

// Local modules
import { IRendererDialog, IRendererIPCHandler, IRendererLogger } from "../../common/interfaces";

export interface IElectronAPI {
  Handler: IRendererIPCHandler;
  Logger: IRendererLogger;
  Dialog: IRendererDialog;
}

declare global {
  interface Window {
    API: IElectronAPI;
  }
}
