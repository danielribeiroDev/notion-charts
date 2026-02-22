import { IsNotEmpty, IsObject, IsOptional, IsString, IsUUID, Validate } from 'class-validator';
import { ConfigJsonMetricsConstraint } from './config-json-metrics.constraint';

export class CreateChartDto {
    @IsUUID('4')
    workspaceId!: string;

    @IsNotEmpty()
    @IsString()
    notionDatabaseId!: string;

    @IsObject()
    @Validate(ConfigJsonMetricsConstraint)
    configJson!: Record<string, unknown>;

    @IsOptional()
    @IsString()
    lastSyncedAt?: string;
}
