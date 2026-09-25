import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';

import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

import { JwtService } from '@nestjs/jwt';

describe('Auth (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const user = {
    name: 'auth',
    email: 'auth@example.com',
    password: '12345678',
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    prisma = moduleFixture.get<PrismaService>(PrismaService);

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await app.init();

    await prisma.user.deleteMany();
    await request(app.getHttpServer()).post('/users').send(user).expect(201);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /auth/login', () => {
    it('should login with valid credentials', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: user.email,
          password: user.password,
        })
        .expect(201);

      expect(response.body.accessToken).toBeDefined;
    });

    it('should reject login with invalid password', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: user.email,
          password: 'wrong-password',
        })
        .expect(401);
    });

    it('should reject a non-existent user', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'does-not-exist@email.com',
          password: user.password,
        })
        .expect(401);
    });
  });

  describe('GET /users/me', () => {
    it('should return the authenticated user', async () => {
      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: user.email,
          password: user.password,
        });

      const token = loginResponse.body.accessToken;

      const response = await request(app.getHttpServer())
        .get('/users/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toEqual({
        id: expect.any(String),
        email: user.email,
      });
    });

    it('should reject a request without a token', async () => {
      await request(app.getHttpServer()).get('/users/me').expect(401);
    });

    it('should reject an invalid token', async () => {
      await request(app.getHttpServer())
        .get('/users/me')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });
  });

  describe('POST auth/refresh', () => {
    it('should refresh the acces token', async () => {
      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: user.email,
          password: user.password,
        })
        .expect(201);

      const refreshToken = loginResponse.body.refreshToken;
      const response = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({
          refreshToken,
        })
        .expect(201);

      expect(response.body.accessToken).toBeDefined();
      expect(typeof response.body.accessToken).toBe('string');
    });

    it('should reject an invalid refresh token', async () => {
      await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({
          refreshToken: 'invalid-refresh-token',
        })
        .expect(401);
    });

    it('Should reject an exprired refreshed token', async () => {
      const jwtService = app.get(JwtService);
      const expiredRefreshedToken = await jwtService.signAsync(
        {
          sub: 'some-user',
        },
        {
          secret: process.env.JWT_REFRESH_SECRET,
          expiresIn: '-1s',
        },
      );

      await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({
          refreshToken: expiredRefreshedToken,
        })
        .expect(401);
    });

    it('Should rotate the refresh token', async () => {
      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: user.email,
          password: user.password,
        })
        .expect(201);

      const refreshTokenA = loginResponse.body.refreshToken;

      const refreshResponse = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({
          refreshToken: refreshTokenA,
        })
        .expect(201);

      const refreshTokenB = refreshResponse.body.refreshToken;

      expect(refreshTokenB).toBeDefined();
      expect(refreshTokenB).not.toBe(refreshTokenA);

      await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({
          refreshToken: refreshTokenA,
        })
        .expect(401);

      await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({
          refreshToken: refreshTokenB,
        })
        .expect(201);
    });
  });
});
