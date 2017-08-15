import { Component } from '@nestjs/common';
import { VinesRepository } from './vines.repository';
import { VinesXd } from './vines.xd';

@Component()
export class VinesService {
    constructor(private readonly vinesRepository: VinesXd) {}

    public save() {
        this.vinesRepository.save();
    }

    public getAll() {
        this.vinesRepository.getAll();
    }
}