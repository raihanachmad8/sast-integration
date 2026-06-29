---
title: Audit Logs
description: Track all significant actions in the workspace
---

# Audit Logs

## Overview

Audit logs track all significant actions in the workspace for compliance and security monitoring.

## Log Types

| Log Type | Records |
|----------|---------|
| `audit_logs` | User actions (who, what, when, where) |
| `activity_logs` | System events (scan completed, finding updated) |
| `finding_history` | Finding field changes (old → new value) |

## Audit Log Fields

| Field | Description |
|-------|-------------|
| `workspace_id` | Workspace scope |
| `user_id` | Who performed the action |
| `action` | What was done |
| `resource_type` | Type of resource affected |
| `resource_id` | Specific resource |
| `data` | Additional context (JSONB) |
| `ip_address` | Client IP |
| `created_at` | When it happened |

## Activity Log Fields

| Field | Description |
|-------|-------------|
| `workspace_id` | Workspace scope |
| `user_id` | User (if applicable) |
| `type` | Event type |
| `description` | Human-readable description |
| `metadata` | Additional data (JSONB) |

## Finding History

Tracks field changes on findings:

| Field | Description |
|-------|-------------|
| `finding_id` | Finding affected |
| `field` | Field changed |
| `old_value` | Previous value |
| `new_value` | New value |
| `created_by` | Who made the change |
