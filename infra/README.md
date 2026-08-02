# Study XP Tracker — Azure Infrastructure (Terraform IaC)

Complete Infrastructure as Code (IaC) configuration using **Terraform** and Azure Resource Manager (azurerm provider) to deploy **Study XP Tracker** on **Microsoft Azure**. This automation is optimized for Azure for Students accounts and sets up a production-ready cloud environment.

---

## Automated Azure Resources

| Azure Resource | Default Name / SKU | Purpose |
| :--- | :--- | :--- |
| **Resource Group** | `rg-study-tracking-prod` | Centralized management of all resources |
| **Storage Account & Blob** | `ststudytrackingprod` | Document storage and avatar uploads |
| **Container Registry (ACR)** | `acrstudytrackingprod` (Basic) | Docker image repository for backend |
| **PostgreSQL Flexible Server** | `pg-study-tracking-...` (`B_Standard_B1ms`) | Primary database (PostgreSQL 15), 32GB free storage |
| **Azure Cache for Redis** | `redis-study-tracking-prod` (Basic C0) | Real-time leaderboards and caching |
| **App Service Plan & App** | `app-study-tracking-api-prod` (B1 Linux) | Containerized backend API and WebSocket hosting |
| **Static Web Apps** | `swa-study-tracking-frontend-prod` (Free) | High-performance React SPA frontend via CDN |

---

## Architecture Overview

### Local Development
For local development without a cloud subscription, the backend connects to Azurite emulator and containerized PostgreSQL/Redis:
```bash
cd backend
docker compose up -d
```

### Cloud Production
Terraform automates the entire Azure infrastructure provisioning, from networking and security groups to managed databases and containerized services. All resources are configured for production workloads with automatic scaling and backup options.

---

## Technology Stack

- **Infrastructure Provisioning:** Terraform 1.5.0+
- **Cloud Platform:** Microsoft Azure
- **Container Runtime:** Docker with Azure Container Registry
- **Database:** PostgreSQL 15 Flexible Server
- **Caching:** Azure Cache for Redis
- **Backend Hosting:** Azure App Service (Linux)
- **Frontend Hosting:** Azure Static Web Apps
- **Storage:** Azure Blob Storage
- **Authentication:** Azure Service Principal (for CI/CD)

---

## Resource Configuration

### Backend Services
- **API & WebSocket Server:** Spring Boot application running in containerized App Service
- **Real-time Features:** Redis-backed leaderboards and messaging
- **Database:** PostgreSQL with automatic backups and point-in-time recovery

### Frontend Services
- **Web Application:** React SPA deployed to Static Web Apps with global CDN distribution
- **Performance:** Automatic caching and edge computing for fast global delivery

### Data Services
- **Primary Database:** PostgreSQL for all application data
- **Cache Layer:** Redis ZSET for leaderboards and session caching
- **Document Storage:** Azure Blob Storage for study materials and avatars

---

## Deployment Architecture

The infrastructure follows a standard three-tier architecture:

1. **Presentation Layer:** Azure Static Web Apps serving the React frontend globally
2. **Application Layer:** Containerized Spring Boot backend in App Service with WebSocket support
3. **Data Layer:** PostgreSQL, Redis, and Blob Storage for persistence and caching

CI/CD pipelines automatically deploy frontend and backend changes to their respective services.

---

## Author & License
* **Author:** Tran Quoc Khanh
