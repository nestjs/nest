import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../song/../../src/app.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Song } from '../song/../../src/song/song.entity';
import { SongModule } from '../song/../../src/song/song.module';
import { CreateSongDTO } from '../song/../../src/song/dto/create-song-dto';

describe('Song Resolver (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'postgres',
          url: 'postgres://postgres:root@localhost:5432/test-dev',
          synchronize: true,
          entities: [Song],
          dropSchema: true,
        }),
        SongModule,
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    const songRepository = app.get('SongRepository');
    await songRepository.clear();
  });

  afterAll(async () => {
    await app.close();
  });

  const createSong = (createSongDTO: CreateSongDTO): Promise<Song> => {
    const song = new Song();
    song.title = createSongDTO.title;
    const songRepo = app.get('SongRepository');
    return songRepo.save(song);
  };

  it('/ (GET)', () => {
    return request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect('Hello World!');
  });

  it('(Query) it should get all songs with songs query', async () => {
    const newSong = await createSong({ title: 'Animals' });
    const queryData = {
      query: `query {
        songs {
          id
          title
        }
      }`,
    };
    const results = await request(app.getHttpServer())
      .post('/graphql')
      .send(queryData);

    expect(results.statusCode).toBe(200);
    expect(results.body).toEqual({ data: { songs: [newSong] } });
  });

  it('(Query) it should get a song by id', async () => {
    const newSong = await createSong({ title: 'Animals' });
    const queryData = {
      query: `query GetSong($id: ID!){
        song(id: $id){
          title
          id
        }
      }`,
      variables: {
        id: newSong.id,
      },
    };
    const results = await request(app.getHttpServer())
      .post('/graphql')
      .send(queryData)
      .expect(200);

    expect(results.body).toEqual({ data: { song: newSong } });
  });

  it('(Mutation) it should create a new song', async () => {
    const queryData = {
      query: `mutation CreateSong($createSongInput: CreateSongInput!){
        createSong(createSongInput: $createSongInput){
          title
          id
        }
      }`,
      variables: {
        createSongInput: {
          title: 'Animals',
        },
      },
    };
    const results = await request(app.getHttpServer())
      .post('/graphql')
      .send(queryData)
      .expect(200);

    expect(results.body.data.createSong.title).toBe('Animals');
  });

  it('(Mutation) it should update existing song', async () => {
    const newSong = await createSong({ title: 'Animals' });
    const queryData = {
      query: `mutation UpdateSong($id: ID!, $updateSongInput: UpdateSongInput!){
        updateSong(id: $id, updateSongInput: $updateSongInput){
          affected
        }
      }`,
      variables: {
        id: newSong.id,
        updateSongInput: {
          title: 'Lover',
        },
      },
    };
    const results = await request(app.getHttpServer())
      .post('/graphql')
      .send(queryData)
      .expect(200);

    expect(results.body.data.updateSong.affected).toBe(1);
  });

  it('(Mutation) it should delete existing song', async () => {
    const newSong = await createSong({ title: 'Animals' });
    const queryData = {
      query: `mutation DeleteSong($id: ID!){
        deleteSong(id: $id){
          affected
        }
      }`,
      variables: {
        id: newSong.id,
      },
    };
    const results = await request(app.getHttpServer())
      .post('/graphql')
      .send(queryData)
      .expect(200);

    expect(results.body.data.deleteSong.affected).toBe(1);
  });
});
