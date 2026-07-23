FROM node:24-alpine AS frontend
WORKDIR /workspace/Front-end
COPY Front-end/package.json Front-end/package-lock.json ./
RUN npm ci
COPY Front-end/ ./
RUN npm run build

FROM maven:3.9.11-eclipse-temurin-21 AS backend
WORKDIR /workspace
COPY Back-end/ Back-end/
RUN rm -rf Back-end/src/main/resources/static/*
COPY --from=frontend /workspace/Front-end/dist/ Back-end/src/main/resources/static/
WORKDIR /workspace/Back-end
RUN mvn package -DskipTests

FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
RUN addgroup -S stealthsync && adduser -S stealthsync -G stealthsync \
    && mkdir -p /app/vault && chown -R stealthsync:stealthsync /app
COPY --from=backend --chown=stealthsync:stealthsync \
    /workspace/Back-end/target/stealthsync-backend-0.0.1-SNAPSHOT.jar /app/stealthsync.jar
USER stealthsync
EXPOSE 8080
ENV SPRING_PROFILES_ACTIVE=production
ENV STEALTHSYNC_VAULT_DIR=/app/vault
ENTRYPOINT ["java", "-jar", "/app/stealthsync.jar"]
