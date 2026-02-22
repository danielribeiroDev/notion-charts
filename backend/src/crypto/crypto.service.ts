import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

@Injectable()
export class CryptoService {
    private readonly key: Buffer;

    constructor(configService: ConfigService) {
        const keyRaw = configService.get<string>('CRYPTO_KEY');
        if (!keyRaw) {
            throw new Error('CRYPTO_KEY is required');
        }

        const keyBuf = this.parseKey(keyRaw);
        if (keyBuf.length !== 32) {
            throw new Error('CRYPTO_KEY must be 32 bytes (hex or base64)');
        }
        this.key = keyBuf;
    }

    encrypt(plaintext: string): string {
        const iv = randomBytes(12);
        const cipher = createCipheriv('aes-256-gcm', this.key, iv);
        const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
        const authTag = cipher.getAuthTag();
        return [iv.toString('base64'), encrypted.toString('base64'), authTag.toString('base64')].join(':');
    }

    decrypt(payload: string): string {
        const [ivB64, dataB64, tagB64] = payload.split(':');
        if (!ivB64 || !dataB64 || !tagB64) {
            throw new Error('Invalid encrypted payload');
        }
        const iv = Buffer.from(ivB64, 'base64');
        const data = Buffer.from(dataB64, 'base64');
        const authTag = Buffer.from(tagB64, 'base64');
        const decipher = createDecipheriv('aes-256-gcm', this.key, iv);
        decipher.setAuthTag(authTag);
        const decrypted = Buffer.concat([decipher.update(data), decipher.final()]);
        return decrypted.toString('utf8');
    }

    private parseKey(raw: string): Buffer {
        const trimmed = raw.trim();
        if (trimmed.length === 64 && /^[0-9a-fA-F]+$/.test(trimmed)) {
            return Buffer.from(trimmed, 'hex');
        }
        return Buffer.from(trimmed, 'base64');
    }
}
