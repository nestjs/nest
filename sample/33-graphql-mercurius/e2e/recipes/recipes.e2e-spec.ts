import { INestApplication } from '@nestjs/common';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { RecipesService } from '../../src/recipes/recipes.service';

describe('GraphQL Mercurius Recipes (e2e)', () => {
  let app: INestApplication;

  const mockRecipes = [
    {
      id: '1',
      title: 'Test Recipe',
      description: 'A test recipe',
      creationDate: new Date('2024-01-01'),
      ingredients: ['ingredient1', 'ingredient2'],
    },
  ];

  const mockRecipesService = {
    findAll: jest.fn().mockResolvedValue(mockRecipes),
    findOneById: jest.fn().mockResolvedValue(mockRecipes[0]),
    create: jest.fn().mockResolvedValue(mockRecipes[0]),
    remove: jest.fn().mockResolvedValue(true),
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(RecipesService)
      .useValue(mockRecipesService)
      .compile();

    app = moduleRef.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter(),
    );
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('should query recipes', () => {
    return request(app.getHttpServer())
      .post('/graphql')
      .send({
        query: '{ recipes { id title description ingredients } }',
      })
      .expect(200)
      .expect(res => {
        expect(res.body.data.recipes).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              id: '1',
              title: 'Test Recipe',
              description: 'A test recipe',
              ingredients: ['ingredient1', 'ingredient2'],
            }),
          ]),
        );
      });
  });

  it('should query a single recipe by id', () => {
    return request(app.getHttpServer())
      .post('/graphql')
      .send({
        query: '{ recipe(id: "1") { id title description } }',
      })
      .expect(200)
      .expect(res => {
        expect(res.body.data.recipe).toEqual(
          expect.objectContaining({
            id: '1',
            title: 'Test Recipe',
            description: 'A test recipe',
          }),
        );
      });
  });

  it('should add a new recipe', () => {
    return request(app.getHttpServer())
      .post('/graphql')
      .send({
        query: `mutation {
          addRecipe(newRecipeData: {
            title: "Test Recipe"
            ingredients: ["ingredient1", "ingredient2"]
          }) {
            id
            title
            ingredients
          }
        }`,
      })
      .expect(200)
      .expect(res => {
        expect(res.body.data.addRecipe).toBeDefined();
        expect(res.body.data.addRecipe.id).toBe('1');
        expect(res.body.data.addRecipe.title).toBe('Test Recipe');
      });
  });

  it('should remove a recipe', () => {
    return request(app.getHttpServer())
      .post('/graphql')
      .send({
        query: 'mutation { removeRecipe(id: "1") }',
      })
      .expect(200)
      .expect(res => {
        expect(res.body.data.removeRecipe).toBe(true);
      });
  });
});
