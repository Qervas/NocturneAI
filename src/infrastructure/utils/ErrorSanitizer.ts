/**
 * ErrorSanitizer
 *
 * Utilities for safely extracting error messages without exposing
 * stack traces or source code to the UI.
 *
 * Prevents source-mapped code from leaking into chat messages.
 */

/**
 * Sanitize an error for display in the UI
 *
 * Extracts only the error message, stripping stack traces and source code.
 *
 * @param error Error object or unknown value
 * @returns Clean error message string
 */
export function sanitizeError(error: unknown): string {
  if (!error) {
    return 'Unknown error occurred';
  }

  // Handle Error objects
  if (error instanceof Error) {
    // Only return the message, never the stack
    return error.message || error.name || 'Unknown error';
  }

  // Handle plain objects with message property
  if (typeof error === 'object' && error !== null) {
    const err = error as any;
    if (err.message) {
      return String(err.message);
    }
    if (err.error) {
      return String(err.error);
    }
  }

  // Handle strings
  if (typeof error === 'string') {
    // Strip any stack traces (lines starting with "at ")
    const lines = error.split('\n');
    const messageLines = lines.filter(line => !line.trim().startsWith('at '));
    return messageLines.join('\n').trim() || error;
  }

  // Fallback
  return 'An error occurred';
}

/**
 * Sanitize an error for logging (includes more details)
 *
 * @param error Error object or unknown value
 * @returns Error details for logging
 */
export function sanitizeErrorForLogging(error: unknown): {
  message: string;
  name?: string;
  code?: string;
} {
  if (!error) {
    return { message: 'Unknown error occurred' };
  }

  if (error instanceof Error) {
    return {
      message: error.message,
      name: error.name,
      code: (error as any).code,
    };
  }

  if (typeof error === 'object' && error !== null) {
    const err = error as any;
    return {
      message: err.message || err.error || JSON.stringify(error),
      name: err.name,
      code: err.code,
    };
  }

  return {
    message: String(error),
  };
}

/**
 * Check if a string contains source code or stack traces
 *
 * @param text Text to check
 * @returns True if text appears to contain source code
 */
export function containsSourceCode(text: string): boolean {
  // Check for common source code patterns
  const sourceCodePatterns = [
    /\bfunction\s+\w+\s*\(/,  // function declarations
    /\bconst\s+\w+\s*=/,      // const declarations
    /\blet\s+\w+\s*=/,        // let declarations
    /\bclass\s+\w+/,          // class declarations
    /\breturn\s+/,            // return statements
    /^\s*at\s+/m,             // stack trace lines
    /\bimport\s+.*from/,      // import statements
    /\bexport\s+(class|function|const|let)/, // export statements
  ];

  return sourceCodePatterns.some(pattern => pattern.test(text));
}

/**
 * Clean text by removing source code and stack traces
 *
 * @param text Text to clean
 * @returns Cleaned text
 */
export function cleanText(text: string): string {
  if (!containsSourceCode(text)) {
    return text;
  }

  // Split into lines and filter out code/stack trace lines
  const lines = text.split('\n');
  const cleanedLines = lines.filter(line => {
    const trimmed = line.trim();
    // Keep lines that don't look like code
    return !(
      trimmed.startsWith('at ') ||          // Stack trace
      trimmed.includes('function ') ||       // Function def
      trimmed.includes(' => ') ||            // Arrow function
      trimmed.match(/^(const|let|var)\s/) || // Variable declaration
      trimmed.match(/^(import|export)\s/)    // Import/export
    );
  });

  return cleanedLines.join('\n').trim() || 'Error occurred (details filtered)';
}
