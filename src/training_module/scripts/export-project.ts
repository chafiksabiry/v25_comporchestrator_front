#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import archiver from 'archiver';

interface ExportOptions {
  includeNodeModules?: boolean;
  includeDist?: boolean;
  includeEnv?: boolean;
  outputPath?: string;
}

class ProjectExporter {
  private projectRoot: string;
  private outputPath: string;

  constructor(options: ExportOptions = {}) {
    this.projectRoot = process.cwd();
    this.outputPath = options.outputPath || path.join(this.projectRoot, 'exports');
  }

  async exportProject(type: 'full' | 'source' | 'production' = 'full'): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const exportName = `training-platform-${type}-${timestamp}`;
    const zipPath = path.join(this.outputPath, `${exportName}.zip`);

    // Ensure export directory exists
    if (!fs.existsSync(this.outputPath)) {
      fs.mkdirSync(this.outputPath, { recursive: true });
    }

    const output = fs.createWriteStream(zipPath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    return new Promise((resolve, reject) => {
      output.on('close', () => {
        console.log(`✅ Export complete: ${zipPath} (${archive.pointer()} bytes)`);
        resolve(zipPath);
      });

      archive.on('error', (err) => {
        reject(err);
      });

      archive.pipe(output);

      // Add files based on export type
      switch (type) {
        case 'full':
          this.addFullProject(archive);
          break;
        case 'source':
          this.addSourceCode(archive);
          break;
        case 'production':
          this.addProductionFiles(archive);
          break;
      }

      archive.finalize();
    });
  }

  private addFullProject(archive: archiver.Archiver): void {
    // Add all source files
    archive.directory('src/', 'src/');
    archive.directory('public/', 'public/');
    
    // Add configuration files
    archive.file('package.json', { name: 'package.json' });
    archive.file('tsconfig.json', { name: 'tsconfig.json' });
    archive.file('next.config.js', { name: 'next.config.js' });
    archive.file('tailwind.config.js', { name: 'tailwind.config.js' });
    archive.file('postcss.config.js', { name: 'postcss.config.js' });
    
    // Add Docker files
    archive.file('docker-compose.yml', { name: 'docker-compose.yml' });
    archive.file('Dockerfile', { name: 'Dockerfile' });
    archive.file('nginx.conf', { name: 'nginx.conf' });
    
    // Add documentation
    archive.file('README.md', { name: 'README.md' });
    archive.file('.env.example', { name: '.env.example' });
    
    // Add deployment scripts
    this.addDeploymentScripts(archive);
  }

  private addSourceCode(archive: archiver.Archiver): void {
    // Core domain layer
    archive.directory('src/core/', 'src/core/');
    
    // Application layer
    archive.directory('src/application/', 'src/application/');
    
    // Infrastructure layer
    archive.directory('src/infrastructure/', 'src/infrastructure/');
    
    // Presentation layer
    archive.directory('src/presentation/', 'src/presentation/');
    archive.directory('src/components/', 'src/components/');
    archive.directory('src/hooks/', 'src/hooks/');
    
    // Utilities and types
    archive.directory('src/lib/', 'src/lib/');
    archive.directory('src/types/', 'src/types/');
    
    // Configuration
    archive.file('package.json', { name: 'package.json' });
    archive.file('tsconfig.json', { name: 'tsconfig.json' });
  }

  private addProductionFiles(archive: archiver.Archiver): void {
    // Production build
    if (fs.existsSync('dist')) {
      archive.directory('dist/', 'dist/');
    }
    
    // Docker production setup
    archive.file('docker-compose.yml', { name: 'docker-compose.yml' });
    archive.file('Dockerfile', { name: 'Dockerfile' });
    archive.file('nginx.conf', { name: 'nginx.conf' });
    
    // Production configuration
    archive.file('package.json', { name: 'package.json' });
    archive.file('.env.example', { name: '.env.example' });
    
    this.addDeploymentScripts(archive);
  }

  private addDeploymentScripts(archive: archiver.Archiver): void {
    const deployScript = `#!/bin/bash
# Training Platform Deployment Script

echo "🚀 Deploying Training Platform..."

# Build and start services
docker-compose down
docker-compose build --no-cache
docker-compose up -d

# Wait for services to be ready
echo "⏳ Waiting for services to start..."
sleep 30

# Check health
curl -f http://localhost:5190/api/health || exit 1

echo "✅ Deployment complete!"
echo "🌐 Application available at: http://localhost:5190"
`;

    const setupScript = `#!/bin/bash
# Training Platform Setup Script

echo "🔧 Setting up Training Platform..."

# Install dependencies
npm install

# Copy environment file
cp .env.example .env
echo "📝 Please configure your .env file with:"
echo "   - MongoDB connection string"
echo "   - JWT secret"
echo "   - AI service API keys"

# Start development server
echo "🚀 Starting development server..."
npm run dev
`;

    archive.append(deployScript, { name: 'deploy.sh' });
    archive.append(setupScript, { name: 'setup.sh' });
    
    // Add README for deployment
    const deploymentReadme = `# Training Platform Deployment

## Quick Start
1. Configure .env file
2. Run: chmod +x deploy.sh && ./deploy.sh
3. Access: http://localhost:3000

## Manual Setup
1. Install dependencies: npm install
2. Configure environment variables
3. Start MongoDB: docker-compose up mongodb
4. Run application: npm run dev

## Production Deployment
- Use Docker Compose for full stack
- Configure MongoDB Atlas for cloud database
- Set up reverse proxy with nginx
- Enable SSL/TLS certificates
`;

    archive.append(deploymentReadme, { name: 'DEPLOYMENT.md' });
  }
}

// CLI interface
if (require.main === module) {
  const args = process.argv.slice(2);
  const exportType = args[0] as 'full' | 'source' | 'production' || 'full';
  
  const exporter = new ProjectExporter();
  
  exporter.exportProject(exportType)
    .then((zipPath) => {
      console.log(`\n🎉 Export successful!`);
      console.log(`📦 File: ${zipPath}`);
      console.log(`\n📋 Next steps:`);
      console.log(`   1. Extract the ZIP file`);
      console.log(`   2. Configure .env file`);
      console.log(`   3. Run: npm install && npm run dev`);
    })
    .catch((error) => {
      console.error('❌ Export failed:', error);
      process.exit(1);
    });
}

export { ProjectExporter };