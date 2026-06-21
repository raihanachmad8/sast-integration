$ciToken = "sast_p_DtKSQdUQas_wF7rKGF5DnDf6YZMelYgEntqzxIs0m90"
$tempDir = "C:\Users\Rezork\AppData\Local\Temp\opencode\ci-scan2"
$utf8NoBOM = New-Object System.Text.UTF8Encoding $false

if (Test-Path $tempDir) { Remove-Item $tempDir -Recurse -Force }
New-Item -ItemType Directory -Path $tempDir -Force | Out-Null

# Clone
Write-Host "Cloning..."
& git clone --depth 1 http://localhost:4000/MeAdmin/vuln-app.git "$tempDir\repo" 2>&1 | Out-Null

# CI Init
Write-Host "CI Init..."
$initBody = @{ repoName = "MeAdmin/vuln-app"; repoUrl = "http://localhost:4000/MeAdmin/vuln-app.git"; branch = "main"; commit = "test-$(Get-Date -Format 'yyyyMMddHHmmss')" } | ConvertTo-Json
[System.IO.File]::WriteAllText("$tempDir\init.json", $initBody)
$initResult = & curl.exe -s -X POST "http://localhost:3000/api/v1/ci/init" -H "Authorization: Bearer $ciToken" -H "Content-Type: application/json" --data-binary "@$tempDir\init.json" | ConvertFrom-Json
$ciScanId = $initResult.data.scanId
Write-Host "  scanId: $ciScanId"

# flawfinder
Write-Host "Running flawfinder..."
& flawfinder --sarif --columns "$tempDir\repo" 2>$null | Out-File "$tempDir\ff_raw.sarif" -Encoding utf8
$ffContent = Get-Content "$tempDir\ff_raw.sarif" -Raw
[System.IO.File]::WriteAllText("$tempDir\ff.sarif", $ffContent, $utf8NoBOM)
$ffSarif = $ffContent | ConvertFrom-Json
$ff = & curl.exe -s -X POST "http://localhost:3000/api/v1/ci/upload" -H "Authorization: Bearer $ciToken" -F "scanId=$ciScanId" -F "tool=flawfinder" -F "sarif=@$tempDir\ff.sarif" -F "repoName=MeAdmin/vuln-app" -F "findingsCount=$($ffSarif.runs[0].results.Count)" | ConvertFrom-Json
Write-Host "  flawfinder: $($ff.data.findingsCount)"

# clang-tidy
Write-Host "Running clang-tidy..."
$files = Get-ChildItem "$tempDir\repo" -Filter "*.c" | ForEach-Object { $_.FullName }
$ctRaw = & clang-tidy --checks='-*,clang-analyzer-*,cert-*,bugprone-*,security-*' --warnings-as-errors=-* $files 2>&1 | ForEach-Object { $_.ToString() }
$pattern = '^(?<file>.+):(?<line>\d+):(?<col>\d+):\s+(?<sev>warning|error):\s+(?<msg>.+?)\s+\[(?<rule>[^\]]+)\]$'
$ctResults = @()
foreach ($line in $ctRaw) { if ($line.Trim() -match $pattern) { $ctResults += @{ ruleId = $matches.rule; level = "warning"; message = @{ text = $matches.msg }; locations = @(@{ physicalLocation = @{ artifactLocation = @{ uri = $matches.file }; region = @{ startLine = [int]$matches.line; startColumn = [int]$matches.col } } }) } } }
$ctSarif = @{ version = "2.1.0"; runs = @(@{ tool = @{ driver = @{ name = "clang-tidy" } }; results = $ctResults }) }
[System.IO.File]::WriteAllText("$tempDir\ct.sarif", ($ctSarif | ConvertTo-Json -Depth 5), $utf8NoBOM)
$ct = & curl.exe -s -X POST "http://localhost:3000/api/v1/ci/upload" -H "Authorization: Bearer $ciToken" -F "scanId=$ciScanId" -F "tool=clang-tidy" -F "sarif=@$tempDir\ct.sarif" -F "repoName=MeAdmin/vuln-app" -F "findingsCount=$($ctResults.Count)" | ConvertFrom-Json
Write-Host "  clang-tidy: $($ct.data.findingsCount)"

# gcc-fanalyzer
Write-Host "Running gcc-fanalyzer..."
$gccRaw = & gcc -fanalyzer -Wall $files -c 2>&1 | ForEach-Object { $_.ToString() }
$gccResults = @()
foreach ($line in $gccRaw) { if ($line -match '^(?<file>.+):(?<line>\d+):(?<col>\d+):\s+warning:\s+(?<msg>.+)\s+\[(-W(?<rule>[^\]]+))\]$') { $gccResults += @{ ruleId = $matches.rule; level = "warning"; message = @{ text = $matches.msg }; locations = @(@{ physicalLocation = @{ artifactLocation = @{ uri = $matches.file }; region = @{ startLine = [int]$matches.line; startColumn = [int]$matches.col } } }) } } }
$gccSarif = @{ version = "2.1.0"; runs = @(@{ tool = @{ driver = @{ name = "gcc-fanalyzer" } }; results = $gccResults }) }
[System.IO.File]::WriteAllText("$tempDir\gcc.sarif", ($gccSarif | ConvertTo-Json -Depth 5), $utf8NoBOM)
$gcc = & curl.exe -s -X POST "http://localhost:3000/api/v1/ci/upload" -H "Authorization: Bearer $ciToken" -F "scanId=$ciScanId" -F "tool=gcc-fanalyzer" -F "sarif=@$tempDir\gcc.sarif" -F "repoName=MeAdmin/vuln-app" -F "findingsCount=$($gccResults.Count)" | ConvertFrom-Json
Write-Host "  gcc-fanalyzer: $($gcc.data.findingsCount)"

