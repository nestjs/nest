import { Injectable } from '@nestjs/common';
import { Song } from './song.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { DeleteResult, Repository, UpdateResult } from 'typeorm';
import { CreateSongDTO } from './dto/create-song-dto';
import { UpdateSongDTO } from './dto/update-song-dto';

@Injectable()
export class SongService {
  constructor(
    @InjectRepository(Song)
    private readonly songRepo: Repository<Song>,
  ) {}
  async getSongs(): Promise<Song[]> {
    return this.songRepo.find();
  }
  getSong(id: string) {
    return this.songRepo.findOneOrFail({ where: { id } });
  }
  async createSong(createSongDTO: CreateSongDTO) {
    const newSong = this.songRepo.create(createSongDTO);
    await this.songRepo.save(newSong);
    return newSong;
  }
  async updateSong(id, updateSongDTO: UpdateSongDTO): Promise<UpdateResult> {
    return this.songRepo.update({ id }, updateSongDTO);
  }
  async deleteSong(id: string): Promise<DeleteResult> {
    return this.songRepo.delete(id);
  }
}
