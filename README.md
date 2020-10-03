# F95GameUpdater
 Unoffical Game Updater for the F95Zone platform

# Project Structure
project
\app
..\app.js # Main electron process
..\electron
..\src
..\..\components
..\..\..\vue?
..\..\styles
..\..\scripts
\docs
\resources

# Naming Convention
All files must be singular with kebab-case style. All electron JS files must be in the format namefile-renderer/preload.js Es. mainpage-preload.js

# Security Settings
The app will run with basic security settings, like:
 + allowRunningInsecureContent: false
 + contextIsolation: true
 + enableRemoteModule: false
 + nodeIntegration: false

Also it will implement IPC and ContextBridge in the preloads.

# Additional Informations
For more information about secure use of IPC see:
https://github.com/reZach/secure-electron-template/blob/master/docs/newtoelectron.md

For how to use the IPC-based JSON store see:
https://github.com/reZach/secure-electron-store