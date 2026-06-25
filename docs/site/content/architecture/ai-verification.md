# AI Verification

## Overview

The AI verification pipeline uses LLM to reduce false positives in security findings. Each finding is analyzed with CWE context and classified as true positive or false positive.

## Pipeline Flow

```
Finding → Build CWE Context → Construct Prompt → Call LLM → Parse Response → Store Verification
```

## CWE Context Enrichment

Knowledge base entries provide context to the LLM:

```typescript
const cweContext = await this.buildCweContext(finding.cweId);
// Returns: "CWE Knowledge (CWE-787 - Out-of-bounds Write): Description: ... Severity: ... Remediation: ..."
```

## Prompt Templates

Two prompt variants (same JSON response format):

| Variant | Description |
|---------|-------------|
| **strict** | Detailed explanation, data flow analysis |
| **balanced** | Brief explanation only |

### System Rules

Both prompts enforce strict rules:

1. Default assumption: scanner is CORRECT (true_positive)
2. Only classify as false_positive with PROOF of safety
3. If unsure → true_positive

## Response Format

```typescript
interface AiModelResponse {
  verdict: 'true_positive' | 'false_positive';
  confidence: number;        // 0-1
  explanation: string;
  dataFlow?: string;         // source → sink path
  taintSource?: string;      // untrusted input origin
  matchDetail?: string;      // what scanner found
  likelyCwe?: string[];      // CWE predictions
  fixSuggestion?: string;
  rawResponse?: string;      // for debugging
}
```

## AI Model Management

### Model Configuration

Each workspace can configure:

| Setting | Description |
|---------|-------------|
| Provider | LLM provider (OpenAI, Anthropic, etc.) |
| Model | Model identifier |
| API Key | Provider API key |
| Prompt Variant | strict or balanced |
| Temperature | Model temperature |

### Model Presets

Pre-configured model setups:

| Preset | Model | Use Case |
|--------|-------|----------|
| Balanced | GPT-4 | General purpose |
| Strict | Claude | Detailed analysis |
| Fast | GPT-3.5 | Quick verification |

## Database Schema

### `ai_verifications`

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| finding_id | UUID | FK to findings |
| model_id | UUID | FK to models |
| verdict | VARCHAR | true_positive / false_positive / pending |
| confidence | NUMERIC | 0.00–1.00 |
| explanation | TEXT | AI explanation |
| data_flow | TEXT | Source-to-sink data flow |
| taint_source | TEXT | Taint source identification |
| likely_cwe | JSONB | Array of CWE identifiers |
| fix_suggestion | TEXT | Remediation suggestion |
| latency_ms | INTEGER | AI inference time |
| raw_response | TEXT | Full LLM output |

## Quality Metrics

| Metric | Target |
|--------|--------|
| False Positive Reduction | 70%+ |
| Verification Coverage | 100% of findings |
| Average Latency | < 5 seconds |
| Confidence Threshold | 0.7+ |
