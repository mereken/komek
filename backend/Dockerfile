# ---------- 1) build ----------
FROM maven:3.9-eclipse-temurin-17 AS build
WORKDIR /app
COPY pom.xml .
RUN mvn -B -q dependency:go-offline
COPY src ./src
RUN mvn -B -q -DskipTests package

# ---------- 2) run ----------
FROM eclipse-temurin:17-jre
WORKDIR /app
RUN useradd -r -u 1001 app
COPY --from=build /app/target/*.jar app.jar
USER app

# Free instances have 512 MB RAM and a very small CPU share: keep the JVM small and start fast.
ENV JAVA_OPTS="-XX:MaxRAMPercentage=65 -XX:+UseSerialGC -XX:TieredStopAtLevel=1 -Xss512k"
# Small DB pool that is allowed to drop to 0 idle connections, so Neon can scale to zero.
ENV SPRING_DATASOURCE_HIKARI_MAXIMUM_POOL_SIZE=5 \
    SPRING_DATASOURCE_HIKARI_MINIMUM_IDLE=0 \
    SPRING_DATASOURCE_HIKARI_IDLE_TIMEOUT=60000 \
    SPRING_DATASOURCE_HIKARI_MAX_LIFETIME=240000

# Render passes the port in $PORT (default 10000); locally falls back to 18080.
EXPOSE 10000
CMD ["sh", "-c", "exec java $JAVA_OPTS -Dserver.port=${PORT:-18080} -jar app.jar"]
