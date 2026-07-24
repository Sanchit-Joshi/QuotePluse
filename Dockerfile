# Production image. Two stages: build the app, then run it on top of
# Playwright's official base image (Chromium + all system libs already
# installed — see docs/docker.md and ADR-007 for why PDF generation needs
# a real browser, not a PDF-primitive library).

FROM node:22-slim AS builder
WORKDIR /app

COPY package.json package-lock.json ./
# --ignore-scripts on both: the new `postinstall` (prisma generate) can't
# run yet since prisma/schema.prisma isn't copied in until the next step —
# it runs explicitly below, after the full source is present.
RUN npm ci --ignore-scripts && npm rebuild --ignore-scripts

COPY . .
RUN npx prisma generate
RUN npm run build

FROM mcr.microsoft.com/playwright:v1.61.1-noble AS runner
WORKDIR /app
ENV NODE_ENV=production

# Playwright's base image already ships a non-root "pwuser" (uid/gid 1001)
# with the permissions Chromium's sandbox needs — reuse it instead of
# creating a new one.
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts
COPY --from=builder /app/package.json ./package.json
COPY docker/entrypoint.sh ./docker/entrypoint.sh
RUN chmod +x ./docker/entrypoint.sh \
  && mkdir -p ./storage/pdfs ./storage/uploads ./public/uploads \
  && chown -R pwuser:pwuser /app

USER pwuser

EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://localhost:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

ENTRYPOINT ["./docker/entrypoint.sh"]
CMD ["npm", "run", "start"]
