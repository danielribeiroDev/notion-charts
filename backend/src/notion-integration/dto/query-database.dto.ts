import { IsArray, IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';

export class QueryDatabaseDto {
    @IsUUID('4')
    @IsNotEmpty()
    workspaceId!: string;

    @IsString()
    @IsNotEmpty()
    databaseId!: string;

    @IsOptional()
    filter?: Record<string, unknown>;

    @IsOptional()
    @IsArray()
    sorts?: Array<Record<string, unknown>>;

    @IsOptional()
    @IsString()
    startCursor?: string;

    @IsOptional()
    @IsNumber()
    @Min(1)
    @Max(100)
    pageSize?: number;
}
