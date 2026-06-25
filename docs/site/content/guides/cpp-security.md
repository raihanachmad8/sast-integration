# C/C++ Security Guide

## Overview

C/C++ code requires special attention due to memory safety issues. This guide covers common vulnerabilities and how the scanner engines detect them.

## Common Vulnerabilities

### Buffer Overflows

| Scanner | Detection |
|---------|-----------|
| Flawfinder | strcpy, strncpy, sprintf, gets |
| Cppcheck | Array bounds checking |
| Clang-Tidy | `cert-*`, `security-*` checks |
| GCC Fanalyzer | Static analysis with `-fanalyzer` |

### Memory Leaks

| Scanner | Detection |
|---------|-----------|
| Cppcheck | Resource leak detection |
| Clang-Tidy | `clang-analyzer-cplusplus.NewDeleteLeaks` |
| GCC Fanalyzer | Heap allocation tracking |

### Format String Vulnerabilities

| Scanner | Detection |
|---------|-----------|
| Flawfinder | printf, fprintf with user input |
| Clang-Tidy | `security-formatString` |

## Recommended Scanner Configuration

For comprehensive C/C++ analysis:

```bash
# All C/C++ scanners
scanners: ['semgrep', 'flawfinder', 'cppcheck', 'clang-tidy', 'gcc-fanalyzer']
```

### Semgrep Rules for C

The platform includes 100+ C-specific rules:

| Rule | CWE | Description |
|------|-----|-------------|
| `insecure-use-string-copy-fn` | CWE-676 | strcpy/strncpy usage |
| `insecure-use-gets-fn` | CWE-120 | gets() usage |
| `buffer-overrun` | CWE-120 | Buffer overflow patterns |
| `use-of-uninitialized-variable` | CWE-457 | Uninitialized variables |

## Clang-Tidy Checks

Enabled checks for security:

| Check | Category | Severity |
|-------|----------|----------|
| `cert-err33-c` | CERT | High |
| `security-*` | Security | High |
| `clang-analyzer-*` | Analyzer | Medium |
| `bugprone-*` | Bugprone | Medium |

## Cppcheck Configuration

```bash
cppcheck --enable=warning,style,performance,portability,information \
         --force --quiet --xml --xml-version=2
```

## GCC Fanalyzer

```bash
gcc -fanalyzer -Wall source.c -c
```

CWE mapping for GCC fanalyzer:

| CWE | Severity |
|-----|----------|
| CWE-416 (Use After Free) | High |
| CWE-476 (NULL Pointer) | High |
| CWE-78 (Command Injection) | High |
| CWE-120 (Buffer Overflow) | High |
| CWE-125 (Out of Bounds Read) | High |
| CWE-401 (Memory Leak) | Medium |
| CWE-690 (NULL Deref) | Medium |
| CWE-190 (Integer Overflow) | Medium |
