import { Test, TestingModule } from '@nestjs/testing';
import { SongResolver } from './song.resolver';
import { SongService } from '../../src/song/song.service';
import { CreateSongInput, UpdateSongInput } from '../../src/graphql';

describe('SongResolver', () => {
  let resolver: SongResolver;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SongResolver,
        {
          provide: SongService,
          useValue: {
            getSongs: jest
              .fn()
              .mockResolvedValue([{ id: 'a uuid', title: 'Dancing Feat' }]),
            getSong: jest.fn().mockImplementation((id: string) => {
              return Promise.resolve({ id: id, title: 'Dancing' });
            }),
            createSong: jest
              .fn()
              .mockImplementation((createSongInput: CreateSongInput) => {
                return Promise.resolve({ id: 'a uuid', ...createSongInput });
              }),
            updateSong: jest
              .fn()
              .mockImplementation(
                (id, string, updateSongInput: UpdateSongInput) => {
                  return Promise.resolve({ affected: 1 });
                },
              ),

            deleteSong: jest.fn().mockImplementation((id: string) => {
              return Promise.resolve({ affected: 1 });
            }),
          },
        },
      ],
    }).compile();

    resolver = module.get<SongResolver>(SongResolver);
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });

  it('should fetch the songs', async () => {
    const songs = await resolver.getSongs();
    expect(songs).toEqual([{ id: 'a uuid', title: 'Dancing Feat' }]);
    expect(songs.length).toBe(1);
  });

  it('should create new song', async () => {
    const song = await resolver.createSong({ title: 'Animals' });
    expect(song).toEqual({ id: 'a uuid', title: 'Animals' });
  });

  it('should update the song', async () => {
    const song = await resolver.updateSong('a uuid', { title: 'DANCING FEAT' });
    expect(song.affected).toBe(1);
  });

  it('should delete the song', async () => {
    const song = await resolver.deleteSong('a uuid');
    expect(song.affected).toBe(1);
  });
});
