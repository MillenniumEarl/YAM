<!--
 Copyright (c) 2021 MillenniumEarl
 
 This software is released under the MIT License.
 https://opensource.org/licenses/MIT
-->

Channel Arguments Description Returns
execute filepath Run the specified file in a detached process void
open-external-url link Open the link provided in the default browser void
show-devtools nothing Open the devtools on the sender window void
allow-menubar [id, value] Open/close the menubar for the window with specified ID and save the value for later use void
translate [key, interpolation] Translate the string identified with the key string
change-language ISO Change the language of the app Promise<void>
current-language nothing Get the current language's ISO string