# Production build of the Chatterbox frontend, served by nginx.
# Supabase settings are baked in at build time (Vite inlines VITE_* variables).
# Used by docker-compose.yml for local runs; see LOCAL_SETUP.md.

FROM node:22-alpine AS build
WORKDIR /app

# Installs from package.json alone: bun.lock points some packages at Lovable's private
# npm cache (403 outside Lovable), and package-lock.json is out of date.
COPY package.json ./
RUN npm install --no-audit --no-fund --legacy-peer-deps --no-package-lock

COPY . .

ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_PUBLISHABLE_KEY
ARG VITE_SUPABASE_PROJECT_ID
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL \
    VITE_SUPABASE_PUBLISHABLE_KEY=$VITE_SUPABASE_PUBLISHABLE_KEY \
    VITE_SUPABASE_PROJECT_ID=$VITE_SUPABASE_PROJECT_ID
# Same steps as `npm run build` (whose prebuild hook needs bunx)
RUN npx tsx scripts/generate-sitemap.ts && npx vite build

FROM nginx:1.27-alpine
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
