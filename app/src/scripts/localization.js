"use strict";

// Core modules
const fs = require("fs");
const util = require("util");
const path = require("path");

// Public modules from npm
const i18next = require("i18next");
const LanguageDetector = require("i18next-electron-language-detector");
const isDev = require("electron-is-dev");

module.exports.initLocalization = async function ({resourcesPath, language}) {
    // Obtain the translation files
    let res = await getTranslationResourcesFromDir(resourcesPath);
    
    // Initialize class
    await i18next
        .use(LanguageDetector)
        .init({
        resources: res,
        fallbackLng: isDev ? "dev" : "en",
        debug: isDev,
    });
    
    // If defined, change language
    if(language && language !== "DEFAULT") this.changeLanguage(language);
}

module.exports.getCurrentLanguage = function() {
    return i18next.language;
}

module.exports.getTranslation = function (key) {
    return i18next.t(key);
}

module.exports.changeLanguage = async function (lang) {
    await i18next.changeLanguage(lang);
}

//#region Private methods
async function getTranslationResourcesFromDir(dirname) {
    // Avoid callback and allow use of await
    const readdir = util.promisify(fs.readdir);
    const readfile = util.promisify(fs.readFile);

    let resources = {};
    let dir = path.resolve(dirname);
    for (let filename of await readdir(path.resolve(dir))) {
        // Read translation
        let translationPath = path.join(dir, filename);
        let json = await readfile(translationPath);

        // Parse translation
        let langTranslation = JSON.parse(json);
        let langName = filename.split(".")[0];

        // Add translation
        resources[langName] = langTranslation;
    }
    return resources;
}
//#endregion Private methods