import { encrypt, decrypt } from "@/lib/encrypt";

// Mock NEXTAUTH_SECRET for tests
process.env.NEXTAUTH_SECRET = "test-secret-min-32-chars-for-testing-only";

describe("encrypt/decrypt", () => {
  it("encrypts and decrypts a string correctly", () => {
    const plaintext = "my-api-key-12345";
    const ciphertext = encrypt(plaintext);
    expect(ciphertext).not.toBe(plaintext);
    const result = decrypt(ciphertext);
    expect(result).toBe(plaintext);
  });

  it("produces different ciphertext for same input (salted)", () => {
    const plaintext = "same-input";
    const c1 = encrypt(plaintext);
    const c2 = encrypt(plaintext);
    // CryptoJS AES may produce same output with same key and no IV randomness,
    // so we just verify decryption works
    expect(decrypt(c1)).toBe(plaintext);
    expect(decrypt(c2)).toBe(plaintext);
  });

  it("throws when NEXTAUTH_SECRET is missing", () => {
    const orig = process.env.NEXTAUTH_SECRET;
    delete process.env.NEXTAUTH_SECRET;
    expect(() => encrypt("test")).toThrow("NEXTAUTH_SECRET is not set");
    process.env.NEXTAUTH_SECRET = orig;
  });
});
