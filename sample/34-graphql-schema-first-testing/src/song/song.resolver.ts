import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { SongService } from './song.service';
import { Query } from '@nestjs/graphql';
import { CreateSongInput, Song } from '../graphql';
import { UpdateSongDTO } from './dto/update-song-dto';
import { DeleteResult, UpdateResult } from 'typeorm';

@Resolver()
export class SongResolver {
  constructor(private songService: SongService) {}

  @Query('songs')
  async getSongs(): Promise<Song[]> {
    return this.songService.getSongs();
  }

  @Query('song')
  async getSong(
    @Args('id')
    id: string,
  ): Promise<Song> {
    return this.songService.getSong(id);
  }

  @Mutation('createSong')
  async createSong(
    @Args('createSongInput')
    args: CreateSongInput,
  ): Promise<Song> {
    return this.songService.createSong(args);
  }
  @Mutation('updateSong')
  async updateSong(
    @Args('id')
    id: string,
    @Args('updateSongInput')
    args: UpdateSongDTO,
  ): Promise<UpdateResult> {
    return this.songService.updateSong(id, args);
  }

  @Mutation('deleteSong')
  async deleteSong(
    @Args('id')
    id: string,
  ): Promise<DeleteResult> {
    return this.songService.deleteSong(id);
  }
}
