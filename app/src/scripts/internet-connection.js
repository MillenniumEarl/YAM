"use strict";

// Core modules
const dns = require("dns");
const { promisify } = require("util");

// Global variables
const HOSTNAME = "www.google.com";
const alookup = promisify(dns.lookup);

/**
 * @public
 * Check if the PC is connected to Internet.
 */
module.exports.check = async function() {
    try {
        // Should save the result in a variable to work (don't know why)
        const ping = await alookup(HOSTNAME);
        return ping.address !== "";
    }
    catch(err) {
        if(err.code === "ENOTFOUND") return false;
        else throw err;
    }
};