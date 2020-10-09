"use strict";

class UserInfo extends HTMLElement {
  constructor() {
    super();

    /* Use the F95API classes (Need main-preload) */
    this._userdata = window.F95.UserData;
  }

  /**
   * Triggered once the element is added to the DOM
   */
  connectedCallback() {
    // Prepare DOM
    this.prepareDOM();

    /* Set events listeners for the buttons */
    this.loginBtn.addEventListener("click", this.login);
  }

  /**
   * Triggered once the element is removed from the DOM
   */
  disconnectedCallback() {
    /* Remove events listeners for the buttons*/
    this.loginBtn.removeEventListener("click", this.login);
  }

  get userdata() {
    return this._userdata;
  }

  set userdata(val) {
    if (!val) return;

    this._userdata = val;

    // Update shadow DOM
    if (val.avatarSrc)
      this.querySelector("#avatar")
        .setAttribute("src", val.avatarSrc.toString()); // toString because it's a URL
    this.querySelector("#username").innerText = val.username;
    this.querySelector(".col-username").style.display =
      "inline-block";
    this.querySelector(".col-login").style.display = "none";
  }

  //#region Events
  /**
   * @event
   * Triggered when user wants to play the game.
   */
  login() {
    // Raise the event
    this.loginClickEvent = new Event("login");
    this.dispatchEvent(this.loginClickEvent);
  }
  //#endregion Events

  //#region Private methods
  /**
   * Load the HTML file and define the buttons of the custom component.
   */
  prepareDOM() {
    /* Defines the HTML code of the custom element */
    let template = document.createElement("template");

    /* Synchronous read of the HTML template */
    let pathHTML = window.API.join(
      window.API.appDir,
      "src",
      "components",
      "user-info.html"
    );
    template.innerHTML = window.IO.readSync(pathHTML);
    this.appendChild(template.content.cloneNode(true));

    /* Define buttons in DOM */
    this.loginBtn = this.querySelector("#login-btn");
  }
  //#endregion Private methods
}

// Let the browser know that <user-info> is served by our new class
customElements.define("user-info", UserInfo);