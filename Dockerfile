FROM node:22.12.0

RUN npm install -g pnpm

WORKDIR /app

COPY package.json pnpm-lock.yaml* ./

RUN corepack prepare pnpm@8.15.5 --activate && pnpm install

COPY . .

EXPOSE 3000
CMD ["pnpm", "dev"]
