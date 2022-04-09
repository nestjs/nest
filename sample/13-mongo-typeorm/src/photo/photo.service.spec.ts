import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Photo } from './photo.entity';
import { PhotoService } from './photo.service';

describe('CatService', () => {
  let service: PhotoService;
  let repository: Repository<Photo>;

  const photosArray = [
    {
      name: 'Photo #1',
      description: 'Description #1',
      filename: 'Filename #1',
      isPublish: true,
    },
    {
      name: 'Photo #2',
      description: 'Description #2',
      filename: 'Filename #2',
      isPublish: true,
    },
  ];

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PhotoService,
        {
          provide: getRepositoryToken(Photo),
          useValue: {
            find: jest.fn().mockResolvedValue(photosArray),
          },
        },
      ],
    }).compile();

    service = module.get<PhotoService>(PhotoService);
    repository = module.get<Repository<Photo>>(getRepositoryToken(Photo));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should return an array of photos', async () => {
    const photos = await service.findAll();
    expect(photos).toEqual(photosArray);
  });
});
