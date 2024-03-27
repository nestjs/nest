import { Test, TestingModule } from '@nestjs/testing';
import { SongService } from './song.service';
import { Song } from './song.entity';
import { FindOneOptions, Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CreateSongDTO } from './dto/create-song-dto';
import { UpdateSongDTO } from './dto/update-song-dto';

describe('SongService', () => {
  let service: SongService;
  let repo: Repository<Song>;

  const oneSong = { id: 'a uuid', title: 'Lover' };
  const songArray = [{ id: 'a uuid', title: 'Lover' }];

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SongService,
        {
          provide: getRepositoryToken(Song),
          useValue: {
            find: jest
              .fn()
              .mockImplementation(() => Promise.resolve(songArray)),
            findOneOrFail: jest
              .fn()
              .mockImplementation((options: FindOneOptions<Song>) => {
                return Promise.resolve(oneSong);
              }),
            create: jest
              .fn()
              .mockImplementation((createSongDTO: CreateSongDTO) => {
                return Promise.resolve(oneSong);
              }),
            save: jest.fn(),
            update: jest
              .fn()
              .mockImplementation(
                (id: string, updateSongDTO: UpdateSongDTO) => {
                  return Promise.resolve({ affected: 1 });
                },
              ),
            delete: jest
              .fn()
              .mockImplementation((id: string) =>
                Promise.resolve({ affected: 1 }),
              ),
          },
        },
      ],
    }).compile();

    service = module.get<SongService>(SongService);
    repo = module.get<Repository<Song>>(getRepositoryToken(Song));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should give me the song by id', async () => {
    const song = await service.getSong('a uuid');
    const repoSpy = jest.spyOn(repo, 'findOneOrFail');
    expect(song).toEqual(oneSong);
    expect(repoSpy).toBeCalledWith({ where: { id: 'a uuid' } });
  });

  it('should create the song', async () => {
    const song = await service.createSong({ title: 'Lover' });
    expect(song).toEqual(oneSong);
    expect(repo.create).toBeCalledTimes(1);
    expect(repo.create).toBeCalledWith({ title: 'Lover' });
  });

  it('should update the song', async () => {
    const result = await service.updateSong('a uuid', { title: 'Lover' });
    expect(repo.update).toBeCalledTimes(1);
    expect(result.affected).toEqual(1);
  });

  it('should delete the song', async () => {
    const song = await service.deleteSong('a uuid');
    const repoSpyOn = jest.spyOn(repo, 'delete');
    expect(repo.delete).toBeCalledTimes(1);
    expect(song.affected).toBe(1);
    expect(repoSpyOn).toBeCalledWith('a uuid');
  });
});
