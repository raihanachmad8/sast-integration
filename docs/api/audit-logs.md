# Audit Logs API

Module: `audit-logs`
Base: `/api/v1/audit-logs`

---

## GET /audit-logs

List audit logs for workspaces the user has access to.

**Auth:** Bearer token

**Query Parameters:**
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `limit` | number | No | Max items (default: 50, max: 200) |
| `offset` | number | No | Pagination offset (default: 0) |

**Response Data:**
```json
{
  "success": true,
  "message": "Audit logs retrieved",
  "data": [
    {
      "id": "uuid",
      "workspaceId": "uuid",
      "userId": "uuid",
      "action": "member.invited",
      "resourceType": "member",
      "resourceId": "uuid",
      "data": {
        "email": "newuser@example.com",
        "role": "member"
      },
      "ipAddress": "192.168.1.1",
      "createdAt": "2026-01-01T00:00:00.000Z"
    },
    {
      "id": "uuid",
      "workspaceId": "uuid",
      "userId": "uuid",
      "action": "scan.triggered",
      "resourceType": "scan",
      "resourceId": "uuid",
      "data": {
        "repository": "backend-api",
        "branch": "main"
      },
      "ipAddress": "192.168.1.1",
      "createdAt": "2026-01-01T00:00:00.000Z"
    }
  ]
}
```

**Common Audit Actions:**
| Action | Description |
|--------|-------------|
| `member.invited` | User invited to workspace |
| `member.joined` | User accepted invitation |
| `member.removed` | User removed from workspace |
| `member.role_changed` | User role changed |
| `scan.triggered` | Scan triggered manually |
| `scan.completed` | Scan completed successfully |
| `scan.failed` | Scan failed |
| `finding.status_changed` | Finding status updated |
| `project.created` | Project created |
| `project.updated` | Project updated |
| `project.deleted` | Project deleted |
| `webhook.created` | Webhook created |
| `webhook.updated` | Webhook updated |
| `settings.updated` | Workspace settings updated |

**Status Codes:**
| Code | Description |
|------|-------------|
| 200 | Success |
| 401 | Unauthorized |
| 500 | Internal Server Error |
