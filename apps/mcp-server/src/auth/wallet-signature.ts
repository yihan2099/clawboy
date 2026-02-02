import { verifySignature, createAuthChallenge, parseAuthChallenge, isTimestampFresh } from '@porternetwork/web3-utils';

// SECURITY: Store active challenges by nonce (not address) to prevent overwrite attacks
// In production, use Redis or similar for persistence and distributed deployments
const activeChallenges = new Map<
  string, // nonce as key
  { address: string; createdAt: number; expiresAt: number }
>();

// Challenge expiration time (5 minutes)
const CHALLENGE_EXPIRATION_MS = 5 * 60 * 1000;

// Maximum active challenges per address (prevents DoS)
const MAX_CHALLENGES_PER_ADDRESS = 3;

/**
 * Generate a new authentication challenge for a wallet address
 * SECURITY: Each challenge is unique by nonce, preventing overwrite attacks
 */
export function generateChallenge(address: `0x${string}`): {
  challenge: string;
  nonce: string;
  expiresAt: number;
} {
  const normalizedAddress = address.toLowerCase();

  // SECURITY: Limit active challenges per address to prevent DoS
  const activeChallengesForAddress = Array.from(activeChallenges.values())
    .filter(c => c.address === normalizedAddress && Date.now() <= c.expiresAt);

  if (activeChallengesForAddress.length >= MAX_CHALLENGES_PER_ADDRESS) {
    throw new Error('Too many active challenges. Please complete or wait for existing challenges to expire.');
  }

  // Generate random nonce
  const nonce = crypto.randomUUID();
  const now = Date.now();
  const expiresAt = now + CHALLENGE_EXPIRATION_MS;

  // Create challenge message
  const challenge = createAuthChallenge(address, nonce);

  // SECURITY: Store challenge by nonce, not address, to prevent overwrites
  activeChallenges.set(nonce, {
    address: normalizedAddress,
    createdAt: now,
    expiresAt,
  });

  return { challenge, nonce, expiresAt };
}

/**
 * Verify a signed challenge
 * SECURITY: Now looks up by nonce to prevent challenge overwrite attacks
 */
export async function verifyChallengeSignature(
  address: `0x${string}`,
  signature: `0x${string}`,
  challenge: string
): Promise<{
  valid: boolean;
  error?: string;
}> {
  const normalizedAddress = address.toLowerCase();

  // Parse challenge to get nonce for lookup
  const parsed = parseAuthChallenge(challenge);
  if (!parsed.nonce) {
    return { valid: false, error: 'Invalid challenge format: missing nonce' };
  }

  // SECURITY: Verify challenge address matches claimed address
  if (parsed.address?.toLowerCase() !== normalizedAddress) {
    return { valid: false, error: 'Challenge address does not match claimed address' };
  }

  // SECURITY: Verify timestamp in challenge is fresh
  if (!parsed.timestamp || !isTimestampFresh(parsed.timestamp, CHALLENGE_EXPIRATION_MS)) {
    return { valid: false, error: 'Challenge timestamp is invalid or expired' };
  }

  // SECURITY: Look up by nonce, not address
  const storedChallenge = activeChallenges.get(parsed.nonce);
  if (!storedChallenge) {
    return { valid: false, error: 'No active challenge found for this nonce' };
  }

  // SECURITY: Verify stored address matches claimed address
  if (storedChallenge.address !== normalizedAddress) {
    return { valid: false, error: 'Address mismatch' };
  }

  // Check if challenge expired
  if (Date.now() > storedChallenge.expiresAt) {
    activeChallenges.delete(parsed.nonce);
    return { valid: false, error: 'Challenge expired' };
  }

  // Verify signature
  const isValid = await verifySignature(challenge, signature, address);
  if (!isValid) {
    return { valid: false, error: 'Invalid signature' };
  }

  // Clean up used challenge (by nonce)
  activeChallenges.delete(parsed.nonce);

  return { valid: true };
}

/**
 * Cleanup expired challenges
 */
export function cleanupExpiredChallenges(): void {
  const now = Date.now();
  for (const [nonce, challenge] of activeChallenges) {
    if (now > challenge.expiresAt) {
      activeChallenges.delete(nonce);
    }
  }
}

/**
 * Get active challenge count (for monitoring)
 */
export function getActiveChallengeCount(): number {
  return activeChallenges.size;
}

// Run cleanup every minute
setInterval(cleanupExpiredChallenges, 60 * 1000);
