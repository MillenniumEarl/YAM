# F95 Game Updater

[![CodeFactor](https://www.codefactor.io/repository/github/millenniumearl/yam/badge)](https://www.codefactor.io/repository/github/millenniumearl/yam)
[![FOSSA Status](https://app.fossa.com/api/projects/git%2Bgithub.com%2FMillenniumEarl%2FYAM.svg?type=shield)](https://app.fossa.com/projects/git%2Bgithub.com%2FMillenniumEarl%2FYAM?ref=badge_shield)
[![Known Vulnerabilities](https://snyk.io/test/github/MillenniumEarl/YAM/badge.svg)](https://snyk.io/test/github/MillenniumEarl/YAM)
![Build](https://github.com/MillenniumEarl/YAM/workflows/Build/badge.svg)
[![Crowdin](https://badges.crowdin.net/yam/localized.svg)](https://crowdin.com/project/yam)

Made with :heart: using :electron:

F95 game updater is an unofficial game manager for the [F95Zone platform](https://f95zone.to/), great for managing the games installed on your device. It will allow you to play, delete, read information and above all notify you of updates to your games.

<p align="center">
  <img src="/resources/images/github/preview.gif">
</p>

**Note**: This application requires an active account on the platform. Two-factor authentication is not supported.

## Functionality

- Game information overview
- Ability to play/delete the game directly from the application
- Notification of updates when available
- Game update wizard
- Game folders are renamed to reflect the installed version
- Support for the following languages: :it: :uk: :es: :portugal: :de: :cn: :ru: :netherlands:
- It is possible to save/export game saves
  - **Beta**: only works for games tagged Ren'Py and RPGM

## Adding a game

Adding a game is possible via the ![add_game](/resources/images/github/plus-button.png) button at the bottom right. When pressed it will present two choices:

1. ![add_from_folder](/resources/images/github/add-game-from-folder.png) You will be presented with a directory selection screen. Select one or more directories containing the game directly and press OK.
2. ![add_from_url](/resources/images/github/add-game-from-url.png) A directory selection screen will be presented. Select a single directory containing the game directly and press OK. A further screen will then appear asking for the main URL (post # 1) of the thread on F95Zone that contains the game information.

**Warning!** In order to correctly detect the games, the folders must be in the format: _GAME NAME [V.VERSION] [MOD]_

- **GAME NAME**: The game name, including any special characters (excluding non-usable characters such as /, %, :, etc...), case insensitive
- **VERSION**: The exact version of the game (case insensitive). Make sure directory name is present "v."
- **MOD**: If it's not a game but a mod add this tag

If the game is not detected, it can be added via URL (point 2).

## Game updates

When adding a game or starting the application, updates of installed games are checked. If there are any, a blue button will appear below the "Play" and "Remove" buttons. Pressing it will start the update procedure in two steps:

1. The first step will open the URL of the game on F95Zone (where it can be downloaded) and the local directory where it is currently saved.
2. In the second step, to be performed once the new version of the game has been downloaded and installed, the directory name is updated and the update is marked as "completed".

**Warning!** Make sure you don't have any processes running from the update game folder!

**Warning!** Remember to copy any game saves in the game folder to update!

## Known Issues

1. Some translations may be totally or partially inaccurate, this is because they are machine translations
   1. **Solution**: Open an issue with the wrong translation, the correct one and where/when the wrong translation occurs
2. Games added even if already present
   1. **Solution**: Rename the directory with the exact name of the game
3. Games are not visible when starting the application
   1. **Solution**: It's a rare database problem, restarting the application should fix it

## How to contribute

- **Translations**: If you know a language that is not available, you can contribute on [Crowdin](https://crwd.in/yam).
- **Translation correction**: Are any translations wrong? Create a new issue or correct the translation file and create a pull request.
- **Code**: Feel free to browse the code and open issues or create pull requests with necessary corrections.
- **Front-end**: Could HTML and CSS be handled better? Create a pull request!
- **Back-end**: This project is based on the [F95API](https://github.com/MillenniumEarl/F95API) API. If you want you can help there too!

## Developer information

The project structure is managed as follows:

```text
project
\app
..\app.js # Main electron process
..\db
..\..\schemas
..\..\store
..\electron
..\..\window # A folder for every window, containing preload and renderer
..\src
..\..\components
..\..\styles
..\..\scripts
..\..\..\classes
\docs
\resources
```

All files follow the kebab convention for nomenclature and all Javascript files related to Electron (preload and renderer) have the format `namefile-renderer/preload.js`.
Eg `mainpage-preload.js`

The app will run with basic security settings, like:

- **allowRunningInsecureContent**: false
- **contextIsolation**: true
- **enableRemoteModule**: false
- **nodeIntegration**: false

Also it will implement IPC and ContextBridge in the preloads.

For more information about secure use of IPC see this [repository](https://github.com/reZach/secure-electron-template/blob/master/docs/newtoelectron.md)

## License

Under the MIT license. See [LICENSE](https://github.com/MillenniumEarl/YAM/blob/master/LICENSE) file for more details.
