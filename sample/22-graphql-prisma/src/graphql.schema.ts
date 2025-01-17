/*
 * -------------------------------------------------------
 * THIS FILE WAS AUTOMATICALLY GENERATED (DO NOT MODIFY)
 * -------------------------------------------------------
 */

/* tslint:disable */

export class NewPost {
  title: string;
  text: string;
}

export class UpdatePost {
  id: string;
  title?: Nullable<string>;
  text?: Nullable<string>;
  isPublished?: Nullable<boolean>;
}

export class Post {
  id: string;
  title: string;
  text: string;
  isPublished: boolean;
}

export abstract class IQuery {
  abstract posts(): Post[] | Promise<Post[]>;

  abstract post(id: string): Nullable<Post> | Promise<Nullable<Post>>;
}

export abstract class IMutation {
  abstract createPost(input: NewPost): Post | Promise<Post>;

  abstract updatePost(
    input: UpdatePost,
  ): Nullable<Post> | Promise<Nullable<Post>>;

  abstract deletePost(id: string): Nullable<Post> | Promise<Nullable<Post>>;
}

export abstract class ISubscription {
  abstract postCreated(): Nullable<Post> | Promise<Nullable<Post>>;
}

type Nullable<T> = T | null;
