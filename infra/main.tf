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

# 4. Azure Database for PostgreSQL Flexible Server (Tách biệt 100%)
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

# Cho phép kết nối công khai từ máy tính cá nhân (DBeaver / pgAdmin)
resource "azurerm_postgresql_flexible_server_firewall_rule" "allow_public_access" {
  name             = "AllowPublicAccess"
  server_id        = azurerm_postgresql_flexible_server.postgres.id
  start_ip_address = "0.0.0.0"
  end_ip_address   = "255.255.255.255"
}

# 5. Azure Container Apps Environment & Container App (Backend Spring Boot - HTTPS Tự Động 100%)
resource "azurerm_container_app_environment" "cae" {
  name                = "cae-study-tracking-prod"
  location            = azurerm_resource_group.rg.location
  resource_group_name = azurerm_resource_group.rg.name
  tags                = var.tags
}

resource "azurerm_container_app" "backend" {
  name                         = var.backend_app_name
  container_app_environment_id = azurerm_container_app_environment.cae.id
  resource_group_name          = azurerm_resource_group.rg.name
  revision_mode                = "Single"

  secret {
    name  = "container-registry-password"
    value = azurerm_container_registry.acr.admin_password
  }

  secret {
    name  = "db-password"
    value = var.db_admin_password
  }

  secret {
    name  = "jwt-secret"
    value = var.jwt_secret
  }

  secret {
    name  = "redis-password"
    value = var.upstash_redis_password
  }

  secret {
    name  = "mail-password"
    value = var.mail_password
  }

  secret {
    name  = "azure-storage-connection-string"
    value = var.azure_storage_connection_string != "" ? var.azure_storage_connection_string : azurerm_storage_account.storage.primary_connection_string
  }

  registry {
    server               = azurerm_container_registry.acr.login_server
    username             = azurerm_container_registry.acr.admin_username
    password_secret_name = "container-registry-password"
  }

  ingress {
    external_enabled = true
    target_port      = 8080
    transport        = "auto"

    traffic_weight {
      latest_revision = true
      percentage      = 100
    }
  }

  template {
    container {
      name   = "backend"
      image  = "acrstudytrackingprod.azurecr.io/study-tracking-backend:latest"
      cpu    = 0.5
      memory = "1.0Gi"

      env {
        name  = "SPRING_PROFILES_ACTIVE"
        value = "prod"
      }
      env {
        name  = "SPRING_DATASOURCE_URL"
        value = var.db_url != "" ? var.db_url : "jdbc:postgresql://${azurerm_postgresql_flexible_server.postgres.fqdn}:5432/${azurerm_postgresql_flexible_server_database.db.name}?sslmode=require"
      }
      env {
        name  = "SPRING_DATASOURCE_USERNAME"
        value = var.db_admin_username
      }
      env {
        name        = "SPRING_DATASOURCE_PASSWORD"
        secret_name = "db-password"
      }
      env {
        name  = "SPRING_REDIS_HOST"
        value = var.upstash_redis_host
      }
      env {
        name  = "SPRING_REDIS_PORT"
        value = var.upstash_redis_port
      }
      env {
        name        = "SPRING_REDIS_PASSWORD"
        secret_name = "redis-password"
      }
      env {
        name  = "SPRING_REDIS_SSL_ENABLED"
        value = "true"
      }
      env {
        name  = "SPRING_MAIL_HOST"
        value = var.mail_host
      }
      env {
        name  = "SPRING_MAIL_PORT"
        value = var.mail_port
      }
      env {
        name  = "SPRING_MAIL_USERNAME"
        value = var.mail_username
      }
      env {
        name        = "SPRING_MAIL_PASSWORD"
        secret_name = "mail-password"
      }
      env {
        name  = "SPRING_MAIL_FROM"
        value = var.mail_from
      }
      env {
        name  = "SPRING_MAIL_SSL_ENABLE"
        value = var.mail_ssl_enable
      }
      env {
        name  = "SPRING_MAIL_STARTTLS_ENABLE"
        value = var.mail_starttls_enable
      }
      env {
        name  = "BREVO_API_KEY"
        value = var.brevo_api_key
      }
      env {
        name  = "GOOGLE_CLIENT_ID"
        value = var.google_client_id
      }
      env {
        name        = "AZURE_STORAGE_CONNECTION_STRING"
        secret_name = "azure-storage-connection-string"
      }
      env {
        name  = "AZURE_STORAGE_CONTAINER_NAME"
        value = var.container_name
      }
      env {
        name  = "AZURE_STORAGE_SAS_EXPIRY_MINUTES"
        value = "60"
      }
      env {
        name  = "CLOUDINARY_CLOUD_NAME"
        value = var.cloudinary_cloud_name
      }
      env {
        name  = "CLOUDINARY_API_KEY"
        value = var.cloudinary_api_key
      }
      env {
        name  = "CLOUDINARY_API_SECRET"
        value = var.cloudinary_api_secret
      }
      env {
        name  = "STORAGE_PROVIDER"
        value = var.storage_provider
      }
      env {
        name  = "UPLOAD_DIR"
        value = var.upload_dir
      }
      env {
        name  = "MAX_FILE_SIZE_MB"
        value = var.max_file_size_mb
      }
      env {
        name  = "MAX_USER_QUOTA_MB"
        value = var.max_user_quota_mb
      }
      env {
        name  = "VNPAY_TMN_CODE"
        value = var.vnpay_tmn_code
      }
      env {
        name  = "VNPAY_HASH_SECRET"
        value = var.vnpay_hash_secret
      }
      env {
        name  = "VNPAY_PAY_URL"
        value = var.vnpay_pay_url
      }
      env {
        name  = "VNPAY_RETURN_URL"
        value = var.vnpay_return_url
      }
      env {
        name  = "VIRTUAL_USERS_ENABLED"
        value = var.virtual_users_enabled
      }
      env {
        name  = "VIRTUAL_USERS_COUNT"
        value = var.virtual_users_count
      }
      env {
        name  = "VIRTUAL_USERS_ROTATION_HOURS"
        value = var.virtual_users_rotation_hours
      }
      env {
        name  = "VIRTUAL_USERS_AUTO_REPLY_ENABLED"
        value = var.virtual_users_auto_reply_enabled
      }
      env {
        name  = "APP_FRONTEND_URL"
        value = var.app_frontend_url != "" ? var.app_frontend_url : "https://studyxp.khaxnh.id.vn"
      }
      env {
        name        = "JWT_SECRET"
        secret_name = "jwt-secret"
      }
      env {
        name  = "PORT"
        value = "8080"
      }
    }
  }

  lifecycle {
    ignore_changes = [
      template[0].container[0].image
    ]
  }

  tags = var.tags
}
