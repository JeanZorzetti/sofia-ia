# Polaris Teams — Code Factory sandbox template (E2B)
#
# Objetivo: remover o bootstrap por-run (`npm i -g @anthropic-ai/claude-code`, ~2-4 min)
# e garantir git/node presentes, para a code-run começar rápida e cada turno do CLI
# terminar bem abaixo do timeout por-turno (15 min). Foi o bootstrap + npm/build que
# comeram boa parte dos ~14 min da task 1 no primeiro teste.
#
# Build:
#   cd e2b && e2b template build --name polaris-code-factory
# Depois, no serviço WORKER (EasyPanel), setar:
#   SANDBOX_TEMPLATE=<template id impresso pelo build>
#
# Base: precisa ser uma imagem Debian/Ubuntu que JÁ traga Node 20+ (o CLI no sandbox
# usa node/npm). A base default do E2B já tem Node — se preferir o caminho canônico,
# rode `e2b template init` e apenas ADICIONE os dois RUN abaixo ao Dockerfile gerado,
# mantendo o FROM que o init escolher.
FROM e2bdev/code-interpreter:latest

# git é necessário para o fluxo de repo clonado; ca-certificates para HTTPS.
RUN apt-get update \
 && apt-get install -y --no-install-recommends git ca-certificates \
 && rm -rf /var/lib/apt/lists/*

# Pré-instala o Claude Code CLI globalmente (pula o bootstrap a cada run).
RUN npm install -g @anthropic-ai/claude-code \
 && (claude --version || true)
