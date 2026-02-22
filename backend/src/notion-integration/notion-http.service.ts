import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Bottleneck from 'bottleneck';

const RETRY_STATUS = new Set([429, 500, 502, 503, 504]);
const MAX_ATTEMPTS = 5;
const BASE_DELAY_MS = 200;

export class NotionHttpError extends Error {
    constructor(
        message: string,
        public readonly status: number,
        public readonly body: string,
    ) {
        super(message);
    }
}

@Injectable()
export class NotionHttpService {
    private readonly logger = new Logger(NotionHttpService.name);
    private readonly apiVersion: string;
    private readonly limiter: Bottleneck;

    constructor(private readonly configService: ConfigService) {
        this.apiVersion = this.configService.get<string>('NOTION_API_VERSION', '2022-06-28');
        this.limiter = new Bottleneck({
            reservoir: 3,
            reservoirRefreshAmount: 3,
            reservoirRefreshInterval: 1000,
            maxConcurrent: 1,
        });
    }

    async requestJson<T>(
        url: string,
        options: { method: 'GET' | 'POST'; token?: string; body?: unknown; headers?: Record<string, string> },
    ): Promise<T> {
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            ...(options.headers ?? {}),
        };

        if (options.token) {
            headers.Authorization = `Bearer ${options.token}`;
            headers['Notion-Version'] = this.apiVersion;
        }

        const fetchRequest = () =>
            fetch(url, {
                method: options.method,
                headers,
                body: options.body && options.method !== 'GET' ? JSON.stringify(options.body) : undefined,
            });

        const response = await this.limiter.schedule(() => this.executeWithRetry(fetchRequest));
        const textBody = await response.text();

        if (!response.ok) {
            const sanitizedBody = this.redactTokens(textBody);
            throw new NotionHttpError(`Notion error ${response.status}`, response.status, sanitizedBody);
        }

        if (!textBody) {
            return {} as T;
        }

        try {
            return JSON.parse(textBody) as T;
        } catch (err) {
            this.logger.warn(`Failed to parse Notion response JSON: ${(err as Error).message}`);
            throw new NotionHttpError('Invalid Notion response body', response.status, this.redactTokens(textBody));
        }
    }

    async postJson<T>(url: string, options: { token?: string; body?: unknown; headers?: Record<string, string> }): Promise<T> {
        return this.requestJson<T>(url, { method: 'POST', ...options });
    }

    async getJson<T>(url: string, options: { token?: string; headers?: Record<string, string> } = {}): Promise<T> {
        return this.requestJson<T>(url, { method: 'GET', ...options });
    }

    private async executeWithRetry(fetchRequest: () => Promise<Response>): Promise<Response> {
        let attempt = 0;
        while (true) {
            const res = await fetchRequest();
            if (!this.shouldRetry(res.status, attempt)) {
                return res;
            }

            const delayMs = this.computeDelayMs(res, attempt);
            this.logger.warn(`Notion request retry ${attempt + 1} after ${res.status}, waiting ${delayMs}ms`);
            await this.delay(delayMs);
            attempt += 1;
        }
    }

    private shouldRetry(status: number, attempt: number): boolean {
        return RETRY_STATUS.has(status) && attempt < MAX_ATTEMPTS - 1;
    }

    private computeDelayMs(res: Response, attempt: number): number {
        const retryAfter = res.headers.get('retry-after');
        if (retryAfter) {
            const parsed = Number(retryAfter);
            if (!Number.isNaN(parsed) && parsed > 0) {
                return parsed * 1000;
            }
        }

        const exp = BASE_DELAY_MS * 2 ** attempt;
        return Math.min(exp, 5000);
    }

    private delay(ms: number) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

    private redactTokens(body: string): string {
        if (!body) return body;

        return body
            .replace(/Bearer\s+[A-Za-z0-9\-_.+/=]+/gi, 'Bearer REDACTED')
            .replace(/"?(authorization|accessToken|refreshToken)"?\s*:\s*"[^"]*"/gi, '"$1":"REDACTED"');
    }
}