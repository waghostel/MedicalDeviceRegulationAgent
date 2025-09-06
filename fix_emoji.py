#!/usr/bin/env python3
"""Fix emoji characters in main.py that cause encoding issues on Windows."""

import re

# Read the file
with open('medical-device-regulatory-assistant/backend/main.py', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace emoji characters with text equivalents
replacements = {
    '🚀': '[STARTING]',
    '✅': '[OK]',
    '❌': '[ERROR]',
    '⚠️': '[WARNING]',
    '🎉': '[SUCCESS]',
    '📊': '[INFO]',
    '🛑': '[STOPPING]',
    '👋': '[GOODBYE]'
}

for emoji, replacement in replacements.items():
    content = content.replace(emoji, replacement)

# Write the file back
with open('medical-device-regulatory-assistant/backend/main.py', 'w', encoding='utf-8') as f:
    f.write(content)

print("Fixed emoji characters in main.py")