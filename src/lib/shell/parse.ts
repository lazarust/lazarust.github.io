export type ParsedCommand = { command: string; args: string[] };

export function parse(input: string): ParsedCommand {
  const tokens: string[] = [];
  let token = '';
  let quote: "'" | '"' | null = null;
  let escaping = false;

  for (const character of input.trim()) {
    if (escaping) {
      token += character;
      escaping = false;
      continue;
    }

    if (character === '\\' && quote !== "'") {
      escaping = true;
      continue;
    }

    if (quote) {
      if (character === quote) quote = null;
      else token += character;
      continue;
    }

    if (character === "'" || character === '"') {
      quote = character;
      continue;
    }

    if (/\s/.test(character)) {
      if (token) {
        tokens.push(token);
        token = '';
      }
      continue;
    }

    token += character;
  }

  if (escaping) token += '\\';
  if (token) tokens.push(token);

  return { command: tokens[0] ?? '', args: tokens.slice(1) };
}
