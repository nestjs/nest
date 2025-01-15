import { Injectable } from '@nestjs/common';
import { Post } from './posts.interfaces';

@Injectable()
export class PostsService {
  private posts: Post[] = [
    { authorId: 1, id: 1, title: 'Lorem Ipsum', body: 'Foo' },
    { authorId: 1, id: 2, title: 'Foo', body: 'Bar' },
    { authorId: 2, id: 3, title: 'Bar', body: 'Baz' },
    { authorId: 2, id: 4, title: 'Hello World', body: 'World' },
  ];

  findOneByAuthorId(authorId: number) {
    return this.posts.filter((post) => post.authorId === Number(authorId));
  }

  findOne(postId: number) {
    return this.posts.find((post) => post.id === postId);
  }

  findAll() {
    return this.posts;
  }
}
