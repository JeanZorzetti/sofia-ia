
// Types for Electron API
declare global {
    interface Window {
        electron?: {
            selectDirectory: () => Promise<string | null>;
            listFiles: (dirPath: string) => Promise<Array<{ name: string; isDirectory: boolean; path: string }>>;
            listFilesRecursive: (dirPath: string, maxDepth?: number) => Promise<FileTreeEntry[]>;
            readFile: (filePath: string) => Promise<string>;
            writeFile: (filePath: string, content: string) => Promise<boolean>;
            createFile: (filePath: string, content?: string) => Promise<boolean>;
            createDirectory: (dirPath: string) => Promise<boolean>;
            deleteFile: (filePath: string) => Promise<boolean>;
            renameFile: (oldPath: string, newPath: string) => Promise<boolean>;
            getFileStats: (filePath: string) => Promise<{
                size: number;
                modifiedAt: string;
                createdAt: string;
                isDirectory: boolean;
            }>;
            runCommand: (command: string, cwd: string) => Promise<{
                stdout: string;
                stderr: string;
                exitCode: number;
            }>;
        };
    }
}

export interface FileTreeEntry {
    name: string;
    isDirectory: boolean;
    path: string;
    children?: FileTreeEntry[];
    size?: number;
    modifiedAt?: string;
}

export const DesktopService = {
    isDesktop: (): boolean => {
        return typeof window !== 'undefined' && !!window.electron;
    },

    selectDirectory: async (): Promise<string | null> => {
        if (!DesktopService.isDesktop()) {
            console.warn('Filesystem access only available in Desktop mode');
            return null;
        }
        return window.electron!.selectDirectory();
    },

    listFiles: async (dirPath: string) => {
        if (!DesktopService.isDesktop()) return [];
        return window.electron!.listFiles(dirPath);
    },

    listFilesRecursive: async (dirPath: string, maxDepth: number = 4): Promise<FileTreeEntry[]> => {
        if (!DesktopService.isDesktop()) return [];
        return window.electron!.listFilesRecursive(dirPath, maxDepth);
    },

    readFile: async (filePath: string) => {
        if (!DesktopService.isDesktop()) return '';
        return window.electron!.readFile(filePath);
    },

    writeFile: async (filePath: string, content: string) => {
        if (!DesktopService.isDesktop()) return false;
        return window.electron!.writeFile(filePath, content);
    },

    createFile: async (filePath: string, content: string = '') => {
        if (!DesktopService.isDesktop()) return false;
        return window.electron!.createFile(filePath, content);
    },

    createDirectory: async (dirPath: string) => {
        if (!DesktopService.isDesktop()) return false;
        return window.electron!.createDirectory(dirPath);
    },

    deleteFile: async (filePath: string) => {
        if (!DesktopService.isDesktop()) return false;
        return window.electron!.deleteFile(filePath);
    },

    renameFile: async (oldPath: string, newPath: string) => {
        if (!DesktopService.isDesktop()) return false;
        return window.electron!.renameFile(oldPath, newPath);
    },

    getFileStats: async (filePath: string) => {
        if (!DesktopService.isDesktop()) return null;
        return window.electron!.getFileStats(filePath);
    },

    runCommand: async (command: string, cwd: string): Promise<{ stdout: string; stderr: string; exitCode: number } | null> => {
        if (!DesktopService.isDesktop()) return null;
        return window.electron!.runCommand(command, cwd);
    },
};
