// Copyright (c) 2022 MillenniumEarl
//
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT

import { createApp } from "vue";
import App from "/@/App.vue";

// Import TailwindCSS
import "../index.css";

// Configure the IPC handler in the preload
void window.Handler.configure();

// Mount the VueJS app
createApp(App).mount("#app");
