import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { WorkspacesModule } from './workspaces/workspaces.module';
import { ChartsModule } from './charts/charts.module';
import { NotionIntegrationModule } from './notion-integration/notion-integration.module';
import { RedisModule } from './redis/redis.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    RedisModule,
    AuthModule,
    WorkspacesModule,
    ChartsModule,
    NotionIntegrationModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
