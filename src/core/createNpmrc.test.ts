import { createNpmrc } from './createNpmrc.js';

describe('setup-npmrc', () => {
  describe(createNpmrc.name, () => {
    it('Should set the auth token for the registry', () => {
      const registryToken = '<token>';
      const registryUrl = new URL('https://registry.npmjs.org');
      const actual = createNpmrc({ registryUrl, registryToken }).split('\n');
      const expected = '//registry.npmjs.org/:_authToken=<token>';
      expect(actual).toContain(expected);
    });

    it('Should set the registry url', () => {
      const registryToken = '<token>';
      const registryUrl = new URL('https://registry.npmjs.org');
      const actual = createNpmrc({ registryUrl, registryToken }).split('\n');
      const expected = 'registry=https://registry.npmjs.org/';
      expect(actual).toContain(expected);
    });

    it('Should set strict ssl to true when the registry url has an https scheme', () => {
      const registryToken = '<token>';
      const registryUrl = new URL('https://registry.npmjs.org');
      const actual = createNpmrc({ registryUrl, registryToken }).split('\n');
      const expected = 'strict-ssl=true';
      expect(actual).toContain(expected);
    });

    it('Should set strict ssl to false when the registry url has an http scheme', () => {
      const registryToken = '<token>';
      const registryUrl = new URL('http://registry.npmjs.org');
      const actual = createNpmrc({ registryUrl, registryToken }).split('\n');
      const expected = 'strict-ssl=false';
      expect(actual).toContain(expected);
    });
  });
});
