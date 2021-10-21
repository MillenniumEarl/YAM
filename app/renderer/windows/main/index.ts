// Copyright (c) 2021 MillenniumEarl
//
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT

const dragDiv = document.getElementById("drag-div");
dragDiv?.addEventListener("drop", onDrop);
dragDiv?.addEventListener("dragover", onDragOver);

void window.API.Handler.configure().then(() => void window.API.Logger.info("Window loaded"));

function onDrop(e: DragEvent) {
  // Prevent default behavior (Prevent file from being opened)
  e.preventDefault();

  // Get the dropped data
  const data = e.dataTransfer;
  const entries = data?.items || data?.files;

  if (entries) {
    // Use DataTransferItemList interface to access the file(s)
    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      const file =
        "kind" in entry && entry.kind === "file" ? (entry.getAsFile() as File) : (entry as File);

      const theDiv = document.getElementById("file-list") as HTMLElement;
      const content = document.createTextNode(`... file[${i}].name = ${file.name}\n`);
      theDiv.appendChild(content);
    }
  }
}

function onDragOver(e: DragEvent) {
  // Prevent default behavior (Prevent file from being opened)
  e.preventDefault();
}
