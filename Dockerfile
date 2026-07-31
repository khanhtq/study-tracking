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
# Giới hạn JVM Heap tối đa 192MB để tránh bùng nổ RAM trên gói 512MB của Render gây I/O timeout
ENTRYPOINT ["java", "-XX:+UseG1GC", "-Xmx192m", "-Xms96m", "-XX:MaxMetaspaceSize=100m", "-XX:ReservedCodeCacheSize=64m", "-jar", "app.jar"]
