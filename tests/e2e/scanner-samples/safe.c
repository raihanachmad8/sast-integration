/**
 * Sample C code for E2E scanner testing - FALSE POSITIVES.
 *
 * This file contains SAFE code patterns that should NOT be flagged as vulnerabilities.
 * Used to verify scanners don't produce false positives on safe code.
 *
 * Based on research samples from sast-integration research project.
 */

#include <stdio.h>
#include <stdlib.h>
#include <string.h>

/* ============================================================
 * SAFE: Bounded String Copy (CWE-120 safe variant)
 * ============================================================ */

void safe_copy(const char *input) {
    char buf[64];
    strncpy(buf, input, sizeof(buf) - 1);  // FP: bounded copy
    buf[sizeof(buf) - 1] = '\0';           // null-terminated
    printf("%s\n", buf);                    // FP: literal format string
}

/* ============================================================
 * SAFE: Format String (CWE-134 safe variant)
 * ============================================================ */

void safe_format() {
    const char *name = "world";
    printf("Hello, %s!\n", name);  // FP: format string is a literal
    fprintf(stdout, "Count: %d\n", 42);  // FP: literal format
}

/* ============================================================
 * SAFE: Memory Management (CWE-416 safe variant)
 * ============================================================ */

void safe_malloc_free() {
    char *buf = malloc(64);
    if (buf) {
        memset(buf, 0, 64);
        strcpy(buf, "safe data");
        printf("Data: %s\n", buf);
        free(buf);  // FP: freed and not used after
    }
}

/* ============================================================
 * SAFE: Safe System Call (CWE-78 safe variant)
 * ============================================================ */

void safe_system_call() {
    const char *cmd = "ls -la";  // FP: hardcoded command, no user input
    int result = system(cmd);
    if (result == -1) {
        perror("system() failed");
    }
}

/* ============================================================
 * SAFE: Safe File Operations (CWE-22 safe variant)
 * ============================================================ */

FILE *safe_open_file() {
    const char *filename = "config.txt";  // FP: hardcoded path
    return fopen(filename, "r");
}

/* ============================================================
 * SAFE: Null Check with Return (CWE-476 safe variant)
 * ============================================================ */

size_t safe_strlen(const char *ptr) {
    if (ptr == NULL) {
        return 0;  // FP: proper NULL check with return
    }
    return strlen(ptr);
}

/* ============================================================
 * SAFE: Integer Overflow Prevention (CWE-190 safe variant)
 * ============================================================ */

int safe_allocate(int size) {
    if (size <= 0 || size > 10000) {
        return -1;  // FP: bounds checking
    }
    int *arr = malloc(size * sizeof(int));
    if (!arr) return -1;
    free(arr);
    return 0;
}

/* ============================================================
 * Main - entry point for testing
 * ============================================================ */

int main() {
    safe_copy("test input");
    safe_format();
    safe_malloc_free();
    safe_system_call();

    FILE *f = safe_open_file();
    if (f) fclose(f);

    printf("Safe length: %zu\n", safe_strlen("hello"));
    safe_allocate(100);

    return 0;
}
