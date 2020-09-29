const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');
const HTMLParser = require('node-html-parser');
const LoginResult = require('./LoginResult.js').LoginResult;
const AppCostants = require('./AppCostants.js').AppCostants;
const GameInfo = require('./game-info').GameInfo;

// URL
const F95_BASE_URL = 'https://f95zone.to';
const F95_SEARCH_URL = 'https://f95zone.to/search';
const F95_LATEST_UPDATES = 'https://f95zone.to/latest';
const F95_LOGIN_URL = 'https://f95zone.to/login'

// CSS Selectors
const SEARCH_FORM_TEXTBOX = 'input[name="keywords"]';
const PASSWORD_INPUT = 'input[name="password"]';
const USERNAME_INPUT = 'input[name="login"]';
const LOGIN_BUTTON = 'button.button--icon--login';
const AVATAR_INFO = 'span.avatar';
const TITLE_ONLY_CHECKBOX = 'form.block > * input[name="c[title_only]"]';
const SEARCH_BUTTON = 'form.block > * button.button--icon--search';
const ENGINE_ID_SELECTOR = 'div[id^="btn-prefix_1_"]>span';
const STATUS_ID_SELECTOR = 'div[id^="btn-prefix_4_"]>span';
const THREAD_TITLE = 'h3.contentRow-title';
const THREAD_POSTS = 'article.message-body:first-child > div.bbWrapper:first-of-type';
const GAME_TITLE = 'h1.p-title-value';
const GAME_IMAGES = 'img[src^="https://attachments.f95zone.to"]';
const LOGIN_MESSAGE_ERROR = 'div.blockMessage.blockMessage--error.blockMessage--iconic';

// Game prefixes
const MOD_PREFIX = 'MOD';
const GAME_RECOMMENDATION_PREFIX = 'RECOMMENDATION';

// Other
var costants = new AppCostants();
costants.init();
const CACHE_PATH = costants.BROWSER_DATA_DIR;
const COOKIES_SAVE_PATH = path.join(CACHE_PATH, 'cookies.json');
const ENGINES_SAVE_PATH = path.join(CACHE_PATH, 'engines.json');
const STATUSES_SAVE_PATH = path.join(CACHE_PATH, 'statuses.json');
const WAIT_STATEMENT = 'domcontentloaded'; // 'networkidle0'

// Global variables
var _isLogged = false;
var _engines = [];
var _statuses = [];
var _cookies = [];

//### EXPORTED METHODS ###
module.exports.isLogged = function () {
  return _isLogged;
}

/**
 * @public
 * Log in to the F95Zone platform.
 * This **must** be the first operation performed before accessing any other script functions.
 * @param {String} username 
 * @param {String} password 
 * @returns {Promise<LoginResult>} Result of the operation
 */
module.exports.login = async function (username, password) {
  // Loads cookies if they exist
  var expiredCookies = false;
  _cookies = loadCookiesFromDisk();

  // Check for expired cookies
  if (_cookies !== null) {
    for (const cookie of _cookies) {
      if (isCookieExpired(cookie)) {
        expiredCookies = true;
        break;
      }
    }
  }

  // Login
  var result;
  if (_cookies !== null && !expiredCookies) {
    console.log('Valid session, no need to re-authenticate');
    _isLogged = true;
    result = new LoginResult();
    result.success = true;
    result.message = 'Logged with cookies';
    return result;
  }

  console.log('No saved sessions or expired session, login on the platform');
  const browser = await prepareBrowser();
  result = await loginF95(browser, username, password);
  _isLogged = result.success;
  await browser.close();

  if (result.success) {
    _cookies = loadCookiesFromDisk();
    console.log('User logged in through the platform');
  } else {
    console.warn('Error during authentication: ' + result.message);
  }

  return result;
}

/**
 * @public
 * Starting from the name, it gets all the information about the game you are looking for.
 * You **must** be logged in to the portal before calling this method.
 * @param {String} gameName Name of the game searched
 * @param {Boolean} includeMods Indicates whether to also take mods into account when searching
 * @returns {Promise<GameInfo>} Information about the game searched or null if no game were found
 */
module.exports.getGameData = async function (gameName, includeMods) {
  if (!_isLogged) {
    console.warn('user not authenticated, unable to continue');
    return null;
  }

  // Gets the search results of the game being searched for
  const browser = await prepareBrowser();
  const infoList = await getSearchGameResults(browser, gameName, _cookies);

  // Process previous partial results
  var result = null;
  for (const info of infoList) {
    // Skip mods if not required
    if (info.isMod && !includeMods) continue;

    // TODO
    // What if there are more games with the same name?
    // For the moment, return the first
    result = await getGameInfo(browser, info);
    break;
  }
  await browser.close();
  return result;
}

