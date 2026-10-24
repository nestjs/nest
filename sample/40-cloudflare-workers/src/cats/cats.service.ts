import { Injectable } from '@nestjs/common';
import { CloudflareContext } from '@nestjs/platform-cloudflare';
import type { Env } from '../env.js';
import { CreateCatDto } from './dto/create-cat.dto.js';
import { Cat } from './interfaces/cat.interface.js';

@Injectable()
export class CatsService {
  constructor(private readonly cloudflare: CloudflareContext<Env>) {}

  async create(createCatDto: CreateCatDto): Promise<Cat> {
    const cat: Cat = { id: crypto.randomUUID(), ...createCatDto };
    await this.cloudflare.env.CATS.put(cat.id, JSON.stringify(cat));
    return cat;
  }

  async findAll(): Promise<Cat[]> {
    const { keys } = await this.cloudflare.env.CATS.list();
    const cats = await Promise.all(keys.map(({ name }) => this.findOne(name)));
    return cats.filter((cat): cat is Cat => cat !== null);
  }

  findOne(id: string): Promise<Cat | null> {
    return this.cloudflare.env.CATS.get<Cat>(id, 'json');
  }
}
