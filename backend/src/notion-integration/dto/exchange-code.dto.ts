import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class ExchangeCodeDto {
    @IsString()
    @IsNotEmpty()
    code!: string;

    @IsUUID('4')
    @IsNotEmpty()
    workspaceId!: string;
}
