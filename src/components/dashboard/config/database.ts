import { MongoClient } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const DATABASE_NAME = process.env.DATABASE_NAME || 'integrations_dashboard';

let client: MongoClient;

export async function connectToDatabase() {
  try {
    if (!client) {
      client = new MongoClient(MONGODB_URI);
      await client.connect();
      
    }
    return client.db(DATABASE_NAME);
  } catch (error) {
    console.error('Failed to connect to MongoDB:', error);
    throw error;
  }
}

export async function disconnectFromDatabase() {
  try {
    if (client) {
      await client.close();
      
    }
  } catch (error) {
    console.error('Failed to disconnect from MongoDB:', error);
    throw error;
  }
}

export default { connectToDatabase, disconnectFromDatabase }; 
