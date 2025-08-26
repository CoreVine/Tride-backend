FROM node:22.12.0

RUN npm install -g pnpm

WORKDIR /tride_backend

COPY package.json pnpm-lock.yaml* ./

RUN corepack prepare pnpm@8.15.5 --activate && pnpm install

COPY . .

EXPOSE 3010

CMD ["pnpm", "dev"]
