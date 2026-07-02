# syntax=docker/dockerfile:1

# ---------------------------------------------------------------------------
# Stage 1: build the AngularJS/TypeScript client with the legacy gulp toolchain.
# node:10 is required because gulp-sass@3 -> node-sass@4 only builds on old Node.
# ---------------------------------------------------------------------------
FROM node:10 AS client-build
WORKDIR /client
# gulp CLI is invoked directly by the build; TypeScript/gulp-sass are local devDeps
RUN npm install -g gulp-cli@2
COPY Rambler.Client/web/package*.json ./
RUN npm install
COPY Rambler.Client/web/ ./
RUN gulp build
# output lands in /client/build

# ---------------------------------------------------------------------------
# Stage 2: build & publish the .NET 5 server (references Rambler.Contracts only).
# ---------------------------------------------------------------------------
FROM mcr.microsoft.com/dotnet/sdk:5.0 AS server-build
WORKDIR /src
# restore first for layer caching
COPY Rambler.Server/Rambler.Server.csproj Rambler.Server/
COPY Rambler.Contracts/Rambler.Contracts.csproj Rambler.Contracts/
RUN dotnet restore Rambler.Server/Rambler.Server.csproj
# then the sources needed to publish
COPY Rambler.Server/ Rambler.Server/
COPY Rambler.Contracts/ Rambler.Contracts/
RUN dotnet publish Rambler.Server/Rambler.Server.csproj -c Release -o /app/publish

# ---------------------------------------------------------------------------
# Stage 3: runtime image.
# ConfigureClientHosting resolves the client at "<cwd>/../Rambler.Client/web/build",
# so the layout below is deliberate: server runs from /app/Rambler.Server and the
# client sits at /app/Rambler.Client/web/build.
# ---------------------------------------------------------------------------
FROM mcr.microsoft.com/dotnet/aspnet:5.0 AS runtime
WORKDIR /app/Rambler.Server
COPY --from=server-build /app/publish ./
COPY --from=client-build /client/build /app/Rambler.Client/web/build
ENV ASPNETCORE_URLS=http://0.0.0.0:5000 \
    RAMBLER_HOSTCLIENT=1
EXPOSE 5000
ENTRYPOINT ["dotnet", "Rambler.Server.dll"]
