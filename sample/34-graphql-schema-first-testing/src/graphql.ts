
/*
 * -------------------------------------------------------
 * THIS FILE WAS AUTOMATICALLY GENERATED (DO NOT MODIFY)
 * -------------------------------------------------------
 */

/* tslint:disable */
/* eslint-disable */

export class CreateSongInput {
    title: string;
}

export class UpdateSongInput {
    title?: Nullable<string>;
}

export class Song {
    id: string;
    title?: Nullable<string>;
}

export abstract class IQuery {
    abstract songs(): Song[] | Promise<Song[]>;

    abstract song(id: string): Song | Promise<Song>;
}

export abstract class IMutation {
    abstract createSong(createSongInput: CreateSongInput): Song | Promise<Song>;

    abstract updateSong(id: string, updateSongInput: UpdateSongInput): UpdateResult | Promise<UpdateResult>;

    abstract deleteSong(id: string): DeleteResult | Promise<DeleteResult>;
}

export abstract class ISubscription {
    abstract songCreated(): Song | Promise<Song>;
}

export class UpdateResult {
    affected: number;
}

export class DeleteResult {
    affected: number;
}

type Nullable<T> = T | null;
