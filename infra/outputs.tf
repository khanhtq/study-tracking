output "resource_group_name" {
  value       = azurerm_resource_group.rg.name
  description = "Tên Resource Group đã khởi tạo"
}

output "storage_account_name" {
  value       = azurerm_storage_account.storage.name
  description = "Tên Storage Account cho tài liệu học tập"
}

output "storage_container_name" {
  value       = azurerm_storage_container.container.name
  description = "Tên Storage Container"
}

output "primary_connection_string" {
  value       = azurerm_storage_account.storage.primary_connection_string
  description = "Chuỗi kết nối Azure Storage Connection String dùng cho backend"
  sensitive   = true
}

output "container_registry_login_server" {
  value       = azurerm_container_registry.acr.login_server
  description = "Địa chỉ Login Server của Azure Container Registry (dùng cho docker login & CI/CD)"
}

output "container_registry_admin_username" {
  value       = azurerm_container_registry.acr.admin_username
  description = "Admin Username của ACR"
}

output "postgresql_server_fqdn" {
  value       = azurerm_postgresql_flexible_server.postgres.fqdn
  description = "Địa chỉ FQDN của PostgreSQL Flexible Server"
}

output "postgresql_database_name" {
  value       = azurerm_postgresql_flexible_server_database.db.name
  description = "Tên Database PostgreSQL"
}

output "redis_connection_status" {
  value       = var.upstash_redis_host != "" ? "Connected to Upstash Redis (${var.upstash_redis_host})" : "Disabled (PostgreSQL Fallback Active)"
  description = "Trạng thái kết nối Redis"
}

output "backend_container_group_name" {
  value       = azurerm_container_group.backend.name
  description = "Tên Azure Container Instance (Backend)"
}

output "backend_app_service_url" {
  value       = "http://${azurerm_container_group.backend.fqdn}:8080"
  description = "Đường dẫn URL truy cập Backend REST API & WebSockets"
}

output "frontend_static_website_url" {
  value       = azurerm_storage_account.frontend_storage.primary_web_endpoint
  description = "Đường dẫn URL truy cập Web Application (React SPA Static Website)"
}

output "frontend_storage_account_name" {
  value       = azurerm_storage_account.frontend_storage.name
  description = "Tên Storage Account chứa Static Website Frontend"
}
