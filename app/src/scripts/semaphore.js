"use strict";

// Core modules
const { promisify } = require("util");
const sleep = promisify(setTimeout);

class Semaphore {
  constructor(tokens = 1) {
    this.tokens = tokens;
    this._taken = 0;
  }

  get free() {
    return this.tokens - this.taken;
  }

  get taken() {
    return this._taken;
  }

  /**
   * @public
   * Occupy a token and return a promise that resolves when the token is available.
   * @param {Number} amount Number of token to
   * @return {Promise} Promise that resolves when a token is available
   */
  take(amount) {
    console.log(`Occupied tokens: ${this.taken}`);
    if (amount <= 0) {
      throw new Error("Amount should be greater than 0");
    }

    this._taken += amount;

    if (this._taken > this.tokens) {
      this._taken = this.tokens;
    }

    return this._wait();
  }

  /**
   * @public
   * Free a token.
   * @param {Number} amount Number of tokens to be made available
   */
  give(amount) {
    console.log(`Free tokens: ${this.free}`);
    if (amount <= 0) {
      throw new Error("Amount should be greater than 0");
    }

    this._taken -= amount;

    if (this._taken < 0) {
      this._taken = 0;
    }
  }

  /**
   * Returns a promise that resolves when a token becomes free.
   * @returns {Promise}
   */
  _wait() {
    return new Promise((resolve) => {
      while (this._taken === this.tokens) {
        console.log("Sleeping...");
        sleep(500);
      }
      console.log("Resolved!");
      resolve();
    });
  }
}

module.exports = Semaphore;
