# Supported Providers — NeoCode

NeoCode supports multiple AI providers through environment variables. Ollama is detected automatically when running locally.

---

## Provider Reference

| Provider | Env Var | Model Env Var | Notes |
|---|---|---|---|
| **Ollama** (default) | _(auto-detected)_ | `OLLAMA_MODEL` | Local, free, no API key. Recommended default. |
| **Anthropic** | `ANTHROPIC_API_KEY` | `ANTHROPIC_MODEL` | First-party Claude API. |
| **OpenAI** | `CLAUDE_CODE_USE_OPENAI=1` + `OPENAI_API_KEY` | `OPENAI_MODEL` | GPT-4o, o3, etc. |
| **Gemini** | `CLAUDE_CODE_USE_GEMINI=1` + `GEMINI_API_KEY` | — | Google Gemini models. |
| **GitHub Models** | `CLAUDE_CODE_USE_GITHUB=1` + `GITHUB_TOKEN` | — | GitHub Marketplace models. |
| **AWS Bedrock** | `CLAUDE_CODE_USE_BEDROCK=1` | `AWS_REGION` | Claude on Bedrock. Requires AWS credentials. |
| **Google Vertex** | `CLAUDE_CODE_USE_VERTEX=1` | `CLOUD_ML_REGION` | Claude on Vertex AI. Requires GCP credentials. |
| **Azure Foundry** | `CLAUDE_CODE_USE_FOUNDRY=1` | — | Azure AI Foundry. |

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