/**
 * @public
 * Returns the currently online version of the specified title.
 * If the version has not changed it returns -1. You **must** be logged 
 * in to the portal before calling this method.
 * @param {String} gameName Name of the game to get the version of
 * @param {URL} gameUrl Game URL on the F95 portal
 * @param {Boolean} isMod Is the specified title a mod?
 * @returns {Promise<String>} Game version or '-1' if the game does not have a new version
 */
module.exports.getGameVersion = async function (info) {
  if (!_isLogged) {
    console.warn('user not authenticated, unable to continue');
    return info.version;
  }

  const browser = await prepareBrowser();
  const urlExists = await verifyUrlExistence(browser, info.f95url);
  await browser.close();

  // F95 change URL at every game update, so if the URL is the same no update is available
  if (urlExists) return info.version;
  else return await module.exports.getGameData(info.name, info.isMod).version;
}

/**
 * @public
 * This method loads the main data from the F95 portal 
 * used to provide game information. You **must** be logged 
 * in to the portal before calling this method.
 * @returns {Promise<void>}
 */
module.exports.loadF95BaseData = async function () {
  if (!_isLogged) {
    console.warn('user not authenticated, unable to continue');
    return;
  }

  console.log('Loading base data...');

  // Prepare a new web page
  const browser = await prepareBrowser();
  const page = await preparePage(browser); // Set new isolated page
  await page.setCookie(..._cookies); // Set cookies to avoid login

  // Go to latest update page and wait for it to load
  await page.goto(F95_LATEST_UPDATES, {
    waitUntil: WAIT_STATEMENT
  });

  // Obtain engines (disc/online)
  await page.waitForSelector(ENGINE_ID_SELECTOR);
  _engines = await loadValuesFromLatestPage(page, ENGINES_SAVE_PATH, ENGINE_ID_SELECTOR, 'engines');

  // Obtain statuses (disc/online)
  await page.waitForSelector(STATUS_ID_SELECTOR);
  _statuses = await loadValuesFromLatestPage(page, STATUSES_SAVE_PATH, STATUS_ID_SELECTOR, 'statuses');

  await browser.close();
  console.log('Base data loaded');
}

//### INTERNAL METHODS ###


/**
 * @private
 * Check the reachability of a URL on the internet
 * @param {puppeteer.Browser} browser Browser object used for navigation
 * @param {URL} url URL to check for existence
 * @returns {Promise<Boolean>} true if the URL exists, false otherwise
 */
async function verifyUrlExistence(browser, url) {
  console.log('Verify existence of ' + url.toString());

  const page = await preparePage(browser); // Set new isolated page
  await page.setCookie(..._cookies); // Set cookies to avoid login

  try {
    await page.goto(url.toString(), {
      waitUntil: WAIT_STATEMENT,
      timeout: 20
    }); // Low timeout
    return true;
  } catch (e) {
    return false;
  } finally {
    await page.close(); // Close the page
  }
}

/**
 * @private
 * Get information from the game's main page.
 * @param {puppeteer.Browser} browser Browser object used for navigation
 * @param {GameInfo} info Partial game information used to locate the main conversation containing the searched data
 * @return {Promise<GameInfo>} Complete information about the game you are looking for
 */
