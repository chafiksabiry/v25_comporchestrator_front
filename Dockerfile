FROM node:20-alpine

WORKDIR /app

COPY package*.json ./

RUN apk add --no-cache git

RUN npm install --force

# Install specific packages needed for the build
RUN npm install

COPY . .

ENV VITE_GIGS_API=https://preprod-api-gigsmanual.harx.ai/api
ENV VITE_NODE_ENV=preprod
ENV VITE_API_BASE_URL=https://preprod-api-comp-orchestrator.harx.ai/api
ENV VITE_COMPANY_API_URL=https://preprod-api-companysearchwizard.harx.ai/api
ENV VITE_DASHBOARD_API=https://preprod-api-dashboard.harx.ai/api
ENV VITE_GOOGLE_API_KEY=AIzaSyCHEKiraViKIrgvloZI-ZBIJqtDMeBuQD0
ENV VITE_KNOWLEDGE_BASE_URL=/knowledgebase
ENV VITE_OPENAI_API_KEY=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
ENV VITE_SCRIPT_GENERATION_BASE_URL=/knowledgebase/script-generator


RUN npm run build

RUN npm install -g serve

EXPOSE 5188

CMD ["serve", "-s", "dist", "-l", "5188"]
