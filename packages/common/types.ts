// Copyright (c) 2022 MillenniumEarl
//
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT

export type TModOperationType = "Add" | "Overwrite" | "Append";
export type TSupportedEnginesForSavesExtraction = "Ren'Py" | "RPGM" | "Unity";
export type TSupportedPlatform = "win32" | "linux" | "darwin";
export type TLoggerCategory = "main" | "renderer" | "f95";

// eslint-disable-next-line no-unused-vars
export type TCloseWindowCallbackRest = (...args: unknown[]) => void;
export type TCloseWindowCallbackNull = () => null;
