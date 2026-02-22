import { Body, Controller, Get, Post, Query, UseGuards, UseInterceptors } from '@nestjs/common';
import { NotionIntegrationService } from './notion-integration.service';
import { ExchangeCodeDto } from './dto/exchange-code.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtPayload } from '../auth/types/jwt-payload';
import { ListDatabasesDto } from './dto/list-databases.dto';
import { AggregateMetricsDto } from './dto/aggregate-metric.dto';
import { GetDatabaseSchemaDto } from './dto/get-database-schema.dto';
import { QueryDatabaseDto } from './dto/query-database.dto';
import { ResponseEnvelopeInterceptor } from './response-envelope.interceptor';

@UseGuards(JwtAuthGuard)
@UseInterceptors(ResponseEnvelopeInterceptor)
@Controller('api/integrations/notion')
export class NotionIntegrationController {
    constructor(private readonly notionIntegrationService: NotionIntegrationService) { }

    @Post('exchange')
    async exchange(@Body() dto: ExchangeCodeDto, @CurrentUser() user: JwtPayload) {
        return this.notionIntegrationService.exchange(user, dto);
    }

    @Get('databases')
    async listDatabases(@Query() query: ListDatabasesDto, @CurrentUser() user: JwtPayload) {
        return this.notionIntegrationService.listDatabases(query, user.sub);
    }

    @Get('schema')
    async getDatabaseSchema(@Query() query: GetDatabaseSchemaDto, @CurrentUser() user: JwtPayload) {
        return this.notionIntegrationService.getDatabaseSchema(query, user.sub);
    }

    @Post('query')
    async queryDatabase(@Body() dto: QueryDatabaseDto, @CurrentUser() user: JwtPayload) {
        return this.notionIntegrationService.queryDatabase(dto, user.sub);
    }

    @Post('aggregate')
    async aggregateMetric(@Body() dto: AggregateMetricsDto, @CurrentUser() user: JwtPayload) {
        return this.notionIntegrationService.aggregateMetric(dto, user.sub);
    }

    // Temporary debug endpoint to verify stored Notion credentials
    @Get('debug/ping')
    async debugPing(@Query('workspaceId') workspaceId: string, @CurrentUser() user: JwtPayload) {
        return this.notionIntegrationService.testPing(workspaceId, user.sub);
    }
}
