# Modelos de IA — Polaris IA

## Providers

| Provider | Uso | Config |
|---|---|---|
| **Groq** | Modelos rápidos/gratuitos | `GROQ_API_KEY` |
| **OpenRouter** | Modelos premium multi-vendor | `OPENROUTER_API_KEY` |
| **HuggingFace** | Embeddings (padrão) | `HUGGINGFACE_API_KEY` |
| **Claude CLI** | Agentes coder locais | Instalação local |

## Modelos Disponíveis no IDE

### Claude (Anthropic) — via OpenRouter
| Modelo | ID | Contexto | Notas |
|---|---|---|---|
| Sonnet 4 ⭐ | `anthropic/claude-sonnet-4` | 200K | Recomendado, melhor custo-benefício |
| Opus 4 👑 | `anthropic/claude-opus-4` | 200K | Premium, raciocínio avançado |
| Sonnet 3.5 | `anthropic/claude-3.5-sonnet` | 200K | Versão anterior estável |
| Haiku 3.5 ⚡ | `anthropic/claude-3.5-haiku` | 200K | Rápido e barato |

### GPT (OpenAI) — via OpenRouter
| Modelo | ID | Contexto | Notas |
|---|---|---|---|
| GPT-4.1 🔥 | `openai/gpt-4.1` | 1M | Novo, contexto massivo |
| GPT-4o | `openai/gpt-4o` | 128K | Multimodal |
| GPT-4.1 Mini | `openai/gpt-4.1-mini` | 1M | Mais barato |
| o3-mini 🧠 | `openai/o3-mini` | 200K | Raciocínio |

### Gemini (Google) — via OpenRouter
| Modelo | ID | Contexto | Notas |
|---|---|---|---|
| 2.5 Pro 🚀 | `google/gemini-2.5-pro` | 1M | Maior contexto |
| 2.5 Flash | `google/gemini-2.5-flash-preview` | 1M | Rápido |
| 2.0 Flash | `google/gemini-2.0-flash-001` | 1M | Estável |

### Llama (Meta) — via Groq
| Modelo | ID | Contexto | Notas |
|---|---|---|---|
| 3.3 70B 🆓 | `llama-3.3-70b-versatile` | 128K | Padrão, gratuito |
| 3.1 8B ⚡🆓 | `llama-3.1-8b-instant` | 128K | Ultra-rápido |
| 3.2 90B 🔬 | `llama-3.2-90b-vision-preview` | 128K | Vision |
| 3.2 11B | `llama-3.2-11b-vision-preview` | 128K | Vision menor |

### DeepSeek — via Groq/OpenRouter
| Modelo | ID | Contexto | Notas |
|---|---|---|---|
| R1 Distill 🧠🆓 | `deepseek-r1-distill-llama-70b` | 128K | Reasoning, Groq |
| R1 | `deepseek/deepseek-r1` | 64K | Full, OpenRouter |
| V3 | `deepseek/deepseek-chat` | 64K | Chat, OpenRouter |

### Outros — via Groq
| Modelo | ID | Contexto | Notas |
|---|---|---|---|
| Qwen 2.5 Coder 💻 | `qwen-2.5-coder-32b` | 128K | Especialista em código |
| Gemma 2 9B | `gemma2-9b-it` | 8K | Google, leve |
| Mixtral 8x7B | `mixtral-8x7b-32768` | 32K | MoE |

## Roteamento

O sistema usa um `MODEL_PROVIDER_MAP` em `src/app/api/ide/chat/route.ts` para rotear automaticamente cada modelo ao provider correto (Groq ou OpenRouter). Modelos com `/` no ID vão para OpenRouter, os demais para Groq.

## Para Agentes

Agentes em `src/lib/ai/groq.ts` suportam routing adicional:
- Modelos com prefixo `claude-` → **Claude CLI** (execução local)
- Modelos com prefixo `opencode-` → **Opencode CLI** (multi-provider local)
- Modelos com `/` no ID → **OpenRouter** (com ReAct loop + tool calling)
- Outros → **Groq** (chamada direta)
