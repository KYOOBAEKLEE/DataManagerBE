import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env from project root (two levels up from src/services/)
dotenv.config({ path: join(__dirname, '../../.env') });

export interface RDPCredentials {
  username?: string | undefined;
  password?: string | undefined;
  appKey: string;
}

export class CredentialManager {
  private static credentialsMap: Record<string, RDPCredentials> = {
    "MARKET_DATA": {
      username: process.env.RDP_USER_MD,
      password: process.env.RDP_PASSWORD_MD,
      appKey: process.env.RDP_APP_KEY_MD || ""
    },
    "NEWS": {
      username: process.env.RDP_USER_NEWS,
      password: process.env.RDP_PASSWORD_NEWS,
      appKey: process.env.RDP_APP_KEY_NEWS || ""
    },
    "LIPPER": {
      username: (process.env.RDP_USER_LIPPER || "").trim(),
      password: (process.env.RDP_PASSWORD_LIPPER || "").trim(),
      appKey: (process.env.RDP_APP_KEY_LIPPER || "").trim()
    },
    "DEFAULT": {
      username: process.env.RDP_USER_DEFAULT,
      password: process.env.RDP_PASSWORD_DEFAULT,
      appKey: process.env.RDP_APP_KEY_DEFAULT || ""
    }
  };

  static {
    // Debug: Log loaded credentials (masked)
    console.log('🔐 Loaded Credentials:');
    const lipper = this.credentialsMap.LIPPER;
    console.log('LIPPER:', {
      username: lipper?.username ? '***SET***' : 'MISSING',
      password: lipper?.password ? '***SET***' : 'MISSING',
      appKey: lipper?.appKey ? `${lipper.appKey.substring(0, 8)}...` : 'MISSING'
    });
    console.log('Environment variables:');
    console.log('  RDP_USER_LIPPER:', process.env.RDP_USER_LIPPER ? '***SET***' : 'MISSING');
    console.log('  RDP_PASSWORD_LIPPER:', process.env.RDP_PASSWORD_LIPPER ? '***SET***' : 'MISSING');
    console.log('  RDP_APP_KEY_LIPPER:', process.env.RDP_APP_KEY_LIPPER ? `${process.env.RDP_APP_KEY_LIPPER.substring(0, 8)}...` : 'MISSING');
  }

  static getCredentials(type: string): RDPCredentials {
    // Make lookup case-insensitive by converting to uppercase
    const upperType = type.toUpperCase();
    console.log(`🔍 Looking up credentials for: "${type}" -> "${upperType}"`);
    const creds = this.credentialsMap[upperType] || this.credentialsMap["DEFAULT"]!;
    console.log(`🔍 Found credentials:`, {
      username: creds.username ? '***SET***' : 'EMPTY',
      password: creds.password ? '***SET***' : 'EMPTY',
      appKey: creds.appKey ? `${creds.appKey.substring(0, 8)}...` : 'EMPTY'
    });
    return creds;
  }
}
