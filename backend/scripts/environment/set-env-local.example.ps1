# ==============================================================================
# TEMPLATE SCRIPT SETTING ENVIRONMENT VARIABLES FOR LOCAL BACKEND DEVELOPMENT
# ==============================================================================

# --- Server & Profile ---
$env:PORT = "8080"
$env:SPRING_PROFILES_ACTIVE = "dev"

# --- Database (Local PostgreSQL via Docker) ---
$env:SPRING_DATASOURCE_URL = "jdbc:postgresql://localhost:5432/study_xp_tracker"
$env:SPRING_DATASOURCE_USERNAME = "postgres"
$env:SPRING_DATASOURCE_PASSWORD = "password"

# --- Redis Cache (Local Redis via Docker) ---
$env:SPRING_REDIS_HOST = "localhost"
$env:SPRING_REDIS_PORT = "6379"
$env:SPRING_REDIS_PASSWORD = ""
$env:SPRING_REDIS_SSL_ENABLED = "false"

# --- Storage Settings (Local Disk / Azurite) ---
$env:STORAGE_PROVIDER = "local" # 'local' (lưu vào uploads/) hoặc 'azure' (lưu vào Azurite localhost:10000)
$env:UPLOAD_DIR = "uploads"
$env:MAX_USER_QUOTA_MB = "1024"
$env:MAX_FILE_SIZE_MB = "200"
$env:AZURE_STORAGE_CONNECTION_STRING = "DefaultEndpointsProtocol=http;AccountName=devstoreaccount1;AccountKey=Eby8vdM02xNOcqFlqUwJPLlmEtlCDXJ1OUzFT50uSRZ6IFsuFq2UVErCz4I6tq/K1SZFPTOtr/KBHBeksoGMGw==;BlobEndpoint=http://127.0.0.1:10000/devstoreaccount1;"
$env:AZURE_STORAGE_CONTAINER_NAME = "study-documents"
$env:AZURE_STORAGE_SAS_EXPIRY_MINUTES = "60"

# --- Cloudinary Storage (Optional) ---
$env:CLOUDINARY_CLOUD_NAME = ""
$env:CLOUDINARY_API_KEY = ""
$env:CLOUDINARY_API_SECRET = ""

# --- Mail & SMTP (Local Mailpit via Docker) ---
$env:SPRING_MAIL_HOST = "localhost"
$env:SPRING_MAIL_PORT = "1025"
$env:SPRING_MAIL_USERNAME = ""
$env:SPRING_MAIL_PASSWORD = ""
$env:SPRING_MAIL_FROM = "no-reply@studyxptracker.local"
$env:SPRING_MAIL_SSL_ENABLE = "false"
$env:SPRING_MAIL_STARTTLS_ENABLE = "false"
$env:SPRING_MAIL_STARTTLS_REQUIRED = "false"
$env:BREVO_API_KEY = ""

# --- Security, OAuth2 & JWT ---
$env:GOOGLE_CLIENT_ID = "your-google-client-id"
$env:JWT_SECRET = "your-256-bit-hex-secret-key-at-least-64-characters-long"
$env:APP_AUTH_COOKIE_SAME_SITE = "Lax"
$env:APP_AUTH_COOKIE_SECURE = "false"

# --- Frontend URL & CORS ---
$env:APP_FRONTEND_URL = "http://localhost:5173"
$env:FRONTEND_URL = "http://localhost:5173"

# --- VNPay Payment Gateway Sandbox ---
$env:VNPAY_TMN_CODE = "DEMO0001"
$env:VNPAY_HASH_SECRET = "SECRETKEYDEMO1234567890ABCDEF"
$env:VNPAY_PAY_URL = "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html"
$env:VNPAY_RETURN_URL = "http://localhost:8080/api/payment/vnpay/return"

# --- Virtual Users / Bot Real-time Chat ---
$env:VIRTUAL_USERS_ENABLED = "true"
$env:VIRTUAL_USERS_COUNT = "5"
$env:VIRTUAL_USERS_ROTATION_HOURS = "1"
$env:VIRTUAL_USERS_AUTO_REPLY_ENABLED = "true"
