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
 * Get the IPFS gateway URL for a CID
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
  return pinata.gateways.createSignedURL({
    cid,
    expires: expiresSeconds,
  });
}

/**
 * Check if a CID is valid
 */
export function isValidCid(cid: string): boolean {
  // Basic CID validation (v0 or v1)
  const cidV0Regex = /^Qm[1-9A-HJ-NP-Za-km-z]{44}$/;
  const cidV1Regex = /^b[a-z2-7]{58}$/;

  return cidV0Regex.test(cid) || cidV1Regex.test(cid);
}
