import {
  Wallet,
  SigningKey,
  getBytes,
  hexlify,
  keccak256,
  toUtf8Bytes,
} from "ethers";

// Helper to convert ArrayBuffer to Base64 string (browser compatible)
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

/**
 * Commitment to the symmetric decryption key, published on-chain as
 * `encryptionKeyHash`.
 *
 * Hashes the UTF-8 bytes of the 44-character Base64 key string -- the exact
 * representation sent to the TEE as `decryption_key` and returned to the buyer
 * by decryptKeyFromTEE. Every party can therefore check the commitment against
 * the value it already holds, with no re-encoding step in between. Producer and
 * verifier must both go through this function so the representation cannot drift.
 */
export function hashDecryptionKey(decryptionKey: string): `0x${string}` {
  return keccak256(toUtf8Bytes(decryptionKey)) as `0x${string}`;
}

/**
 * Encrypts the raw Python code for the TEE.
 *
 * Blob layout is `iv (12 bytes) || ciphertext+GCM tag`. The symmetric key is
 * deliberately NOT part of the blob: the blob is published to public IPFS, so
 * anything inside it is readable by everyone. The key travels separately as the
 * returned `decryptionKey`, which is handed to the TEE and only ever released
 * to the winning buyer.
 */
export async function encryptCodeForTEE(
  rawCode: string,
): Promise<{ blob: Blob; decryptionKey: string }> {
  const encoder = new TextEncoder();
  const data = encoder.encode(rawCode);

  // Generate a random symmetric key (256-bit = 32 bytes)
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

  // Export the raw 32-byte key
  const exportedKey = await window.crypto.subtle.exportKey("raw", key);

  // Convert the 32-byte raw key to a 44-character Base64 URL-safe string
  // This exactly matches the Python Fernet key format expected by your TEE Worker!
  const base64Key = arrayBufferToBase64(exportedKey);
  const decryptionKey = base64Key.replace(/\+/g, "-").replace(/\//g, "_");

  // Combine IV and Ciphertext only. The key is returned out-of-band instead of
  // being packed in here -- see the note on this function.
  const payload = new Uint8Array(iv.length + encryptedBuffer.byteLength);
  payload.set(iv, 0);
  payload.set(new Uint8Array(encryptedBuffer), iv.length);

  const blob = new Blob([payload], { type: "application/octet-stream" });

  return { blob, decryptionKey };
}

/**
 * Generates a secure secp256k1 asymmetric keypair for the buyer.
 * The public key is submitted with the Nash bid. The TEE uses it to securely
 * encrypt the decryption key (ECIES) so only the winning buyer can access the invention.
 */
export async function generateBuyerKeyPair(): Promise<{
  publicKey: `0x${string}`;
  privateKey: string;
}> {
  // Generates a cryptographically secure random secp256k1 keypair
  const randomWallet = Wallet.createRandom();

  return {
    // This is the true public key (usually 66 characters hex, compressed format)
    // The TEE's worker.py is configured to accept this exact format.
    publicKey: randomWallet.publicKey as `0x${string}`,

    // The buyer MUST save this private key locally (e.g., localStorage)
    // to decrypt the final payload if they win the auction.
    privateKey: randomWallet.privateKey,
  };
}

/**
 * Decrypts the ECIES payload returned by the TEE Worker.
 * Mirrors the Python TEE's exact encryption pipeline: ECDH -> HKDF -> AES-GCM.
 * * @param encryptedPayloadHex The "0x..." string returned by the TEE
 * @param privateKeyHex The buyer's private key from localStorage
 * @returns The plaintext Fernet decryption key
 */
export async function decryptKeyFromTEE(
  encryptedPayloadHex: string,
  privateKeyHex: string,
): Promise<string> {
  // 1. Convert the hex payload to a Uint8Array
  const payloadBytes = getBytes(encryptedPayloadHex);

  // 2. Extract components based on Python's structure:
  // ephemeral_pubkey (33 bytes) || nonce (12 bytes) || ciphertext
  const ephemeralPubKeyBytes = payloadBytes.slice(0, 33);
  const nonce = payloadBytes.slice(33, 45);
  const ciphertext = payloadBytes.slice(45);

  const ephemeralPubKeyHex = hexlify(ephemeralPubKeyBytes);

  // 3. ECDH: Compute the Shared Secret using ethers v6 SigningKey
  const signingKey = new SigningKey(privateKeyHex);
  const sharedSecretHex = signingKey.computeSharedSecret(ephemeralPubKeyHex);

  // ethers returns the full uncompressed point (0x04 || x || y, 65 bytes), but
  // Python's `cryptography` ECDH exchange() yields only the 32-byte x-coordinate.
  // Slice off the prefix and y so both sides feed HKDF identical keying material.
  const sharedSecret = new Uint8Array(getBytes(sharedSecretHex)).slice(1, 33);

  // 4. HKDF: Derive the AES key using Web Crypto API
  const baseKey = await window.crypto.subtle.importKey(
    "raw",
    sharedSecret,
    "HKDF",
    false,
    ["deriveKey"],
  );

  const derivedKey = await window.crypto.subtle.deriveKey(
    {
      name: "HKDF",
      hash: "SHA-256",
      salt: new Uint8Array(), // Empty salt matches Python's salt=None
      info: new TextEncoder().encode("adytum-key-encryption"), // Must match Python exactly
    },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["decrypt"],
  );

  // 5. AES-GCM: Decrypt the ciphertext
  const decryptedBuffer = await window.crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: nonce,
    },
    derivedKey,
    ciphertext,
  );

  // 6. Convert the decrypted buffer back to a string (the Fernet key)
  return new TextDecoder().decode(decryptedBuffer);
}

/**
 * Deterministically derives a secp256k1 keypair from a wallet signature.
 * Because the same wallet signing the same message always produces the same signature,
 * this allows us to recreate the exact same keypair later without storing it!
 */
export function deriveNashSecretsFromSignature(signature: string): {
  publicKey: `0x${string}`;
  privateKey: string;
  salt: `0x${string}`;
} {
  // 1. Derive Private Key (exactly as we did before)
  const privateKeyHex = keccak256(signature);
  const signingKey = new SigningKey(privateKeyHex);

  // 2. Derive Salt deterministically
  // We append a prefix to the signature before hashing so the salt
  // is mathematically unique and different from the private key.
  const saltSeed = toUtf8Bytes("adytum_salt_" + signature);
  const saltHex = keccak256(saltSeed) as `0x${string}`;

  return {
    // Compressed (33-byte) form, matching what the TEE worker parses and what
    // generateBuyerKeyPair returns. `signingKey.publicKey` is uncompressed.
    publicKey: signingKey.compressedPublicKey as `0x${string}`,
    privateKey: privateKeyHex,
    salt: saltHex,
  };
}
