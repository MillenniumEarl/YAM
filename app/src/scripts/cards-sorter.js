"use strict";

/**
 * @public
 * Sort two GameCards alphabetically.
 * @param {GameCard} a 
 * @param {GameCard} b 
 * @returns {1|0|-1}
 */
module.exports.alphabetically = function(a, b) {
    const gamenameA = a.info.name;
    const gamenameB = b.info.name;
    return gamenameA.localeCompare(gamenameB);
};

/**
 * @public
 * Sort two gamecards based on the availability of updates, 
 * putting the gamecard with updates first.
 * @param {GameCard} a 
 * @param {GameCard} b 
 */
module.exports.updateAvailable = function(a, b) {
    const updateA = a.info.updateAvailable;
    const updateB = b.info.updateAvailable;

    if (updateA && !updateB) return 1;
    else if (updateA === updateB) return 0;
    else if (!updateA && updateB) return -1;
};