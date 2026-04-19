import { ObjectId } from 'mongodb';
import { connectToDatabase } from '../config/database';

export interface UserIntegrationConfig {
  userId: string;
  integrationId: string;
  status: 'connected' | 'pending' | 'error';
  config: {
    token?: string;
    credentials?: Record<string, any>;
    fields?: Record<string, any>;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface Integration {
  _id?: ObjectId;
  integrationId: string;
  name: string;
  category: string;
  description: string;
  defaultConfig: {
    fields: {
      key: string;
      label: string;
      type: 'text' | 'password' | 'url' | 'select';
      required?: boolean;
      placeholder?: string;
    }[];
  };
}

export class IntegrationService {
  private static INTEGRATIONS_COLLECTION = 'integrations';
  private static USER_CONFIGS_COLLECTION = 'user_integration_configs';

  static async getIntegrations(): Promise<Integration[]> {
    const db = await connectToDatabase();
    return db.collection(this.INTEGRATIONS_COLLECTION).find().toArray();
  }

  static async getUserIntegrations(userId: string): Promise<UserIntegrationConfig[]> {
    const db = await connectToDatabase();
    return db.collection(this.USER_CONFIGS_COLLECTION)
      .find({ userId })
      .toArray();
  }

  static async getUserIntegrationConfig(
    userId: string,
    integrationId: string
  ): Promise<UserIntegrationConfig | null> {
    const db = await connectToDatabase();
    return db.collection(this.USER_CONFIGS_COLLECTION)
      .findOne({ userId, integrationId });
  }

  static async updateUserIntegrationConfig(
    userId: string,
    integrationId: string,
    config: Partial<UserIntegrationConfig['config']>
  ): Promise<boolean> {
    const db = await connectToDatabase();
    const result = await db.collection(this.USER_CONFIGS_COLLECTION).updateOne(
      { userId, integrationId },
      {
        $set: {
          config: config,
          updatedAt: new Date()
        }
      },
      { upsert: true }
    );
    return result.modifiedCount > 0 || result.upsertedCount > 0;
  }

  static async disconnectUserIntegration(
    userId: string,
    integrationId: string
  ): Promise<boolean> {
    const db = await connectToDatabase();
    const result = await db.collection(this.USER_CONFIGS_COLLECTION).updateOne(
      { userId, integrationId },
      {
        $set: {
          status: 'pending',
          'config.token': null,
          'config.credentials': {},
          updatedAt: new Date()
        }
      }
    );
    return result.modifiedCount > 0;
  }

  static async connectUserIntegration(
    userId: string,
    integrationId: string,
    token: string,
    credentials?: Record<string, any>
  ): Promise<boolean> {
    const db = await connectToDatabase();
    const result = await db.collection(this.USER_CONFIGS_COLLECTION).updateOne(
      { userId, integrationId },
      {
        $set: {
          status: 'connected',
          'config.token': token,
          'config.credentials': credentials || {},
          updatedAt: new Date()
        }
      },
      { upsert: true }
    );
    return result.modifiedCount > 0 || result.upsertedCount > 0;
  }
} 
