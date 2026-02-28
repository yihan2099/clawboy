import { getGatewayUrl, getSignedGatewayUrl, isValidCid } from '../client/pinata-client';

export interface FetchOptions {
  /** Custom gateway URL (overrides default) */
  gateway?: string;
  /** Timeout in milliseconds */
  timeout?: number;
  /** Use signed URL for private content (default: true) */
  useSignedUrl?: boolean;
}

/**
 * Fetch JSON data from IPFS by CID
 * Uses signed URLs for private Pinata content by default
 */
export async function fetchJson<T = unknown>(cid: string, options: FetchOptions = {}): Promise<T> {
  if (!isValidCid(cid)) {
    throw new Error(`Invalid CID: ${cid}`);
  }

  const { gateway, timeout = 30000, useSignedUrl = true } = options;

  // Determine the URL to use
  let url: string;
  if (gateway) {
    url = `${gateway}/ipfs/${cid}`;
  } else if (useSignedUrl) {
    // Use signed URL for private Pinata content
    url = await getSignedGatewayUrl(cid);
  } else {
    url = getGatewayUrl(cid);
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch CID ${cid}: HTTP ${response.status}`);
    }

    return response.json() as Promise<T>;
  } catch (error) {
    // Distinguish timeout (AbortError) from other network errors for better diagnostics.
    // Previously, an AbortError would surface as an opaque "AbortError: The operation was aborted"
    // message which doesn't indicate the timeout duration.
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`IPFS fetch timed out after ${timeout}ms for CID ${cid}`);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Fetch a task specification from IPFS
 */
export async function fetchTaskSpecification(
  cid: string,
  options?: FetchOptions
): Promise<import('@pactprotocol/shared-types').TaskSpecification> {
  return fetchJson(cid, options);
}

/**
 * Fetch an agent profile from IPFS
 */
export async function fetchAgentProfile(
  cid: string,
  options?: FetchOptions
): Promise<import('@pactprotocol/shared-types').AgentProfile> {
  return fetchJson(cid, options);
}

/**
 * Fetch a work submission from IPFS
 */
export async function fetchWorkSubmission(
  cid: string,
  options?: FetchOptions
): Promise<import('@pactprotocol/shared-types').WorkSubmission> {
  return fetchJson(cid, options);
}

/**
 * Fetch dispute evidence from IPFS
 */
export async function fetchDisputeEvidence(
  cid: string,
  options?: FetchOptions
): Promise<import('@pactprotocol/shared-types').DisputeEvidence> {
  return fetchJson(cid, options);
}
