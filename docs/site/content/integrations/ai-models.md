---
title: AI Models
description: Configure LLM providers for AI verification
---

# AI Models

## Overview

Configure LLM providers for AI-powered finding verification. Each workspace can have its own model configuration.

## Supported Providers

| Provider | Default Base URL | Notes |
|----------|-----------------|-------|
| Ollama | `http://localhost:11434` | Local, free |
| OpenAI | `https://api.openai.com/v1` | Cloud, paid |
| Anthropic | `https://api.anthropic.com` | Cloud, paid |
| Groq | `https://api.groq.com/openai/v1` | Cloud, fast |
| Modal | Custom | Serverless GPU |
| Custom | User-defined | Any OpenAI-compatible API |

## Add Model

```mermaid
sequenceDiagram
    actor User
    participant UI
    participant API
    participant DB[(Database)]

    User->>UI: Click "Add Model"
    UI->>API: POST /api/v1/ai-models
    API->>API: Encrypt API key
    API->>DB: INSERT ai_model
    API-->>UI: 201 { model }
```

## Test Model

```mermaid
sequenceDiagram
    actor User
    participant API
    participant AI as AI Provider

    User->>API: POST /api/v1/ai-models/:id/test
    API->>AI: Send test prompt
    AI-->>API: Response
    API->>API: Update model status
    API-->>UI: 200 { status, latency }
```

## Fallback Chain

```mermaid
flowchart TD
    A["AI verification needed"] --> B["Try primary model<br/>(priority: 1)"]
    B --> C{"Success?"}
    C -->|"Yes"| D["Return result"]
    C -->|"Timeout/Error"| E["Try fallback model<br/>(priority: 2+)"]
    E --> F{"Success?"}
    F -->|"Yes"| D
    F -->|"No more models"| G["Mark as pending<br/>(human review)"]

    style D fill:#22c55e,color:#fff
    style G fill:#f59e0b,color:#fff
```

## Model Roles

| Role | Purpose |
|------|---------|
| `primary` | First choice for verification |
| `fallback` | Backup when primary fails |

## Prompt Presets

| Preset | Description |
|--------|-------------|
| `strict` | Conservative, high precision |
| `balanced` | Default, good precision/recall |
| `aggressive` | Catch more, may have more FP |
