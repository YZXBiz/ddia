#!/usr/bin/env python3
"""User message hook to add ultrathink functionality."""

import json
import sys

# Load input
input_data = json.load(sys.stdin)
context = "[[ ultrathink ]]\n"

# Output the context additions
output = {
    "hookSpecificOutput": {
        "hookEventName": "UserPromptSubmit",
        "additionalContext": context,
    }
}
print(json.dumps(output))

sys.exit(0)
