import { Test, TestingModule } from '@nestjs/testing';
import { PhotoController } from './photo.controller';
import { PhotoService } from './photo.service';

describe('Photo Controller', () => {
  let controller: PhotoController;
  let service: PhotoService;
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PhotoController],
      providers: [
        {
          provide: PhotoService,
          useValue: {
            findAll: jest.fn().mockResolvedValue([
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
              {
                name: 'Photo #3',
                description: 'Description #3',
                filename: 'Filename #3',
                isPublish: false,
              },
            ]),
          },
        },
      ],
    }).compile();

    controller = module.get<PhotoController>(PhotoController);
    service = module.get<PhotoService>(PhotoService);
  });

  describe('findAll()', () => {
    it('should return an array of photos', () => {
      expect(controller.findAll()).resolves.toEqual([
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
        {
          name: 'Photo #3',
          description: 'Description #3',
          filename: 'Filename #3',
          isPublish: false,
        },
      ]);
    });
  });
});
