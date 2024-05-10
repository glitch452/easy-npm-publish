export interface GitLogEntry {
  message: string;
  body: string;
  hash: string;
}

export function createIsMajorChange(majorTypes: readonly string[]) {
  const majorTypesRegex = new RegExp(`^(${majorTypes.map((x) => x.toLowerCase()).join('|')})`);

  return (entry: GitLogEntry) => {
    const message = entry.message.toLowerCase();
    return !!(
      message.includes('!:') ||
      entry.body.includes('BREAKING CHANGE') ||
      entry.body.includes('BREAKING-CHANGE') ||
      (majorTypes.length && majorTypesRegex.test(message))
    );
  };
}

export function createIsMinorChange(minorTypes: readonly string[]) {
  const minorTypesRegex = new RegExp(`^(${minorTypes.map((x) => x.toLowerCase()).join('|')})`);

  return (entry: GitLogEntry) => {
    const message = entry.message.toLowerCase();
    return !!(minorTypes.length && minorTypesRegex.test(message));
  };
}
