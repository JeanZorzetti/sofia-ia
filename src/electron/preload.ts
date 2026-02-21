
import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electron', {
    // Directory
    selectDirectory: () => ipcRenderer.invoke('select-directory'),

    // List
    listFiles: (dirPath: string) => ipcRenderer.invoke('list-files', dirPath),
    listFilesRecursive: (dirPath: string, maxDepth?: number) =>
        ipcRenderer.invoke('list-files-recursive', dirPath, maxDepth),

    // Read / Write
    readFile: (filePath: string) => ipcRenderer.invoke('read-file', filePath),
    writeFile: (filePath: string, content: string) => ipcRenderer.invoke('write-file', filePath, content),

    // CRUD
    createFile: (filePath: string, content?: string) => ipcRenderer.invoke('create-file', filePath, content),
    createDirectory: (dirPath: string) => ipcRenderer.invoke('create-directory', dirPath),
    deleteFile: (filePath: string) => ipcRenderer.invoke('delete-file', filePath),
    renameFile: (oldPath: string, newPath: string) => ipcRenderer.invoke('rename-file', oldPath, newPath),

    // Stats
    getFileStats: (filePath: string) => ipcRenderer.invoke('get-file-stats', filePath),

    // Terminal
    runCommand: (command: string, cwd: string) => ipcRenderer.invoke('run-command', command, cwd),
});
