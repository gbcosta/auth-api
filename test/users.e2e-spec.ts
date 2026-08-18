import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';

import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Users (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

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
  });

  afterAll(async () => {
    await prisma.user.deleteMany();
    await app.close();
  });

  describe('POST /users', () => {
    it('should create a user', async () => {
      const response = await request(app.getHttpServer())
        .post('/users')
        .send({
          name: 'Gabriel',
          email: 'test@example.com',
          password: '12345678',
        })
        .expect(201);

      expect(response.body).toEqual(
        expect.objectContaining({
          name: 'Gabriel',
          email: 'test@example.com',
        }),
      );

      expect(response.body.password).toBeUndefined();
    });

    it('should reject invalid email', async () => {
      await request(app.getHttpServer())
        .post('/users')
        .send({
          name: 'Gabriel',
          email: 'invalid-email',
          password: '12345678',
        })
        .expect(400);
    });

    it('should reject short password', async () => {
      await request(app.getHttpServer())
        .post('/users')
        .send({
          name: 'Gabriel',
          email: 'invalid-email',
          password: '1',
        })
        .expect(400);
    });

    it('should reject a short name', async () => {
      await request(app.getHttpServer())
        .post('/users')
        .send({
          name: 'G',
          email: 'another2@example.com',
          password: '12345678',
        })
        .expect(400);
    });

    it('should reject unknown fields', async () => {
      await request(app.getHttpServer())
        .post('/users')
        .send({
          name: 'Gabriel',
          email: 'another3@example.com',
          password: '12345678',
          isAdmin: true,
        })
        .expect(400);
    });
    it('should reject a duplicated email', async () => {
      const user = {
        name: 'Gabriel',
        email: 'duplicate@example.com',
        password: '12345678',
      };

      await request(app.getHttpServer()).post('/users').send(user).expect(201);

      const response = await request(app.getHttpServer())
        .post('/users')
        .send(user)
        .expect(409);

      expect(response.body.message).toBe('Email already in use');
    });
  });
});
