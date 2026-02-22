import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateWorkspaceDto } from './dto/create-workspace.dto';
import { UpdateWorkspaceDto } from './dto/update-workspace.dto';

@Injectable()
export class WorkspacesService {
    constructor(private readonly prisma: PrismaService) { }

    list(userId: string) {
        return this.prisma.workspace.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
        });
    }

    async getById(userId: string, id: string) {
        const workspace = await this.prisma.workspace.findFirst({ where: { id, userId } });
        if (!workspace) {
            throw new NotFoundException('Workspace not found');
        }
        return workspace;
    }

    create(userId: string, dto: CreateWorkspaceDto) {
        return this.prisma.workspace.create({
            data: {
                name: dto.name,
                userId,
            },
        });
    }

    async update(userId: string, id: string, dto: UpdateWorkspaceDto) {
        const updated = await this.prisma.workspace.updateMany({
            where: { id, userId },
            data: { ...dto },
        });
        if (updated.count === 0) {
            throw new NotFoundException('Workspace not found');
        }
        return this.prisma.workspace.findUnique({ where: { id } });
    }

    async remove(userId: string, id: string) {
        const deleted = await this.prisma.workspace.deleteMany({ where: { id, userId } });
        if (deleted.count === 0) {
            throw new NotFoundException('Workspace not found');
        }
        return { success: true };
    }
}
