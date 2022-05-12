import { Injectable } from '@nestjs/common';
import { Cats } from '@prisma/client';
import { PrismaService } from 'prisma/prisma.service';

@Injectable()
export class CatsService {
  constructor(private prismaService: PrismaService) {}

  async getAllCats(): Promise<Cats[]> {
    return this.prismaService.cats.findMany();
  }

  async getCat(id: string): Promise<Cats> {
    return this.prismaService.cats.findUnique({ where: { id } });
  }

  async createCat(cat: Cats): Promise<Cats> {
    return this.prismaService.cats.create({ data: cat });
  }

  async updateCat(id: string, cat: Cats): Promise<Cats> {
    return this.prismaService.cats.update({ where: { id }, data: cat });
  }

  async deleteCat(id: string): Promise<Cats> {
    return this.prismaService.cats.delete({ where: { id } });
  }
}
