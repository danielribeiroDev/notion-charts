import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateWorkspaceDto } from './dto/create-workspace.dto';
import { UpdateWorkspaceDto } from './dto/update-workspace.dto';

@Injectable()
export class WorkspacesService {
    constructor(private readonly prisma: PrismaService) { }

    async list(userId: string) {
        const workspaces = await this.prisma.workspace.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            include: { credential: { select: { id: true } } },
        });
        return workspaces.map(({ credential, ...ws }) => ({
            ...ws,
            notionConnected: credential !== null,
        }));
    }

    async getById(userId: string, id: string) {
        const result = await this.prisma.workspace.findFirst({
            where: { id, userId },
            include: { credential: { select: { id: true } } },
        });
        if (!result) {
            throw new NotFoundException('Workspace not found');
        }
        const { credential, ...workspace } = result;
        return { ...workspace, notionConnected: credential !== null };
    }

    async create(userId: string, dto: CreateWorkspaceDto) {
        const workspace = await this.prisma.workspace.create({
            data: {
                name: dto.name,
                userId,
            },
        });
        return { ...workspace, notionConnected: false };
    }

    async update(userId: string, id: string, dto: UpdateWorkspaceDto) {
        const updated = await this.prisma.workspace.updateMany({
            where: { id, userId },
            data: { ...dto },
        });
        if (updated.count === 0) {
            throw new NotFoundException('Workspace not found');
        }
        return this.getById(userId, id);
    }

    async remove(userId: string, id: string) {
        const deleted = await this.prisma.workspace.deleteMany({ where: { id, userId } });
        if (deleted.count === 0) {
            throw new NotFoundException('Workspace not found');
        }
        return { success: true };
    }
}
