-- CashTrace V2 - Database Setup (V4 FINAL)
-- Jalankan file ini di SQLyog

SET FOREIGN_KEY_CHECKS=0;

-- 1. Buat Database
CREATE DATABASE IF NOT EXISTS cashtrace;
USE cashtrace;

-- 2. Hapus tabel lama
DROP TABLE IF EXISTS transactions;
DROP TABLE IF EXISTS refresh_tokens;
DROP TABLE IF EXISTS categories;
DROP TABLE IF EXISTS users;

-- 3. Buat Tabel Users
-- Ubah email ke VARCHAR(191) untuk menghindari error #1071 pada MySQL versi lama
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(191) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    name VARCHAR(100) NOT NULL,
    avatar_url VARCHAR(500) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Buat Tabel Refresh Tokens
CREATE TABLE refresh_tokens (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    token VARCHAR(500) NOT NULL,
    expires_at DATETIME NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Buat Tabel Categories
CREATE TABLE categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NULL,
    name VARCHAR(100) NOT NULL,
    type ENUM('income', 'expense') NOT NULL,
    icon VARCHAR(100) NULL,
    color VARCHAR(20) DEFAULT '#3B82F6',
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Buat Tabel Transactions
CREATE TABLE transactions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    category_id INT NULL,
    amount DECIMAL(15,2) NOT NULL,
    type ENUM('income', 'expense') NOT NULL,
    description TEXT NULL,
    transaction_date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. Insert Data Default (Income)
INSERT INTO categories (name, type, icon, color, is_default) VALUES
('Gaji', 'income', '💰', '#10B981', 1),
('Bonus', 'income', '🎁', '#8B5CF6', 1),
('Investasi', 'income', '📈', '#3B82F6', 1),
('Freelance', 'income', '💼', '#F59E0B', 1),
('Lainnya', 'income', '📦', '#6B7280', 1);

-- 8. Insert Data Default (Expense)
INSERT INTO categories (name, type, icon, color, is_default) VALUES
('Makanan', 'expense', '🍔', '#EF4444', 1),
('Transport', 'expense', '🚗', '#3B82F6', 1),
('Belanja', 'expense', '🛒', '#10B981', 1),
('Hiburan', 'expense', '🎬', '#8B5CF6', 1),
('Tagihan', 'expense', '📋', '#F59E0B', 1),
('Kesehatan', 'expense', '🏥', '#EC4899', 1),
('Pendidikan', 'expense', '📚', '#6366F1', 1),
('Lainnya', 'expense', '📦', '#6B7280', 1);

SET FOREIGN_KEY_CHECKS=1;
