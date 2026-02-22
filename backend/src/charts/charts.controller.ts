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
import { ChartsService } from './charts.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtPayload } from '../auth/types/jwt-payload';
import { CreateChartDto } from './dto/create-chart.dto';
import { UpdateChartDto } from './dto/update-chart.dto';
import { PlanGuard } from './guards/plan.guard';

@UseGuards(JwtAuthGuard)
@Controller('charts')
export class ChartsController {
    constructor(private readonly chartsService: ChartsService) { }

    @Get()
    list(@CurrentUser() user: JwtPayload) {
        return this.chartsService.list(user);
    }

    @Get(':id')
    getById(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
        return this.chartsService.getById(user, id);
    }

    @Post(':id/compute')
    compute(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
        return this.chartsService.compute(user, id);
    }

    @UseGuards(PlanGuard)
    @Post()
    create(@Body() dto: CreateChartDto, @CurrentUser() user: JwtPayload) {
        return this.chartsService.create(user, dto);
    }

    @Patch(':id')
    update(
        @Param('id') id: string,
        @Body() dto: UpdateChartDto,
        @CurrentUser() user: JwtPayload,
    ) {
        return this.chartsService.update(user, id, dto);
    }

    @Delete(':id')
    remove(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
        return this.chartsService.remove(user, id);
    }
}
