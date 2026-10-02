"""
Sample Python code for E2E scanner testing - FALSE POSITIVES.

This file contains SAFE code patterns that should NOT be flagged as vulnerabilities.
Used to verify scanners don't produce false positives on safe code.
"""

import os
import subprocess
import sqlite3
from flask import Flask, request, escape

app = Flask(__name__)

# ============================================================
# SAFE: Parameterized Query (CWE-89 safe variant)
# ============================================================

def safe_query(username):
    """Safe: parameterized query prevents SQL injection."""
    conn = sqlite3.connect('users.db')
    cursor = conn.cursor()
    # SAFE: parameterized query
    cursor.execute("SELECT * FROM users WHERE name = ?", (username,))
    return cursor.fetchall()

# ============================================================
# SAFE: Subprocess with List (CWE-78 safe variant)
# ============================================================

def safe_command(filename):
    """Safe: subprocess with list argument, no shell=True."""
    # SAFE: list argument, no shell injection
    subprocess.call(["cat", filename])

def safe_subprocess_safe(user_input):
    """Safe: shell=False with list."""
    # SAFE: no shell=True
    subprocess.call([user_input], shell=False)

# ============================================================
# SAFE: Path Sanitization (CWE-22 safe variant)
# ============================================================

import os.path

def safe_file_read(user_path):
    """Safe: path sanitization prevents traversal."""
    # SAFE: os.path.join + basename prevents "../"
    safe_path = os.path.join("/data", os.path.basename(user_path))
    with open(safe_path, 'r') as f:
        return f.read()

# ============================================================
# SAFE: JSON Deserialization (CWE-502 safe variant)
# ============================================================

import json

def safe_deserialize(data):
    """Safe: JSON is safe deserialization format."""
    # SAFE: json.loads is safe
    return json.loads(data)

# ============================================================
# SAFE: Environment Variables (CWE-798 safe variant)
# ============================================================

def get_db_connection():
    """Safe: credentials from environment variables."""
    # SAFE: no hardcoded credentials
    password = os.environ.get('DB_PASSWORD')
    return sqlite3.connect(
        f"postgresql://admin:{password}@localhost/mydb"
    )

# ============================================================
# SAFE: Escaped HTML (CWE-79 safe variant)
# ============================================================

@app.route('/greet')
def greet():
    """Safe: user input escaped before HTML output."""
    name = request.args.get('name', 'World')
    # SAFE: escape() prevents XSS
    return f"<h1>Hello, {escape(name)}!</h1>"

# ============================================================
# SAFE: Cryptographic Random (CWE-330 safe variant)
# ============================================================

import secrets

def generate_token():
    """Safe: cryptographically secure random."""
    # SAFE: secrets module is cryptographically secure
    return secrets.token_hex(32)

# ============================================================
# SAFE: Secure Temp File (CWE-377 safe variant)
# ============================================================

import tempfile

def create_temp_file():
    """Safe: secure temp file with unique name."""
    # SAFE: mkstemp creates file with unique name securely
    fd, path = tempfile.mkstemp()
    with os.fdopen(fd, 'w') as f:
        f.write("sensitive data")
    return path

# ============================================================
# Main
# ============================================================

if __name__ == '__main__':
    print("Safe test file for Python vulnerability scanning")
    app.run(debug=False)
