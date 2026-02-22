import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Request } from 'express';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

interface Envelope<T> {
    data: T;
    meta: {
        latency: number;
        timestamp: string;
        requestId: string;
    };
}

@Injectable()
export class ResponseEnvelopeInterceptor implements NestInterceptor {
    intercept(context: ExecutionContext, next: CallHandler): Observable<Envelope<unknown>> {
        const startedAt = Date.now();
        const request = context.switchToHttp().getRequest<Request>();
        const requestIdHeader = request?.headers['x-request-id'] ?? request?.headers['request-id'];
        const requestId = (Array.isArray(requestIdHeader) ? requestIdHeader[0] : requestIdHeader) || randomUUID();

        return next.handle().pipe(
            map((data) => ({
                data,
                meta: {
                    latency: Date.now() - startedAt,
                    timestamp: new Date().toISOString(),
                    requestId,
                },
            })),
        );
    }
}
