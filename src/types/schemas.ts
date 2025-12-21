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

export const unpublishedDetails = z.object({
  time: z.string(),
  versions: z.string().array(),
});

export type UnpublishedDetails = z.infer<typeof unpublishedDetails>;

export const timeDetails = z
  .object({
    unpublished: unpublishedDetails.optional(),
    created: z.string().optional(),
    modified: z.string().optional(),
  })
  .catchall(z.string().optional());

export type TimeDetails = z.infer<typeof timeDetails>;

export const registryMetadataSchema = z.object({
  'dist-tags': z.object({ latest: z.string() }).optional(),
  versions: z.record(z.string(), registryMetadataForVersionSchema.optional()).optional(),
  time: timeDetails,
});

export type RegistryMetadata = z.infer<typeof registryMetadataSchema>;
