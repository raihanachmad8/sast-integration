/**
 * CI/CD Scan Upload — Node.js Example
 * 
 * This script demonstrates how to upload scan results to the SAST Integration API
 * using Node.js. It runs multiple scanners and uploads their SARIF output.
 * 
 * Usage:
 *   SAST_API_URL=https://sast.example.com/api/v1 \
 *   SAST_WORKSPACE_ID=ws_xxx \
 *   SAST_PROJECT_ID=repo_xxx \
 *   SAST_AUTH_TOKEN=your-token \
 *   node upload-scan.js
 */

import { execSync } from 'node:child_process';
import { readFileSync, existsSync, unlinkSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

// ─── Configuration ──────────────────────────────────────────────────────────

const config = {
  apiUrl: process.env.SAST_API_URL || 'http://localhost:3000/api/v1',
  workspaceId: process.env.SAST_WORKSPACE_ID,
  projectId: process.env.SAST_PROJECT_ID,
  repositoryUrl: process.env.REPOSITORY_URL || '',
  repositoryName: process.env.REPOSITORY_NAME || '',
  branch: process.env.BRANCH || 'main',
  commit: process.env.COMMIT_SHA || '',
  authToken: process.env.SAST_AUTH_TOKEN,
  source: process.env.SCAN_SOURCE || 'nodejs_ci',
};

// Validate required config
for (const [key, value] of Object.entries(config)) {
  if (['apiUrl', 'workspaceId', 'projectId', 'authToken'].includes(key) && !value) {
    console.error(`Error: ${key} is required`);
    process.exit(1);
  }
}

// ─── Scanner Runners ────────────────────────────────────────────────────────

const scanners = [
  {
    name: 'Semgrep',
    command: 'semgrep scan --config p/default --sarif --output {output} --quiet .',
    outputFile: 'semgrep.sarif',
  },
  {
    name: 'Gitleaks',
    command: 'gitleaks detect --source . --report-format sarif --report-path {output}',
    outputFile: 'gitleaks.sarif',
  },
  {
    name: 'Trivy',
    command: 'trivy fs --format sarif --output {output} --quiet .',
    outputFile: 'trivy.sarif',
  },
];

// ─── Main ───────────────────────────────────────────────────────────────────

async function runScanner(scanner, outputDir) {
  const outputFile = join(outputDir, scanner.outputFile);
  const command = scanner.command.replace('{output}', outputFile);

  console.log(`  ├─ Running ${scanner.name}...`);
  
  try {
    execSync(command, { 
      stdio: 'pipe',
      timeout: 300_000, // 5 minutes
    });
    console.log(`  │  └─ ✓ ${scanner.name} completed`);
    return outputFile;
  } catch (error) {
    console.log(`  │  └─ ⚠ ${scanner.name} failed (non-zero exit, results may still be valid)`);
    // Some scanners return non-zero when findings are found
    if (existsSync(outputFile)) {
      return outputFile;
    }
    return null;
  }
}

async function uploadResults(files) {
  const formData = new FormData();
  
  // Add metadata
  formData.append('projectId', config.projectId);
  formData.append('repositoryUrl', config.repositoryUrl);
  formData.append('repositoryName', config.repositoryName);
  formData.append('branch', config.branch);
  formData.append('commit', config.commit);
  formData.append('source', config.source);
  
  // Add files
  for (const file of files) {
    const content = readFileSync(file);
    const filename = file.split('/').pop() || file.split('\\').pop();
    formData.append('file', new Blob([content]), filename);
  }

  const url = `${config.apiUrl}/workspaces/${config.workspaceId}/scans/upload`;
  
  console.log(`  └─ Uploading ${files.length} file(s) to ${url}...`);
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${config.authToken}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Upload failed: ${response.status} ${error}`);
  }

  return response.json();
}

async function main() {
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║              SAST CI/CD Scan Upload (Node.js)                ║');
  console.log('╚════════════════════════════════════════════════════════════════╝');
  console.log('');

  // Create temp directory
  const outputDir = join(tmpdir(), `sast-scan-${Date.now()}`);
  mkdirSync(outputDir, { recursive: true });

  try {
    // Step 1: Run scanners
    console.log('▶ Step 1: Running scanners...');
    console.log('');
    
    const resultFiles = [];
    for (const scanner of scanners) {
      const result = await runScanner(scanner, outputDir);
      if (result) {
        resultFiles.push(result);
      }
    }

    if (resultFiles.length === 0) {
      console.log('');
      console.log('⚠ No scan results generated. Ensure scanners are installed.');
      process.exit(1);
    }

    console.log('');
    console.log(`  ✓ Generated ${resultFiles.length} result file(s)`);
    console.log('');

    // Step 2: Upload results
    console.log('▶ Step 2: Uploading results...');
    console.log('');
    
    const response = await uploadResults(resultFiles);
    
    console.log('');
    console.log('╔════════════════════════════════════════════════════════════════╗');
    console.log('║                      ✓ Upload Successful                     ║');
    console.log('╠════════════════════════════════════════════════════════════════╣');
    console.log(`║  Scan ID:     ${response.data.scanId}`);
    console.log(`║  Findings:    ${response.data.findingsCount}`);
    console.log('╚════════════════════════════════════════════════════════════════╝');

  } finally {
    // Cleanup
    console.log('');
    console.log('▶ Cleaning up...');
    const files = ['semgrep.sarif', 'gitleaks.sarif', 'trivy.sarif'];
    for (const file of files) {
      const filePath = join(outputDir, file);
      if (existsSync(filePath)) {
        unlinkSync(filePath);
      }
    }
    console.log('  └─ ✓ Done');
  }
}

main().catch((error) => {
  console.error('');
  console.error('╔════════════════════════════════════════════════════════════════╗');
  console.error('║                      ✗ Upload Failed                         ║');
  console.error('╠════════════════════════════════════════════════════════════════╣');
  console.error(`║  Error: ${error.message}`);
  console.error('╚════════════════════════════════════════════════════════════════╝');
  process.exit(1);
});
