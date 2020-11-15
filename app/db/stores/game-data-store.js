"use strict";

// Public modules from npm
const Datastore = require("nedb-promises");
const Ajv = require("ajv");
const gamedataSchema = require("../schemas/gamedata");

/**
 * It allows you to store and get game data from a disk database.
 */
class GameDataStore {
    /**
     * It allows you to store and get game data from a disk database.
     * @param {String} dbPath Database path to disk
     */
    constructor(dbPath) {
        // Create the JSON validator
        const ajv = new Ajv({
            useDefaults: true
        });

        /**
         * JSON schema validator.
         */
        this._schemaValidator = ajv.compile(gamedataSchema);

        /**
         * NoDB stored on disk.
         */
        this._db = Datastore.create({
            filename: dbPath,
            timestampData: true,
            autoload: true,
        });
    }

    /**
     * @public
     * Check if the data passed by parameter is compatible with the database schema.
     * @param {Object} data Dictionary of properties of a GameInfoExtended object
     * @returns {Boolean} true if the dictionary is valid, false otherwise
     */
    validate(data) {
        return this._schemaValidator(data);
    }

    /**
     * @public
     * Save a `GameInfoExtended` object in the database.
     * @param {Object} data Dictionary of properties of a `GameInfoExtended` object
     */
    async insert(data) {
        // Validate schema
        const isValid = this.validate(data);
        if (!isValid) {
            const error = this._schemaValidator.errors[0];
            throw new Error(`Invalid schema: ${error.dataPath} ${error.message}`);
        }

        // Insert data
        return await this._db.insert(data);
    }

    /**
     * @public
     * Remove a record from the database.
     * @param {number} id The ID of the record to be deleted
     */
    async delete(id) {
        return await this._db.remove({id});
    }

    /**
     * @public
     * Reads a single record from the database.
     * @param {number} id ID of the record to read
     * @returns {Object} Dict of properties
     */
    async read(id) {
        return await this._db.findOne({ _id: id });
    }

    /**
     * @public
     * Count the number of records in the database that match the query.
     */
    async count(query) {
        return await this._db.count(query);
    }

    /**
     * @public
     * Search for specific records in the database
     * @param {Object} query Dictionary used for search. If `{}` return all the records.
     * @param {number} index (optional) Index of the page to prepare
     * @param {number} size (optional) Size of each page
     * @param {number} limit (Optional) Max number of element in the results
     * @param {Object} sortQuery (Optional) Sort the results
     */
    async search(searchQuery, index, size, limit, sortQuery) {
        const results = this._db.find(searchQuery);

        if (index && size) results.skip(index * size); // Skip the first "index" pages
        if (limit) results.limit(limit); // Get the next "size" records
        if (sortQuery) results.sort(sortQuery);

        return await results.exec();
    }

    /**
     * @public
     * Write a single object in the database.
     * @param {GameInfoExtended} data 
     */
    async write(data) {
        // Validate schema
        const isValid = this.validate(data);
        if (!isValid) {
            const error = this._schemaValidator.errors[0];
            throw new Error(`Invalid schema: ${error.dataPath} ${error.message}`);
        }

        // Set the update query
        const selectQuery = {_id : data._id};

        return await this._db.update(selectQuery, data);
    }
}

module.exports = GameDataStore;
