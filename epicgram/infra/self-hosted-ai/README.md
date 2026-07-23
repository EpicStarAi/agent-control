# DEEPINSIDE — Self-Hosted AI Stack (PHASE S)

Additive infrastructure layer based on the [n8n Self-Hosted AI Starter Kit](https://github.com/n8n-io/self-hosted-ai-starter-kit), extended with **Redis** and **MinIO**. It does not touch the existing DEEPINSIDE app, API, Agent Registry, Epic OS, or AI Operator.

## Services

| Layer | Service | Port | Role |
|---|---|---|---|
| CORE | n8n | 5678 | Workflow engine |
| CORE | PostgreSQL | (internal) | State / memory store |
| CORE | Qdrant | 6333 | Vector store (embeddings) |
| CORE | Ollama | 11434 | Local LLM runtime |
| STORAGE | Redis | (internal) | Queue / cache |
| STORAGE | MinIO | 9000 / 9001 | Object storage |
| ADD-ON | Open WebUI | 3080 | Chat UI over Ollama |
| ADD-ON | Flowise | 3070 | Visual agent / RAG builder |

## Bring up

```bash
cp .env.example .env          # fill LOCAL-ONLY values
docker compose --profile cpu up -d          # Ollama on CPU
# or
docker compose --profile gpu-nvidia up -d   # Ollama on NVIDIA GPU
# optional extras:
docker compose --profile cpu --profile addons up -d
```

Pull a local model once Ollama is up:

```bash
docker exec -it deepinside-ollama ollama pull qwen2.5-coder:7b
```

## AI Router

- **Local**: Ollama (`http://127.0.0.1:11434`) — primary, always self-hosted.
- **External providers** (OpenAI, Claude, Gemini, Grok, OpenRouter): interface + config only, **Disabled / Mock by default**. Keys live solely in your local `.env` and are never read or shown by the DEEPINSIDE UI.

## Safety

No real secrets in this repo. No real Telegram actions, no auto-publish, no external API calls are performed by this stack or by the DEEPINSIDE UI that visualizes it. All external connections are presented as **Ready / Mock / Disabled** until you explicitly opt in locally.
