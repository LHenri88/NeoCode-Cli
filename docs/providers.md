# Supported Providers — NeoCode

NeoCode supports multiple AI providers through environment variables. Ollama is detected automatically when running locally.

---

## Provider Reference

### Cloud Providers

| Provider | Env Var | Model Env Var | Notes |
|---|---|---|---|
| **Anthropic** | `ANTHROPIC_API_KEY` | `ANTHROPIC_MODEL` | First-party Claude API. Default: `claude-sonnet-4-6` |
| **OpenAI** | `CLAUDE_CODE_USE_OPENAI=1` + `OPENAI_API_KEY` | `OPENAI_MODEL` | GPT-4o, o3, GPT-5.3-codex, etc. |
| **Gemini** | `CLAUDE_CODE_USE_GEMINI=1` + `GEMINI_API_KEY` | — | Google Gemini models. Default: `gemini-3-flash-preview` |
| **GitHub Models** | `CLAUDE_CODE_USE_GITHUB=1` + `GITHUB_TOKEN` | — | GitHub Marketplace models (free tier available) |
| **AWS Bedrock** | `CLAUDE_CODE_USE_BEDROCK=1` | `AWS_REGION` | Claude on Bedrock. Requires AWS credentials. |
| **Google Vertex** | `CLAUDE_CODE_USE_VERTEX=1` | `CLOUD_ML_REGION` | Claude on Vertex AI. Requires GCP credentials. |
| **Azure OpenAI** | `OPENAI_BASE_URL` + `OPENAI_API_KEY` | `OPENAI_MODEL` | Azure-hosted OpenAI models. |
| **Azure Foundry** | `CLAUDE_CODE_USE_FOUNDRY=1` | — | Azure AI Foundry. |

### OpenAI-Compatible Providers

| Provider | Base URL | Default Model | API Key Required |
|---|---|---|---|
| **OpenRouter** | `https://openrouter.ai/api/v1` | `openai/gpt-5-mini` | ✅ Yes |
| **Groq** | `https://api.groq.com/openai/v1` | `llama-3.3-70b-versatile` | ✅ Yes |
| **DeepSeek** | `https://api.deepseek.com/v1` | `deepseek-chat` | ✅ Yes |
| **Together AI** | `https://api.together.xyz/v1` | `Qwen/Qwen3.5-9B` | ✅ Yes |
| **Mistral** | `https://api.mistral.ai/v1` | `mistral-large-latest` | ✅ Yes |
| **Moonshot AI** | `https://api.moonshot.ai/v1` | `kimi-k2.5` | ✅ Yes |
| **Qwen (gqwen-auth)** | `http://localhost:3099/v1` | `qwen3-coder-plus` | ❌ No (local proxy) |

### Local Providers

| Provider | Base URL | Default Model | Notes |
|---|---|---|---|
| **Ollama** (default) | `http://localhost:11434/v1` | `llama3.1:8b` | Auto-detected, free, no API key |
| **LM Studio** | `http://localhost:1234/v1` | `local-model` | Local inference server |
| **LocalAI** | `http://localhost:8080/v1` | Custom | Self-hosted OpenAI-compatible |
| **vLLM** | Custom | Custom | High-performance inference |
| **Text Generation WebUI** | `http://localhost:5000/v1` | Custom | Oobabooga's WebUI with API extension |

---

## Quick Setup Examples

### OpenRouter

```bash
export CLAUDE_CODE_USE_OPENAI=1
export OPENAI_BASE_URL=https://openrouter.ai/api/v1
export OPENAI_API_KEY=sk-or-v1-...
export OPENAI_MODEL=openai/gpt-4o

neocode
```

### Groq

```bash
export CLAUDE_CODE_USE_OPENAI=1
export OPENAI_BASE_URL=https://api.groq.com/openai/v1
export OPENAI_API_KEY=gsk_...
export OPENAI_MODEL=llama-3.3-70b-versatile

neocode
```

### DeepSeek

```bash
export CLAUDE_CODE_USE_OPENAI=1
export OPENAI_BASE_URL=https://api.deepseek.com/v1
export OPENAI_API_KEY=sk-...
export OPENAI_MODEL=deepseek-chat

neocode
```

### LM Studio

```bash
export CLAUDE_CODE_USE_OPENAI=1
export OPENAI_BASE_URL=http://localhost:1234/v1
export OPENAI_API_KEY=dummy
export OPENAI_MODEL=local-model

neocode
```

---

## Ollama Setup (Recommended)

1. Install: `curl -fsSL https://ollama.com/install.sh | sh`
2. Pull a model: `ollama pull qwen2.5-coder:7b`
3. Run NeoCode — Ollama is auto-detected on `http://localhost:11434`

Override URL: `OLLAMA_BASE_URL=http://my-ollama-server:11434`

### Recommended Models

| Use Case | Model | VRAM |
|---|---|---|
| Coding (fast) | `qwen2.5-coder:7b` | 6 GB |
| Coding (quality) | `qwen2.5-coder:32b` | 20 GB |
| General | `llama3.2:3b` | 3 GB |
| Large context | `mistral-nemo:12b` | 10 GB |

---

## Provider Fallback

NeoCode probes providers at startup and supports automatic fallback:

1. Configured/detected provider
2. Ollama (if available locally)
3. `firstParty` Anthropic (if `ANTHROPIC_API_KEY` is set)

Use `/provider` to check status and switch providers interactively.

---

## Custom OpenAI-Compatible Endpoints

Any server speaking the OpenAI API protocol (LM Studio, LocalAI, vLLM, etc.) works via:

```bash
CLAUDE_CODE_USE_OPENAI=1
OPENAI_BASE_URL=http://localhost:1234/v1
OPENAI_API_KEY=dummy
OPENAI_MODEL=your-model-name
```
