import { Module } from '@nestjs/common';
import { NotionIntegrationController } from './notion-integration.controller';
import { NotionIntegrationService } from './notion-integration.service';
import { CryptoService } from '../crypto/crypto.service';
import { ConfigModule } from '@nestjs/config';
import { NotionHttpService } from './notion-http.service';
import { RedisModule } from '../redis/redis.module';
import { NotionFilterFactory } from './notion-filter.factory';
import { AggregationService } from './aggregation.service';

@Module({
    imports: [ConfigModule, RedisModule],
    controllers: [NotionIntegrationController],
    providers: [NotionIntegrationService, CryptoService, NotionHttpService, NotionFilterFactory, AggregationService],
    exports: [NotionIntegrationService],
})
export class NotionIntegrationModule { }
