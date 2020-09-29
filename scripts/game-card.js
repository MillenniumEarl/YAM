/* Defines the HTML code of the custom element */
const template = document.createElement('template');

/* Synchronous read of the HTML template */
template.innerHTML = window.readFileSync('./game-card.html');

/**
 * This element allows you to view and interact with a specific game
 */
class GameCard extends HTMLElement {
  constructor() {
    super();

    /* Binds the methods to the class's methods */
    this.playGame = playGame.bind(this);
    this.updateGame = updateGame.bind(this);
    this.deleteGame = deleteGame.bind(this);
  }

  async checkUpdates() {
    if (!window.gameScraper.isLogged()) return;

    var onlineVersion = await window.gameScraper.getGameVersion(this.info);
    
    if (onlineVersion.toString() !== this.info.version.toString()) {
      console.log('Update ' + onlineVersion + ' available for ' + this.info.name);
      this.querySelector('#updateGame').innerText = 'Update (' + onlineVersion + ')';
      this.querySelector('#updateGame').style.display = 'block';
    }
  }

  /* Triggered once the element is added to the DOM */
  connectedCallback() {
    // Load HTML template into custom element
    this.appendChild(template.content.cloneNode(true));

    /* Define buttons in DOM */
    this.playBtn = this.querySelector('#playGame');
    this.updateBtn = this.querySelector('#updateGame');
    this.deleteBtn = this.querySelector('#deleteGame');

    /* Set events listeners for the buttons */
    this.playBtn.addEventListener('click', this.playGame);
    this.updateBtn.addEventListener('click', this.updateGame);
    this.deleteBtn.addEventListener('click', this.deleteGame);

    /* It must be defined here because it requires elements of the DOM */
    this.info = new window.GameInfo();
  }

  /* Triggered once the element is removed from the DOM */
  disconnectedCallback() {
    /* Remove events listeners for the buttons*/
    this.playBtn.removeEventListener('click', this.play);
    this.updateBtn.removeEventListener('click', this.update);
    this.deleteBtn.removeEventListener('click', this.delete);

    // Save game data
    saveGameData(this);
  }

  /* Triggered when a observed attribute change */
  attributeChangedCallback(name, oldValue, newValue) {
    if (name == 'datapath' && oldValue !== newValue) {
      // Load the stored data from disk
      loadGameData(newValue, this);
    }
  }

  /* Attributes */
  static get observedAttributes() {
    // Specify the attributes that, when changed, trigger the 'attributeChangedCallback'
    return ['datapath'];
  }

  /**
   * @param {String} value
   */
  set datapath(value) {
    this.setAttribute('datapath', String(value));
  }

  set info(value) {
    const propertyValue = value;
    if (propertyValue) {
      this.setAttribute('info', JSON.stringify(propertyValue));

      // Set HTML elements
      this.querySelector('#gameName').innerText = propertyValue.isMod ? '[MOD] ' + propertyValue.name : propertyValue.name;
      this.querySelector('#gameAuthor').innerText = propertyValue.author;
      this.querySelector('#f95GameURL').setAttribute('href', propertyValue.f95url);
      this.querySelector('#gameOverview').innerText = propertyValue.overview;
      this.querySelector('#gameEngine').innerText = propertyValue.engine;
      this.querySelector('#gameStatus').innerText = propertyValue.status;
      const source = propertyValue.previewSource ? propertyValue.previewSource : './images/f95CompactLogo.jpg';
      this.querySelector('#gameImage').setAttribute('src', source);
      this.querySelector('#gameInstalledVersion').innerText = propertyValue.version;
      this.querySelector('#gameLastUpdate').innerText = propertyValue.lastUpdate;
    } else
      this.removeAttribute('info');
  }

  get info() {
    return JSON.parse(this.getAttribute('info'));
  }
}

/* Register the component for use in the DOM via HTML */
window.customElements.define('game-card', GameCard);

/* Events methods */
/**
 * @event
 * Triggered when user wants to play the game.
 */
function playGame() {
  // Get the game launcher
  const launcherPath = getGameLauncher(this.info.gameDir);

  // Alert user if no launcher is found
  if (launcherPath === null || launcherPath === undefined) {
    const options = {
      type: 'warning',
      buttons: ['OK'],
      defaultId: 0,
      title: 'Percorso inesistente',
      message: 'Il percorso del gioco non esiste',
      detail: 'Questo errore è probabilmente dovuto ad un aggiornamento o ad una modifica manuale dei file del gioco',
    };

    window.dialog.showMessageBox(null, options);
    console.warn('Cannot find executable path of ' + this.info.name + ' in ' + this.info.gameDir);
    return;
  }

  // Run game
  window.runApplication(launcherPath);
  this.info.lastPlayed = Date.now().toString();
  console.log('Running ' + launcherPath)
}

