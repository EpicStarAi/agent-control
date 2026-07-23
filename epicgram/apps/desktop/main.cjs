const { app, BrowserWindow, shell } = require("electron");
const path = require("node:path");

const DEFAULT_WEB_URL = "http://127.0.0.1:3015";
const WEB_URL = process.env.EPICGRAM_WEB_URL || DEFAULT_WEB_URL;

function createWindow() {
  const window = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 980,
    minHeight: 680,
    title: "EPIC☠️GRAM",
    backgroundColor: "#05080c",
    icon: path.join(__dirname, "../web/public/icon.svg"),
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  window.removeMenu();
  window.loadURL(WEB_URL);

  window.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
