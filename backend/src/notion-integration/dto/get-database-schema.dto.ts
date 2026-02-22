import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class GetDatabaseSchemaDto {
    @IsUUID('4')
    @IsNotEmpty()
    workspaceId!: string;

    @IsString()
    @IsNotEmpty()
    databaseId!: string;
}
