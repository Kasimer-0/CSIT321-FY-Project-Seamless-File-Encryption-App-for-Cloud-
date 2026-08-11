FROM maven:3.9.11-eclipse-temurin-21 AS build
WORKDIR /workspace/Back-end
COPY Back-end/pom.xml ./pom.xml
RUN mvn -B dependency:go-offline
COPY Back-end/src ./src
RUN mvn -B package -DskipTests

FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
RUN addgroup -S stealthsync \
    && adduser -S stealthsync -G stealthsync \
    && mkdir -p /var/data/stealthsync-vault \
    && chown -R stealthsync:stealthsync /app /var/data/stealthsync-vault
COPY --from=build --chown=stealthsync:stealthsync \
    /workspace/Back-end/target/stealthsync-backend-0.0.1-SNAPSHOT.jar /app/stealthsync.jar
USER stealthsync
EXPOSE 10000
ENV SPRING_PROFILES_ACTIVE=prod
ENV STEALTHSYNC_VAULT_DIR=/var/data/stealthsync-vault
ENTRYPOINT ["java", "-jar", "/app/stealthsync.jar"]
