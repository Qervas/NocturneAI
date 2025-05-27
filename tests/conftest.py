"""
Pytest configuration file.

This file is automatically loaded by pytest before any tests are run.
"""

import sys
import os

# Add the parent directory to sys.path to allow imports from the src package
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
