#!/bin/bash
# Environment variables setup script for Backend (Linux / macOS)

# Database
export SPRING_DATASOURCE_URL="jdbc:postgresql://localhost:5432/study_xp_tracker"
export SPRING_DATASOURCE_USERNAME="postgres"
export SPRING_DATASOURCE_PASSWORD="password"

# Redis
export SPRING_REDIS_HOST="localhost"
export SPRING_REDIS_PORT="6379"
export SPRING_REDIS_PASSWORD=""
export SPRING_REDIS_SSL_ENABLED="false"

# JWT & Security
export JWT_SECRET="your-256-bit-secret-key"
export GOOGLE_CLIENT_ID="your-google-client-id"

# Mail Configuration
export SPRING_MAIL_HOST="smtp-relay.brevo.com"
export SPRING_MAIL_PORT="465"
export SPRING_MAIL_USERNAME="username"
export SPRING_MAIL_PASSWORD="password"
export SPRING_MAIL_FROM="from@example.com"
export SPRING_MAIL_STARTTLS_ENABLE="false"
export SPRING_MAIL_SSL_ENABLE="true"
export BREVO_API_KEY="api-key"

# Storage Provider
export STORAGE_PROVIDER="local" # 'local', 'cloudinary', or 'azure'
export UPLOAD_DIR="uploads"
export CLOUDINARY_CLOUD_NAME="cloud-name"
export CLOUDINARY_API_KEY="api-key"
export CLOUDINARY_API_SECRET="api-secret"

# VNPay Payment
export VNPAY_TMN_CODE="tmn-code"
export VNPAY_HASH_SECRET="vnpay-hash-secret"
export VNPAY_PAY_URL="https://sandbox.vnpayment.vn/paymentv2/vpcpay.html"
export VNPAY_RETURN_URL="http://localhost:8080/api/payment/vnpay/return"
export FRONTEND_URL="http://localhost:5173"

# Virtual Users
export VIRTUAL_USERS_ENABLED="true"
export VIRTUAL_USERS_COUNT="8"
export VIRTUAL_USERS_ROTATION_HOURS="2"
export VIRTUAL_USERS_AUTO_REPLY_ENABLED="false"

echo "Environment variables loaded."
