# AI Models Flow

## Pre-conditions
- User has AI_MODELS permission
- Provider API key configured

## Role Context
| Action | Owner | Manager | Reviewer | Member |
|--------|-------|---------|----------|--------|
| View models | ✅ | ✅ | ✅ | ✅ |
| Add model | ✅ | ✅ | ❌ | ❌ |
| Remove model | ✅ | ✅ | ❌ | ❌ |
| Set active | ✅ | ✅ | ❌ | ❌ |
| Test model | ✅ | ✅ | ❌ | ❌ |

## User Scenarios

### 1. View Models
1. User navigates to AI Models page
2. Table shows all models with:
   - Name
   - Provider
   - Role (Primary/Fallback)
   - Status (Reachable/Unreachable)
3. Sorted by priority

### 2. Add Model
1. User clicks "Add model"
2. Selects provider (OpenAI/Anthropic/Ollama/etc)
3. Fills in: name, API key, model ID
4. Clicks "Test connection"
5. If successful, clicks "Add"
6. Model added to chain

### 3. Configure Fallback Chain
1. User sees model list with reorder buttons
2. Can move models up/down
3. Primary model runs first
4. Fallbacks tried in order on timeout

### 4. Set Active Model
1. User clicks "Set Active" on fallback model
2. Model promoted to primary
3. Previous primary demoted to fallback
4. Chain order updated

### 5. Remove Model
1. User clicks "Remove" on model
2. Confirmation dialog
3. Model removed from chain
4. Chain re-ordered

### 6. Test Model
1. User clicks "Test" on model
2. Sends test prompt
3. Shows response time and quality
4. Updates status (Reachable/Unreachable)

## Model Roles
| Role | Description |
|------|-------------|
| Primary | First model tried for verification |
| Fallback | Tried if primary times out |

## Provider Options
| Provider | Auth Type |
|----------|-----------|
| OpenAI | API Key |
| Anthropic | API Key |
| Ollama | URL only |
| Groq | API Key |
| Custom | API Key + Base URL |

## Pre-condition Checks
- Model requires valid API key
- Primary model must always exist
- Fallback chain max 5 models
