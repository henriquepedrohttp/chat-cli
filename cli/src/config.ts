import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

interface StoredData {
  token?: string;
  userId?: string;
  email?: string;
  password?: string;
}

const CONFIG_DIR = path.join(os.homedir(), '.chat-cli');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

export function getConfig(): StoredData {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const data = fs.readFileSync(CONFIG_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch {
  }
  return {};
}

export function saveConfig(data: StoredData): void {
  fs.mkdirSync(CONFIG_DIR, { recursive: true });
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(data, null, 2));
}

export function clearConfig(): void {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      fs.unlinkSync(CONFIG_FILE);
    }
  } catch {
  }
}

export function getStoredCredentials(): { email: string; password: string } | null {
  const config = getConfig();
  if (config.email && config.password) {
    return { email: config.email, password: config.password };
  }
  return null;
}