/**
 * Sample file with hardcoded secrets for Gitleaks testing.
 *
 * This file contains intentional secrets that should be detected by Gitleaks.
 * WARNING: These are TEST secrets only - never commit real credentials.
 */

#include <stdio.h>

/* ============================================================
 * TRUE POSITIVE: Hardcoded API Keys
 * ============================================================ */

// AWS Access Key (should be detected)
const char *AWS_KEY = "AKIA_REDACTED_EXAMPLE_KEY";

// AWS Secret Key (should be detected)
const char *AWS_SECRET = "REDACTED_AWS_SECRET_FIXTURE";

// GitHub Token (should be detected)
const char *GITHUB_TOKEN = "ghp_REDACTED_FIXTURE_TOKEN";

// GitLab Token (should be detected)
const char *GITLAB_TOKEN = "glpat-REDACTED";

/* ============================================================
 * TRUE POSITIVE: Hardcoded Passwords
 * ============================================================ */

// Database connection string with password
const char *DB_URL = "postgresql://admin:SuperSecret123!@localhost:5432/mydb";

// SMTP credentials
const char *SMTP_USER = "admin@example.com";
const char *SMTP_PASS = "email_password_123";

// API credentials
const char *API_KEY = "sk-REDACTED-FIXTURE-KEY";

/* ============================================================
 * TRUE POSITIVE: Private Keys
 * ============================================================ */

// RSA Private Key (should be detected)
const char *PRIVATE_KEY =
    "-----BEGIN REDACTED PRIVATE KEY-----\n"
    "MIIEpAIBAAKCAQEA0Z3VS5JJcds3xfn/ygWyF8PbnGy0AHB7MhgHcLiSPlqvj2\n"
    "-----END RSA PRIVATE KEY-----";

/* ============================================================
 * TRUE POSITIVE: Connection Strings
 * ============================================================ */

// MongoDB connection string
const char *MONGO_URI = "mongodb://admin:password123@mongo.example.com:27017/mydb";

// Redis connection string
const char *REDIS_URL = "redis://:mypassword@redis.example.com:6379";

/* ============================================================
 * Main
 * ============================================================ */

int main() {
    printf("This is a test file for secret detection.\n");
    printf("DO NOT commit real credentials!\n");
    return 0;
}
