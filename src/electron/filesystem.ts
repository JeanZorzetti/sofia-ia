
import { dialog, IpcMain } from 'electron';
import fs from 'fs/promises';
import path from 'path';

// ── Ignore patterns for file tree ──────────────────────────
const IGNORE_DIRS = new Set([
    'node_modules', '.git', '.next', '.turbo', 'dist', 'build',
    '.cache', '__pycache__', '.vscode', '.idea', 'coverage',
    '.DS_Store', 'out', '.vercel', '.svn',
]);

const IGNORE_FILES = new Set(['.DS_Store', 'Thumbs.db']);

interface FileTreeEntry {
    name: string;
    isDirectory: boolean;
    path: string;
    children?: FileTreeEntry[];
    size?: number;
    modifiedAt?: string;
}

export function setupFilesystemHandlers(ipcMain: IpcMain) {
    // ── Select directory dialog ─────────────────────────────
    ipcMain.handle('select-directory', async () => {
        const result = await dialog.showOpenDialog({
            properties: ['openDirectory'],
        });
        return result.canceled ? null : result.filePaths[0];
    });

    // ── List files (flat) ───────────────────────────────────
    ipcMain.handle('list-files', async (_, dirPath: string) => {
        try {
            const entries = await fs.readdir(dirPath, { withFileTypes: true });
            return entries
                .filter(e => !IGNORE_DIRS.has(e.name) && !IGNORE_FILES.has(e.name))
                .map(entry => ({
                    name: entry.name,
                    isDirectory: entry.isDirectory(),
                    path: path.join(dirPath, entry.name),
                }));
        } catch (error) {
            console.error('Error listing files:', error);
            throw error;
        }
    });

    // ── List files recursive (tree) ─────────────────────────
    ipcMain.handle('list-files-recursive', async (_, dirPath: string, maxDepth: number = 4) => {
        async function buildTree(currentPath: string, depth: number): Promise<FileTreeEntry[]> {
            if (depth > maxDepth) return [];

            try {
                const entries = await fs.readdir(currentPath, { withFileTypes: true });
                const result: FileTreeEntry[] = [];

                const sorted = entries
                    .filter(e => !IGNORE_DIRS.has(e.name) && !IGNORE_FILES.has(e.name) && !e.name.startsWith('.'))
                    .sort((a, b) => {
                        if (a.isDirectory() === b.isDirectory()) return a.name.localeCompare(b.name);
                        return a.isDirectory() ? -1 : 1;
                    });

                for (const entry of sorted) {
                    const fullPath = path.join(currentPath, entry.name);
                    const node: FileTreeEntry = {
                        name: entry.name,
                        isDirectory: entry.isDirectory(),
                        path: fullPath,
                    };

                    if (entry.isDirectory()) {
                        node.children = await buildTree(fullPath, depth + 1);
                    }

                    result.push(node);
                }

                return result;
            } catch {
                return [];
            }
        }

        return buildTree(dirPath, 0);
    });

    // ── Read file ───────────────────────────────────────────
    ipcMain.handle('read-file', async (_, filePath: string) => {
        try {
            return await fs.readFile(filePath, 'utf-8');
        } catch (error) {
            console.error('Error reading file:', error);
            throw error;
        }
    });

    // ── Write file ──────────────────────────────────────────
    ipcMain.handle('write-file', async (_, filePath: string, content: string) => {
        try {
            await fs.writeFile(filePath, content, 'utf-8');
            return true;
        } catch (error) {
            console.error('Error writing file:', error);
            throw error;
        }
    });

    // ── Get file stats ──────────────────────────────────────
    ipcMain.handle('get-file-stats', async (_, filePath: string) => {
        try {
            const stats = await fs.stat(filePath);
            return {
                size: stats.size,
                modifiedAt: stats.mtime.toISOString(),
                createdAt: stats.birthtime.toISOString(),
                isDirectory: stats.isDirectory(),
            };
        } catch (error) {
            console.error('Error getting file stats:', error);
            throw error;
        }
    });

    // ── Create file ─────────────────────────────────────────
    ipcMain.handle('create-file', async (_, filePath: string, content: string = '') => {
        try {
            await fs.writeFile(filePath, content, 'utf-8');
            return true;
        } catch (error) {
            console.error('Error creating file:', error);
            throw error;
        }
    });

    // ── Create directory ────────────────────────────────────
    ipcMain.handle('create-directory', async (_, dirPath: string) => {
        try {
            await fs.mkdir(dirPath, { recursive: true });
            return true;
        } catch (error) {
            console.error('Error creating directory:', error);
            throw error;
        }
    });

    // ── Delete file or directory ────────────────────────────
    ipcMain.handle('delete-file', async (_, filePath: string) => {
        try {
            const stats = await fs.stat(filePath);
            if (stats.isDirectory()) {
                await fs.rm(filePath, { recursive: true, force: true });
            } else {
                await fs.unlink(filePath);
            }
            return true;
        } catch (error) {
            console.error('Error deleting file:', error);
            throw error;
        }
    });

    // ── Rename file or directory ────────────────────────────
    ipcMain.handle('rename-file', async (_, oldPath: string, newPath: string) => {
        try {
            await fs.rename(oldPath, newPath);
            return true;
        } catch (error) {
            console.error('Error renaming file:', error);
            throw error;
        }
    });

    // ── Run shell command ───────────────────────────────────
    ipcMain.handle('run-command', async (_, command: string, cwd: string) => {
        const { exec } = await import('child_process');
        return new Promise<{ stdout: string; stderr: string; exitCode: number }>((resolve) => {
            exec(command, {
                cwd,
                maxBuffer: 1024 * 1024,
                shell: process.platform === 'win32' ? 'cmd.exe' : '/bin/bash',
                timeout: 30000,
            }, (error, stdout, stderr) => {
                resolve({
                    stdout: stdout?.toString() || '',
                    stderr: stderr?.toString() || '',
                    exitCode: error?.code || 0,
                });
            });
        });
    });
}
