interface Window {
    readonly Handler: import("C:/Users/samue/Documents/GitHub/YAM/packages/common/interfaces").IRendererIPCHandler;
    readonly Logger: import("C:/Users/samue/Documents/GitHub/YAM/packages/common/interfaces").IRendererLogger;
    readonly Dialog: { file: (o: import("C:/Users/samue/Documents/GitHub/YAM/packages/common/interfaces").IDialogOptions) => Promise<Electron.OpenDialogReturnValue>; folder: (o: import("C:/Users/samue/Documents/GitHub/YAM/packages/common/interfaces").IDialogOptions) => Promise<Electron.OpenDialogReturnValue>; };
}
