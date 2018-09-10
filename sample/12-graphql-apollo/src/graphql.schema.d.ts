export class Cat {
    id?: number;
    name?: string;
    age?: number;
}

export class IMutation {
    createCat(name?: string): Cat | Promise<Cat>;
}

export class IQuery {
    getCats(): Cat[] | Promise<Cat[]>;
    cat(id: string): Cat | Promise<Cat>;
}

export class ISubscription {
    catCreated(): Cat | Promise<Cat>;
}
