export interface SetupNpmrcInputs {
  registryUrl: URL;
  registryToken: string;
}

export function createNpmrc({ registryToken, registryUrl }: SetupNpmrcInputs) {
  return [
    `//${registryUrl.host}/:_authToken=${registryToken}`,
    `registry=${registryUrl.href}`,
    `strict-ssl=${registryUrl.protocol.startsWith('https')}`,
  ].join('\n');
}