async function getGameInfo(browser, info) {
  console.log('Obtaining game info');

  const page = await preparePage(browser); // Set new isolated page
  await page.setCookie(..._cookies); // Set cookies to avoid login
  await page.goto(info.f95url, {
    waitUntil: WAIT_STATEMENT
  }); // Go to the game page and wait until it loads

  // Get the game/mod name (without square brackets)
  const title = await getGameTitle(page);

  // Get the game/mod author (without square brackets)
  const author = await getGameAuthor(page);

  // Get the game title image (the first is what we are searching)
  const previewSource = await getGamePreviewSource(page);
  if (previewSource === null) console.warn('Cannot find game preview image for ' + title);

  // Gets the first post, where are listed all the game's informations
  const post = (await page.$$(THREAD_POSTS))[0];

  // The info are plain text so we need to parse the HTML code
  const bodyHTML = await page.evaluate((mainPost) => mainPost.innerHTML, post);
  const structuredText = HTMLParser.parse(bodyHTML).structuredText;

  // Get overview (different parsing for game and mod)
  var overviewEndIndex;
  if (info.IsMod) overviewEndIndex = structuredText.indexOf('Updated');
  else overviewEndIndex = structuredText.indexOf('Thread Updated');
  const overview = structuredText.substring(0, overviewEndIndex).replace('Overview:\n', '').trim();

  // Parse all the information in the format DESCRIPTION : VALUE
  const parsedInfos = parseConversationPage(structuredText);

  // Fill in the GameInfo element with the information obtained
  info.name = title;
  info.author = author;
  info.overview = overview;
  info.version = info.IsMod ? parsedInfos['MOD VERSION'] : parsedInfos['VERSION'];
  info.lastUpdate = info.IsMod ? parsedInfos['UPDATED'] : parsedInfos['THREAD UPDATED'];
  info.previewSource = previewSource;

  await page.close(); // Close the page
  console.log('Founded data for ' + title);
  return info;
}

/**
 * @private
 * Extrapolates and cleans the author from the page passed by parameter.
 * @param {puppeteer.Page} page Page containing the author to be extrapolated
 * @returns {Promise<String>} Game author
 */
async function getGameAuthor(page) {
  // Get the game/mod name (without square brackets)
  const titleHTML = await page.evaluate((selector) => document.querySelector(selector).innerHTML, GAME_TITLE);
  const structuredTitle = HTMLParser.parse(titleHTML);

  // The last element **shoud be** the title without prefixes (engines, status, other...)
  var gameTitle = structuredTitle.childNodes.pop().rawText;

  // The last square brackets contain the author
  const startTitleIndex = gameTitle.lastIndexOf('[') + 1;
  return gameTitle.substring(startTitleIndex, gameTitle.length - 1).trim();
}

/**
 * @private
 * Process the post text to get all the useful 
 * information in the format *DESCRIPTOR : VALUE*.
 * @param {String} text Structured text of the post
 * @returns {object} Dictionary of information
 */
function parseConversationPage(text) {
  var dataPairs = {};

  // The information searched in the game post are one per line
  var splittedText = text.split('\n');
  for (const line of splittedText) {

    if (!line.includes(':')) continue;

    // Create pair key/value
    const splitted = line.split(':');
    const key = splitted[0].trim().toUpperCase(); // Uppercase to avoid mismatch
    const value = splitted[1].trim();

    // Add pair to the dict if valid
    if (value != '') dataPairs[key] = value;
  }

  return dataPairs;
}

/**
 * @private
 * Gets the URL of the image used as a preview for the game in the conversation.
 * @param {puppeteer.Page} page Page containing the URL to be extrapolated
 * @returns {Promise<URL>} URL of the image or null if failed to get it
 */
async function getGamePreviewSource(page) {
  const src = await page.evaluate((selector) => {
    // Get the firs image available
    const img = document.querySelector(selector);

    if (img === null || img === undefined) return null;
    else return img.getAttribute('src');
  }, GAME_IMAGES);

  // Check if the URL is valid
  const stringIsAValidUrl = (s) => {
    try {
      new URL(s);
      return true;
    } catch (err) {
      return false;
    }
  };

  return stringIsAValidUrl(src) ? new URL(src) : null;
}

/**
 * @private
 * Extrapolates and cleans the title from the page passed by parameter.
 * @param {puppeteer.Page} page Page containing the title to be extrapolated
 * @returns {Promise<String>} Game title
 */
async function getGameTitle(page) {
  // Get the game/mod name (without square brackets)
  const titleHTML = await page.evaluate((selector) => document.querySelector(selector).innerHTML, GAME_TITLE);
  const structuredTitle = HTMLParser.parse(titleHTML);

  // The last element **shoud be** the title without prefixes (engines, status, other...)
  var gameTitle = structuredTitle.childNodes.pop().rawText;
  const endTitleIndex = gameTitle.indexOf('[');
  return gameTitle.substring(0, endTitleIndex).trim();
}

/**
 * @private
 * Search the F95Zone portal to find possible conversations regarding the game you are looking for.
 * @param {puppeteer.Browser} browser Browser object used for navigation
 * @param {String} gamename Name of the game to search for
 * @returns {Promise<GameInfo[]>} List of information obtained from the preliminary research on the F95 portal
 */
