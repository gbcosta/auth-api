import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { LoginDto } from './dto/login.dto';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { randomUUID, UUID } from 'node:crypto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async login(loginDto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: {
        email: loginDto.email,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordMatches = await bcrypt.compare(
      loginDto.password,
      user.password,
    );

    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload = {
      sub: user.id,
      email: user.email,
    };

    const accessToken = await this.jwtService.signAsync({
      ...payload,
      jti: randomUUID(),
    });
    const refreshToken = await this.jwtService.signAsync(
      {
        sub: user.id,
        jti: randomUUID(),
      },
      {
        secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
        expiresIn: '7d',
      },
    );

    const refreshTokenHash = await bcrypt.hash(refreshToken, 10);

    await this.prisma.refreshToken.create({
      data: {
        tokenHash: refreshTokenHash,
        userId: user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    return {
      accessToken,
      refreshToken,
    };
  }

  async refresh(refreshToken: string) {
    const payload = await this.jwtService
      .verifyAsync<{
        sub: string;
        jti: UUID;
      }>(refreshToken, {
        secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
      })
      .catch((_) => {
        throw new UnauthorizedException('Invalid refresh token');
      });

    const refreshTokens = await this.prisma.refreshToken.findMany({
      where: {
        userId: payload.sub,
      },
      include: {
        user: true,
      },
    });
    console.log('Tokens no banco:', refreshTokens.length);
    console.log('Token recebido:', refreshToken);

    let validToken: (typeof refreshTokens)[number] | null = null;
    for (const storedToken of refreshTokens) {
      const matches = await bcrypt.compare(refreshToken, storedToken.tokenHash);
      console.log('Token encontrado:', storedToken.id);
      console.log('Match:', matches);

      if (matches) {
        const jtiRefreshTokenRecebido = this.jwtService.decode<{
          sub: string;
          jti: UUID;
        }>(refreshToken);

        const storedTokenJti = this.jwtService.decode<{
          sub: string;
          jti: UUID;
        }>(refreshToken);

        console.log({ refreshToken, storedToken });
        console.log({ jtiRefreshTokenRecebido, storedTokenJti });
        validToken = storedToken;
        break;
      }
    }

    if (!validToken) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    await this.prisma.refreshToken.delete({
      where: {
        id: validToken.id,
      },
    });
    const deleted = await this.prisma.refreshToken.findUnique({
      where: {
        id: validToken.id,
      },
    });
    console.log({ deleted });

    const accessToken = await this.jwtService.signAsync({
      sub: payload.sub,
      jti: randomUUID(),
      email: validToken.user.email,
    });

    const newRefreshToken = await this.jwtService.signAsync(
      {
        sub: payload.sub,
        jti: randomUUID(),
      },
      {
        secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
        expiresIn: '7d',
      },
    );

    const newRefreshTokenHash = await bcrypt.hash(newRefreshToken, 10);

    await this.prisma.refreshToken.create({
      data: {
        tokenHash: newRefreshTokenHash,
        userId: payload.sub,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    return {
      accessToken,
      refreshToken: newRefreshToken,
    };
  }
}
