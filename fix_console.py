#!/usr/bin/env python3
"""Simple, safe ESLint fixer - only adds eslint-disable-next-line for no-console."""
import re
from pathlib import Path

PROJECT = Path(r"D:\developer\2025\Backend\research\workspace\projects\active\sast-integration")

# Files with no-console warnings (from ESLint output)
CONSOLE_FILES = [
    "src/app/api/v1/workspaces/[id]/members/[userId]/route.ts",
    "src/app/api/v1/workspaces/[id]/members/route.ts",
    "src/app/api/v1/workspaces/[id]/projects/[projectId]/api-tokens/route.ts",
    "src/app/api/v1/workspaces/[id]/projects/[projectId]/route.ts",
    "src/app/api/v1/workspaces/[id]/projects/route.ts",
    "src/app/api/v1/workspaces/[id]/teams/[teamId]/route.ts",
    "src/app/api/v1/workspaces/[id]/teams/route.ts",
    "src/app/api/v1/workspaces/[id]/webhooks/[webhookId]/route.ts",
    "src/app/api/v1/workspaces/[id]/webhooks/route.ts",
    "src/modules/scan/api.ts",
    "src/server/modules/mail/mail.service.ts",
    "src/server/modules/project/repositories/project.repository.ts",
    "src/server/modules/project/services/project.service.ts",
    "src/server/modules/queue/jobs/ai-verify-finding.job.ts",
    "src/server/modules/queue/jobs/parse-scan-result.job.ts",
    "src/server/modules/scan/services/managed-scan.service.ts",
    "src/server/modules/teams/repositories/team.repository.ts",
    "src/server/modules/teams/services/team.service.ts",
    "src/server/modules/webhooks/webhook.service.ts",
]

fixed = 0
for rel_path in CONSOLE_FILES:
    filepath = PROJECT / rel_path
    if not filepath.exists():
        print(f"SKIP (not found): {rel_path}")
        continue
    
    content = filepath.read_text(encoding="utf-8")
    lines = content.split('\n')
    new_lines = []
    changed = False
    
    for i, line in enumerate(lines):
        stripped = line.strip()
        # Check if this line has a console.info/debug/log/warn/error/debug statement
        if re.search(r'\bconsole\.(log|info|debug|warn|error|trace)\b', stripped):
            # Check if previous line already has the disable comment
            if i > 0 and 'eslint-disable-next-line no-console' in lines[i-1]:
                new_lines.append(line)
                continue
            
            # Check if this line itself has a /* eslint-disable */ inline
            if 'eslint-disable' in line:
                new_lines.append(line)
                continue
            
            # Add the disable comment
            indent = line[:len(line) - len(line.lstrip())]
            new_lines.append(f"{indent}// eslint-disable-next-line no-console")
            new_lines.append(line)
            changed = True
        else:
            new_lines.append(line)
    
    if changed:
        filepath.write_text('\n'.join(new_lines), encoding="utf-8")
        fixed += 1
        print(f"Fixed: {rel_path}")
    else:
        print(f"No changes needed: {rel_path}")

print(f"\nTotal files fixed: {fixed}")
