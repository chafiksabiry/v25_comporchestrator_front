FROM node:20-alpine

WORKDIR /app

COPY package*.json ./

RUN apk add --no-cache git

RUN npm install --force




COPY . .

ENV VITE_GIGS_API=https://api-gigsmanual.harx.ai/api
ENV NODE_ENV=development



RUN npm run build

RUN npm install -g serve

EXPOSE 5188

CMD ["serve", "-s", "dist", "-l", "5188"]
