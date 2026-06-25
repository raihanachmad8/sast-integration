# AI Models

## Overview

Configure LLM providers for AI-powered finding verification. Each workspace can have its own model configuration.

## Supported Providers

| Provider | Models | Auth |
|----------|--------|------|
| OpenAI | GPT-4, GPT-3.5 | API Key |
| Anthropic | Claude | API Key |
| Azure OpenAI | GPT-4, GPT-3.5 | Endpoint + Key |

## Configuration

### Adding a Model

1. Go to **AI Models** page
2. Click **Add Model**
3. Select provider
4. Enter API key and model settings
5. Click **Test Connection**
6. Click **Save**

### Model Settings

| Setting | Description |
|---------|-------------|
| Provider | LLM provider name |
| Model ID | Model identifier |
| API Key | Provider API key |
| Temperature | 0.0-1.0 (lower = more deterministic) |
| Max Tokens | Maximum response tokens |
| Prompt Variant | strict or balanced |

## Prompt Variants

### Strict

Detailed analysis with:
- Data flow tracing
- Taint source identification
- CWE prediction
- Fix suggestions

### Balanced

Brief analysis with:
- Verdict and confidence
- Short explanation

## Model Testing

Test model configuration:

```bash
POST /api/v1/workspaces/:workspaceId/model/:modelId/test
```

Returns sample verification result.

## Model Presets

| Preset | Provider | Model | Use Case |
|--------|----------|-------|----------|
| Default | OpenAI | GPT-4 | General |
| Fast | OpenAI | GPT-3.5-turbo | Quick verification |
| Thorough | Anthropic | Claude | Detailed analysis |

## API Endpoints

| Method | Endpoint | Permission |
|--------|----------|-----------|
| GET | `/model` | `AI_MODEL_VIEW` |
| POST | `/model` | `AI_MODEL_MANAGE` |
| GET | `/model/:modelId` | `AI_MODEL_VIEW` |
| PUT | `/model/:modelId` | `AI_MODEL_MANAGE` |
| DELETE | `/model/:modelId` | `AI_MODEL_MANAGE` |
| POST | `/model/:modelId/test` | `AI_MODEL_MANAGE` |

## Feature Flag

AI models require `FEATURE_FLAG_AI_MODELS=true`.
