FROM node:20-alpine

WORKDIR /app

COPY package*.json ./

RUN apk add --no-cache git

RUN npm install --force

# Install specific packages needed for the build
RUN npm install

COPY . .

ENV VITE_GIGS_API=https://api-gigsmanual.harx.ai/api
ENV NODE_ENV=sandbox
ENV VITE_API_BASE_URL=https://api-Comp-Orchestrator.harx.ai/api
ENV VITE_COMPANY_API_URL=https://api-companysearchwizard.harx.ai/api
ENV VITE_DASHBOARD_API=https://api-dashboard.harx.ai/api
ENV VITE_GOOGLE_API_KEY=AIzaSyCHEKiraViKIrgvloZI-ZBIJqtDMeBuQD0
ENV VITE_KNOWLEDGE_BASE_URL=/knowledgebase

RUN npm run build

RUN npm install -g serve

EXPOSE 5188

CMD ["serve", "-s", "dist", "-l", "5188"]
