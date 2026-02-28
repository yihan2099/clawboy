/**
 * @deprecated PactClient is non-functional (its connect() always throws).
 * Use PactApiClient for all HTTP-based tool calls.
 * PactClient is retained here to avoid a breaking change for consumers that
 * import from this package but never call connect(). It will be removed in a
 * future major version.
 */
export { PactClient, createPactClient } from './client.js';
export type { PactClientConfig } from './client.js';

export { PactApiClient } from './api-client.js';
export type { ApiClientOptions, ApiError } from './api-client.js';
