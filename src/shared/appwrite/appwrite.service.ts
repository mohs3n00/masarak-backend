import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client, Databases, Storage, Query, ID } from 'node-appwrite';

@Injectable()
export class AppwriteService implements OnModuleInit {
  private client: Client;
  private _databases: Databases;
  private _storage: Storage;
  private _databaseId: string;
  private _bucketId: string;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    const endpoint = this.configService.get<string>('appwrite.endpoint') || '';
    const projectId =
      this.configService.get<string>('appwrite.projectId') || '';
    const apiKey = this.configService.get<string>('appwrite.apiKey') || '';

    this.client = new Client();
    this.client.setEndpoint(endpoint).setProject(projectId).setKey(apiKey);

    this._databases = new Databases(this.client);
    this._storage = new Storage(this.client);
    this._databaseId =
      this.configService.get<string>('appwrite.databaseId') || '';
    this._bucketId = this.configService.get<string>('appwrite.bucketId') || '';
  }

  get databases(): Databases {
    return this._databases;
  }

  get storage(): Storage {
    return this._storage;
  }

  get databaseId(): string {
    return this._databaseId;
  }

  get bucketId(): string {
    return this._bucketId;
  }

  /** Re-export Query and ID helpers for convenience */
  static Query = Query;
  static ID = ID;
}
