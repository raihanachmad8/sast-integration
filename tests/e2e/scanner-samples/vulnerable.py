"""
Sample Python code for E2E scanner testing.

This file contains intentional vulnerabilities for testing Semgrep Python rules.
Based on common vulnerability patterns.
"""

import os
import subprocess
import sqlite3
import pickle
from flask import Flask, request

app = Flask(__name__)

# ============================================================
# TRUE POSITIVE: SQL Injection (CWE-89)
# ============================================================

def unsafe_query(username):
    """Vulnerable: direct string interpolation in SQL."""
    conn = sqlite3.connect('users.db')
    cursor = conn.cursor()
    # TP: username not sanitized, allows SQL injection
    cursor.execute(f"SELECT * FROM users WHERE name = '{username}'")
    return cursor.fetchall()

# ============================================================
# TRUE POSITIVE: Command Injection (CWE-78)
# ============================================================

def unsafe_command(filename):
    """Vulnerable: unsanitized input in system command."""
    # TP: filename can contain "; rm -rf /"
    os.system(f"cat {filename}")

def unsafe_subprocess(user_input):
    """Vulnerable: shell=True with unsanitized input."""
    # TP: shell injection possible
    subprocess.call(user_input, shell=True)

# ============================================================
# TRUE POSITIVE: Path Traversal (CWE-22)
# ============================================================

def unsafe_file_read(user_path):
    """Vulnerable: no path sanitization."""
    # TP: user can use "../" to read any file
    with open(f"/data/{user_path}", 'r') as f:
        return f.read()

# ============================================================
# TRUE POSITIVE: Deserialization (CWE-502)
# ============================================================

def unsafe_deserialize(data):
    """Vulnerable: pickle.loads on untrusted data."""
    # TP: pickle can execute arbitrary code
    return pickle.loads(data)

# ============================================================
# TRUE POSITIVE: Hardcoded Credentials (CWE-798)
# ============================================================

DATABASE_PASSWORD = "SuperSecret123!"
API_KEY = "sk-1234567890abcdef"

def get_db_connection():
    """Vulnerable: hardcoded credentials."""
    return sqlite3.connect(
        f"postgresql://admin:{DATABASE_PASSWORD}@localhost/mydb"
    )

# ============================================================
# TRUE POSITIVE: XSS via Flask (CWE-79)
# ============================================================

@app.route('/greet')
def greet():
    """Vulnerable: user input in HTML response without escaping."""
    name = request.args.get('name', 'World')
    # TP: XSS - name not escaped
    return f"<h1>Hello, {name}!</h1>"

# ============================================================
# TRUE POSITIVE: Weak Random (CWE-330)
# ============================================================

import random

def generate_token():
    """Vulnerable: predictable random for security token."""
    # TP: random is not cryptographically secure
    return str(random.randint(100000, 999999))

# ============================================================
# TRUE POSITIVE: Insecure Temp File (CWE-377)
# ============================================================

import tempfile

def create_temp_file():
    """Vulnerable: predictable temp file name."""
    # TP: temp file with predictable name
    tmp = tempfile.mktemp()
    with open(tmp, 'w') as f:
        f.write("sensitive data")
    return tmp

# ============================================================
# Main
# ============================================================

if __name__ == '__main__':
    print("Test file for Python vulnerability scanning")
    app.run(debug=True)
