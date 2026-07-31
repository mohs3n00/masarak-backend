import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { JwtAuthGuard } from '../src/common/guards/jwt-auth.guard';
import { RolesGuard } from '../src/common/guards/roles.guard';

describe('Community Module (e2e)', () => {
  let app: INestApplication;
  let spaceId = '';
  let postId = '';
  let commentId = '';

  beforeAll(async () => {
    const mockUser = {
      id: 'test-admin-id',
      name: 'Admin Test',
      role: 'SUPER_ADMIN',
    };
    const mockAuthGuard = {
      canActivate: (context: any) => {
        const req = context.switchToHttp().getRequest();
        req.user = mockUser;
        return true;
      },
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(mockAuthGuard)
      .overrideGuard(RolesGuard)
      .useValue(mockAuthGuard)
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    await app.init();
  }, 30000); // Allow time to initialize

  afterAll(async () => {
    await app.close();
  });

  it('1. POST /community/spaces - Create Space', async () => {
    const res = await request(app.getHttpServer())
      .post('/community/spaces')
      .send({
        name: 'Test Space',
        type: 'global',
        slug: 'test-space-' + Date.now(),
      })
      .expect(201);
    spaceId = res.body.id;
    expect(spaceId).toBeDefined();
  });

  it('2. GET /community/spaces/global - Get Spaces', async () => {
    const res = await request(app.getHttpServer())
      .get('/community/spaces/global')
      .expect(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('3. POST /community/posts - Create Post', async () => {
    const res = await request(app.getHttpServer())
      .post('/community/posts')
      .send({ spaceId, content: 'This is a test post', tags: ['test'] })
      .expect(201);
    postId = res.body.id;
    expect(postId).toBeDefined();
  });

  it('4. GET /community/posts/:id - Get Post by ID', async () => {
    const res = await request(app.getHttpServer())
      .get('/community/posts/' + postId)
      .expect(200);
    expect(res.body.id).toEqual(postId);
  });

  it('5. GET /community/posts - Get Feed', async () => {
    const res = await request(app.getHttpServer())
      .get('/community/posts?spaceId=' + spaceId)
      .expect(200);
    expect(res.body.data).toBeDefined();
  });

  it('6. POST /community/comments - Create Comment', async () => {
    const res = await request(app.getHttpServer())
      .post('/community/comments')
      .send({ postId, content: 'This is a test comment' })
      .expect(201);
    commentId = res.body.id;
    expect(commentId).toBeDefined();
  });

  it('7. GET /community/comments/post/:id - Get Comments', async () => {
    const res = await request(app.getHttpServer())
      .get('/community/comments/post/' + postId)
      .expect(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('8. POST /community/reactions/toggle - Toggle Reaction', async () => {
    const res = await request(app.getHttpServer())
      .post('/community/reactions/toggle')
      .send({ targetId: postId, targetType: 'post', type: 'like' })
      .expect(201);
    expect(res.body).toBeDefined();
  });

  it('9. GET /community/search - Search Posts', async () => {
    const res = await request(app.getHttpServer())
      .get('/community/search?q=test')
      .expect(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('10. GET /community/notifications - Get Notifications', async () => {
    const res = await request(app.getHttpServer())
      .get('/community/notifications')
      .expect(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});
