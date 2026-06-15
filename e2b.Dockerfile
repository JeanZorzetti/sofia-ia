# E2B sandbox template for Polaris code-teams (Sub-projeto C — Option B).
# Adds the Claude Code CLI (+ git) to E2B's code-interpreter base, which already
# ships Node.js and the /home/user layout the worker clones into.
#
# Build (after `e2b auth login`):
#   e2b template create polaris-claude -d e2b.Dockerfile
# Then set SANDBOX_TEMPLATE=<id-printed-by-the-build> on the worker EasyPanel service.
FROM e2bdev/code-interpreter:latest

RUN apt-get update \
    && apt-get install -y --no-install-recommends git ripgrep ca-certificates \
    && rm -rf /var/lib/apt/lists/*

RUN npm install -g @anthropic-ai/claude-code

# Fail the build early if the CLI isn't runnable (no auth needed for --version).
RUN claude --version
