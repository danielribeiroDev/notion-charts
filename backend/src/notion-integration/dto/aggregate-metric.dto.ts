import { Type } from 'class-transformer';
import {
    ArrayMinSize,
    IsArray,
    IsBoolean,
    IsEnum,
    IsNotEmpty,
    IsOptional,
    IsString,
    IsUUID,
    ValidateNested,
} from 'class-validator';

export enum DateRange {
    Last7d = 'last7d',
    Last30d = 'last30d',
    Last90d = 'last90d',
    Last12m = 'last12m',
    All = 'all',
}

export enum MetricFilterType {
    Select = 'select',
    Status = 'status',
    MultiSelect = 'multi_select',
    Date = 'date',
    Checkbox = 'checkbox',
    People = 'people',
    Relation = 'relation',
    Number = 'number',
    Formula = 'formula',
}

export class MetricFilterDto {
    @IsString()
    @IsNotEmpty()
    property!: string;

    @IsEnum(MetricFilterType)
    type!: MetricFilterType;

    @IsString()
    @IsNotEmpty()
    value!: string;
}

export class MetricConfigDto {
    @IsUUID('4')
    id!: string;

    @IsString()
    @IsNotEmpty()
    valueColumn!: string;

    @IsOptional()
    @IsEnum(DateRange)
    timeRange?: DateRange;

    @IsOptional()
    @IsString()
    dateProperty?: string;

    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => MetricFilterDto)
    filters?: MetricFilterDto[];
}

export class AggregateMetricsDto {
    @IsUUID('4')
    workspaceId!: string;

    @IsString()
    @IsNotEmpty()
    databaseId!: string;

    @IsArray()
    @ArrayMinSize(1)
    @ValidateNested({ each: true })
    @Type(() => MetricConfigDto)
    metrics!: MetricConfigDto[];

    @IsOptional()
    @IsBoolean()
    forceRefresh?: boolean;
}
