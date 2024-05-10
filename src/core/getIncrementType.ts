import { GitLogEntry, createIsMajorChange, createIsMinorChange } from './git-log-tools.js';

export type IncrementType = 'major' | 'minor' | 'patch';

export function getIncrementType(
  gitHistory: readonly GitLogEntry[],
  majorTypes: string[],
  minorTypes: string[],
): IncrementType {
  let incrementType: IncrementType = 'patch';

  const isMajorChange = createIsMajorChange(majorTypes);
  const isMinorChange = createIsMinorChange(minorTypes);

  for (const entry of gitHistory) {
    if (isMajorChange(entry)) {
      return 'major';
    }
    if (incrementType === 'patch' && isMinorChange(entry)) {
      incrementType = 'minor';
    }
  }

  return incrementType;
}
