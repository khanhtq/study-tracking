output "resource_group_name" {
  value       = azurerm_resource_group.rg.name
  description = "Tên Resource Group đã khởi tạo"
}

output "storage_account_name" {
  value       = azurerm_storage_account.storage.name
  description = "Tên Storage Account đã khởi tạo"
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

output "primary_blob_endpoint" {
  value       = azurerm_storage_account.storage.primary_blob_endpoint
  description = "Địa chỉ Blob Endpoint gốc"
}
