import JSZip from 'jszip';
import { saveAs } from 'file-saver';

export class ExportService {
  // Export entire project as ZIP
  static async exportProject(): Promise<void> {
    const zip = new JSZip();
    
    // Add source code
    await this.addSourceCode(zip);
    
    // Add documentation
    await this.addDocumentation(zip);
    
    // Add configuration files
    await this.addConfiguration(zip);
    
    // Generate and download ZIP
    const content = await zip.generateAsync({ type: 'blob' });
    saveAs(content, `training-platform-${new Date().toISOString().split('T')[0]}.zip`);
  }

  // Export training data as JSON
  static async exportTrainingData(): Promise<void> {
    const data = {
      companies: [], // Would fetch from API
      journeys: [],
      modules: [],
      reps: [],
      progress: [],
      exportedAt: new Date().toISOString(),
      version: '1.0.0'
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    saveAs(blob, `training-data-${new Date().toISOString().split('T')[0]}.json`);
  }

  // Export as Docker containers
  static async exportDockerSetup(): Promise<void> {
    const zip = new JSZip();
    
    // Add Docker files
    zip.file('docker-compose.yml', await this.getDockerCompose());
    zip.file('Dockerfile', await this.getDockerfile());
    zip.file('nginx.conf', await this.getNginxConfig());
    zip.file('deploy.sh', await this.getDeployScript());
    
    const content = await zip.generateAsync({ type: 'blob' });
    saveAs(content, 'docker-deployment.zip');
  }

  // Export database schema
  static async exportDatabaseSchema(): Promise<void> {
    const schema = {
      mongodb: {
        collections: [
          'users', 'companies', 'training_journeys', 
          'training_modules', 'reps', 'progress'
        ],
        indexes: [],
        relationships: []
      },
      exportedAt: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(schema, null, 2)], { type: 'application/json' });
    saveAs(blob, 'database-schema.json');
  }

  private static async addSourceCode(zip: JSZip): Promise<void> {
    const sourceFolder = zip.folder('src');
    
    // Add all TypeScript/JavaScript files
    // This would recursively add all source files
    sourceFolder?.file('README.md', 'Source code exported from training platform');
  }

  private static async addDocumentation(zip: JSZip): Promise<void> {
    const docsFolder = zip.folder('docs');
    
    docsFolder?.file('API.md', await this.generateAPIDocumentation());
    docsFolder?.file('SETUP.md', await this.generateSetupGuide());
    docsFolder?.file('ARCHITECTURE.md', await this.generateArchitectureDoc());
  }

  private static async addConfiguration(zip: JSZip): Promise<void> {
    zip.file('package.json', JSON.stringify({
      name: 'training-platform',
      version: '1.0.0',
      description: 'AI-Powered Training Platform',
      scripts: {
        dev: 'next dev',
        build: 'next build',
        start: 'next start'
      }
    }, null, 2));
    
    zip.file('.env.example', `
MONGODB_URI=mongodb://localhost:27017/training_platform
JWT_SECRET=your_jwt_secret_here
NEXTAUTH_SECRET=your_nextauth_secret
OPENAI_API_KEY=your_openai_key
ELEVENLABS_API_KEY=your_elevenlabs_key
    `.trim());
  }

  private static async getDockerCompose(): Promise<string> {
    return `
version: '3.8'
services:
  app:
    build: .
    ports:
      - "5190:5190"
    environment:
      - MONGODB_URI=mongodb://mongodb:27017/training_platform
    depends_on:
      - mongodb
  
  mongodb:
    image: mongo:7
    ports:
      - "27017:27017"
    volumes:
      - mongodb_data:/data/db

volumes:
  mongodb_data:
    `.trim();
  }

  private static async getDockerfile(): Promise<string> {
    return `
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 5190
CMD ["npm", "start"]
    `.trim();
  }

  private static async getNginxConfig(): Promise<string> {
    return `
server {
    listen 80;
    server_name localhost;
    
    location / {
        proxy_pass http://app:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
    `.trim();
  }

  private static async getDeployScript(): Promise<string> {
    return `
#!/bin/bash
echo "Deploying Training Platform..."
docker-compose down
docker-compose build
docker-compose up -d
echo "Deployment complete!"
    `.trim();
  }

  private static async generateAPIDocumentation(): Promise<string> {
    return `
# Training Platform API Documentation

## Authentication Endpoints
- POST /api/auth/login
- POST /api/auth/register
- POST /api/auth/logout

## Company Endpoints
- GET /api/companies
- POST /api/companies
- GET /api/companies/:id
- PUT /api/companies/:id

## Training Endpoints
- GET /api/training/journeys
- POST /api/training/journeys
- GET /api/training/modules
- POST /api/training/modules

## Progress Endpoints
- GET /api/progress
- POST /api/progress
- PUT /api/progress/:id
    `.trim();
  }

  private static async generateSetupGuide(): Promise<string> {
    return `
# Training Platform Setup Guide

## Prerequisites
- Node.js 18+
- MongoDB 7+
- Docker (optional)

## Installation
1. Clone the repository
2. Install dependencies: npm install
3. Configure environment variables
4. Start MongoDB
5. Run the application: npm run dev

## Production Deployment
1. Build the application: npm run build
2. Use Docker: docker-compose up
3. Configure reverse proxy (nginx)
    `.trim();
  }

  private static async generateArchitectureDoc(): Promise<string> {
    return `
# Training Platform Architecture

## Clean Architecture Layers

### Core Domain Layer
- Entities: Business objects with validation
- Use Cases: Application business logic
- Repository Interfaces: Data access contracts

### Application Layer
- Controllers: HTTP request handling
- Dependency Injection: Service management

### Infrastructure Layer
- Repository Implementations: MongoDB integration
- External Services: AI, file upload, auth

### Presentation Layer
- React Components: User interface
- Custom Hooks: State management
    `.trim();
  }
}