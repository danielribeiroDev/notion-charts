import { Module } from '@nestjs/common';
import { ChartsService } from './charts.service';
import { ChartsController } from './charts.controller';
import { PlanGuard } from './guards/plan.guard';
import { NotionIntegrationModule } from '../notion-integration/notion-integration.module';

@Module({
    imports: [NotionIntegrationModule],
    controllers: [ChartsController],
    providers: [ChartsService, PlanGuard],
})
export class ChartsModule { }
