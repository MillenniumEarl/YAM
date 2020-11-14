"use strict";

// Public modules from npm
const Datastore = require("nedb-promises");
const Ajv = require("ajv");
const gamedataSchema = require("../schemas/gamedata");

// Modules from file
const GameInfoExtended = require("../../src/scripts/classes/game-info-extended.js");

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
            allErrors: true,
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
    insert(data) {
        // Validate schema
        const isValid = this.validate(data);
        if (!isValid) throw new Error("Invalid schema");

        // Insert data
        return this._db.insert(data);
    }

    /**
     * @public
     * Remove a record from the database.
     * @param {number} id The ID of the record to be deleted
     */
    delete(id) {
        return this._db.remove({id});
    }

    /**
     * @public
     * Reads a single record from the database.
     * @param {number} id ID of the record to read
     * @returns {GameInfoExtended}
     */
    read(id) {
        const record = this._db.findOne({ id });
        return Object.assign(new GameInfoExtended(), record);
    }

    /**
     * @public
     * Reads all the records in the database.
     * @returns {GameInfoExtended[]}
     */
    readAll() {
        const records = this._db.find();
        const objects = [];
        records.forEach(r => {
            const o = Object.assign(new GameInfoExtended(), r);
            objects.push(o);
        });
        return objects;
    }

    /**
     * 
     * @param {*} query 
     */
    search(query) {
        //  { $regex: VALUE_TO_SEARCH} }
        return this._db.find(query);
    }

    /**
     * @public
     * Write a single object in the database.
     * @param {GameInfoExtended} data 
     */
    write(data) {
        // Set the update query
        const selectQuery = {_id : data.dbid};

        // Parse data from object to dict of properties
        const updateData = data.toJSON();

        return this._db.update(selectQuery, updateData);
    }
}

module.exports = GameDataStore;
