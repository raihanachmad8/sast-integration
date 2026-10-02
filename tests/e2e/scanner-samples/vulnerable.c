/**
 * Sample C code for E2E scanner testing.
 *
 * This file contains intentional vulnerabilities for testing Flawfinder and Semgrep.
 * Based on research samples from sast-integration research project.
 *
 * CWE-120: Buffer Overflow
 * CWE-78: Command Injection
 * CWE-134: Format String
 */

#include <stdio.h>
#include <stdlib.h>
#include <string.h>

/* ============================================================
 * TRUE POSITIVE: Buffer Overflow (CWE-120)
 * ============================================================ */

void vulnerable_strcpy(char *input) {
    char buf[16];
    strcpy(buf, input);  // TP: no bounds check, input may exceed 16 bytes
    printf("Copied: %s\n", buf);
}

void vulnerable_gets() {
    char buf[64];
    printf("Enter input: ");
    gets(buf);  // TP: gets() has no length limit, deprecated
}

/* ============================================================
 * TRUE POSITIVE: Command Injection (CWE-78)
 * ============================================================ */

void run_command(char *filename) {
    char cmd[256];
    sprintf(cmd, "cat %s", filename);  // TP: filename not sanitized
    system(cmd);  // TP: attacker can inject "; rm -rf /"
}

/* ============================================================
 * TRUE POSITIVE: Format String (CWE-134)
 * ============================================================ */

void log_message(char *user_input) {
    printf(user_input);  // TP: user input as format string
}

void log_error(char *msg) {
    fprintf(stderr, msg);  // TP: same issue with fprintf
}

/* ============================================================
 * TRUE POSITIVE: Integer Overflow (CWE-190)
 * ============================================================ */

int allocate_array(int size) {
    int *arr = malloc(size * sizeof(int));  // TP: integer overflow if size is large
    if (!arr) return -1;
    free(arr);
    return 0;
}

/* ============================================================
 * TRUE POSITIVE: Null Pointer Dereference (CWE-476)
 * ============================================================ */

void process_pointer(char *ptr) {
    if (ptr == NULL) {
        printf("NULL pointer\n");
    }
    // TP: missing return after NULL check
    printf("Length: %zu\n", strlen(ptr));  // dereference after check
}

/* ============================================================
 * TRUE POSITIVE: Path Traversal (CWE-22)
 * ============================================================ */

FILE *open_file(char *user_path) {
    char full_path[256];
    sprintf(full_path, "/data/%s", user_path);  // TP: no sanitization of "../"
    return fopen(full_path, "r");
}

/* ============================================================
 * Main - entry point for testing
 * ============================================================ */

int main(int argc, char *argv[]) {
    if (argc > 1) {
        vulnerable_strcpy(argv[1]);
        run_command(argv[1]);
        log_message(argv[1]);
    }

    vulnerable_gets();
    allocate_array(1000);
    process_pointer(NULL);

    FILE *f = open_file("test.txt");
    if (f) fclose(f);

    return 0;
}
