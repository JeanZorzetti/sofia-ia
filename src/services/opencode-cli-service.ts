
import { spawn } from 'child_process';

export class OpencodeCliService {
    /**
     * Executes a prompt via the Opencode CLI and returns the response.
     *
     * Opencode CLI non-interactive mode:
     *   opencode run -q -m provider/model   (prompt fed via stdin)
     *   - run: non-interactive run mode (prints result, exits)
     *   - -q: quiet mode (suppresses spinner, good for scripts)
     *   - -m: model selection (format: provider/model)
     *
     * The prompt is piped via stdin (no command-line length limit, and
     * cross-platform). The previous `type <file> | opencode` only worked on the
     * Windows cmd shell — on Linux/Docker `type` does not print a file, so the
     * pipe fed an empty stdin and the CLI returned nothing.
     *
     * Teams V2.1 — S1.3 LIMITATION (decision #2): unlike the Claude CLI, `opencode run`
     * exposes NO per-run tool/permission/MCP flags (verified against the installed binary:
     * only -m/--agent/--format/--variant/--thinking). MCP + permissions live in config
     * files / `opencode mcp` / agent definitions, not flags. So a member's CapabilityPolicy
     * canNOT be translated to flags here — we deliberately do NOT invent one. Opencode
     * members therefore keep today's behavior; the policy is honored on the Claude CLI path
     * (claude-cli-service.ts / sandbox-cli-agent.ts) and the function-calling providers.
     */
    static async generate(
        prompt: string,
        cwd: string = process.cwd(),
        systemPrompt?: string,
        modelId?: string
    ): Promise<{ content: string; usage?: any }> {
        return new Promise((resolve, reject) => {
            try {
                // Opencode has no system-prompt flag here; prepend it to the prompt.
                let fullPrompt = prompt;
                if (systemPrompt) {
                    fullPrompt = `<system>\n${systemPrompt}\n</system>\n\n${prompt}`;
                }

                // Build the command. The prompt is fed via stdin (below).
                let shellCmd = `opencode run -q`;
                if (modelId) {
                    shellCmd += ` -m ${modelId}`;
                }

                console.log(`[Opencode CLI] Executing: ${shellCmd.substring(0, 120)}...`);

                // shell:true keeps Windows binary resolution (opencode.cmd) working;
                // the prompt is fed via stdin, not via the command line.
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
                    reject(new Error(`Failed to start Opencode CLI: ${error.message}`));
                });

                child.on('close', (code) => {
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

                // Feed the prompt via stdin (cross-platform, no length limit).
                child.stdin?.write(fullPrompt);
                child.stdin?.end();

                // Timeout safety — 20 minutes
                setTimeout(() => {
                    child.kill();
                    reject(new Error('Opencode CLI timed out after 20 minutes'));
                }, 20 * 60 * 1000);

            } catch (err: any) {
                reject(err);
            }
        });
    }

    private static cleanOutput(output: string): string {
        // Strip ANSI escape codes (CSI sequences)
        const ansi = new RegExp(String.fromCharCode(27) + '\\[\\d+m', 'g');
        return output.replace(ansi, '').trim();
    }
}