async function getSearchGameResults(browser, gamename) {
  console.log('Searching ' + gamename + ' on F95Zone');

  const page = await preparePage(browser); // Set new isolated page
  await page.setCookie(..._cookies); // Set cookies to avoid login
  await page.goto(F95_SEARCH_URL, {
    waitUntil: WAIT_STATEMENT
  }); // Go to the search form and wait for it
  await page.type(SEARCH_FORM_TEXTBOX, gamename) // Type the game we desire
  await page.click(TITLE_ONLY_CHECKBOX) // Select only the thread with the game in the titles
  await Promise.all([
    page.click(SEARCH_BUTTON), // Execute search
    page.waitForNavigation({
      waitUntil: WAIT_STATEMENT
    }), // Wait for page to load
  ]);

  // Select all conversation titles
  var threadTitleList = await page.$$(THREAD_TITLE);

  // For each title extract the info about the conversation
  console.log('Extracting info from conversation titles');
  var results = [];
  for (const title of threadTitleList) {
    var info = await getSearchThreadInfo(page, title);

    // Append the game's informations
    if (info !== null) results.push(info);
  }
  console.log('Find ' + results.length + ' conversations');
  await page.close(); // Close the page

  return results;
}

/**
 * @private
 * Starting from the title of a conversation on the F95 portal, 
 * he obtains basic information about the element (in case it is a game)
 * @param {puppeteer.Page} page Page containing the conversation to be analyzed
 * @param {puppeteer.ElementHandle} titleHandle Title of the conversation to be analyzed
 * @return {Promise<GameInfo>} Object containing the information obtained from the analysis or null if it is not a game conversation
 */
async function getSearchThreadInfo(page, titleHandle) {

  var info = new GameInfo();

  // Get the URL of the thread from the title
  const relativeURLThread = await page.evaluate((element) => element.querySelector('a').href, titleHandle);
  info.f95url = new URL(relativeURLThread, F95_BASE_URL);

  // Select infos like the engine used for the game or it's status
  // parsing the title
  const elements = await titleHandle.$$('span[dir="auto"]');

  // The 'Ongoing' status is not specified, only 'Abandoned'/'OnHold'/'Complete' are
  info.status = 'Ongoing';
  for (const element of elements) {
    // Elaborate the prefixes
    var prefix = await page.evaluate(element => element.textContent.toUpperCase(), element);
    prefix = prefix.replace('[', '').replace(']', '');

    // This is not a game nor a mod, we can exit
    if (prefix === GAME_RECOMMENDATION_PREFIX) return null;

    // Getting infos...
    else if (_statuses.includes(prefix)) info.status = prefix;
    else if (_engines.includes(prefix)) info.engine = prefix;

    // This is probably a mod for the game we are searching
    else if (prefix === MOD_PREFIX) info.isMod = true;
  }
  return info;
}

/**
 * @private
 * Create a Chromium instance used to navigate with Puppeteer. 
 * By default the browser is headless.
 * @returns {Promise<puppeteer.Browser>} Created browser
 */
async function prepareBrowser() {
  // Create a headless browser
  const browser = await puppeteer.launch({
    headless: true,
  });

  return browser;
}

/**
 * @private
 * Prepare a page used to navigate the browser.
 * The page is set up to reject image download requests. The user agent is also changed.
 * @param {puppeteer.Browser} browser Browser to use when navigating where the page will be created
 * @returns {Promise<puppeteer.Page>} New page
 */
async function preparePage(browser) {
  // Create new page in the browser argument
  const page = await browser.newPage();

  // Block image download
  await page.setRequestInterception(true);
  page.on('request', (request) => {
    if (request.resourceType() === 'image') request.abort();
    // else if(request.resourceType == 'font') request.abort();
    // else if(request.resourceType == 'media') request.abort();
    else request.continue();
  });

  // Set custom user-agent
  const userAgent = 'Mozilla/5.0 (X11; Linux x86_64)' +
    'AppleWebKit/537.36 (KHTML, like Gecko) Chrome/64.0.3282.39 Safari/537.36';
  await page.setUserAgent(userAgent);

  return page;
}

/**
 * @private
 * Loads previously stored cookies from disk if they exist, otherwise it returns null.
 * @return {object[]} List of dictionaries or null if cookies don't exist
 */
function loadCookiesFromDisk() {
  if (fs.existsSync(COOKIES_SAVE_PATH)) {
    var cookiesJSON = fs.readFileSync(COOKIES_SAVE_PATH);
    return JSON.parse(cookiesJSON);
  } else return null;
}

