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
ENV VITE_KNOWLEDGE_BASE_URL=/knowledgebase
ENV VITE_OPENAI_API_KEY=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

RUN npm run build

RUN npm install -g serve

EXPOSE 5188

CMD ["serve", "-s", "dist", "-l", "5188"]
