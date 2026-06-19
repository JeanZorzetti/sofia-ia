
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { isClaudeRateLimit } from '@/lib/ai/claude-token-pool';
import { buildCliToolFlags, renderClaudeCliFlags, type CliMcpServerDescriptor } from '@/lib/ai/cli-tool-flags';
import type { CapabilityPolicy } from '@/lib/orchestration/team/team-types';

export class ClaudeCliService {
    /**
     * Executes a prompt via the Claude Code CLI and returns the response.
     *
     * Auth (subscription vs API): no API key is injected. The spawned `claude`
     * CLI uses its own login session — either an interactive `claude login`
     * (local) or the long-lived CLAUDE_CODE_OAUTH_TOKEN env var (headless/Docker).
     * This bills against the Claude subscription (Pro/Max) instead of the
     * pay-per-token API. We also STRIP ANTHROPIC_API_KEY / ANTHROPIC_AUTH_TOKEN
     * from the subprocess env, because if either is present the CLI switches to
     * API billing (this mirrors what Agent Teams AI does in OAuth mode).
     *
     * The user prompt is piped via stdin (no command-line length limit, and
     * cross-platform). The previous `type <file> | claude` only worked on the
     * Windows cmd shell — on Linux/Docker `type` does not print a file, so the
     * pipe fed an empty stdin and the CLI returned nothing.
     * The system prompt is offloaded to a temp file via --system-prompt-file.
     */
    static async generate(
        prompt: string,
        cwd: string = process.cwd(),
        systemPrompt?: string,
        modelId?: string,
        oauthToken?: string,
        // Teams V2.1 — S1.3: a team member may carry a capability policy. This is a
        // CHAT-RUN on the worker/HOST FS (no sandbox), so a policy ALWAYS demotes the CLI
        // to read-only + `--permission-mode plan` (writes would hit /app — isolation hole)
        // and honors `mcpAllowlist` via --mcp-config. Absent → today's exact command.
        capabilityOpts?: { capabilities?: CapabilityPolicy | null; mcpServers?: CliMcpServerDescriptor[] },
    ): Promise<{ content: string; usage?: any }> {
        const tempDir = os.tmpdir();
        const randomId = Math.random().toString(36).substring(2, 15);

        let tempSystemPromptPath: string | null = null;
        let tempMcpConfigPath: string | null = null;

        const cleanup = () => {
            for (const p of [tempSystemPromptPath, tempMcpConfigPath]) {
                if (p && fs.existsSync(p)) {
                    try { fs.unlinkSync(p); } catch (e) { /* ignore */ }
                }
            }
        };

        return new Promise((resolve, reject) => {
            try {
                // S1.3: resolve the policy → CLI flags for the CHAT-RUN (host) context.
                // No policy → buildCliToolFlags returns {} and renderClaudeCliFlags emits
                // exactly `--dangerously-skip-permissions` (byte-identical to the legacy cmd).
                const toolFlags = buildCliToolFlags({
                    capabilities: capabilityOpts?.capabilities,
                    context: 'chat-run',
                    mcpServers: capabilityOpts?.mcpServers,
                });
                if (toolFlags.mcpConfig) {
                    tempMcpConfigPath = path.join(tempDir, `claude_mcp_${randomId}.json`);
                    fs.writeFileSync(tempMcpConfigPath, JSON.stringify(toolFlags.mcpConfig), 'utf8');
                }
                const flagArgs = renderClaudeCliFlags(toolFlags, {
                    mcpConfigPath: tempMcpConfigPath ? `"${tempMcpConfigPath}"` : undefined,
                });

                // Build the command. The prompt is fed via stdin (below), so the
                // command line stays short regardless of prompt size.
                // --output-format json gives us the response + token usage.
                let shellCmd = `claude --print ${flagArgs.join(' ')} --output-format json`;

                // Offload system prompt to a temp file (avoids arg length limits).
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

                // Strip API credentials so the CLI uses the subscription session
                // (CLAUDE_CODE_OAUTH_TOKEN) instead of pay-per-token API billing.
                const env = { ...process.env, CI: 'true' } as NodeJS.ProcessEnv;
                delete env.ANTHROPIC_API_KEY;
                delete env.ANTHROPIC_AUTH_TOKEN;
                // Pin the subscription account for this spawn (token-pool failover).
                // Absent → inherit the ambient login / single CLAUDE_CODE_OAUTH_TOKEN.
                if (oauthToken) env.CLAUDE_CODE_OAUTH_TOKEN = oauthToken;

                // shell:true keeps Windows binary resolution (claude.cmd) working;
                // the prompt is fed via stdin, not via the command line.
                const child = spawn(shellCmd, [], {
                    cwd: cwd,
                    shell: true,
                    env,
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
                        // Surface rate/usage limits so the coordinator can react
                        // (mirrors OpencodeCliService).
                        if (isClaudeRateLimit(stderrData)) {
                            reject(new Error(stderrData.trim() || `Claude CLI rate limit (exit ${code})`));
                            return;
                        }
                    }
                    const result = this.parseResult(stdoutData);
                    // The CLI prints the session/usage-limit banner to STDOUT with exit 0
                    // (e.g. "You've hit your session limit · resets 5pm (UTC)"). Detect it
                    // in the content and reject so the token-pool failover rotates accounts
                    // instead of returning the banner as the agent's answer.
                    if (isClaudeRateLimit(result.content)) {
                        reject(new Error(result.content.slice(0, 300) || 'Claude usage limit'));
                        return;
                    }
                    resolve(result);
                });

                // Feed the user prompt via stdin (cross-platform, no length limit).
                child.stdin?.write(prompt);
                child.stdin?.end();

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

    /**
     * Parses `--output-format json` stdout into content + usage. Falls back to
     * raw text if the output is not the expected JSON envelope (older CLI,
     * unexpected stdout, etc.).
     */
    private static parseResult(stdout: string): { content: string; usage?: any } {
        const text = this.cleanOutput(stdout);
        try {
            const json = JSON.parse(text);
            const content = typeof json.result === 'string' ? json.result : text;
            const u = json.usage || {};
            const input = u.input_tokens ?? 0;
            const output = u.output_tokens ?? 0;
            return {
                content: content.trim(),
                usage: {
                    input_tokens: input,
                    output_tokens: output,
                    total_tokens: input + output,
                    cost_usd: json.total_cost_usd ?? 0,
                },
            };
        } catch {
            // Not JSON — return as plain text.
            return { content: text, usage: { input_tokens: 0, output_tokens: 0 } };
        }
    }

    private static cleanOutput(output: string): string {
        // Strip ANSI escape codes (CSI sequences)
        const ansi = new RegExp(String.fromCharCode(27) + '\\[\\d+m', 'g');
        return output.replace(ansi, '').trim();
    }
}
