"use strict";

// Public modules from npm
const F95API = require("f95api");
const logger = require("electron-log");

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
        const games = await this._gameStore.search({})
            .catch(e => logger.error(`Error while searching games in the games db: ${e}`));

        for(const game of games) {
            // Obtains the log argument based on the 
            // total number of times the game has been played
            // with a minimum of 2
            const argument = Math.max(game.gameSessions, 2);
            
            for(const tag of game.tags) {
                // Calculate the log_2 (min is 1)
                const log = this._getBaseLog(LOG_BASE, argument);

                // If the game is installed we can assume that 
                // the user is more interested in it than one 
                // that is not installed
                const rating = log + log / 10; // Log + 10%

                // Obtains the current value for the tag
                const currentTagRating = weightedTags[tag] ?? 0;
                weightedTags[tag] = currentTagRating + rating;
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
        const threads = await this._threadStore.search({})
            .catch(e => logger.error(`Error while searching threads in the threads db: ${e}`));

        for(const t of threads) {
            const count = await this._gameStore.count({
                id: t.id
            }).catch(e => logger.error(`Error while counting thread with id ${t.id} in the threads db: ${e}`));
            
            if (count === 0) {
                for (const tag of t.tags) {
                    // Obtains the current value for the tag
                    const currentTagCount = tags[tag] ?? 0;
                    tags[tag] = currentTagCount + 1;
                }
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
            
            // Obtains the current value for the tag
            const currentValue = merged[key] ?? 0;
            merged[key] = currentValue + value;
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
        const items = Object.keys(dict).map(key => [key, dict[key]]);

        // Sort the array based on the second element
        items.sort((first, second) => second[1] - first[1]);

        // Return the first `n` elements
        const min = Math.min(n, items.length);
        const returnElements = items.slice(0, min);
        return returnElements.map(e => e[0]);
    }

    /**
     * @private
     * Validate `games` by checking that they are not installed, 
     * are not in watched threads and do not belong to `excludeGames`.
     * @param {GameInfo[]} games 
     * @param {GameInfo[]} excludeGames 
     */
    async _validateGame(games, excludeGames) {
        const returnValue = [];
        for (const game of games) {
            // Get info about the game
            const isInstalledGame = (await this._gameStore.count({id: game.id})) !== 0;
            const isWatchedGame = (await this._threadStore.count({id: game.id})) !== 0;
            const isAlreadyAdded = excludeGames.find(g => g.id === game.id);

            if (!isInstalledGame && !isAlreadyAdded && !isWatchedGame) {
                returnValue.push(game);
            }
        }
        return returnValue;
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
        const recommendedGames = [];

        // Get the tags
        const weightedTags = await this._getWeightedInstalledGameTags()
            .catch(e => logger.error(`Error while processing weighted tags of installed games: ${e}`));
        const watchedTags = await this._getWatchedThreadTags()
            .catch(e => logger.error(`Error while processing tags of watched games: ${e}`));
        const merged = this._mergeTagDicts(weightedTags, watchedTags);

        // Get the MAX_TAGS most frequent tags
        const tags = this._mostFrequent(merged, MAX_TAGS);

        // Login
        const result = await F95API.login(this._credentials.username, this._credentials.password);
        if(result.success) {
            do {
                // Get the games that match with tags
                const games = await F95API.getLatestUpdates({
                    tags: tags,
                    sorting: "rating"
                }, MAX_FETCHED_GAMES)
                    .catch(e => logger.error(`Error while fetching latest game from F95: ${e}`));

                // Add the games
                const validGames = await this._validateGame(games, recommendedGames);
                validGames.map(game => {
                    if (recommendedGames.length < limit) 
                        recommendedGames.push(game);
                });

                // Remove the last tag
                // This is necessary for the possible next do-while loop
                // that happens when there aren't enough recommended games
                tags.pop();
            }
            while (recommendedGames.length < limit && tags.length > 0);
        }

        // Convert and return the games
        return recommendedGames.map(g => Object.assign(new GameInfoExtended, g));
    }
}

module.exports = RecommendationEngine;