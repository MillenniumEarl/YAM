// Modules to control application life and create native browser window
const {
  app,
  BrowserWindow,
  shell,
  ipcMain: ipc
} = require('electron');
const path = require('path');

let mainWindow;

function createMainWindow() {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 1024,
    height: 600,
    backgroundColor: '#252321', // Used to simulate loading and not make the user wait
    webPreferences: {
      worldSafeExecuteJavaScript: true,
      enableRemoteModule: true,
      contextIsolation: false,
      webSecurity: true,
      nodeIntegration: false,
      preload: path.join(app.getAppPath(), 'scripts', 'preload-main.js')
    }
  });

  // Whatever URL the user clicks will open the default browser for viewing
  mainWindow.webContents.on('new-window', function (e, url) {
    e.preventDefault();
    shell.openExternal(url);
  });

  // Used to save the game data in the GameCards
  mainWindow.on('close', function (e) {
    if (mainWindow) {
      e.preventDefault();
      mainWindow.webContents.send('app-close');
    }
  });

  // Disable default menu
  //mainWindow.setMenu(null)

  // Load the index.html of the app.
  mainWindow.loadFile('index.html');

  // Open the DevTools.
  // mainWindow.webContents.openDevTools()
}

function createLoginWindow(mainWindow) {
  console.log('window creation');
  // Create the login window.
  var loginWindow = new BrowserWindow({
    width: 400,
    height: 250,
    backgroundColor: '#252321', // Used to simulate loading and not make the user wait
    frame: false,
    webPreferences: {
      worldSafeExecuteJavaScript: true,
      enableRemoteModule: true,
      contextIsolation: false,
      webSecurity: true,
      nodeIntegration: false,
      preload: path.join(app.getAppPath(), 'scripts', 'preload-login.js')
    }
  });

  // Disable default menu
  loginWindow.setMenu(null)

  // Load the index.html of the app.
  loginWindow.loadFile('login.html');
}

// This will be called when a BrowserWindows 
// respond via ip with the message 'closed'
ipc.on('closed', _ => {
  mainWindow = null;
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// This will be called when the main window require credentials
ipc.on('login-required', _ => {
  console.log('login required');
  createLoginWindow(mainWindow);
});

// Used to return credentials
ipc.on('auth-successful', (event, credentials) => {
  mainWindow.webContents.send('auth-successful', credentials);
});

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  createMainWindow();

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
  })
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.