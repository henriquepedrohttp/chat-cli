import CryptoJS from 'crypto-js';

const PBKDF2_ITERATIONS = 100000;
const KEY_SIZE = 256 / 32;

export interface EncryptedData {
  ciphertext: string;
  iv: string;
}

export function deriveKey(password: string, salt: string): string {
  const saltWordArray = CryptoJS.enc.Hex.parse(salt);
  const key = CryptoJS.PBKDF2(password, saltWordArray, {
    keySize: KEY_SIZE,
    iterations: PBKDF2_ITERATIONS,
    hasher: CryptoJS.algo.SHA256
  });
  return key.toString(CryptoJS.enc.Hex);
}

export function encrypt(plaintext: string, password: string): EncryptedData {
  const salt = CryptoJS.lib.WordArray.random(32);
  const saltHex = salt.toString(CryptoJS.enc.Hex);
  const key = deriveKey(password, saltHex);

  const iv = CryptoJS.lib.WordArray.random(16);
  const ivHex = iv.toString(CryptoJS.enc.Hex);

  const keyWordArray = CryptoJS.enc.Hex.parse(key);
  const ivWordArray = CryptoJS.enc.Hex.parse(ivHex);

  const encrypted = CryptoJS.AES.encrypt(plaintext, keyWordArray, {
    iv: ivWordArray,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7
  });

  return {
    ciphertext: saltHex + ':' + encrypted.ciphertext.toString(CryptoJS.enc.Hex),
    iv: ivHex
  };
}

export function decrypt(encryptedData: EncryptedData, password: string): string {
  const [saltHex, ciphertext] = encryptedData.ciphertext.split(':');
  const key = deriveKey(password, saltHex);

  const keyWordArray = CryptoJS.enc.Hex.parse(key);
  const ivWordArray = CryptoJS.enc.Hex.parse(encryptedData.iv);
  const ciphertextWordArray = CryptoJS.enc.Hex.parse(ciphertext);

  const decrypted = CryptoJS.AES.decrypt(
    { ciphertext: ciphertextWordArray } as CryptoJS.lib.CipherParams,
    keyWordArray,
    {
      iv: ivWordArray,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7
    }
  );

  return decrypted.toString(CryptoJS.enc.Utf8);
}