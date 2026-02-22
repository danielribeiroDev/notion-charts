import { IsObject, IsOptional, IsString, IsUUID, Validate } from 'class-validator';
import { ConfigJsonMetricsConstraint } from './config-json-metrics.constraint';

export class UpdateChartDto {
    @IsOptional()
    @IsString()
    notionDatabaseId?: string;

    @IsOptional()
    @IsObject()
    @Validate(ConfigJsonMetricsConstraint)
    configJson?: Record<string, unknown>;

    @IsOptional()
    @IsString()
    lastSyncedAt?: string;
}
