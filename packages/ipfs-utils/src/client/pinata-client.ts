import { PinataSDK } from 'pinata';

let pinataClient: PinataSDK | null = null;

/**
 * Get the Pinata client instance
 * Creates a new client if one doesn't exist
 */
export function getPinataClient(): PinataSDK {
  if (pinataClient) {
    return pinataClient;
  }

  const pinataJwt = process.env.PINATA_JWT;
  const pinataGateway = process.env.PINATA_GATEWAY;

  if (!pinataJwt) {
    throw new Error('Missing Pinata environment variables. Please set PINATA_JWT.');
  }

  pinataClient = new PinataSDK({
    pinataJwt,
    pinataGateway,
  });

  return pinataClient;
}

/**
 * Reset the Pinata client (useful for testing)
 */
export function resetPinataClient(): void {
  pinataClient = null;
}

/**
 * Get the IPFS gateway URL for a CID.
 * Configure PINATA_GATEWAY to use a dedicated gateway for better rate limits and reliability.
 * The public Pinata gateway (fallback) has rate limits and is a single point of failure.
 * For production, set PINATA_GATEWAY to a dedicated gateway URL (e.g. https://mysite.mypinata.cloud).
 */
export function getGatewayUrl(cid: string): string {
  const gateway = process.env.PINATA_GATEWAY || 'https://gateway.pinata.cloud';
  return `${gateway}/ipfs/${cid}`;
}

/**
 * Get a signed URL for private content access
 * Expires in 5 minutes by default
 */
export async function getSignedGatewayUrl(
  cid: string,
  expiresSeconds: number = 300
): Promise<string> {
  const pinata = getPinataClient();
  return pinata.gateways.private.createAccessLink({
    cid,
    expires: expiresSeconds,
  });
}

/**
 * Check if a CID is valid
 *
 * CIDv0: Starts with "Qm", base58btc encoded, exactly 46 characters
 * CIDv1: Starts with "b", base32lower encoded, variable length (typically 50-64 chars)
 *        Uses only base32 alphabet: a-z and 2-7 (no 0, 1, 8, 9)
 */
export function isValidCid(cid: string): boolean {
  // CIDv0: Qm + 44 base58 characters = 46 total
  const cidV0Regex = /^Qm[1-9A-HJ-NP-Za-km-z]{44}$/;

  // CIDv1 base32lower: b + 32-100 base32 characters (allows various codecs/hashes)
  // Base32 alphabet is [a-z2-7] - numbers 0, 1, 8, 9 are NOT valid
  const cidV1Regex = /^b[a-z2-7]{32,100}$/;

  return cidV0Regex.test(cid) || cidV1Regex.test(cid);
}

/**
 * Get the public group ID for public content uploads.
 * Returns undefined if not configured (content will be private).
 * Pinata group IDs are UUIDs; an invalid value will cause Pinata API errors at upload time.
 */
export function getPublicGroupId(): string | undefined {
  const groupId = process.env.PINATA_PUBLIC_GROUP_ID;
  if (!groupId) return undefined;

  // Pinata group IDs are UUIDs (xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(groupId)) {
    // Throw instead of warn: an invalid group ID will cause every public upload to fail
    // with a Pinata API error. Failing fast at startup prevents confusing upload failures
    // and makes the misconfiguration immediately visible in logs.
    throw new Error(
      `[pinata-client] PINATA_PUBLIC_GROUP_ID "${groupId}" is not a valid UUID ` +
        '(expected format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx). ' +
        'Fix or unset PINATA_PUBLIC_GROUP_ID to proceed.'
    );
  }

  return groupId;
}
