import { toHex } from "viem";

/**
 * Encrypts the raw Python code for the TEE.
 * Note: In production, this should use the TEE's specific public RSA/ECIES key.
 * For this implementation, we are using AES-GCM as a placeholder structure.
 */
export async function encryptCodeForTEE(rawCode: string): Promise<Blob> {
  const encoder = new TextEncoder();
  const data = encoder.encode(rawCode);

  // Generate a random symmetric key (In production, encrypt this key with TEE Public Key)
  const key = await window.crypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"],
  );

  const iv = window.crypto.getRandomValues(new Uint8Array(12));

  const encryptedBuffer = await window.crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv },
    key,
    data,
  );

  // Export the key so we can bundle it (Mocking the TEE envelope process)
  const exportedKey = await window.crypto.subtle.exportKey("raw", key);

  // Combine IV, Key, and Ciphertext into a single file buffer
  const payload = new Uint8Array(
    iv.length + exportedKey.byteLength + encryptedBuffer.byteLength,
  );
  payload.set(iv, 0);
  payload.set(new Uint8Array(exportedKey), iv.length);
  payload.set(
    new Uint8Array(encryptedBuffer),
    iv.length + exportedKey.byteLength,
  );

  return new Blob([payload], { type: "application/octet-stream" });
}

/**
 * MOCK: Generates a dummy asymmetric keypair for the buyer.
 * The public key is submitted with the Nash bid. The TEE uses it to securely
 * encrypt the decryption key so only the winning buyer can access the invention.
 * (In production, use secp256k1 or X25519)
 */
export async function generateBuyerKeyPair(): Promise<{
  publicKey: `0x${string}`;
  privateKey: string;
}> {
  // Mocking a 32-byte public key string for compatibility
  const mockPubKeyArray = new Uint8Array(32);
  window.crypto.getRandomValues(mockPubKeyArray);
  return {
    publicKey: toHex(mockPubKeyArray),
    privateKey: "MOCK_PRIVATE_KEY",
  };
}
