# Stage 1: Build stage
FROM maven:3.9.6-eclipse-temurin-21-alpine AS build
WORKDIR /app
COPY pom.xml .
RUN mvn dependency:go-offline -B || true
COPY src ./src
RUN mvn clean package -DskipTests

# Stage 2: Run stage
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app

# Cài đặt curl cho health check
RUN apk add --no-cache curl

COPY --from=build /app/target/*.jar app.jar
EXPOSE 8080
# Tối ưu RAM cho Render 512MB: Heap 224MB, Metaspace 160MB, CodeCache 48MB, ThreadStack 256KB
ENTRYPOINT ["java", "-XX:+UseG1GC", "-Xmx224m", "-Xms128m", "-XX:MetaspaceSize=128m", "-XX:MaxMetaspaceSize=160m", "-XX:ReservedCodeCacheSize=48m", "-Xss256k", "-jar", "app.jar"]
