# AI Models API

Module: `ai-models`
Base: `/api/v1/workspaces/:workspaceId/model`

---

## GET /model

List AI models in the workspace.

**Auth:** Bearer token
**Required Role:** Member+ (AI_MODEL_MANAGE permission)

**Response Data:**
```json
{
  "success": true,
  "message": "AI models retrieved",
  "data": [
    {
      "id": "uuid",
      "name": "Qwen2.5-Coder",
      "provider": "ollama",
      "baseUrl": "http://localhost:11434",
      "role": "primary",
      "priority": 1,
      "promptPreset": "strict",
      "status": "reachable",
      "lastTestedAt": "2026-01-01T00:00:00.000Z",
      "createdAt": "2026-01-01T00:00:00.000Z"
    }
  ]
}
```

**Status Codes:**
| Code | Description |
|------|-------------|
| 200 | Success |
| 401 | Unauthorized |
| 403 | Forbidden |
| 500 | Internal Server Error |

---

## POST /model

Create a new AI model.

**Auth:** Bearer token
**Required Role:** Manager+ (AI_MODEL_MANAGE permission)

**Request Body:**
```json
{
  "name": "Qwen2.5-Coder",
  "provider": "ollama",
  "baseUrl": "http://localhost:11434",
  "apiKey": "optional-api-key",
  "role": "primary",
  "priority": 1,
  "promptPreset": "strict"
}
```

**Providers:** `ollama`, `openai`, `anthropic`, `google`, `groq`, `deepseek`, `together`, `openrouter`
**Roles:** `primary`, `fallback`
**Prompt Presets:** `strict`, `balanced`, `custom`

**Response Data:**
```json
{
  "success": true,
  "message": "AI model created",
  "data": {
    "id": "uuid",
    "name": "Qwen2.5-Coder",
    "provider": "ollama",
    "baseUrl": "http://localhost:11434",
    "role": "primary",
    "priority": 1,
    "promptPreset": "strict",
    "status": "pending",
    "createdAt": "2026-01-01T00:00:00.000Z"
  }
}
```

**Status Codes:**
| Code | Description |
|------|-------------|
| 201 | Success |
| 401 | Unauthorized |
| 403 | Forbidden |
| 422 | Validation error |
| 500 | Internal Server Error |

---

## GET /model/:modelId

Get an AI model.

**Auth:** Bearer token
**Required Role:** Member+ (AI_MODEL_MANAGE permission)

**Path Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `modelId` | uuid | Model ID |

**Response Data:**
```json
{
  "success": true,
  "message": "AI model retrieved",
  "data": {
    "id": "uuid",
    "name": "Qwen2.5-Coder",
    "provider": "ollama",
    "baseUrl": "http://localhost:11434",
    "role": "primary",
    "priority": 1,
    "promptPreset": "strict",
    "status": "reachable",
    "lastTestedAt": "2026-01-01T00:00:00.000Z",
    "createdAt": "2026-01-01T00:00:00.000Z",
    "updatedAt": "2026-01-01T00:00:00.000Z"
  }
}
```

**Status Codes:**
| Code | Description |
|------|-------------|
| 200 | Success |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Model not found |
| 500 | Internal Server Error |

---

## PUT /model/:modelId

Update an AI model.

**Auth:** Bearer token
**Required Role:** Manager+ (AI_MODEL_MANAGE permission)

**Path Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `modelId` | uuid | Model ID |

**Request Body:**
```json
{
  "name": "Updated Model",
  "baseUrl": "http://new-url:11434",
  "apiKey": "new-api-key",
  "role": "fallback",
  "priority": 2,
  "promptPreset": "balanced"
}
```

**Response Data:**
```json
{
  "success": true,
  "message": "AI model updated",
  "data": {
    "id": "uuid",
    "name": "Updated Model",
    "baseUrl": "http://new-url:11434",
    "role": "fallback",
    "priority": 2,
    "promptPreset": "balanced",
    "updatedAt": "2026-01-01T00:00:00.000Z"
  }
}
```

**Status Codes:**
| Code | Description |
|------|-------------|
| 200 | Success |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Model not found |
| 422 | Validation error |
| 500 | Internal Server Error |

---

## DELETE /model/:modelId

Delete an AI model.

**Auth:** Bearer token
**Required Role:** Manager+ (AI_MODEL_MANAGE permission)

**Path Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `modelId` | uuid | Model ID |

**Response Data:** No Content (204)

**Status Codes:**
| Code | Description |
|------|-------------|
| 204 | Success |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Model not found |
| 500 | Internal Server Error |

---

## POST /model/:modelId/test

Test connectivity to an AI model.

**Auth:** Bearer token
**Required Role:** Manager+ (AI_MODEL_MANAGE permission)

**Path Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `modelId` | uuid | Model ID |

**Response Data:**
```json
{
  "success": true,
  "message": "Model is reachable",
  "data": {
    "status": "reachable"
  }
}
```

**Status Codes:**
| Code | Description |
|------|-------------|
| 200 | Success |
| 400 | Invalid model URL or SSRF blocked |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Model not found |
| 500 | Internal Server Error |
