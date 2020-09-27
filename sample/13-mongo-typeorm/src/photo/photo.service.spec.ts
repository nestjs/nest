import { Test } from '@nestjs/testing';
import { PhotoService } from './photo.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Photo } from './photo.entity';

describe('Photo Service', () => {
  let service: PhotoService;
  let repository;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        PhotoService,
        {
          provide: getRepositoryToken(Photo),
          useFactory: jest.fn(() => ({
            find: jest.fn(),
          })),
        },
      ],
    }).compile();
    service = module.get<PhotoService>(PhotoService);
    repository = module.get(getRepositoryToken(Photo));
  });

  it('should return all photos from the repository', async () => {
    repository.find.mockReturnValueOnce([]);
    expect(await service.findAll()).toEqual([]);
    expect(repository.find).toHaveBeenCalledTimes(1);
  });

});
