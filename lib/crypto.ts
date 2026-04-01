// lib/crypto.ts

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
