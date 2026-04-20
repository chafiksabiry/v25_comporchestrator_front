import { connectToDatabase } from '../config/database';

async function initializeDatabase() {
  try {
    const db = await connectToDatabase();
    const collection = db.collection('integrations');

    // Check if collection is empty
    const count = await collection.countDocuments();
    if (count > 0) {
      
      return;
    }

    // Default integrations
    const defaultIntegrations = [
      {
        integrationId: 'twilio',
        name: 'Twilio',
        description: 'Cloud communications platform for voice, SMS, and video',
        category: 'phone',
        status: 'pending',
        config: {
          fields: {
            account_sid: '',
            auth_token: '',
            phone_number: ''
          },
          credentials: {}
        },
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        integrationId: 'zoho-crm',
        name: 'Zoho CRM',
        description: 'Customer relationship management and sales automation',
        category: 'crm',
        status: 'pending',
        config: {
          fields: {
            client_id: '',
            client_secret: '',
            refresh_token: ''
          },
          credentials: {}
        },
        createdAt: new Date(),
        updatedAt: new Date()
      }
      // Add more default integrations as needed
    ];

    // Insert default integrations
    await collection.insertMany(defaultIntegrations);
    
  } catch (error) {
    console.error('Failed to initialize database:', error);
  }
}

// Run initialization
initializeDatabase()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 
