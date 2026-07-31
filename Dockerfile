# Stage 1: Build stage
FROM maven:3.9.6-eclipse-temurin-21-alpine AS build
WORKDIR /app
COPY pom.xml .
RUN mvn dependency:go-offline
COPY src ./src
RUN mvn clean package -DskipTests

# Stage 2: Run stage
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app

# Cài đặt python3, nodejs (JS runtime cho yt-dlp), ffmpeg, curl và yt-dlp
RUN apk add --no-cache python3 nodejs ffmpeg curl && \
    curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp && \
    chmod a+rx /usr/local/bin/yt-dlp

COPY --from=build /app/target/*.jar app.jar
EXPOSE 8080
# Giới hạn JVM Heap 224MB, Metaspace 180MB để chạy mượt mà Spring Boot 3.3 + Spring Security trên Render 512MB
ENTRYPOINT ["java", "-XX:+UseG1GC", "-Xmx224m", "-Xms128m", "-XX:MetaspaceSize=128m", "-XX:MaxMetaspaceSize=180m", "-XX:ReservedCodeCacheSize=48m", "-Xss256k", "-jar", "app.jar"]