/**
 * @private
 * Check the validity of a cookie.
 * @param {object} cookie Cookies to verify the validity. It's a dictionary
 * @returns {Boolean} true if the cookie has expired, false otherwise
 */
function isCookieExpired(cookie) {
  // Local variables
  var expiredCookies = false;

  // Ignore cookies that never expire 
  var expirationUnixTimestamp = cookie['expire'];

  if (expirationUnixTimestamp !== '-1') {
    // Convert UNIX epoch timestamp to normal Date
    var expirationDate = new Date(expirationUnixTimestamp * 1000);

    if (expirationDate < Date.now()) {
      console.log('Cookie ' + cookie['name'] + ' expired, you need to re-authenticate');
      expiredCookies = true;
    }
  }

  return expiredCookies;
}

/**
 * @private
 * Log in to the F95Zone portal and, if successful, save the cookies
 * @param {puppeteer.Browser} browser Browser object used for navigation
 * @param {String} username Username to use during login
 * @param {String} password Password to use during login
 * @returns {Promise<LoginResult>} Result of the operation
 */
async function loginF95(browser, username, password) {
  const page = await preparePage(browser); // Set new isolated page
  await page.goto(F95_LOGIN_URL, {
    waitUntil: WAIT_STATEMENT
  }); // Go to login page and wait until it loads
  await page.type(USERNAME_INPUT, username); // Insert username
  await page.type(PASSWORD_INPUT, password); // Insert password
  await Promise.all([
    page.click(LOGIN_BUTTON), // Click on the login button
    page.waitForNavigation({
      waitUntil: WAIT_STATEMENT
    }), // Wait for page to load
  ]);

  // Prepare result
  var result = new LoginResult();

  // Check if the user is logged in
  result.success = await page.evaluate((selector) => document.querySelector(selector) !== null, AVATAR_INFO);

  // Save cookies to avoid re-auth
  if (result.success) {
    const cookies = await page.cookies();
    fs.writeFileSync(COOKIES_SAVE_PATH, JSON.stringify(cookies));
    result.message = 'Authentication successful';
  }
  // Obtain the error message
  else {
    var errorMessage = await page.evaluate((selector) => document.querySelector(selector).innerText, LOGIN_MESSAGE_ERROR);
    if (errorMessage === 'Incorrect password. Please try again.') result.message = 'Incorrect password';
    else if (errorMessage === "The requested user '" + username + "' could not be found.") result.message = 'Incorrect username';
    else result.message = errorMessage;
  }
  await page.close(); // Close the page

  return result;
}

/**
 * @private
 * If present, it reads the file containing the searched values (engines or states) 
 * from the disk, otherwise it connects to the F95 portal (at the page 
 * https://f95zone.to/latest) and downloads them.
 * @param {puppeteer.Page} page Page used to locate the required elements
 * @param {String} path Path to disk of the JSON file containing the data to read / write
 * @param {String} selector CSS selector of the required elements
 * @param {String} elementRequested Required element (engines or states) used to detail log messages
 * @returns {Promise<String[]>} List of required values in uppercase
 */
async function loadValuesFromLatestPage(page, path, selector, elementRequested) {
  // If the values already exist they are loaded from disk without having to connect to F95
  console.log('Load ' + elementRequested + ' from disc...');
  if (fs.existsSync(path)) {
    var valueJSON = fs.readFileSync(path);
    return JSON.parse(valueJSON);
  }

  // Otherwise, connect and download the data from the portal
  console.log('No ' + elementRequested + ' cached, downloading...');
  var values = await getValuesFromLatestPage(page, selector, 'Getting ' + elementRequested + ' from page');
  fs.writeFileSync(path, JSON.stringify(values));
  return values;
}

/**
 * @private
 * Gets all the textual values of the elements present 
 * in the F95 portal page and identified by the selector 
 * passed by parameter
 * @param {puppeteer.Page} page Page used to locate items specified by the selector
 * @param {String} selector CSS selector
 * @param {String} logMessage Log message indicating which items the selector is requesting
 * @return {Promise<String[]>} List of uppercase strings indicating the textual values of the elements identified by the selector
 */
async function getValuesFromLatestPage(page, selector, logMessage) {
  console.log(logMessage);

  var enginesFound = [];
  var elements = await page.$$(selector);

  for (const element of elements) {
    const text = await element.evaluate(e => e.innerText);

    // Save as upper text for better match if used in query
    enginesFound.push(text.toUpperCase());
  }
  return enginesFound;
}