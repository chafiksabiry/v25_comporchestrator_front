FROM node:20-alpine

WORKDIR /app

COPY package*.json ./

RUN apk add --no-cache git

RUN npm install --force

# Install specific packages needed for the build
RUN npm install

COPY . .

ENV VITE_GIGS_API=https://preprod-api-gigsmanual.harx.ai/api
ENV NODE_ENV=sandbox
ENV VITE_API_BASE_URL=https://preprod-api-Comp-Orchestrator.harx.ai/api
ENV VITE_COMPANY_API_URL=https://preprod-api-companysearchwizard.harx.ai/api
ENV VITE_DASHBOARD_API=https://preprod-api-dashboard.harx.ai/api
ENV VITE_REP_API=https://preprod-api-repcreationwizard.harx.ai/api
ENV VITE_GOOGLE_API_KEY=AIzaSyCHEKiraViKIrgvloZI-ZBIJqtDMeBuQD0
ENV VITE_KNOWLEDGE_BASE_URL=/knowledgebase/upload
ENV VITE_OPENAI_API_KEY=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
ENV VITE_SCRIPT_GENERATION_BASE_URL=/knowledgebase/script-generator

RUN npm run build

RUN npm install -g serve

EXPOSE 5188

CMD ["serve", "-s", "dist", "-l", "5188"]
