"use strict";

/* Defines the HTML code of the custom element */
const template = document.createElement("template");

/* Synchronous read of the HTML template */
template.innerHTML = window.api.send("read-file", "../components/user-info.html");

class UserInfo extends HTMLElement {
    constructor() {
        super();

        /* Use the F95API classes (Need main-preload) */
        console.log(window.UserData);
        this.userdata = new window.UserData();

        /* Binds the methods to the class's methods */
        this.login = login.bind(this);

        this.attachShadow({
            mode: 'open'
        });
        this.shadowRoot.appendChild(template.content.cloneNode(true));

        this.loginBtn = this.shadowRoot.getElementById("login-btn");
    }

    /**
     * Triggered once the element is added to the DOM 
     */
    connectedCallback() {
        /* Set events listeners for the buttons */
        this.loginBtn.addEventListener('click', this.login);
    }

    /**
     * Triggered once the element is removed from the DOM
     */
    disconnectedCallback() {
        /* Remove events listeners for the buttons*/
        this.loginBtn.removeEventListener('click', this.login);
    }

    get userdata() {
        return this.userdata;
    }

    set userdata(val) {
        if (!userdata) return;

        this.userdata = val;

        // Update shadow DOM
        this.shadowRoot.getElementById("avatar").setAttribute("src", val.avatarSrc);
        this.shadowRoot.getElementById("username").innerText = val.username;
        this.shadowRoot.querySelector(".col-username").style.display = "inline-block";
        this.shadowRoot.querySelector(".col-login").style.display = "none";
    }
}

// Let the browser know that <user-info> is served by our new class
customElements.define("user-info", UserInfo);

//#region Events
/**
 * @event
 * Triggered when user wants to play the game.
 */
function login() {
    console.log("login");
    // Raise the event
    this.loginClickEvent = new Event("login");
    this.dispatchEvent(this.loginClickEvent);
}
//#endregion Events