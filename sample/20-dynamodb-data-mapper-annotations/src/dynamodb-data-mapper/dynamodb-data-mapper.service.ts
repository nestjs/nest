import { Injectable } from '@nestjs/common';
import { DynamoDB } from 'aws-sdk';
import { DataMapper } from '@aws/dynamodb-data-mapper';

@Injectable()
export class DynamoDBDataMapperService {
  private client: DynamoDB;
  public mapper: DataMapper;

  constructor() {
    this.client = new DynamoDB({
      region: 'us-west-2',
      endpoint: 'http://localhost:8000',
    });
    this.mapper = new DataMapper({ client: this.client });
  }
}
