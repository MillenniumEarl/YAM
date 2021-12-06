/* eslint-disable no-unused-vars */
// Copyright (c) 2022 MillenniumEarl
//
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT

interface Window {
  /**
   * 
   */
  readonly Handler: import("../common/interfaces").IRendererIPCHandler;
  /**
   * 
   */
  readonly Logger: import("../common/interfaces").IRendererLogger;
  /**
   * 
   */
  readonly Dialog: import("../common/interfaces").IRendererDialog;
}
