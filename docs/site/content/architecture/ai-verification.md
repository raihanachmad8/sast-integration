---
title: AI Verification
description: How AI models verify security findings
---

# AI Verification

## Overview

AI verification uses LLMs to reduce false positives in security findings. Each finding is analyzed with CWE context and classified as true positive or false positive.

## Verification Flow

```mermaid
sequenceDiagram
    participant Q as Queue Worker
    participant V as AI Verifier
    participant K as Knowledge Base
    participant M as AI Model
    participant DB[(Database)]

    Q->>V: ai-verify-finding job
    V->>DB: Get finding + group details
    V->>K: Get CWE context (if cweId exists)
    K-->>V: CWE title, description, remediation
    V->>V: Build verification prompt
    Note over V,M: Prompt includes:<br/>- Finding description<br/>- Code snippet<br/>- Scanner rule<br/>- CWE context<br/>- Similar findings
    V->>M: Send prompt
    M-->>V: { verdict, confidence, explanation }
    V->>DB: INSERT ai_verification
    V->>DB: UPDATE finding_group.verdict
    Note over V,DB: If confidence < threshold,<br/>mark as pending for human review
```

## AI Model Fallback Chain

```mermaid
flowchart TD
    A["AI verification request"] --> B["Try primary model<br/>(priority: 1)"]
    B --> C{"Success?"}
    C -->|"Yes"| D["Return result"]
    C -->|"Timeout/Error"| E["Try next model<br/>(priority: 2+)"]
    E --> F{"Success?"}
    F -->|"Yes"| D
    F -->|"No more models"| G["Mark as pending<br/>(human review needed)"]

    style D fill:#22c55e,color:#fff
    style G fill:#f59e0b,color:#fff
```

## Supported Providers

| Provider | Default Base URL | Notes |
|----------|-----------------|-------|
| Ollama | `http://localhost:11434` | Local, free |
| OpenAI | `https://api.openai.com/v1` | Cloud, paid |
| Anthropic | `https://api.anthropic.com` | Cloud, paid |
| Groq | `https://api.groq.com/openai/v1` | Cloud, fast |
| Modal | Custom | Serverless GPU |
| Custom | User-defined | Any OpenAI-compatible API |

## Model Configuration

```mermaid
graph TB
    subgraph "Model Roles"
        Primary["Primary Model<br/>(priority: 1)"]
        Fallback["Fallback Model<br/>(priority: 2+)"]
    end

    subgraph "Prompt Presets"
        Strict["Strict<br/>High precision"]
        Balanced["Balanced<br/>Default"]
        Aggressive["Aggressive<br/>More catch"]
    end

    Primary -->|"Fails"| Fallback
    Fallback -->|"All fail"| Pending["Pending<br/>(human review)"]

    style Primary fill:#4a9eff,color:#fff
    style Fallback fill:#f59e0b,color:#fff
    style Pending fill:#ef4444,color:#fff
```

| Role | Purpose |
|------|---------|
| `primary` | First choice for verification |
| `fallback` | Backup when primary fails |

## Prompt Structure

```mermaid
flowchart TD
    A["Verification Prompt"] --> B["Finding Description"]
    A --> C["Code Snippet"]
    A --> D["Scanner Rule"]
    A --> E["CWE Context"]
    A --> F["Similar Findings"]
    A --> G["Output Format"]

    B --> H["AI Response"]
    C --> H
    D --> H
    E --> H
    F --> H
    G --> H

    H --> I["{ verdict, confidence, explanation }"]

    style A fill:#a855f7,color:#fff
    style H fill:#4a9eff,color:#fff
```

## Verification Results

| Verdict | Description | Action |
|---------|-------------|--------|
| `true_positive` | Confirmed security issue | Keep finding open |
| `false_positive` | Not a real issue | Mark as dismissed |
| `inconclusive` | AI uncertain | Mark as pending for review |
| `pending` | Awaiting verification | Default state |

## Knowledge Base Enrichment

The AI prompt is enriched with CWE context from the knowledge base:

```mermaid
flowchart LR
    A["Finding with CWE-89"] --> B["Query knowledge_entries<br/>WHERE cwe_id = 'CWE-89'"]
    B --> C["Include in prompt:<br/>- CWE title & description<br/>- Remediation steps<br/>- Related weaknesses"]
    C --> D["AI verifies with<br/>better context"]

    style B fill:#336791,color:#fff
    style D fill:#22c55e,color:#fff
```
