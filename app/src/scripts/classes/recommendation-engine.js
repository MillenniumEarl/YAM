"use strict";

// Public modules from npm
const F95API = require("f95api");

// Modules from file
const GameDataStore = require("../../../db/stores/game-data-store.js");
const ThreadDataStore = require("../../../db/stores/thread-data-store.js");
const GameInfoExtended = require("./game-info-extended.js");

class RecommendationEngine {
    /**
     * @param {Object} credentials Credentials of the F95Zone platform
     * @param {String} credentials.username
     * @param {String} credentials.password
     * @param {String} gameDbPath Path to games database
     * @param {String} threadDbPath Path to threads database
     */
    constructor(credentials, gameDbPath, threadDbPath) {
        this._gameStore = new GameDataStore(gameDbPath);
        this._threadStore = new ThreadDataStore(threadDbPath);
        this._credentials = credentials;
    }

    //#region Private methods
    /**
     * @private
     * Calculate the logarithm.
     * @param {Number} base 
     * @param {Number} argument 
     */
    _getBaseLog(base, argument) {
        return Math.log(argument) / Math.log(base);
    }

    /**
     * @private
     * Obtains the tags of the installed games with a weighted 
     * rate based on how much the user has played them.
     * @returns {Promise<Object.<string, number>>}
     */
    async _getWeightedInstalledGameTags() {
        // Local variables
        const LOG_BASE = 2;
        const weightedTags = {};
        const games = await this._gameStore.search({});

        for(const game of games) {
            // Obtains the log argument based on the 
            // total number of times the game has been played
            const argument = game.gameSessions <= 2 ? 2 : game.gameSessions;
            
            for(const tag of game.tags) {
                // Calculate the log_2 (min is 1)
                const log = this._getBaseLog(LOG_BASE, argument);

                // If the game is installed we can assume that 
                // the user is more interested in it than one 
                // that is not installed
                const rating = log + log / 4; // Log + 25%

                // Add tag to dict
                if (tag in weightedTags) weightedTags[tag] += rating;
                else weightedTags[tag] = rating;
            }
        }
        return weightedTags;
    }

    /**
     * @private
     * Obtains the number of tags of the non-installed 
     * games in the watchlist of the user.
     * @returns {Promise<Object.<string, number>>}
     */
    async _getWatchedThreadTags() {
        // Local variables
        const tags = {};
        const threads = await this._threadStore.search({});

        for(const t of threads) {
            const game = await this._gameStore.search({id: t.id});
            if (game.length !== 0) continue;

            for(const tag of t.tags) {
                if (tag in tags) tags[tag] += 1;
                else tags[tag] = 1;
            }
        }
        return tags;
    }

    /**
     * @private
     * Merge two dictionaries containing tags.
     * @param {Object<string, number>} a 
     * @param {Object<string, number>} b 
     */
    _mergeTagDicts(a, b) {
        // Copy a to merged
        const merged = Object.assign({}, a);

        // Convert b to an array
        const converted = Object.entries(b);
        
        // Merge b dict into merged
        for (const e of converted) {
            const key = e[0];
            const value = e[1];
            
            if (key in merged) merged[key] += value;
            else merged[key] = value;
        }
        return merged;
    }

    /**
     * @private
     * Get the `n` elements most frequents in `dict`.
     * @param {Object.<string, number>} dict 
     * @param {Number} n 
     * @returns {String[]}
     */
    _mostFrequent(dict, n) {
        // Create items array
        const items = Object.keys(dict).map(function (key) {
            return [key, dict[key]];
        });

        // Sort the array based on the second element
        items.sort(function (first, second) {
            return second[1] - first[1];
        });

        // Return the first `n` elements
        const min = Math.min(n, items.length);
        const returnElements = items.slice(0, min);
        return returnElements.map(e => e[0]);
    }
    //#endregion Private methods

    /**
     * @public
     * Obtains the games recommended for the user based on the games he follows and owns.
     * @param {Number} limit Maximum number of games to reccomend.
     * @returns {Promise<GameInfoExtended[]>}
     */
    async recommend(limit) {
        // Local variables
        const MAX_TAGS = 5; // Because F95Zone allow for a max. of 5 tags
        const MAX_FETCHED_GAMES = Math.floor(limit + limit / 2); // limit + 50%
        const validGames = [];

        // Get the tags
        const weightedTags = await this._getWeightedInstalledGameTags();
        const watchedTags = await this._getWatchedThreadTags();
        const merged = this._mergeTagDicts(weightedTags, watchedTags);

        // Get the MAX_TAGS most frequent tags
        const tags = this._mostFrequent(merged, MAX_TAGS);

        // Login
        const result = await F95API.login(this._credentials.username, this._credentials.password);
        if(!result.success) return [];

        do {
            // Get the games that match with tags
            const games = await F95API.getLatestUpdates({
                tags: tags,
                sorting: "rating"
            }, MAX_FETCHED_GAMES);

            // Add the games
            for (const game of games) {
                const isInstalledGame = (await this._gameStore.search({id: game.id})).length !== 0;
                const isWatchedGame = (await this._threadStore.search({id: game.id})).length !== 0;
                const isAlreadyAdded = validGames.find(g => g.id === game.id);

                if (!isInstalledGame && !isAlreadyAdded && !isWatchedGame && validGames.length < limit) {
                    validGames.push(game);
                }
                else continue;
            }

            // Remove the last tag
            // This is necessary for the possible next do-while loop
            // that happens when there aren't enough recommended games
            tags.pop();
        }
        while (validGames.length < limit && tags.length > 0);

        // Convert and return the games
        return validGames.map(g => Object.assign(new GameInfoExtended, g));
    }
}

module.exports = RecommendationEngine;