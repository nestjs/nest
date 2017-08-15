import { Component } from '@nestjs/common';
import { VinesRepository } from './vines.repository';

@Component()
export class VinesXd {
    constructor(private readonly vinesRepository: VinesRepository) {}

    public save() {
        this.vinesRepository.save(null);
    }

    public getAll() {
        this.vinesRepository.getAll();
    }
}