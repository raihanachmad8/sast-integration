---
title: Role-Based Access Control
description: 4 roles with 39 granular permissions
---

# Role-Based Access Control (RBAC)

## Overview

SAST Integration implements granular RBAC with 4 roles and 39 permissions.

## Role Hierarchy

```mermaid
graph TB
    Owner["👑 Owner<br/>Level 4<br/>39 permissions"] --> Manager["🔧 Manager<br/>Level 3<br/>39 permissions"]
    Manager --> Reviewer["🔍 Reviewer<br/>Level 2<br/>23 permissions"]
    Reviewer --> Member["👤 Member<br/>Level 1<br/>17 permissions"]

    style Owner fill:#ef4444,color:#fff
    style Manager fill:#f59e0b,color:#fff
    style Reviewer fill:#4a9eff,color:#fff
    style Member fill:#22c55e,color:#fff
```

## Permission Matrix

| Capability | Owner | Manager | Reviewer | Member |
|------------|:-----:|:-------:|:--------:|:------:|
| View dashboard | ✅ | ✅ | ✅ | ✅ |
| View findings | ✅ | ✅ | ✅ | ✅ |
| Trigger scans | ✅ | ✅ | ✅ | ❌ |
| Triage findings | ✅ | ✅ | ✅ | ❌ |
| Override AI verdict | ✅ | ✅ | ✅ | ❌ |
| Export reports | ✅ | ✅ | ✅ | ❌ |
| Manage members | ✅ | ✅ | ✅ | ❌ |
| Change member roles | ✅ | ✅ | ❌ | ❌ |
| Workspace settings | ✅ | ✅ | ❌ | ❌ |

## Permission Resources

| Resource | Permissions |
|----------|------------|
| `dashboard` | view |
| `repository` | view, manage |
| `scan` | view, run, upload |
| `finding` | view, triage, override_ai |
| `report` | view, export |
| `arena` | view, manage |
| `member` | view, invite, manage |
| `team` | view, manage |
| `project` | view, manage |
| `integration` | view, manage |
| `webhook` | view, manage |
| `schedule` | view, manage |
| `policy` | view, manage |
| `quality_gate` | view, manage |
| `scanner` | view, manage |
| `ai_model` | view, manage |
| `knowledge` | read, manage |
| `workspace` | view, settings |
| `audit` | read |

## Permission Checking

```mermaid
flowchart LR
    A["User action"] --> B["PermissionGate<br/>component"]
    B --> C{"Has permission?"}
    C -->|"Yes"| D["Render action"]
    C -->|"No"| E["Hide/disable action"]

    style D fill:#22c55e,color:#fff
    style E fill:#ef4444,color:#fff
```
