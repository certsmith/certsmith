// Certsmith CLI - Lightweight JSONC Parser & Serializer
// Handles comments (// and /* */) and trailing commas without heavy dependencies.

/**
 * Strip single-line and multi-line comments from JSONC string.
 * Accurately ignores comments inside quoted string literals.
 */
export function stripJsonComments(jsonc: string): string {
  let insideString = false;
  let stringChar = '';
  let isEscaped = false;
  let result = '';

  for (let i = 0; i < jsonc.length; i++) {
    const char = jsonc[i];
    const nextChar = jsonc[i + 1];

    if (insideString) {
      result += char;
      if (isEscaped) {
        isEscaped = false;
      } else if (char === '\\') {
        isEscaped = true;
      } else if (char === stringChar) {
        insideString = false;
      }
      continue;
    }

    // Check for string start
    if (char === '"' || char === "'") {
      insideString = true;
      stringChar = char;
      result += char;
      continue;
    }

    // Check single line comment
    if (char === '/' && nextChar === '/') {
      const newlineIndex = jsonc.indexOf('\n', i + 2);
      if (newlineIndex === -1) {
        break; // Reached end of file
      }
      i = newlineIndex - 1;
      continue;
    }

    // Check multi line comment
    if (char === '/' && nextChar === '*') {
      const closeIndex = jsonc.indexOf('*/', i + 2);
      if (closeIndex === -1) {
        break;
      }
      i = closeIndex + 1;
      continue;
    }

    result += char;
  }

  // Remove trailing commas before } or ]
  return result.replace(/,\s*([}\]])/g, '$1');
}

/**
 * Parse JSONC content into an object.
 */
export function parseJsonc<T = unknown>(jsoncContent: string): T {
  const stripped = stripJsonComments(jsoncContent).trim();
  if (!stripped) {
    return {} as T;
  }
  return JSON.parse(stripped) as T;
}
