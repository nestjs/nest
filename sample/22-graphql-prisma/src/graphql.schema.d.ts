
/** ------------------------------------------------------
 * THIS FILE WAS AUTOMATICALLY GENERATED (DO NOT MODIFY)
 * -------------------------------------------------------
 */

/* tslint:disable */
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
    id?: string;
    isPublished?: boolean;
    title: string;
    text: string;
}

export class PostSubscriptionWhereInput {
    AND?: PostSubscriptionWhereInput[];
    OR?: PostSubscriptionWhereInput[];
    NOT?: PostSubscriptionWhereInput[];
    mutation_in?: MutationType[];
    updatedFields_contains?: string;
    updatedFields_contains_every?: string[];
    updatedFields_contains_some?: string[];
    node?: PostWhereInput;
}

export class PostUpdateInput {
    isPublished?: boolean;
    title?: string;
    text?: string;
}

export class PostUpdateManyMutationInput {
    isPublished?: boolean;
    title?: string;
    text?: string;
}

export class PostWhereInput {
    AND?: PostWhereInput[];
    OR?: PostWhereInput[];
    NOT?: PostWhereInput[];
    id?: string;
    id_not?: string;
    id_in?: string[];
    id_not_in?: string[];
    id_lt?: string;
    id_lte?: string;
    id_gt?: string;
    id_gte?: string;
    id_contains?: string;
    id_not_contains?: string;
    id_starts_with?: string;
    id_not_starts_with?: string;
    id_ends_with?: string;
    id_not_ends_with?: string;
    isPublished?: boolean;
    isPublished_not?: boolean;
    title?: string;
    title_not?: string;
    title_in?: string[];
    title_not_in?: string[];
    title_lt?: string;
    title_lte?: string;
    title_gt?: string;
    title_gte?: string;
    title_contains?: string;
    title_not_contains?: string;
    title_starts_with?: string;
    title_not_starts_with?: string;
    title_ends_with?: string;
    title_not_ends_with?: string;
    text?: string;
    text_not?: string;
    text_in?: string[];
    text_not_in?: string[];
    text_lt?: string;
    text_lte?: string;
    text_gt?: string;
    text_gte?: string;
    text_contains?: string;
    text_not_contains?: string;
    text_starts_with?: string;
    text_not_starts_with?: string;
    text_ends_with?: string;
    text_not_ends_with?: string;
}

export class PostWhereUniqueInput {
    id?: string;
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
    abstract updatePost(data: PostUpdateInput, where: PostWhereUniqueInput): Post | Promise<Post>;
    abstract deletePost(where: PostWhereUniqueInput): Post | Promise<Post>;
    abstract upsertPost(where: PostWhereUniqueInput, create: PostCreateInput, update: PostUpdateInput): Post | Promise<Post>;
    abstract updateManyPosts(data: PostUpdateManyMutationInput, where?: PostWhereInput): BatchPayload | Promise<BatchPayload>;
    abstract deleteManyPosts(where?: PostWhereInput): BatchPayload | Promise<BatchPayload>;
}

export class PageInfo {
    hasNextPage: boolean;
    hasPreviousPage: boolean;
    startCursor?: string;
    endCursor?: string;
}

export class Post implements Node {
    id: string;
    isPublished: boolean;
    title: string;
    text: string;
}

export class PostConnection {
    pageInfo: PageInfo;
    edges: PostEdge[];
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
    node?: Post;
    updatedFields?: string[];
    previousValues?: PostPreviousValues;
}

export abstract class IQuery {
    abstract posts(where?: PostWhereInput, orderBy?: PostOrderByInput, skip?: number, after?: string, before?: string, first?: number, last?: number): Post[] | Promise<Post[]>;
    abstract post(where: PostWhereUniqueInput): Post | Promise<Post>;
    abstract postsConnection(where?: PostWhereInput, orderBy?: PostOrderByInput, skip?: number, after?: string, before?: string, first?: number, last?: number): PostConnection | Promise<PostConnection>;
    abstract node(id: string): Node | Promise<Node>;
}

export abstract class ISubscription {
    abstract post(where?: PostSubscriptionWhereInput): PostSubscriptionPayload | Promise<PostSubscriptionPayload>;
}

export type Long = any;
