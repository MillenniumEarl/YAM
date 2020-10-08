"use strict";

class UserInfo extends HTMLElement {
  constructor() {
    super();

    /* Use the F95API classes (Need main-preload) */
    this._userdata = window.F95.UserData;

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

    this.attachShadow({
      mode: "open",
    });
    this.shadowRoot.appendChild(template.content.cloneNode(true));

    this.loginBtn = this.shadowRoot.getElementById("login-btn");
  }

  /**
   * Triggered once the element is added to the DOM
   */
  connectedCallback() {
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
    if (val.avatarSrc) this.shadowRoot.getElementById("avatar").setAttribute("src", val.avatarSrc);
    this.shadowRoot.getElementById("username").innerText = val.username;
    this.shadowRoot.querySelector(".col-username").style.display =
      "inline-block";
    this.shadowRoot.querySelector(".col-login").style.display = "none";
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
}

// Let the browser know that <user-info> is served by our new class
customElements.define("user-info", UserInfo);
