import { z } from 'zod';

export const packageJsonSchema = z.looseObject({
  name: z.string(),
  version: z.string(),
  scripts: z.record(z.string(), z.string()).optional(),
});

export type PackageJsonSchema = z.infer<typeof packageJsonSchema>;

export const registryMetadataForVersionSchema = z.object({
  name: z.string(),
  version: z.string(),
  gitHead: z.string(),
});

export type RegistryMetadataForVersion = z.infer<typeof registryMetadataForVersionSchema>;

export const registryMetadataSchema = z.object({
  'dist-tags': z.object({ latest: z.string() }),
  versions: z.record(z.string(), registryMetadataForVersionSchema.optional()),
  time: z.record(z.string(), z.string().or(z.undefined())),
});

export type RegistryMetadata = z.infer<typeof registryMetadataSchema>;
