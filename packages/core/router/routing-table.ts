import { Injectable, RequestMethod } from '@nestjs/common';
import { RoutePathMetadata } from './interfaces/route-path-metadata.interface';

export type RoutingTableEntry = RoutePathMetadata & {
  fullUrl: string;
  requestMethod: RequestMethod;
  routeName: string;
  slugs: string[];
};

type FindEntryWhere = Omit<Partial<RoutingTableEntry>, 'slugs'>;

@Injectable()
export class RoutingTable {
  private entries: RoutingTableEntry[] = [];

  addEntry(entry: RoutingTableEntry) {
    this.entries.push(entry);
  }

  findEntry(where: FindEntryWhere): RoutingTableEntry {
    return this.entries.find(entry => this.filterEntry(entry, where));
  }

  findEntries(where: FindEntryWhere): RoutingTableEntry[] {
    return this.entries.filter(entry => this.filterEntry(entry, where));
  }

  getAll(): RoutingTableEntry[] {
    return this.entries;
  }

  private filterEntry(
    entry: RoutingTableEntry,
    where: FindEntryWhere,
  ): boolean {
    for (let key in where) {
      if (entry[key] !== where[key]) {
        return false;
      }
    }
    return true;
  }
}
