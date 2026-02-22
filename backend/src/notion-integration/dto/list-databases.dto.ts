import { IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';

export class ListDatabasesDto {
    @IsUUID('4')
    workspaceId!: string;

    @IsOptional()
    @IsString()
    startCursor?: string;

    @IsOptional()
    @Min(1)
    @Max(100)
    pageSize?: number;
}