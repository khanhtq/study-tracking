terraform {
  required_version = ">= 1.5.0"

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.100"
    }
  }
}

provider "azurerm" {
  features {
    resource_group {
      prevent_deletion_if_contains_resources = false
    }
  }
}

# 1. Resource Group (Khu vực japaneast nằm trong danh sách chính sách cho phép của tài khoản Student)
resource "azurerm_resource_group" "rg" {
  name     = var.resource_group_name
  location = var.location

  tags = var.tags
}

# 2. Azure Storage Account & Blob Container (Study Document Drive & Avatars)
resource "azurerm_storage_account" "storage" {
  name                     = var.storage_account_name
  resource_group_name      = azurerm_resource_group.rg.name
  location                 = azurerm_resource_group.rg.location
  account_tier             = var.storage_account_tier
  account_replication_type = var.storage_replication_type
  account_kind             = "StorageV2"
  access_tier              = "Hot"
  allow_nested_items_to_be_public = true

  blob_properties {
    cors_rule {
      allowed_headers    = var.cors_allowed_headers
      allowed_methods    = var.cors_allowed_methods
      allowed_origins    = var.cors_allowed_origins
      exposed_headers    = var.cors_exposed_headers
      max_age_in_seconds = var.cors_max_age_in_seconds
    }
  }

  tags = var.tags
}

resource "azurerm_storage_container" "container" {
  name                  = var.container_name
  storage_account_name  = azurerm_storage_account.storage.name
  container_access_type = "private"
}

# 3. Azure Container Registry (ACR)
resource "azurerm_container_registry" "acr" {
  name                = var.acr_name
  resource_group_name = azurerm_resource_group.rg.name
  location            = azurerm_resource_group.rg.location
  sku                 = var.acr_sku
  admin_enabled       = true

  tags = var.tags
}

# 4. Azure Database for PostgreSQL Flexible Server
resource "azurerm_postgresql_flexible_server" "postgres" {
  name                   = "pg-study-tracking-${var.resource_group_name}"
  resource_group_name    = azurerm_resource_group.rg.name
  location               = azurerm_resource_group.rg.location
  version                = "15"
  administrator_login    = var.db_admin_username
  administrator_password = var.db_admin_password
  sku_name               = var.db_sku_name
  storage_mb             = var.db_storage_mb
  zone                   = "1"

  tags = var.tags
}

resource "azurerm_postgresql_flexible_server_database" "db" {
  name      = var.db_name
  server_id = azurerm_postgresql_flexible_server.postgres.id
  collation = "en_US.utf8"
  charset   = "utf8"
}

# Cho phép các dịch vụ đám mây nội bộ Azure kết nối PostgreSQL
resource "azurerm_postgresql_flexible_server_firewall_rule" "allow_azure_services" {
  name             = "AllowAllAzureServices"
  server_id        = azurerm_postgresql_flexible_server.postgres.id
  start_ip_address = "0.0.0.0"
  end_ip_address   = "0.0.0.0"
}

# 5. Azure Container Instance - ACI (Backend Spring Boot Container - Hỗ trợ tích hợp Upstash Redis)
resource "azurerm_container_group" "backend" {
  name                = var.backend_app_name
  location            = azurerm_resource_group.rg.location
  resource_group_name = azurerm_resource_group.rg.name
  ip_address_type     = "Public"
  dns_name_label      = var.backend_app_name
  os_type             = "Linux"

  image_registry_credential {
    server   = azurerm_container_registry.acr.login_server
    username = azurerm_container_registry.acr.admin_username
    password = azurerm_container_registry.acr.admin_password
  }

  container {
    name   = "backend"
    image  = "mcr.microsoft.com/azuredocs/aci-helloworld"
    cpu    = "1.0"
    memory = "1.5"

    ports {
      port     = 8080
      protocol = "TCP"
    }

    environment_variables = {
      "SPRING_PROFILES_ACTIVE"          = "prod"
      "SPRING_DATASOURCE_URL"           = "jdbc:postgresql://${azurerm_postgresql_flexible_server.postgres.fqdn}:5432/${azurerm_postgresql_flexible_server_database.db.name}?sslmode=require"
      "SPRING_DATASOURCE_USERNAME"      = var.db_admin_username
      "SPRING_DATASOURCE_PASSWORD"      = var.db_admin_password
      "SPRING_REDIS_HOST"               = var.upstash_redis_host != "" ? var.upstash_redis_host : "localhost"
      "SPRING_REDIS_PORT"               = var.upstash_redis_port
      "SPRING_REDIS_PASSWORD"           = var.upstash_redis_password
      "SPRING_REDIS_SSL_ENABLED"        = var.upstash_redis_host != "" ? "true" : "false"
      "AZURE_STORAGE_CONNECTION_STRING" = azurerm_storage_account.storage.primary_connection_string
      "AZURE_STORAGE_CONTAINER_NAME"    = azurerm_storage_container.container.name
      "JWT_SECRET"                      = var.jwt_secret
      "PORT"                            = "8080"
    }
  }

  tags = var.tags
}

# 6. Azure Storage Static Website (Frontend React SPA - Nằm tại vùng 'japaneast', tránh lỗi Policy 403)
resource "azurerm_storage_account" "frontend_storage" {
  name                     = var.frontend_storage_name
  resource_group_name      = azurerm_resource_group.rg.name
  location                 = azurerm_resource_group.rg.location
  account_tier             = "Standard"
  account_replication_type = "LRS"
  account_kind             = "StorageV2"

  static_website {
    index_document     = "index.html"
    error_404_document = "index.html"
  }

  tags = var.tags
}
