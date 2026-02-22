import { CanActivate, ExecutionContext, Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtPayload } from '../../auth/types/jwt-payload';
import { CreateChartDto } from '../dto/create-chart.dto';

@Injectable()
export class PlanGuard implements CanActivate {
    constructor(private readonly prisma: PrismaService) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const req = context.switchToHttp().getRequest();
        const user = req.user as JwtPayload | undefined;
        const body = req.body as CreateChartDto;

        if (!user) {
            throw new ForbiddenException('User context missing');
        }

        if (user.planType !== 'FREE') {
            return true; // PRO is unlimited
        }

        // For FREE, enforce max 1 chart across all user workspaces
        const count = await this.prisma.chart.count({
            where: {
                workspace: { userId: user.sub },
            },
        });

        if (count >= 1) {
            throw new ForbiddenException('Free plan allows only 1 chart');
        }

        return true;
    }
}
