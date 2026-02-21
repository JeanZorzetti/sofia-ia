
import { app, BrowserWindow, ipcMain, dialog, Menu } from 'electron';
import path from 'path';
import isDev from 'electron-is-dev';
import { setupFilesystemHandlers } from './filesystem';

let mainWindow: BrowserWindow | null = null;

function createMenu() {
    const template: Electron.MenuItemConstructorOptions[] = [
        {
            label: 'File',
            submenu: [
                { role: 'quit', label: 'Sair' }
            ]
        },
        {
            label: 'Navegar',
            submenu: [
                {
                    label: 'Voltar',
                    accelerator: 'Alt+Left',
                    click: () => {
                        if (mainWindow?.webContents.canGoBack()) {
                            mainWindow.webContents.goBack();
                        }
                    }
                },
                {
                    label: 'Avançar',
                    accelerator: 'Alt+Right',
                    click: () => {
                        if (mainWindow?.webContents.canGoForward()) {
                            mainWindow.webContents.goForward();
                        }
                    }
                },
                { type: 'separator' },
                {
                    label: 'Recarregar',
                    accelerator: 'CmdOrCtrl+R',
                    click: () => {
                        mainWindow?.webContents.reload();
                    }
                }
            ]
        },
        {
            label: 'Edit',
            submenu: [
                { role: 'undo' },
                { role: 'redo' },
                { type: 'separator' },
                { role: 'cut' },
                { role: 'copy' },
                { role: 'paste' },
                { role: 'selectAll' }
            ]
        },
        {
            label: 'View',
            submenu: [
                { role: 'toggleDevTools' },
                { type: 'separator' },
                { role: 'resetZoom' },
                { role: 'zoomIn' },
                { role: 'zoomOut' },
                { type: 'separator' },
                { role: 'togglefullscreen' }
            ]
        },
        {
            label: 'Window',
            submenu: [
                { role: 'minimize' },
                { role: 'close' }
            ]
        }
    ];

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
}

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true,
        },
    });

    const startUrl = isDev
        ? 'http://localhost:3000'
        : `file://${path.join(__dirname, '../out/index.html')}`;

    mainWindow.loadURL(startUrl);

    if (isDev) {
        mainWindow.webContents.openDevTools();
    }

    mainWindow.on('closed', () => (mainWindow = null));
}

app.on('ready', () => {
    createMenu();
    createWindow();
    setupFilesystemHandlers(ipcMain);
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (mainWindow === null) {
        createWindow();
    }
});
