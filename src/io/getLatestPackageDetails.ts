import * as core from '@actions/core';
import { RegistryMetadataForVersion, registryMetadataForVersionSchema, registryMetadataSchema } from './schemas.js';

const NOT_FOUND = 404;

/**
 * @param registryUrl
 * @param packageName
 * @param registryToken
 * @throws {Error} if the registry response is not a 2xx or 404 code
 * @throws {Error} if the registry response does not match the expected schema
 * @returns The package details or undefined if the registry response is a 404 (Not Found) or the latest version details
 * are not present in the response
 */
export async function getLatestPackageDetails(
  registryUrl: URL,
  packageName: string,
  registryToken?: string,
): Promise<RegistryMetadataForVersion | undefined> {
  // Attempt to get the package details from the `/latest` endpoint, which works on NPM but may not be
  // available on other registries, such as GitHub packages, otherwise fall back to the full package details
  const dataFromLatest = await useLatestEndpoint(registryUrl, packageName, registryToken);
  if (dataFromLatest) {
    core.debug('Registry details successfully retrieved from "/latest" endpoint');
    return dataFromLatest;
  }

  const url = new URL(encodeURIComponent(packageName), registryUrl);
  const headers: Record<string, string> = {};
  if (registryToken) {
    headers.Authorization = `Bearer ${registryToken}`;
  }

  const response = await fetch(url, { headers });

  if (!response.ok) {
    if (response.status === NOT_FOUND) {
      return;
    }
    throw new Error(`Fetch request failed using url "${url}". Error: ${response.status} "${response.statusText}".`);
  }

  const data = registryMetadataSchema.parse(await response.json());
  return data.versions[data['dist-tags'].latest];
}

async function useLatestEndpoint(
  registryUrl: URL,
  packageName: string,
  registryToken?: string,
): Promise<RegistryMetadataForVersion | undefined> {
  try {
    const url = new URL(`${encodeURIComponent(packageName)}/latest`, registryUrl);
    const headers: Record<string, string> = {};
    if (registryToken) {
      headers.Authorization = `Bearer ${registryToken}`;
    }
    const response = await fetch(url, { headers });

    if (response.ok) {
      return registryMetadataForVersionSchema.parse(await response.json());
    }
  } catch (e: unknown) {
    /* empty */
  }
}
