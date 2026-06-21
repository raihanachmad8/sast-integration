# Reports API

Module: `reports`
Base: `/api/v1/workspaces/:workspaceId/reports`

---

## GET /reports

List reports for the workspace.

**Auth:** Bearer token
**Required Role:** Member+ (REPORT_VIEW permission)

**Query Parameters:**
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `search` | string | No | Search by title |
| `page` | number | No | Page number (default: 1) |
| `perPage` | number | No | Items per page (default: 50) |

**Response Data:**
```json
{
  "success": true,
  "message": "Reports retrieved",
  "data": [
    {
      "id": "uuid",
      "title": "Security Report Jan 2026",
      "type": "findings",
      "format": "pdf",
      "status": "completed",
      "generatedBy": "uuid",
      "createdAt": "2026-01-01T00:00:00.000Z"
    }
  ],
  "meta": {
    "page": 1,
    "perPage": 50,
    "total": 10,
    "totalPages": 1
  }
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

## POST /reports

Generate a new report.

**Auth:** Bearer token
**Required Role:** Manager+ (REPORT_EXPORT permission)

**Request Body:**
```json
{
  "type": "findings" | "verdict" | "executive" | "compliance",
  "title": "Security Report Jan 2026",
  "format": "pdf" | "xlsx" | "csv",
  "range": "last-30-days"
}
```

**Report Types:**
| Type | Description |
|------|-------------|
| `findings` | Detailed findings report |
| `verdict` | AI verification summary |
| `executive` | Executive summary with KPIs |
| `compliance` | CWE compliance mapping |

**Response Data:**
```json
{
  "success": true,
  "message": "Report generated",
  "data": {
    "id": "uuid",
    "title": "Security Report Jan 2026",
    "type": "findings",
    "format": "pdf",
    "status": "completed",
    "generatedBy": "uuid",
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

## GET /reports/:reportId

Get report detail.

**Auth:** Bearer token
**Required Role:** Member+ (REPORT_VIEW permission)

**Path Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `reportId` | uuid | Report ID |

**Response Data:**
```json
{
  "success": true,
  "message": "Report retrieved",
  "data": {
    "id": "uuid",
    "title": "Security Report Jan 2026",
    "type": "findings",
    "format": "pdf",
    "status": "completed",
    "filters": {},
    "generatedBy": "uuid",
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
| 404 | Report not found |
| 500 | Internal Server Error |

---

## GET /reports/:reportId/download

Download a generated report.

**Auth:** Bearer token
**Required Role:** Member+ (REPORT_VIEW permission)

**Path Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `reportId` | uuid | Report ID |

**Response:** Binary file download

**Content Types:**
| Format | Content-Type |
|--------|-------------|
| `pdf` | `application/pdf` |
| `xlsx` | `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` |
| `csv` | `text/csv; charset=utf-8` |

**Status Codes:**
| Code | Description |
|------|-------------|
| 200 | Success (file download) |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Report not found |
| 500 | Internal Server Error |

---

## GET /reports/:reportId/preview

Preview a report inline. PDF renders in browser, Excel returns JSON sheet data, CSV streams raw text.

**Auth:** Bearer token
**Required Role:** Member+ (REPORT_VIEW permission)

**Path Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `reportId` | uuid | Report ID |

**Response by Format:**

- **PDF:** Serves file with `Content-Disposition: inline` (renders in iframe/canvas)
- **Excel:** Returns JSON with sheet data:
  ```json
  {
    "success": true,
    "data": {
      "sheets": [
        {
          "name": "Findings",
          "rows": [[{ "value": "Header", "bold": true, "bg": "#f5f5f5" }]],
          "colCount": 8,
          "rowCount": 50
        }
      ],
      "generatedAt": "2026-06-18T00:00:00.000Z"
    }
  }
  ```
- **CSV:** Streams raw text

**Status Codes:**
| Code | Description |
|------|-------------|
| 200 | Success |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Report not found |
| 425 | Report not ready |

---

## DELETE /reports/:reportId

Delete a report.

**Auth:** Bearer token
**Required Role:** Manager+ (REPORT_EXPORT permission)

**Path Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `reportId` | uuid | Report ID |

**Response Data:** No Content (204)

**Status Codes:**
| Code | Description |
|------|-------------|
| 204 | Success |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Report not found |
| 500 | Internal Server Error |
