import type { Git } from 'src/services/GitService.js';

export function getGitMock() {
  return {
    tag: vi.fn(),
    pushTags: vi.fn(),
    raw: vi.fn(),
    revparse: vi.fn(),
    fetch: vi.fn(),
    tags: vi.fn(),
    log: vi.fn(),
  } satisfies Git;
}
