import crypto from 'crypto';

const ALGORITHM = 'aes-256-cbc';
const KEY_LENGTH = 32;
const IV_LENGTH = 16;
const SALT_LENGTH = 32;
const PBKDF2_ITERATIONS = 100000;

export interface EncryptedData {
  ciphertext: string;
  iv: string;
}

export function deriveKey(password: string, salt: Buffer): Buffer {
  return crypto.pbkdf2Sync(password, salt, PBKDF2_ITERATIONS, KEY_LENGTH, 'sha256');
}

export function encrypt(plaintext: string, password: string): EncryptedData {
  const salt = crypto.randomBytes(SALT_LENGTH);
  const key = deriveKey(password, salt);

  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  return {
    ciphertext: salt.toString('hex') + ':' + encrypted,
    iv: iv.toString('hex')
  };
}

export function decrypt(encryptedData: EncryptedData, password: string): string {
  const [saltHex, ciphertext] = encryptedData.ciphertext.split(':');
  const salt = Buffer.from(saltHex, 'hex');
  const key = deriveKey(password, salt);
  const iv = Buffer.from(encryptedData.iv, 'hex');

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);

  let decrypted = decipher.update(ciphertext, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}