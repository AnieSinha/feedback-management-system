FROM maven:3.9-eclipse-temurin-17 AS build
WORKDIR /build
COPY pom.xml .
RUN mvn -B -q dependency:go-offline
COPY src ./src
RUN mvn -B -q clean package -DskipTests

FROM eclipse-temurin:17-jre
WORKDIR /app
COPY --from=build /build/target/feedback-management-0.0.1-SNAPSHOT.jar app.jar
EXPOSE 8080
# MaxRAMPercentage: without it the JVM sizes its heap for the host, not the container,
# and gets OOM-killed on small instances such as Render's free 512MB plan.
ENTRYPOINT ["sh", "-c", "java -XX:MaxRAMPercentage=70 -jar /app/app.jar"]
