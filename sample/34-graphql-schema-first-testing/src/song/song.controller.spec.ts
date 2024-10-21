import { Test, TestingModule } from '@nestjs/testing';
import { SongController } from './song.controller';
import { SongService } from './song.service';
import { CreateSongDTO } from './dto/create-song-dto';
import { UpdateSongDTO } from './dto/update-song-dto';

describe('SongController', () => {
  let controller: SongController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SongController],
      providers: [
        SongService,
        {
          provide: SongService,
          useValue: {
            getSongs: jest
              .fn()
              .mockResolvedValue([{ id: 1, title: 'Dancing Feat' }]),
            getSong: jest.fn().mockImplementation((id: string) => {
              return Promise.resolve({ id: id, title: 'Dancing' });
            }),
            createSong: jest
              .fn()
              .mockImplementation((createSongDTO: CreateSongDTO) => {
                return Promise.resolve({ id: 'a uuid', ...createSongDTO });
              }),
            updateSong: jest
              .fn()
              .mockImplementation((updateSongDTO: UpdateSongDTO) => {
                return Promise.resolve({ affected: 1 });
              }),

            deleteSong: jest.fn().mockImplementation((id: string) => {
              return Promise.resolve({ affected: 1 });
            }),
          },
        },
      ],
    }).compile();

    controller = module.get<SongController>(SongController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getSongs', () => {
    it('should fetch all the songs', async () => {
      const songs = await controller.getSongs();
      expect(songs).toEqual([{ id: 1, title: 'Dancing Feat' }]);
    });
  });

  describe('getSong by id', () => {
    it('should give me the song by id', async () => {
      const song = await controller.getSong('a uuid');
      expect(song.id).toBe('a uuid');
    });
  });

  describe('createSong', () => {
    it('should create a new song', async () => {
      const newSongDTO: CreateSongDTO = {
        title: 'Runaway',
      };
      const song = await controller.createSong(newSongDTO);
      expect(song.title).toBe('Runaway');
      expect(song).toEqual({ id: 'a uuid', title: 'Runaway' });
    });
  });

  describe('updateSong', () => {
    it('should update the song DTO', async () => {
      const updatesongDTO: UpdateSongDTO = {
        title: 'Animals',
      };
      const updateResults = await controller.updateSong(
        'a uuid',
        updatesongDTO,
      );
      expect(updateResults).toBeDefined();
      expect(updateResults.affected).toBe(1);
    });
  });

  describe('deleteSong', () => {
    it('should delete the song', async () => {
      const deleteResult = await controller.deleteSong('a uuid');
      expect(deleteResult.affected).toBe(1);
    });
  });
});
