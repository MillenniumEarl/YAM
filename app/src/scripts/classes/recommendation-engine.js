"use strict";

// Public modules from npm
const F95API = require("f95api");

// Modules from file
const GameInfoExtended = require("./game-info-extended.js");
const reportError = require("../error-manger.js").reportError;

class RecommendationEngine {
    /**
     * @param {Object} credentials Credentials of the F95Zone platform
     * @param {String} credentials.username Username of the F95Zone platform
     * @param {String} credentials.password Password of the F95Zone platform
     * @param {GameDataStore} gameStore Store of the games information
     * @param {ThreadDataStore} threadStore Store of the threads information
     */
    constructor(credentials, gameStore, threadStore) {
        this._gameStore = gameStore;
        this._threadStore = threadStore;
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
            .catch(e => reportError(e, "31600", "this._gameStore.search", "_getWeightedInstalledGameTags"));

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

        // Get all the tags of the threads of games watched by the user but non installed
        const threads = await this._threadStore.search({})
            .catch(e => reportError(e, "31601", "this._threadStore.search", "_getWatchedThreadTags"));

        const ids = threads.map(t => t.id);
        const installedIDs = await this._gameStore.search({id: {$in: ids}})
            .catch(e => reportError(e, "31602", "this._gameStore.search", "_getWatchedThreadTags"));
        const gameTags = threads.map(t => {
            if(!installedIDs.includes(t.id)) {
                return t.tags;
            }
        });

        // Count the tags
        const validTags = [].concat(...gameTags);
        for (const tag of validTags) {
            // Obtains the current value for the tag
            const currentTagCount = tags[tag] ?? 0;
            tags[tag] = currentTagCount + 1;
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
            .catch(e => reportError(e, "31603", "this._getWeightedInstalledGameTags", "recommend"));
        const watchedTags = await this._getWatchedThreadTags()
            .catch(e => reportError(e, "31604", "this._getWatchedThreadTags", "recommend"));
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
                    .catch(e => reportError(e, "31605", "F95API.getLatestUpdates", "recommend"));

                // Add the games
                if (!games) return [];
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