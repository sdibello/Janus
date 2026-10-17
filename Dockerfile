FROM node:24-bookworm-slim AS web-build
WORKDIR /src/web
COPY web/package.json web/package-lock.json ./
RUN npm ci
COPY web/ ./
RUN npm run build

FROM mcr.microsoft.com/dotnet/sdk:10.0 AS dotnet-build
WORKDIR /src
COPY . ./
COPY --from=web-build /src/web/dist ./web/dist

FROM dotnet-build AS identity-publish
RUN dotnet publish src/Janus.Identity/Janus.Identity.csproj -c Release -o /out

FROM dotnet-build AS campaigns-publish
RUN dotnet publish src/Janus.Campaigns/Janus.Campaigns.csproj -c Release -o /out

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS identity
WORKDIR /app
COPY --from=identity-publish /out/ ./
RUN mkdir /data && chown "${APP_UID}:${APP_UID}" /data
USER $APP_UID
ENV ASPNETCORE_URLS=http://0.0.0.0:5186
ENTRYPOINT ["dotnet", "Janus.Identity.dll"]

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS campaigns
WORKDIR /app
COPY --from=campaigns-publish /out/ ./
RUN mkdir /data && chown "${APP_UID}:${APP_UID}" /data
USER $APP_UID
ENV ASPNETCORE_URLS=http://0.0.0.0:5199
ENTRYPOINT ["dotnet", "Janus.Campaigns.dll"]
