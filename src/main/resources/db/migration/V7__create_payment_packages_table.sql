CREATE TABLE IF NOT EXISTS payment_packages (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    price_vnd BIGINT NOT NULL,
    duration_days INT NOT NULL,
    tag_name VARCHAR(50),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO payment_packages (id, name, price_vnd, duration_days, tag_name, is_active)
VALUES 
    ('1_MONTH', 'Gói VIP Premium 1 Tháng', 20000, 30, NULL, TRUE),
    ('3_MONTHS', 'Gói VIP Premium 3 Tháng', 50000, 90, 'Phổ biến 🔥', TRUE),
    ('1_YEAR', 'Gói VIP Premium 1 Năm', 180000, 365, 'Tiết kiệm 25% ⚡', TRUE)
ON CONFLICT (id) DO NOTHING;
