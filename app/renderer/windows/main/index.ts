// Copyright (c) 2021 MillenniumEarl
//
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT

// Get all the elements used in this script
const dragDiv = document.getElementById("drag-div");
const addBtn = document.getElementById("add-game-btn");

// Assign events to elements
dragDiv?.addEventListener("drop", onDrop);
dragDiv?.addEventListener("dragover", onDragOver);
addBtn?.addEventListener("click", () => {
  void (async () => await onAddBtnClick())();
});
void window.API.Handler.configure();

function onDrop(e: DragEvent) {
  // Prevent default behavior (Prevent file from being opened)
  e.preventDefault();

  // Get the dropped data
  const data = e.dataTransfer;
  const entries = data?.items || data?.files;

  if (entries) {
    // List of paths with context to send to the main process
    const paths = [];

    // Get all the paths of the dropped files
    for (let i = 0; i < entries.length; i++) {
      // Parse the element
      const entry = entries[i];
      const isDataTransferItem = "kind" in entry && entry.kind === "file";
      const file = isDataTransferItem ? (entry.getAsFile() as File) : (entry as File);

      // Save the path and the context
      paths.push({ path: file.path, context: null });
    }

    // Send the paths via IPC
    window.API.Handler.send("received-paths", paths, false);
  }
}

function onDragOver(e: DragEvent) {
  // Prevent default behavior (Prevent file from being opened)
  e.preventDefault();
}

async function onAddBtnClick() {
  // Get the paths with dialog
  const result = await window.API.Dialog.folder({
    title: "Add games"
  });

  // Parse the paths and add the context
  const data = result.filePaths.map((p) => ({ path: p, context: null }));

  // Send the paths via IPC
  window.API.Handler.send("received-paths", data, false);
}
