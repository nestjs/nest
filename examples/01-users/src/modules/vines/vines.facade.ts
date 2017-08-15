import { Component, Get } from '@nestjs/common';
import { VinesService } from './vines.service';

@Component()
export class VinesFacade {
    constructor(private readonly vinesService: VinesService) {}

    public save() {
        this.vinesService.save();
    }

    public getAll() {
        this.vinesService.getAll();
    }
}