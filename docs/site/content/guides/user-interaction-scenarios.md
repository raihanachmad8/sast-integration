---
title: User Interaction Scenarios
description: Common user journeys through the platform
---

# User Interaction Scenarios

## Scenario 1: First-Time Setup

```mermaid
sequenceDiagram
    actor Admin
    participant App

    Admin->>App: Sign up with email
    App->>App: Create personal workspace
    Admin->>App: Connect GitHub/GitLab
    Admin->>App: Import repository
    Admin->>App: Run first scan
    App->>App: View findings
```

## Scenario 2: Run a Scan

```mermaid
flowchart TD
    A["Go to Scans"] --> B["Click New Scan"]
    B --> C["Select Repository"]
    C --> D["Select Branch"]
    D --> E["Choose Scanners"]
    E --> F["Start Scan"]
    F --> G["Monitor Progress"]
    G --> H["View Findings"]
```

## Scenario 3: Triage Findings

```mermaid
flowchart TD
    A["Go to Findings"] --> B["Filter by severity"]
    B --> C["Open finding detail"]
    C --> D{"AI verdict?"}
    D -->|"True Positive"| E["Acknowledge + assign"]
    D -->|"False Positive"| F["Dismiss"]
    D -->|"Pending"| G["Manual review"]
    E --> H["Track to resolution"]
```

## Scenario 4: Set Up CI/CD

```mermaid
sequenceDiagram
    participant Dev
    participant SAST
    participant CI as CI/CD

    Dev->>SAST: Create Project API Token
    Dev->>CI: Configure pipeline with token
    CI->>SAST: POST /scans/upload/init
    CI->>SAST: POST /scans/upload (results)
    CI->>SAST: POST /scans/upload/complete
    SAST->>SAST: Parse + AI verify
```

## Scenario 5: Invite Team

```mermaid
sequenceDiagram
    actor Owner
    participant App

    Owner->>App: Go to Members
    Owner->>App: Invite member by email
    App->>App: Send invitation email
    App->>App: Member accepts
    Owner->>App: Assign to project
```

## Scenario 6: Generate Report

```mermaid
flowchart TD
    A["Go to Reports"] --> B["Click Generate"]
    B --> C["Select filters"]
    C --> D["Choose format (PDF/XLSX)"]
    D --> E["Generate"]
    E --> F["Download"]
```
