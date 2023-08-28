<!--
 Copyright (c) 2021 MillenniumEarl
 
 This software is released under the MIT License.
 https://opensource.org/licenses/MIT
-->

# Usage with Vite (VueJS) + Typescript + Electron

## Structure

The actual application is located in the `packages` folder divided into different modules depending on the function, so there are the `main`, `preload` and `renderer` modules.

In the `common` directory are some scripts common to the whole application, regardless of the module type.

Each module has inside the `src` directory, containing all the scripts and components used by the specific module.

There is also the `vite.config.js` file which contains the information needed to run the module build process.

The Typescript preferences for the module are set in the `tsconfig.json` file (which extends the one in the project root). If you want to use special settings, such as `experimentalDecorators`, remove the `files` property and add the glob string `./src/**/*.ts` to the `includes` property.

## Modules description

The `main` module is the one that takes care of the heavy operations of the application and has nothing to do with Vue. It is normally programmed in typescript.

The `preload` module contains a single preload file that will be shared with any `BrowserWindow` of the application. The `exposedInMainWorld.d.ts` file contains the types of methods and properties exported to the preload file via the `contextBridge`.

Finally, the `renderer` module is what is shown to the user and which uses VueJS. In index.html you just need to define a `<div>` with id "app" and include the `index.ts` script. It will then be up to the individual Vue components to define style and behavior. These components, contained in the `src/components` directory, are" named "by the main Vue file: `App.vue`. Methods to be used in components must be saved in the `src/scripts` directory, imported into the component's `script` tag, and assigned to a function in the `methods` property in `defineComponents()`.
