<!--
 Copyright (c) 2022 MillenniumEarl
 
 This software is released under the MIT License.
 https://opensource.org/licenses/MIT
-->

Channel | Arguments | Description | Returns

execute | filepath | Run the specified file in a detached process | void

open-external-url | link | Open the link provided in the default browser | void

show-devtools | nothing | Open the devtools on the sender window | void

allow-menubar | wid, value | Open/close the menubar for the window with specified ID and save the value for later use | void

renderer-log | log: IRendererLog | Receive a log from the renderer process and send emit a `renderer-log` event | void

received-paths | paths: IPathContext[], allowFiles: boolean | Receive filepaths (with context) and process them, then emit a `received-paths` event | void

translate | key, interpolation | Translate the string identified with the key | string

change-language | ISO | Change the language of the app | Promise<void>

current-language | nothing | Get the current language's ISO | string

get-window-name | wid | Get the name of the window having the passed ID | string or `null`

get-window-id | nothing | Get the current window unique ID | number

open-dialog | options: OpenDialogOptions, modal: boolean | Open a dialog used to select folder or files | OpenDialogReturnValue