import { Component } from '@nestjs/common';
import { Vine } from './models/vine.model';

@Component()
export class VinesRepository {
    public save(vine: Vine) {
        console.log('save');
    }
    public getAll() {
        console.log('get all');
    }
}