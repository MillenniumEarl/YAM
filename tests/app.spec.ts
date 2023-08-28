// Copyright (c) 2021 MillenniumEarl
//
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT

import type { ElectronApplication } from "@playwright/test";
import { test, expect } from "@playwright/test";
import { _electron as electron } from "playwright";
import { windowState } from "./utils";

test.describe("example test", () => {
    // Test variables
    let app: ElectronApplication;

    test.beforeAll(async () => {
        app = await electron.launch({ args: ["."]});
    });

    test.afterAll(async () => {
        await app.close();
    });

    test("Window state", async () => {
        // Get the main window
        const main = await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0]);

        // Get the window's state
        const state = await windowState(main);

        // Assert
        expect(state.isVisible).toBeTruthy();
        expect(state.isDevToolsOpened).toBeFalsy();
        expect(state.isCrashed).toBeFalsy();
    });

    test("Check webpage content", async () => {
      /**
       * Rendered Main window web-page
       */
      const page = await app.firstWindow();

      // Check web-page content
      
      const locator = page.locator("#app");
      expect((await locator.innerHTML()).trim()).toBeEmpty();
    });

    test("Check framework", async () => {
      /**
       * Rendered Main window web-page
       */
      const page = await app.firstWindow();

      // It is assumed that on the main screen there is a `<button>`
      // that changes its contents after clicking.
      const button = page.locator("button");
      const originalBtnText = await button.textContent();

      await button.click();
      const newBtnText = await button.textContent();
      expect(originalBtnText).not.toBe(newBtnText);
    });
});
