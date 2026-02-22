import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { JwtPayload, PlanType } from './types/jwt-payload';
import { Tokens } from './types/tokens';

@Injectable()
export class AuthService {
    private readonly accessSecret: string;
    private readonly refreshSecret: string;
    private readonly accessExpiresIn: string | number;
    private readonly refreshExpiresIn: string | number;

    constructor(
        private readonly prisma: PrismaService,
        private readonly jwtService: JwtService,
        configService: ConfigService,
    ) {
        this.accessSecret = configService.get<string>('JWT_SECRET', 'change-me');
        this.refreshSecret = configService.get<string>('JWT_REFRESH_SECRET', this.accessSecret);
        this.accessExpiresIn = configService.get<string>('JWT_ACCESS_EXPIRES', '15m');
        this.refreshExpiresIn = configService.get<string>('JWT_REFRESH_EXPIRES', '7d');
    }

    async register(dto: RegisterDto): Promise<Tokens> {
        const exists = await this.prisma.user.findUnique({ where: { email: dto.email } });
        if (exists) {
            throw new ConflictException('User already exists');
        }

        const passwordHash = await bcrypt.hash(dto.password, 10);
        const user = await this.prisma.user.create({
            data: { email: dto.email, passwordHash },
        });

        return this.signTokens({ sub: user.id, email: user.email, planType: user.planType as PlanType });
    }

    async login(dto: LoginDto): Promise<Tokens> {
        const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
        if (!user) {
            throw new UnauthorizedException('Invalid credentials');
        }

        const valid = await bcrypt.compare(dto.password, user.passwordHash);
        if (!valid) {
            throw new UnauthorizedException('Invalid credentials');
        }

        return this.signTokens({ sub: user.id, email: user.email, planType: user.planType as PlanType });
    }

    async refresh(dto: RefreshDto): Promise<Tokens> {
        try {
            const payload = await this.jwtService.verifyAsync<JwtPayload>(dto.refreshToken, {
                secret: this.refreshSecret,
            });

            const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
            if (!user) {
                throw new UnauthorizedException('User not found');
            }

            return this.signTokens({ sub: user.id, email: user.email, planType: user.planType as PlanType });
        } catch {
            throw new UnauthorizedException('Invalid refresh token');
        }
    }

    private async signTokens(payload: JwtPayload): Promise<Tokens> {
        const [accessToken, refreshToken] = await Promise.all([
            this.jwtService.signAsync(payload, {
                secret: this.accessSecret,
                expiresIn: this.accessExpiresIn as any,
            }),
            this.jwtService.signAsync(payload, {
                secret: this.refreshSecret,
                expiresIn: this.refreshExpiresIn as any,
            }),
        ]);

        return {
            accessToken,
            refreshToken,
            expiresIn: this.accessExpiresIn,
        };
    }
}
