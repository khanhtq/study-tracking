# Resource Group Name
output "resource_group_name" {
  description = "Tên Resource Group"
  value       = azurerm_resource_group.rg.name
}

# Azure Storage Account (Backend Document Storage)
output "storage_account_name" {
  description = "Tên Azure Storage Account chứa tài liệu"
  value       = azurerm_storage_account.storage.name
}

output "storage_container_name" {
  description = "Tên Container chứa tài liệu"
  value       = azurerm_storage_container.container.name
}

output "primary_connection_string" {
  description = "Chuỗi kết nối Azure Storage Account"
  value       = azurerm_storage_account.storage.primary_connection_string
  sensitive   = true
}

# Azure Container Registry
output "container_registry_login_server" {
  description = "Login server của Azure Container Registry"
  value       = azurerm_container_registry.acr.login_server
}

output "container_registry_admin_username" {
  description = "Tài khoản Admin của ACR"
  value       = azurerm_container_registry.acr.admin_username
}

# Azure Database for PostgreSQL Flexible Server
output "postgresql_server_fqdn" {
  description = "Tên miền FQDN của PostgreSQL Flexible Server"
  value       = azurerm_postgresql_flexible_server.postgres.fqdn
}

output "postgresql_database_name" {
  description = "Tên cơ sở dữ liệu PostgreSQL"
  value       = azurerm_postgresql_flexible_server_database.db.name
}

# Upstash Redis Connection Status
output "redis_connection_status" {
  description = "Trạng thái cấu hình Redis"
  value       = var.upstash_redis_host != "" ? "Connected to Upstash Redis (${var.upstash_redis_host})" : "PostgreSQL Database Fallback Active"
}

# Azure Container Apps Backend (Spring Boot API - HTTPS Tự Động 100%)
output "backend_app_service_url" {
  description = "Đường dẫn HTTPS Endpoint chính thức của Backend Spring Boot API trên Azure Container Apps"
  value       = "https://${azurerm_container_app.backend.ingress[0].fqdn}"
}

output "backend_container_app_name" {
  description = "Tên Azure Container App cho Backend"
  value       = azurerm_container_app.backend.name
}
