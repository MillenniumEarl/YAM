// Copyright (c) 2021 MillenniumEarl
//
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT

export function addOnDrop(e: DragEvent) {
  // Prevent default behavior (Prevent file from being opened)
  // e.preventDefault(); Use VueJS instead

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
      const file = isDataTransferItem
        ? ((entry as DataTransferItem).getAsFile() as File)
        : (entry as File);

      // Save the path and the context
      paths.push({ path: file.path, context: null });
    }

    // Send the paths via IPC
    window.Handler.send("received-paths", paths, false);
  }
}

export async function addOnButtonClick() {
  // Get the paths with dialog
  const result = await window.Dialog.folder({
    title: "Add games"
  });

  // Parse the paths and add the context
  const data = result.filePaths.map((p) => ({ path: p, context: null }));

  // Send the paths via IPC
  window.Handler.send("received-paths", data, false);
}