// Copyright (c) 2021 MillenniumEarl
//
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT

export type TLoggerCategory = "app.main" | "app.renderer" | "modules.f95";

// eslint-disable-next-line no-unused-vars
export type TCloseWindowCallbackRest = (...args: any[]) => void;
export type TCloseWindowCallbackNull = () => null;