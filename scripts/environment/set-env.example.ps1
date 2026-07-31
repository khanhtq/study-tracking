# Variables for Spring Mail configuration
$env:SPRING_MAIL_USERNAME="username"
$env:SPRING_MAIL_PASSWORD="password"
$env:SPRING_MAIL_HOST="smtp-relay.brevo.com"
$env:SPRING_MAIL_PORT="465"
$env:SPRING_MAIL_FROM="from@example.com"
$env:SPRING_MAIL_STARTTLS_ENABLE="false"
$env:SPRING_MAIL_SSL_ENABLE="true"
$env:BREVO_API_KEY="api-key"

# Variable for Google OAuth configuration
$env:GOOGLE_CLIENT_ID="client-id"

# variable for storage provider
$env:STORAGE_PROVIDER="cloudinary"

#variables for Cloudinary configuration
$env:CLOUDINARY_CLOUD_NAME="cloud-name"
$env:CLOUDINARY_API_KEY="api-key"
$env:CLOUDINARY_API_SECRET="api-secret"

# Variables for Redis configuration
$env:SPRING_REDIS_HOST="host"
$env:SPRING_REDIS_PORT="6379"
$env:SPRING_REDIS_PASSWORD="password"
$env:SPRING_REDIS_SSL_ENABLED="true"

#Variable for JWT secret key
$env:JWT_SECRET="secret-key"

#VNPay ìnormation
$env:VNPAY_TMN_CODE="tmn-code"
$env:VNPAY_HASH_SECRET="vnpay-hash-secret"
$env:VNPAY_PAY_URL="https://sandbox.vnpayment.vn/paymentv2/vpcpay.html"
$env:VNPAY_RETURN_URL="https://example.com/payment-return"
$env:FRONTEND_URL="https://example.com"

# Variables for Virtual Users configuration
$env:VIRTUAL_USERS_ENABLED="true"
$env:VIRTUAL_USERS_COUNT="8"
$env:VIRTUAL_USERS_ROTATION_HOURS="2"
$env:VIRTUAL_USERS_AUTO_REPLY_ENABLED="true"

Write-Host "Environment variables loaded."