"use strict";

window.API.once("messagebox-arguments", async function (type, title, message) {
    // Local variables
    const cwd = await window.API.cwd();
    const imagesPath = window.API.join(cwd, "resources", "images");
    
    // Set the data
    document.getElementById("title").textContent = title;
    document.getElementById("message").textContent = message;

    // Set the window icon
    const iconElement = document.getElementById("icon");
    switch (type) {
    case "info":
        iconElement.setAttribute("src", window.API.join(imagesPath, "info.png"));
        break;
    case "warning":
        iconElement.setAttribute("src", window.API.join(imagesPath, "warning.png"));
        break;
    case "error":
        iconElement.setAttribute("src", window.API.join(imagesPath, "error.png"));
        break;
    default:
        return;
    }

    // Get the body size
    const PADDING_FOR_SIDE = 15;
    const width = document.body.clientWidth + 3 * PADDING_FOR_SIDE;
    const height = document.body.clientHeight + 2 * PADDING_FOR_SIDE;
    window.API.send("messagebox-resize", width, height);
});

document.querySelector("#close-btn").addEventListener("click", function close() {
    window.API.send("messagebox-closing");
});
