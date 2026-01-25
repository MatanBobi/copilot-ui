// Commands that should include their subcommand for granular permission control
const SUBCOMMAND_EXECUTABLES = ['git', 'npm', 'yarn', 'pnpm', 'docker', 'kubectl']

// Shell builtins that are not real executables and should be skipped
// These are commonly used in patterns like `|| true` or `&& false` and don't need permission
const SHELL_BUILTINS_TO_SKIP = ['true', 'false']

// Shell keywords that are part of control flow syntax, not executables
const SHELL_KEYWORDS_TO_SKIP = ['for', 'in', 'do', 'done', 'while', 'until', 'if', 'then', 'else', 'elif', 'fi', 'case', 'esac', 'select']

/**
 * Extract all executables from a shell command.
 * Handles heredocs, string literals, redirections, and common shell patterns.
 */
export function extractExecutables(command: string): string[] {
  const executables: string[] = []
  
  // Remove heredocs first (<<'MARKER' ... MARKER or <<MARKER ... MARKER)
  // The regex handles: << 'EOF', <<'EOF', <<"EOF", <<EOF, and trailing spaces after closing marker
  // Uses lookahead (?=\n|$) to preserve newline after marker for proper command separation
  let cleaned = command.replace(/<<\s*['"]?(\w+)['"]?[\s\S]*?\n\1\s*(?=\n|$)/g, '')
  
  // Also handle heredocs that might not have closing marker in view
  cleaned = cleaned.replace(/<<\s*['"]?\w+['"]?[\s\S]*$/g, '')
  
  // Remove string literals to avoid false positives
  cleaned = cleaned
    .replace(/"[^"]*"/g, '""')
    .replace(/'[^']*'/g, "''")
    .replace(/`[^`]*`/g, '``')
  
  // Remove shell redirections like 2>&1, >&2, 2>/dev/null, etc.
  cleaned = cleaned.replace(/\d*>&?\d+/g, '')      // 2>&1, >&1, 1>&2
  cleaned = cleaned.replace(/\d+>>\S+/g, '')       // 2>>/dev/null
  cleaned = cleaned.replace(/\d+>\S+/g, '')        // 2>/dev/null
  
  // Split on shell operators, separators, and newlines
  const segments = cleaned.split(/[;&|\n]+/)
  
  for (const segment of segments) {
    const trimmed = segment.trim()
    if (!trimmed) continue
    
    // Skip if it looks like a heredoc marker line
    if (/^[A-Z]+$/.test(trimmed)) continue
    
    // Get first word of segment
    const parts = trimmed.split(/\s+/)
    const prefixes = ['sudo', 'env', 'nohup', 'nice', 'time', 'command']
    
    let foundExec: string | null = null
    let subcommand: string | null = null
    
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i]
      // Skip environment variable assignments
      if (part.includes('=') && !part.startsWith('-')) continue
      // Skip flags
      if (part.startsWith('-')) continue
      // Skip common prefixes
      if (prefixes.includes(part)) continue
      // Skip shell builtins like 'true' and 'false' used in || true patterns
      if (SHELL_BUILTINS_TO_SKIP.includes(part)) continue
      // Skip shell keywords like 'for', 'in', 'do', 'done', etc.
      if (SHELL_KEYWORDS_TO_SKIP.includes(part)) continue
      // Skip empty or punctuation
      if (!part || /^[<>|&;()]+$/.test(part)) continue
      // Skip redirection targets
      if (part.startsWith('>') || part.startsWith('<')) continue
      
      // Found potential executable - remove path prefix
      const exec = part.replace(/^.*\//, '')
      // Validate it looks like a command (alphanumeric, dashes, underscores)
      if (exec && /^[a-zA-Z0-9_-]+$/.test(exec)) {
        if (!foundExec) {
          foundExec = exec
          // Check if this needs subcommand handling
          if (SUBCOMMAND_EXECUTABLES.includes(exec)) {
            // Look for subcommand in next non-flag part
            for (let j = i + 1; j < parts.length; j++) {
              const nextPart = parts[j]
              if (nextPart.startsWith('-')) continue
              if (nextPart.includes('=')) continue
              if (/^[a-zA-Z0-9_-]+$/.test(nextPart)) {
                subcommand = nextPart
                break
              }
              break // Stop if we hit something unexpected
            }
          }
        }
        break
      }
    }
    
    if (foundExec) {
      // Combine executable with subcommand for granular control
      const execId = subcommand ? `${foundExec} ${subcommand}` : foundExec
      if (!executables.includes(execId)) {
        executables.push(execId)
      }
    }
  }
  
  return executables
}
