
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import os from 'os';

export class OpencodeCliService {
    /**
     * Executes a prompt via the Opencode CLI and returns the response.
     * 
     * Opencode CLI non-interactive mode:
     *   opencode -p "prompt" -q -m provider/model
     *   - -p: non-interactive prompt mode (prints result, exits)
     *   - -q: quiet mode (suppresses spinner, good for scripts)
     *   - -m: model selection (format: provider/model)
     * 
     * For large prompts, we pipe via stdin:
     *   type <file> | opencode run -q -m provider/model
     */
    static async generate(
        prompt: string,
        cwd: string = process.cwd(),
        systemPrompt?: string,
        modelId?: string
    ): Promise<{ content: string; usage?: any }> {
        const tempDir = os.tmpdir();
        const randomId = Math.random().toString(36).substring(2, 15);
        const tempPromptPath = path.join(tempDir, `opencode_prompt_${randomId}.txt`);

        const cleanup = () => {
            if (fs.existsSync(tempPromptPath)) {
                try { fs.unlinkSync(tempPromptPath); } catch (e) { /* ignore */ }
            }
        };

        return new Promise((resolve, reject) => {
            try {
                // Build full prompt with system prompt prepended
                let fullPrompt = prompt;
                if (systemPrompt) {
                    fullPrompt = `<system>\n${systemPrompt}\n</system>\n\n${prompt}`;
                }

                // Write prompt to temp file to avoid command-line length limits
                fs.writeFileSync(tempPromptPath, fullPrompt, 'utf8');

                // Build the shell command
                // `type <file> | opencode run -q` pipes the prompt via stdin
                let shellCmd = `type "${tempPromptPath}" | opencode run -q`;

                // Add --model flag if specified (format: provider/model)
                if (modelId) {
                    shellCmd += ` -m ${modelId}`;
                }

                console.log(`[Opencode CLI] Executing: ${shellCmd.substring(0, 120)}...`);

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
                    const text = data.toString().trim();
                    if (text) {
                        console.error('[Opencode CLI Stderr]:', text);
                    }
                });

                child.on('error', (error) => {
                    console.error('Opencode CLI spawn error:', error);
                    cleanup();
                    reject(new Error(`Failed to start Opencode CLI: ${error.message}`));
                });

                child.on('close', (code) => {
                    cleanup();
                    console.log(`Opencode CLI exited with code ${code}`);
                    if (code !== 0) {
                        console.warn(`Opencode CLI non-zero exit. Stderr: ${stderrData}`);
                        if (stderrData.includes('hit your limit') || stderrData.includes('rate limit')) {
                            reject(new Error(stderrData));
                            return;
                        }
                    }
                    const cleanOutput = this.cleanOutput(stdoutData);
                    resolve({
                        content: cleanOutput,
                        usage: { input_tokens: 0, output_tokens: 0 }
                    });
                });

                // Timeout safety — 20 minutes
                setTimeout(() => {
                    child.kill();
                    cleanup();
                    reject(new Error('Opencode CLI timed out after 20 minutes'));
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
