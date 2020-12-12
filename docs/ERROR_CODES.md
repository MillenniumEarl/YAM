# Error codes for errors and unhandled errors
The error codes are structured as follows:
+ **First digit**: Type of script
+ **Second digit**: Script identifier
+ **Third and subsequent digits**: Unique identifier of the error

## Types of scripts:
| Code |      Script      |                     Description                    |
|:----:|:----------------:|:--------------------------------------------------:|
|   0  |  Preload script  | Scripts used as preload by Electron                |
|   1  |  Renderer script | Scripts used to interact with the user             |
|   2  | Component script | Scripts used to manage the behavior of a component |
|   3  |  Generic script  | Generic scripts                                    |

## Script identifier
| Code |          Script          |
|:----:|:------------------------:|
|   0  |          app.js          |
|   1  |     card-paginator.js    |
|   2  |     error-manager.js     |
|   3  |       game-card.js       |
|   4  |    game-data-store.js    |
|   5  |       game-data.js       |
|   6  |   game-info-extended.js  |
|   7  |     io-operations.js     |
|   8  |      localization.js     |
|   9  |     login-preload.js     |
|  10  |     login-renderer.js    |
|  11  |      main-preload.js     |
|  12  |     main-renderer.js     |
|  13  |   messagebox-preload.js  |
|  14  |  messagebox-renderer.js  |
|  15  |     network-helper.js    |
|  16  | recommendation-engine.js |
|  17  |    recommended-card.js   |
|  18  |   save-files-finder.js   |
|  19  |         shared.js        |
|  20  |   thread-data-store.js   |
|  21  |      thread-data.js      |
|  22  |      thread-info.js      |
|  23  |   thread-visualizer.js   |
|  24  |       um-preload.js      |
|  25  |      um-renderer.js      |
|  26  |        updater.js        |
|  27  |   url-input-preload.js   |
|  28  |   url-input-renderer.js  |
|  29  |       user-info.js       |
|  30  |     window-creator.js    |