# semgrep
Write-Host "Running semgrep..."
& semgrep scan --json --metrics=off --disable-version-check --no-git-ignore --skip-unknown-extensions --config p/default --config p/security-audit "$tempDir\repo" 2>$null | Out-File "$tempDir\sg_raw.sarif" -Encoding utf8
$sgContent = Get-Content "$tempDir\sg_raw.sarif" -Raw
[System.IO.File]::WriteAllText("$tempDir\sg.sarif", $sgContent, $utf8NoBOM)
$sgSarif = $sgContent | ConvertFrom-Json
$sg = & curl.exe -s -X POST "http://localhost:3000/api/v1/ci/upload" -H "Authorization: Bearer $ciToken" -F "scanId=$ciScanId" -F "tool=semgrep" -F "sarif=@$tempDir\sg.sarif" -F "repoName=MeAdmin/vuln-app" -F "findingsCount=$($sgSarif.results.Count)" | ConvertFrom-Json
Write-Host "  semgrep: $($sg.data.findingsCount)"

# gitleaks
Write-Host "Running gitleaks..."
& gitleaks detect --source "$tempDir\repo" --report-format json --report-path "$tempDir\gl.json" --no-git 2>$null
$glJson = Get-Content "$tempDir\gl.json" -Raw | ConvertFrom-Json
$glResults = @()
foreach ($f in $glJson) {
    $matchText = ""
    if ($f.Match) { $matchText = $f.Match.Substring(0, [Math]::Min(200, $f.Match.Length)) }
    $glResults += @{ ruleId = $f.RuleID; level = "error"; message = @{ text = $f.Description }; locations = @(@{ physicalLocation = @{ artifactLocation = @{ uri = $f.File }; region = @{ startLine = $f.StartLine; snippet = @{ text = $matchText } } } }) }
}
$glSarif = @{ version = "2.1.0"; runs = @(@{ tool = @{ driver = @{ name = "gitleaks" } }; results = $glResults }) }
[System.IO.File]::WriteAllText("$tempDir\gl.sarif", ($glSarif | ConvertTo-Json -Depth 5), $utf8NoBOM)
$gl = & curl.exe -s -X POST "http://localhost:3000/api/v1/ci/upload" -H "Authorization: Bearer $ciToken" -F "scanId=$ciScanId" -F "tool=gitleaks" -F "sarif=@$tempDir\gl.sarif" -F "repoName=MeAdmin/vuln-app" -F "findingsCount=$($glResults.Count)" | ConvertFrom-Json
Write-Host "  gitleaks: $($gl.data.findingsCount)"

# cppcheck
Write-Host "Running cppcheck..."
& cppcheck --enable=warning,style,performance,portability,information --force --quiet --xml --xml-version=2 "$tempDir\repo" 2>"$tempDir\cpp.xml"
$cppXml = [xml](Get-Content "$tempDir\cpp.xml" -Raw)
$cppResults = @()
foreach ($err in $cppXml.results.errors.error) {
    if ($err.id -notin @('missingIncludeSystem', 'checkersReport', 'unmatchedSuppression')) {
        $loc = $err.location[0]
        if ($loc) { $cppResults += @{ ruleId = $err.id; level = "warning"; message = @{ text = $err.verbose }; locations = @(@{ physicalLocation = @{ artifactLocation = @{ uri = $loc.file }; region = @{ startLine = [int]$loc.line } } }) } }
    }
}
$cppSarif = @{ version = "2.1.0"; runs = @(@{ tool = @{ driver = @{ name = "cppcheck" } }; results = $cppResults }) }
[System.IO.File]::WriteAllText("$tempDir\cpp.sarif", ($cppSarif | ConvertTo-Json -Depth 5), $utf8NoBOM)
$cpp = & curl.exe -s -X POST "http://localhost:3000/api/v1/ci/upload" -H "Authorization: Bearer $ciToken" -F "scanId=$ciScanId" -F "tool=cppcheck" -F "sarif=@$tempDir\cpp.sarif" -F "repoName=MeAdmin/vuln-app" -F "findingsCount=$($cppResults.Count)" | ConvertFrom-Json
Write-Host "  cppcheck: $($cpp.data.findingsCount)"

# Complete
Write-Host "`nCompleting..."
$completeBody = @{ scanId = $ciScanId; status = "completed"; tools = @("semgrep","cppcheck","flawfinder","gitleaks","clang-tidy","gcc-fanalyzer"); platform = "local"; trigger = "ci" } | ConvertTo-Json
[System.IO.File]::WriteAllText("$tempDir\complete.json", $completeBody)
$complete = & curl.exe -s -X POST "http://localhost:3000/api/v1/ci/complete" -H "Authorization: Bearer $ciToken" -H "Content-Type: application/json" --data-binary "@$tempDir\complete.json" | ConvertFrom-Json
Write-Host "  Gate: $($complete.data.qualityGate.status)"
Write-Host "`nCI scanId: $ciScanId"
