import { keccak256, encodePacked, toHex, stringToHex } from "viem";
const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// ============================================
// TYPES
// ============================================

export interface ExecutionRequest {
  execution_id: string;
  invention_id: string;
  buyer: string;
  status: "pending" | "executing" | "completed" | "failed";
}

export interface ExecutionResult {
  execution_id: string;
  status: "completed" | "failed";
  output?: unknown;
  metrics?: {
    execution_time_ms: number;
    memory_used_mb: number;
  };
  attestation?: string;
  error?: string;
}

export interface KeyReleaseResult {
  invention_id: string;
  buyer: string;
  decryption_key: string;
  released: boolean;
}

// ============================================
// PAY-PER-USE ENDPOINTS
// ============================================

/**
 * Request execution of a Pay-Per-Use invention
 */
export async function requestExecution(
  inventionId: string,
  buyer: string,
  inputData: Record<string, unknown>,
  txHash: string,
): Promise<ExecutionRequest> {
  const response = await fetch(`${API_BASE}/api/executions/request`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      invention_id: inventionId,
      buyer,
      input_data: inputData,
      tx_hash: txHash,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "Failed to request execution");
  }

  return response.json();
}

/**
 * Poll for execution result
 */
export async function getExecutionResult(
  executionId: string,
): Promise<ExecutionResult> {
  const response = await fetch(`${API_BASE}/api/executions/${executionId}`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "Failed to get execution result");
  }

  return response.json();
}

/**
 * Wait for execution to complete with polling
 */
export async function waitForExecution(
  executionId: string,
  maxAttempts = 60,
  intervalMs = 2000,
): Promise<ExecutionResult> {
  for (let i = 0; i < maxAttempts; i++) {
    const result = await getExecutionResult(executionId);

    if (result.status === "completed" || result.status === "failed") {
      return result;
    }

    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  throw new Error("Execution timed out");
}

// ============================================
// NASH NEGOTIATION ENDPOINTS
// ============================================

/**
 * Request trial execution during Nash negotiation
 */
export async function requestNashTrial(
  inventionId: string,
  buyer: string,
  inputData: Record<string, unknown>,
  txHash: string,
): Promise<ExecutionRequest> {
  const response = await fetch(`${API_BASE}/api/nash/trial`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      invention_id: inventionId,
      buyer,
      input_data: inputData,
      tx_hash: txHash,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "Failed to request Nash trial");
  }

  return response.json();
}

/**
 * Request key release after Nash settlement
 */
export async function requestKeyRelease(
  inventionId: string,
  buyer: string,
): Promise<KeyReleaseResult> {
  const response = await fetch(`${API_BASE}/api/nash/key-release`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      invention_id: inventionId,
      buyer,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "Failed to request key release");
  }

  return response.json();
}

/**
 * Wait for key release confirmation
 */
export async function waitForKeyRelease(
  inventionId: string,
  buyer: string,
  maxAttempts = 30,
  intervalMs = 2000,
): Promise<KeyReleaseResult> {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const result = await requestKeyRelease(inventionId, buyer);
      if (result.released) {
        return result;
      }
    } catch {
      // Key not ready yet, continue polling
    }

    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  throw new Error("Key release timed out");
}

// ============================================
// SELLER ENDPOINTS
// ============================================

/**
 * Encrypt invention code and upload to IPFS
 */
export async function encryptAndUploadInvention(
  code: string,
  metadata: Record<string, unknown>,
): Promise<{
  encrypted_code_hash: string;
  encryption_key_hash: string;
  metadata_uri: string;
}> {
  const response = await fetch(`${API_BASE}/api/inventions/encrypt`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      code,
      metadata,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "Failed to encrypt invention");
  }

  return response.json();
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Generate input hash from data
 */
export function hashInput(data: Record<string, unknown>): `0x${string}` {
  // Convert JSON to a hex string, then keccak256 hash it
  const jsonString = JSON.stringify(data);
  const hexData = stringToHex(jsonString);
  return keccak256(hexData);
}

/**
 * Generate Nash bid hash
 * Exactly matches Solidity's: keccak256(abi.encodePacked(amount, salt))
 */
export function generateNashBidHash(
  amount: bigint,
  salt: `0x${string}`,
): `0x${string}` {
  // encodePacked tightly packs the uint256 (amount) and bytes32 (salt)
  // exactly how Solidity does it natively.
  const packed = encodePacked(["uint256", "bytes32"], [amount, salt]);

  return keccak256(packed);
}

/**
 * Generate random 32-byte salt for Nash bids
 */
export function generateSalt(): `0x${string}` {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return toHex(array);
}
