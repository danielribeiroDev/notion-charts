import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleDestroy {
    private readonly logger = new Logger(RedisService.name);
    private readonly url?: string;
    private readonly defaultTtlSeconds: number;
    private client?: Redis;

    constructor(configService: ConfigService) {
        this.url = configService.get<string>('REDIS_URL');
        this.defaultTtlSeconds = Number(configService.get<string>('NOTION_CACHE_TTL_SECONDS', '300'));
        if (this.url) {
            this.client = new Redis(this.url, { lazyConnect: true });
            this.client.on('error', (err) => {
                this.logger.warn(`Redis error: ${err.message}`);
            });
            this.client.connect().catch((err) => {
                this.logger.warn(`Redis connect failed: ${err.message}`);
            });
        } else {
            this.logger.log('REDIS_URL not set; cache disabled');
        }
    }

    async get<T>(key: string): Promise<T | null> {
        if (!this.client) return null;
        try {
            const raw = await this.client.get(key);
            if (!raw) return null;
            return JSON.parse(raw) as T;
        } catch (err) {
            this.logger.warn(`Redis get failed for key ${key}: ${(err as Error).message}`);
            return null;
        }
    }

    async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
        if (!this.client) return;
        try {
            const ttl = ttlSeconds ?? this.defaultTtlSeconds;
            const payload = JSON.stringify(value);
            if (ttl > 0) {
                await this.client.setex(key, ttl, payload);
            } else {
                await this.client.set(key, payload);
            }
        } catch (err) {
            this.logger.warn(`Redis set failed for key ${key}: ${(err as Error).message}`);
        }
    }

    async del(key: string): Promise<void> {
        if (!this.client) return;
        try {
            await this.client.del(key);
        } catch (err) {
            this.logger.warn(`Redis del failed for key ${key}: ${(err as Error).message}`);
        }
    }

    async onModuleDestroy() {
        if (this.client) {
            await this.client.quit();
        }
    }
}