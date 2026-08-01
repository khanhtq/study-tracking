-- Migration V6: Create payment_orders table for VNPay Payment Integration
CREATE TABLE payment_orders (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    order_id VARCHAR(100) NOT NULL UNIQUE,
    amount BIGINT NOT NULL,
    package_id VARCHAR(50) NOT NULL,
    duration_days INT NOT NULL DEFAULT 30,
    package_name VARCHAR(100) NOT NULL,
    order_info VARCHAR(255),
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
    vnp_transaction_no VARCHAR(100),
    vnp_response_code VARCHAR(20),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_payment_orders_user ON payment_orders(user_id);
CREATE INDEX idx_payment_orders_order_id ON payment_orders(order_id);
