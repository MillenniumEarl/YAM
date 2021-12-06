/* eslint-disable @typescript-eslint/ban-types */
// Copyright (c) 2021 MillenniumEarl
//
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT

declare module "i18next-electron-language-detector" {
    import type { Module, ModuleType } from "i18next";
    interface LanguageDetector extends Module {
      init: Function;
      type: ModuleType;
      detect: string;
      cacheUserLanguage: Function;
    }
}
