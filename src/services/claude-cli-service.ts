
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import os from 'os';

export class ClaudeCliService {
    /**
     * Executes a prompt via the Claude CLI and returns the response.
     * All large text (system prompt AND user prompt) is offloaded to temp files
     * to avoid Windows command-line length limits (EINVAL).
     * 
     * Strategy:
     * 1. Write system prompt to a temp file -> --system-prompt-file flag
     * 2. Write user prompt to a temp file
     * 3. Use shell: true with `type <file> | claude --print --system-prompt-file <file>`
     *    This pipes the user prompt via stdin while keeping the command line short.
     */
    static async generate(prompt: string, cwd: string = process.cwd(), systemPrompt?: string, modelId?: string): Promise<{ content: string; usage?: any }> {
        const tempDir = os.tmpdir();
        const randomId = Math.random().toString(36).substring(2, 15);

        let tempSystemPromptPath: string | null = null;
        const tempPromptPath = path.join(tempDir, `claude_prompt_${randomId}.txt`);

        const cleanup = () => {
            if (tempSystemPromptPath && fs.existsSync(tempSystemPromptPath)) {
                try { fs.unlinkSync(tempSystemPromptPath); } catch (e) { /* ignore */ }
            }
            if (fs.existsSync(tempPromptPath)) {
                try { fs.unlinkSync(tempPromptPath); } catch (e) { /* ignore */ }
            }
        };

        return new Promise((resolve, reject) => {
            try {
                // Write user prompt to temp file
                fs.writeFileSync(tempPromptPath, prompt, 'utf8');

                // Build the shell command string
                // We use `type <file> | claude --print` to pipe the prompt via stdin
                // This keeps the actual command line very short.
                let shellCmd = `type "${tempPromptPath}" | claude --print --dangerously-skip-permissions`;

                // Offload system prompt to file
                if (systemPrompt) {
                    tempSystemPromptPath = path.join(tempDir, `claude_sys_${randomId}.txt`);
                    fs.writeFileSync(tempSystemPromptPath, systemPrompt, 'utf8');
                    shellCmd += ` --system-prompt-file "${tempSystemPromptPath}"`;
                }

                // Add --model flag if a specific model was requested
                if (modelId) {
                    shellCmd += ` --model ${modelId}`;
                }

                console.log(`[Claude CLI] Executing: ${shellCmd.substring(0, 120)}...`);

                // Use spawn with shell: true but the command itself is short (just file paths)
                const child = spawn(shellCmd, [], {
                    cwd: cwd,
                    shell: true,
                    env: {
                        ...process.env,
                        CI: 'true',
                    }
                });

                let stdoutData = '';
                let stderrData = '';

                child.stdout.on('data', (data) => {
                    stdoutData += data.toString();
                });

                child.stderr.on('data', (data) => {
                    stderrData += data.toString();
                    // Only log non-empty stderr
                    const text = data.toString().trim();
                    if (text) {
                        console.error('[Claude CLI Stderr]:', text);
                    }
                });

                child.on('error', (error) => {
                    console.error('Claude CLI spawn error:', error);
                    cleanup();
                    reject(new Error(`Failed to start Claude CLI: ${error.message}`));
                });

                child.on('close', (code) => {
                    cleanup();
                    console.log(`Claude CLI exited with code ${code}`);
                    if (code !== 0) {
                        console.warn(`Claude CLI non-zero exit. Stderr: ${stderrData}`);
                    }
                    const cleanOutput = this.cleanOutput(stdoutData);
                    resolve({
                        content: cleanOutput,
                        usage: { input_tokens: 0, output_tokens: 0 }
                    });
                });

                // Timeout safety
                setTimeout(() => {
                    child.kill();
                    cleanup();
                    reject(new Error('Claude CLI timed out after 20 minutes'));
                }, 20 * 60 * 1000);

            } catch (err: any) {
                cleanup();
                reject(err);
            }
        });
    }

    private static cleanOutput(output: string): string {
        // Strip ANSI escape codes
        let cleaned = output.replace(/\u001b\[\d+m/g, '');
        return cleaned.trim();
    }
}
