import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    Patch,
    Post,
    UseGuards,
} from '@nestjs/common';
import { WorkspacesService } from './workspaces.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtPayload } from '../auth/types/jwt-payload';
import { CreateWorkspaceDto } from './dto/create-workspace.dto';
import { UpdateWorkspaceDto } from './dto/update-workspace.dto';

@UseGuards(JwtAuthGuard)
@Controller('workspaces')
export class WorkspacesController {
    constructor(private readonly workspacesService: WorkspacesService) { }

    @Get()
    list(@CurrentUser() user: JwtPayload) {
        return this.workspacesService.list(user.sub);
    }

    @Get(':id')
    getById(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
        return this.workspacesService.getById(user.sub, id);
    }

    @Post()
    create(@Body() dto: CreateWorkspaceDto, @CurrentUser() user: JwtPayload) {
        return this.workspacesService.create(user.sub, dto);
    }

    @Patch(':id')
    update(
        @Param('id') id: string,
        @Body() dto: UpdateWorkspaceDto,
        @CurrentUser() user: JwtPayload,
    ) {
        return this.workspacesService.update(user.sub, id, dto);
    }

    @Delete(':id')
    remove(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
        return this.workspacesService.remove(user.sub, id);
    }
}