/**
 * @event
 * Triggered when user wants to update the game (and an update is available).
 */
function updateGame() {}

/**
 * @event
 * Triggered when user wants to delete the game.
 */
function deleteGame() {
  const options = {
    type: 'question',
    buttons: ['Si, sono sicuro', 'No, ci ho ripensato'],
    defaultId: 1,
    title: 'Elimina gioco',
    message: 'Vuoi veramente eliminare tutti i dati del gioco?',
    detail: 'Per rigiocarci dovrai riscaricare i dati',
    checkboxLabel: 'Mantieni i salvataggi',
    checkboxChecked: true,
  };

  window.dialog.showMessageBox(null, options).then((data) => {
    // Save the game's saves
    if (data.response == 0 && data.checkboxChecked) {
      // TODO
      console.log('Copied savegame files for ' + this.info.name + ' to ' + 'PATH');
    }

    if (data.response == 0) {

      // Delete the cached data
      const BASE_DIR = window.AppCostant.GAME_DATA_DIR;
      const FILE_NAME = this.info.name.replaceAll(' ', '') + '_data.json';
      var path = window.join(BASE_DIR, FILE_NAME);
      window.unlinkSync(path);
      if (window.existsSync(this.info.previewSource)) {
        window.unlinkSync(this.info.previewSource)
      }

      // Hide the card
      this.querySelector('div.card').style.display = 'none';
      // Delete the game's directory
      window.rmdir(this.info.gameDir, {
        recursive: true
      }, (err) => {
        if (err) console.error('Cannot delete ' + this.info.name + ': ' + err);
        console.log('Deleted game: ' + this.info.name);
      });
    }
  });
}


// #######################################

/**
 * Search for a compatible game launcher for the current OS.
 * @param {String} gameDir Directory where looking for the launcher
 * @returns {String} Launcher of the game or null if no file are found
 */
function getGameLauncher(gameDir) {
  // Get the extension matching the current OS
  var extension = '';

  if (window.osPlatform == 'win32') extension = 'exe';
  else if (window.osPlatform == 'darwin') extension = 'sh'; // TODO -> not so sure
  else if (window.osPlatform = 'linux') extension = 'py'; // TODO -> not so sure
  else return null;

  // Find the launcher
  var files = window.glob.sync('*.' + extension, {
    cwd: gameDir
  });
  if (files.length === 0) {
    // Try with HTML
    files = window.glob.sync('*.html', {
      cwd: gameDir
    });
  }

  if (files.length === 0) return null;
  else return window.join(gameDir, files[0]);
}

/**
 * @private
 * Download the game cover image.
 * @param {String} name Game name
 * @param {URL} previewSource Current URL of the image
 * @returns {String} Local path to the image or null if it was not downloaded
 */
function downloadGamePreview(name, previewSource) {
  // Check if it's possible to download the image
  if (previewSource.toString() === '') return null;
  if (previewSource.toString() === './images/f95CompactLogo.jpg') return null;
  if (window.existsSync(previewSource.toString())) return null; // Already downloaded

  // Get image extension
  var splitted = previewSource.toString().split('.');
  var extension = splitted.pop();
  const IMAGE_NAME = name.replaceAll(' ', '') + '_preview.' + extension;

  // Download image
  const BASE_DIR = window.AppCostant.GAME_DATA_DIR;
  var localPreviewPath = window.join(BASE_DIR, IMAGE_NAME);
  var downloaded = window.downloadImage(previewSource, localPreviewPath);

  if (downloaded) return localPreviewPath;
  else return null;
}

/**
 * @private
 * Save component data to disk as a JSON string.
 * @param {GameCard} gameCard Component to save data for
 */
function saveGameData(gameCard) {
  // Download preview image
  var previewLocalPath = downloadGamePreview(gameCard.info.name, gameCard.info.previewSource);
  if (previewLocalPath) gameCard.info.previewSource = previewLocalPath;

  // Join save path
  const BASE_DIR = window.AppCostant.GAME_DATA_DIR;
  const FILE_NAME = gameCard.info.name.replaceAll(' ', '') + '_data.json';
  var savePath = window.join(BASE_DIR, FILE_NAME);

  // Save the serialized JSON
  window.writeFileSync(savePath, JSON.stringify(gameCard.info));
}

/**
 * @private
 * Load component data from disk.
 * @param {String} path Path where the data to be loaded are located
 * @param {GameCard} gameCard Component to load data for
 */
function loadGameData(path, gameCard) {
  // Load the serialized JSON
  var json = window.readFileSync(path);
  var obj = JSON.parse(json);

  // Load object
  gameCard.info = obj;
}