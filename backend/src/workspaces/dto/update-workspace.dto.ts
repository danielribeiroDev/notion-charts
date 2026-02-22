import { IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateWorkspaceDto {
    @IsString()
    @IsOptional()
    @MinLength(2)
    name?: string;
}
