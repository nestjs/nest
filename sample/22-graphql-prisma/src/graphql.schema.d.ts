
/*
 * -------------------------------------------------------
 * THIS FILE WAS AUTOMATICALLY GENERATED (DO NOT MODIFY)
 * -------------------------------------------------------
 */

/* tslint:disable */
/* eslint-disable */
export enum MutationType {
    CREATED = "CREATED",
    UPDATED = "UPDATED",
    DELETED = "DELETED"
}

export enum PostOrderByInput {
    id_ASC = "id_ASC",
    id_DESC = "id_DESC",
    isPublished_ASC = "isPublished_ASC",
    isPublished_DESC = "isPublished_DESC",
    title_ASC = "title_ASC",
    title_DESC = "title_DESC",
    text_ASC = "text_ASC",
    text_DESC = "text_DESC"
}

export class PostCreateInput {
    id?: Nullable<string>;
    isPublished?: Nullable<boolean>;
    title: string;
    text: string;
}

export class PostSubscriptionWhereInput {
    AND?: Nullable<PostSubscriptionWhereInput[]>;
    OR?: Nullable<PostSubscriptionWhereInput[]>;
    NOT?: Nullable<PostSubscriptionWhereInput[]>;
    mutation_in?: Nullable<MutationType[]>;
    updatedFields_contains?: Nullable<string>;
    updatedFields_contains_every?: Nullable<string[]>;
    updatedFields_contains_some?: Nullable<string[]>;
    node?: Nullable<PostWhereInput>;
}

export class PostUpdateInput {
    isPublished?: Nullable<boolean>;
    title?: Nullable<string>;
    text?: Nullable<string>;
}

export class PostUpdateManyMutationInput {
    isPublished?: Nullable<boolean>;
    title?: Nullable<string>;
    text?: Nullable<string>;
}

export class PostWhereInput {
    AND?: Nullable<PostWhereInput[]>;
    OR?: Nullable<PostWhereInput[]>;
    NOT?: Nullable<PostWhereInput[]>;
    id?: Nullable<string>;
    id_not?: Nullable<string>;
    id_in?: Nullable<string[]>;
    id_not_in?: Nullable<string[]>;
    id_lt?: Nullable<string>;
    id_lte?: Nullable<string>;
    id_gt?: Nullable<string>;
    id_gte?: Nullable<string>;
    id_contains?: Nullable<string>;
    id_not_contains?: Nullable<string>;
    id_starts_with?: Nullable<string>;
    id_not_starts_with?: Nullable<string>;
    id_ends_with?: Nullable<string>;
    id_not_ends_with?: Nullable<string>;
    isPublished?: Nullable<boolean>;
    isPublished_not?: Nullable<boolean>;
    title?: Nullable<string>;
    title_not?: Nullable<string>;
    title_in?: Nullable<string[]>;
    title_not_in?: Nullable<string[]>;
    title_lt?: Nullable<string>;
    title_lte?: Nullable<string>;
    title_gt?: Nullable<string>;
    title_gte?: Nullable<string>;
    title_contains?: Nullable<string>;
    title_not_contains?: Nullable<string>;
    title_starts_with?: Nullable<string>;
    title_not_starts_with?: Nullable<string>;
    title_ends_with?: Nullable<string>;
    title_not_ends_with?: Nullable<string>;
    text?: Nullable<string>;
    text_not?: Nullable<string>;
    text_in?: Nullable<string[]>;
    text_not_in?: Nullable<string[]>;
    text_lt?: Nullable<string>;
    text_lte?: Nullable<string>;
    text_gt?: Nullable<string>;
    text_gte?: Nullable<string>;
    text_contains?: Nullable<string>;
    text_not_contains?: Nullable<string>;
    text_starts_with?: Nullable<string>;
    text_not_starts_with?: Nullable<string>;
    text_ends_with?: Nullable<string>;
    text_not_ends_with?: Nullable<string>;
}

export class PostWhereUniqueInput {
    id?: Nullable<string>;
}

export interface Node {
    id: string;
}

export class AggregatePost {
    count: number;
}

export class BatchPayload {
    count: Long;
}

export abstract class IMutation {
    abstract createPost(data: PostCreateInput): Post | Promise<Post>;
    abstract updatePost(data: PostUpdateInput, where: PostWhereUniqueInput): Nullable<Post> | Promise<Nullable<Post>>;
    abstract deletePost(where: PostWhereUniqueInput): Nullable<Post> | Promise<Nullable<Post>>;
    abstract upsertPost(where: PostWhereUniqueInput, create: PostCreateInput, update: PostUpdateInput): Post | Promise<Post>;
    abstract updateManyPosts(data: PostUpdateManyMutationInput, where?: Nullable<PostWhereInput>): BatchPayload | Promise<BatchPayload>;
    abstract deleteManyPosts(where?: Nullable<PostWhereInput>): BatchPayload | Promise<BatchPayload>;
}

export class PageInfo {
    hasNextPage: boolean;
    hasPreviousPage: boolean;
    startCursor?: Nullable<string>;
    endCursor?: Nullable<string>;
}

export class Post implements Node {
    id: string;
    isPublished: boolean;
    title: string;
    text: string;
}

export class PostConnection {
    pageInfo: PageInfo;
    edges: Nullable<PostEdge>[];
    aggregate: AggregatePost;
}

export class PostEdge {
    node: Post;
    cursor: string;
}

export class PostPreviousValues {
    id: string;
    isPublished: boolean;
    title: string;
    text: string;
}

export class PostSubscriptionPayload {
    mutation: MutationType;
    node?: Nullable<Post>;
    updatedFields?: Nullable<string[]>;
    previousValues?: Nullable<PostPreviousValues>;
}

export abstract class IQuery {
    abstract posts(where?: Nullable<PostWhereInput>, orderBy?: Nullable<PostOrderByInput>, skip?: Nullable<number>, after?: Nullable<string>, before?: Nullable<string>, first?: Nullable<number>, last?: Nullable<number>): Nullable<Post>[] | Promise<Nullable<Post>[]>;
    abstract post(where: PostWhereUniqueInput): Nullable<Post> | Promise<Nullable<Post>>;
    abstract postsConnection(where?: Nullable<PostWhereInput>, orderBy?: Nullable<PostOrderByInput>, skip?: Nullable<number>, after?: Nullable<string>, before?: Nullable<string>, first?: Nullable<number>, last?: Nullable<number>): PostConnection | Promise<PostConnection>;
    abstract node(id: string): Nullable<Node> | Promise<Nullable<Node>>;
}

export abstract class ISubscription {
    abstract post(where?: Nullable<PostSubscriptionWhereInput>): Nullable<PostSubscriptionPayload> | Promise<Nullable<PostSubscriptionPayload>>;
}

export type Long = any;
type Nullable<T> = T | null;
