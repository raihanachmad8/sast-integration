#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>

// --- CWE-121: Stack Buffer Overflow via strcpy -------------------------------
void copy_username(char *user_input) {
    char buf[64];
    strcpy(buf, user_input);   // VULN: no bounds check
    printf("User: %s\n", buf);
}

// --- CWE-416: Use After Free -------------------------------------------------
int* allocate_data(int size) {
    int *data = malloc(size * sizeof(int));
    if (!data) return NULL;
    data[0] = 42;
    free(data);
    return data;  // VULN: use-after-free
}

// --- CWE-476: Null Pointer Dereference ---------------------------------------
int get_length(const char *s) {
    char *p = NULL;
    if (s != NULL)
        p = (char *)s;
    return strlen(p);  // VULN: p may be NULL if s==NULL
}

// --- CWE-134: Format String Vulnerability ------------------------------------
void log_message(char *msg) {
    printf(msg);  // VULN: format string
}

// --- CWE-190: Integer Overflow -----------------------------------------------
void allocate_buffer(int count) {
    int size = count * sizeof(int);  // VULN: overflow if count is large
    char *buf = malloc(size);
    if (buf) free(buf);
}

// --- CWE-78: Command Injection via system() ----------------------------------
void run_command(char *filename) {
    char cmd[256];
    sprintf(cmd, "cat %s", filename);  // VULN: command injection
    system(cmd);
}

// --- CWE-401: Memory Leak ----------------------------------------------------
char* create_token(int len) {
    char *token = malloc(len);
    if (!token) return NULL;
    memset(token, 'A', len);
    token[len-1] = '\0';
    return token;  // caller must free — but often forgotten
}

void process_request(char *input) {
    char *tok = create_token(128);
    // VULN: tok is never freed here
    copy_username(input);
}

// --- CWE-125: Out-of-Bounds Read ---------------------------------------------
int read_array(int *arr, int idx) {
    return arr[idx];  // VULN: no bounds check on idx
}

// --- CWE-131: Incorrect Calculation of Buffer Size ---------------------------
void concat_strings(char *s1, char *s2) {
    char *result = malloc(strlen(s1));  // VULN: missing +strlen(s2)+1
    strcpy(result, s1);
    strcat(result, s2);  // overflow
    free(result);
}

// --- Hardcoded secret (for gitleaks/semgrep) ---------------------------------
const char *API_KEY = "sk-prod-1234567890abcdefghijklmnopqrstuvwxyz";
const char *DB_PASS = "password=SuperSecret123!";

int main(int argc, char *argv[]) {
    if (argc < 2) return 1;

    copy_username(argv[1]);

    int *p = allocate_data(10);
    printf("val: %d\n", p[0]);   // use-after-free triggered

    log_message(argv[1]);        // format string
    run_command(argv[1]);        // command injection

    int arr[5] = {1,2,3,4,5};
    printf("%d\n", read_array(arr, 99));  // oob read

    process_request(argv[1]);

    return 0;
}
