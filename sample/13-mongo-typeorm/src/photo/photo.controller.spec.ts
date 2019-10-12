import { Test } from '@nestjs/testing';
import { PhotoController } from './photo.controller';
import { PhotoService } from './photo.service';

describe('Photo Controller', () => {
  let controller: PhotoController;
  let service;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [PhotoController],
      providers: [
        {
          provide: PhotoService,
          useFactory: jest.fn(() => ({
            findAll: jest.fn(),
          })),
        },
      ],
    }).compile();
    controller = module.get<PhotoController>(PhotoController);
    service = module.get(PhotoService);
  });

  it('should return all photos from the service', async () => {
    service.findAll.mockReturnValueOnce([]);
    expect(await controller.findAll()).toEqual([]);
    expect(service.findAll).toHaveBeenCalledTimes(1);
  });

});
