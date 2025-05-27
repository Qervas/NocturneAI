"""
Colored Logging Setup for NocturneAI

This module provides a way to set up colorized logging for better readability
of log messages, especially in the terminal.
"""

import logging
import colorlog

def setup_colored_logging(level=logging.INFO):
    """
    Set up colored logging for better log readability.
    
    Args:
        level: Logging level (default: logging.INFO)
    """
    handler = colorlog.StreamHandler()
    handler.setFormatter(
        colorlog.ColoredFormatter(
            "%(log_color)s%(asctime)s - %(name)s - %(levelname)s - %(message)s",
            log_colors={
                'DEBUG': 'cyan',
                'INFO': 'green',
                'WARNING': 'yellow',
                'ERROR': 'red',
                'CRITICAL': 'red,bg_white',
            },
            secondary_log_colors={},
            style='%'
        )
    )
    
    root_logger = logging.getLogger()
    root_logger.setLevel(level)
    
    # Remove any existing handlers
    for hdlr in root_logger.handlers[:]:
        root_logger.removeHandler(hdlr)
    
    root_logger.addHandler(handler)