import type { Logger } from 'src/types/Logger.js';

export function getLoggerMock() {
  return {
    group: vi.fn(),
    startGroup: vi.fn(),
    endGroup: vi.fn(),
    debug: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
    notice: vi.fn(),
    isDebug: vi.fn().mockReturnValue(false),
  } satisfies Logger;
}
