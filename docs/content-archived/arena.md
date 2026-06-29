# Arena

## Overview

Arena provides A/B comparison of AI model configurations. Test different models, prompts, and settings to find the optimal verification setup.

## How It Works

1. Create a comparison run
2. Select findings to verify
3. Configure model variants
4. Run comparison
5. Review results and pick the best model

## Use Cases

| Scenario | Description |
|----------|-------------|
| Model Selection | Compare GPT-4 vs Claude vs local models |
| Prompt Tuning | Test strict vs balanced prompts |
| Cost Optimization | Find cheapest model with acceptable accuracy |

## Comparison Metrics

| Metric | Description |
|--------|-------------|
| Accuracy | % of correct verdicts |
| Precision | % of TP verdicts that are correct |
| Recall | % of actual TPs detected |
| F1 Score | Harmonic mean of precision and recall |
| Latency | Average response time |
| Cost | Per-finding verification cost |

## API Endpoints

| Method | Endpoint | Permission |
|--------|----------|-----------|
| GET | `/arena` | `ARENA_VIEW` |
| POST | `/arena` | `ARENA_MANAGE` |
| GET | `/arena/:runId` | `ARENA_VIEW` |

## Feature Flag

Arena requires `FEATURE_FLAG_ARENA=true` (disabled by default).
