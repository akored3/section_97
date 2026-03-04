-- SECTION-97 Product Sizes Migration
-- Splits each product's total stock across realistic size variants
-- Size stocks SUM to the product's total stock (single source of truth)
-- Run this in Supabase SQL Editor

-- Drop existing table if any
DROP TABLE IF EXISTS product_sizes CASCADE;

-- Create product_sizes table
CREATE TABLE product_sizes (
    id SERIAL PRIMARY KEY,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    size VARCHAR(10) NOT NULL,
    stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
    UNIQUE(product_id, size)
);

-- Enable RLS (public read, like products)
ALTER TABLE product_sizes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Product sizes are viewable by everyone" ON product_sizes
    FOR SELECT USING (true);

-- Index for fast lookups
CREATE INDEX idx_product_sizes_product_id ON product_sizes(product_id);

-- ============================================================
-- SIZE DISTRIBUTION RULES:
--   Clothing (hoodies, tshirts, jackets, pants): S, M, L, XL
--     Distribution: S ~20%, M ~30%, L ~35%, XL ~15%
--   Shoes: 7, 8, 9, 10, 11, 12
--     Distribution: bell curve centered on 9-10
--   Bags & Other (board, caps): One Size
-- ============================================================

INSERT INTO product_sizes (product_id, size, stock) VALUES

-- ==================== SUPREME ====================

-- 1: Red Supreme Hoodie (stock: 23)
(1, 'S', 5), (1, 'M', 7), (1, 'L', 8), (1, 'XL', 3),

-- 2: Black Supreme Hoodie (stock: 18)
(2, 'S', 4), (2, 'M', 5), (2, 'L', 6), (2, 'XL', 3),

-- 3: Blue Supreme Hoodie (stock: 31)
(3, 'S', 6), (3, 'M', 9), (3, 'L', 11), (3, 'XL', 5),

-- 4: Supreme Hoodie (stock: 12)
(4, 'S', 2), (4, 'M', 4), (4, 'L', 4), (4, 'XL', 2),

-- 5: Brown Supreme Hoodie (stock: 27)
(5, 'S', 5), (5, 'M', 8), (5, 'L', 10), (5, 'XL', 4),

-- 6: Blue Supreme Hoodie (stock: 9)
(6, 'S', 2), (6, 'M', 3), (6, 'L', 3), (6, 'XL', 1),

-- 7: Supreme Triple Hoodie (stock: 45)
(7, 'S', 9), (7, 'M', 14), (7, 'L', 15), (7, 'XL', 7),

-- 8: Black Supreme Jacket (stock: 14)
(8, 'S', 3), (8, 'M', 4), (8, 'L', 5), (8, 'XL', 2),

-- 9: Supreme Skull Shirt (stock: 36)
(9, 'S', 7), (9, 'M', 11), (9, 'L', 13), (9, 'XL', 5),

-- 10: Brown Supreme Shirt (stock: 21)
(10, 'S', 4), (10, 'M', 6), (10, 'L', 8), (10, 'XL', 3),

-- 11: Supreme Triple Shirts (stock: 8)
(11, 'S', 2), (11, 'M', 2), (11, 'L', 3), (11, 'XL', 1),

-- 12: Red Supreme Shirt (stock: 33)
(12, 'S', 7), (12, 'M', 10), (12, 'L', 11), (12, 'XL', 5),

-- 13: Green Supreme Shirt (stock: 19)
(13, 'S', 4), (13, 'M', 6), (13, 'L', 6), (13, 'XL', 3),

-- 14: Black Supreme Shirt (stock: 42)
(14, 'S', 8), (14, 'M', 13), (14, 'L', 15), (14, 'XL', 6),

-- 15: Black Supreme Pants (stock: 16)
(15, 'S', 3), (15, 'M', 5), (15, 'L', 6), (15, 'XL', 2),

-- 16: Supreme Shorts (stock: 28)
(16, 'S', 6), (16, 'M', 8), (16, 'L', 10), (16, 'XL', 4),

-- 17: Supreme Board (stock: 7)
(17, 'One Size', 7),

-- 18: Supreme Caps (stock: 50)
(18, 'One Size', 50),

-- ==================== CORTEIZ ====================

-- 19: Green Corteiz Hoodie (stock: 24)
(19, 'S', 5), (19, 'M', 7), (19, 'L', 8), (19, 'XL', 4),

-- 20: White Corteiz Hoodie (stock: 11)
(20, 'S', 2), (20, 'M', 3), (20, 'L', 4), (20, 'XL', 2),

-- 21: White Corteiz Hoodie (stock: 38)
(21, 'S', 8), (21, 'M', 11), (21, 'L', 13), (21, 'XL', 6),

-- 22: Black Corteiz Hoodie (stock: 15)
(22, 'S', 3), (22, 'M', 5), (22, 'L', 5), (22, 'XL', 2),

-- 23: Black Corteiz Jacket (stock: 6)
(23, 'S', 1), (23, 'M', 2), (23, 'L', 2), (23, 'XL', 1),

-- 24: Corteiz Denim Jacket (stock: 29)
(24, 'S', 6), (24, 'M', 9), (24, 'L', 10), (24, 'XL', 4),

-- 25: White Corteiz Shirt (stock: 47)
(25, 'S', 9), (25, 'M', 14), (25, 'L', 17), (25, 'XL', 7),

-- 26: Green Corteiz Pants (stock: 13)
(26, 'S', 3), (26, 'M', 4), (26, 'L', 4), (26, 'XL', 2),

-- 27: Corteiz Denim Pants (stock: 35)
(27, 'S', 7), (27, 'M', 11), (27, 'L', 12), (27, 'XL', 5),

-- 28: White Corteiz Pants (stock: 22)
(28, 'S', 4), (28, 'M', 7), (28, 'L', 8), (28, 'XL', 3),

-- 29: Black Corteiz Pants (stock: 40)
(29, 'S', 8), (29, 'M', 12), (29, 'L', 14), (29, 'XL', 6),

-- ==================== BALENCIAGA NBA ====================

-- 30: Black Balenciaga NBA Jersey (stock: 10)
(30, 'S', 2), (30, 'M', 3), (30, 'L', 3), (30, 'XL', 2),

-- 31: Black Balenciaga NBA Boots (stock: 5) — SHOES
(31, '8', 1), (31, '9', 1), (31, '10', 1), (31, '11', 1), (31, '12', 1),

-- 32: Red Balenciaga NBA Jacket (stock: 8)
(32, 'S', 2), (32, 'M', 2), (32, 'L', 3), (32, 'XL', 1),

-- 33: White Balenciaga NBA Jacket (stock: 17)
(33, 'S', 3), (33, 'M', 5), (33, 'L', 6), (33, 'XL', 3),

-- 34: Balenciaga NBA Slides (stock: 44) — SHOES
(34, '7', 5), (34, '8', 7), (34, '9', 10), (34, '10', 10), (34, '11', 7), (34, '12', 5),

-- 35: Balenciaga NBA Backpack (stock: 12) — BAG
(35, 'One Size', 12),

-- 36: Blue Balenciaga NBA Shirt (stock: 26)
(36, 'S', 5), (36, 'M', 8), (36, 'L', 9), (36, 'XL', 4),

-- 37: Balenciaga NBA Jacket (stock: 9)
(37, 'S', 2), (37, 'M', 3), (37, 'L', 3), (37, 'XL', 1),

-- ==================== STUSSY ====================

-- 38: Green Stussy Hoodie (stock: 32)
(38, 'S', 6), (38, 'M', 10), (38, 'L', 11), (38, 'XL', 5),

-- 39: Black Stussy Hoodie (stock: 20)
(39, 'S', 4), (39, 'M', 6), (39, 'L', 7), (39, 'XL', 3),

-- 40: Black & Blue Stussy Sweatshirt (stock: 37)
(40, 'S', 7), (40, 'M', 11), (40, 'L', 13), (40, 'XL', 6),

-- 41: Brown Stussy Sweatshirt (stock: 25)
(41, 'S', 5), (41, 'M', 8), (41, 'L', 8), (41, 'XL', 4),

-- 42: Brown Stussy Pants (stock: 14)
(42, 'S', 3), (42, 'M', 4), (42, 'L', 5), (42, 'XL', 2),

-- ==================== NIKE ====================

-- 43: Green Nike Shirt (stock: 48)
(43, 'S', 10), (43, 'M', 14), (43, 'L', 17), (43, 'XL', 7),

-- 44: Black Nike Shirt (stock: 30)
(44, 'S', 6), (44, 'M', 9), (44, 'L', 11), (44, 'XL', 4),

-- 45: White Nike Shirt (stock: 41)
(45, 'S', 8), (45, 'M', 12), (45, 'L', 15), (45, 'XL', 6),

-- 46: Grey Nike x Carhartt Jacket (stock: 11)
(46, 'S', 2), (46, 'M', 3), (46, 'L', 4), (46, 'XL', 2),

-- ==================== AIME LEON DORE ====================

-- 47: Brown Aime Leon Dore Sweatshirt (stock: 7)
(47, 'S', 1), (47, 'M', 2), (47, 'L', 3), (47, 'XL', 1),

-- 48: Aime Leon Dore Pants (stock: 19)
(48, 'S', 4), (48, 'M', 6), (48, 'L', 6), (48, 'XL', 3),

-- ==================== YARD SALE ====================

-- 49: Yard Sale Vest (stock: 34)
(49, 'S', 7), (49, 'M', 10), (49, 'L', 12), (49, 'XL', 5),

-- 50: White Yard Sale Hoodie (stock: 16)
(50, 'S', 3), (50, 'M', 5), (50, 'L', 6), (50, 'XL', 2),

-- 51: Black Yard Sale Hoodie (stock: 43)
(51, 'S', 9), (51, 'M', 13), (51, 'L', 15), (51, 'XL', 6),

-- 52: Checkered Yard Sale Hoodie (stock: 28)
(52, 'S', 6), (52, 'M', 8), (52, 'L', 10), (52, 'XL', 4),

-- 53: Blue Denim Yard Sale Hoodie (stock: 13)
(53, 'S', 3), (53, 'M', 4), (53, 'L', 4), (53, 'XL', 2),

-- 54: Purple Yard Sale Hoodie (stock: 39)
(54, 'S', 8), (54, 'M', 12), (54, 'L', 13), (54, 'XL', 6),

-- 55: Beige Yard Sale Hoodie (stock: 22)
(55, 'S', 4), (55, 'M', 7), (55, 'L', 8), (55, 'XL', 3),

-- 56: Purple Yard Sale Hoodie (stock: 31)
(56, 'S', 6), (56, 'M', 9), (56, 'L', 11), (56, 'XL', 5),

-- 57: Checkered Yard Sale Hoodie (stock: 8)
(57, 'S', 2), (57, 'M', 2), (57, 'L', 3), (57, 'XL', 1),

-- 58: Blue Yard Sale Hoodie (stock: 46)
(58, 'S', 9), (58, 'M', 14), (58, 'L', 16), (58, 'XL', 7),

-- 59: Yard Sale Shirt (stock: 50)
(59, 'S', 10), (59, 'M', 15), (59, 'L', 18), (59, 'XL', 7),

-- 60: Red Yard Sale Shirt (stock: 17)
(60, 'S', 3), (60, 'M', 5), (60, 'L', 6), (60, 'XL', 3),

-- 61: Black Yard Sale Shirt (stock: 24)
(61, 'S', 5), (61, 'M', 7), (61, 'L', 8), (61, 'XL', 4),

-- 62: White Yard Sale Shirt (stock: 36)
(62, 'S', 7), (62, 'M', 11), (62, 'L', 13), (62, 'XL', 5),

-- 63: Black Yard Sale Shirt (stock: 12)
(63, 'S', 2), (63, 'M', 4), (63, 'L', 4), (63, 'XL', 2),

-- 64: Grey Yard Sale Shirt (stock: 29)
(64, 'S', 6), (64, 'M', 9), (64, 'L', 10), (64, 'XL', 4),

-- 65: Black Yard Sale Shirt (stock: 41)
(65, 'S', 8), (65, 'M', 12), (65, 'L', 15), (65, 'XL', 6),

-- 66: Yard Sale Bag (stock: 15) — BAG
(66, 'One Size', 15),

-- 67: Brown Yard Sale Cargo Pants (stock: 33)
(67, 'S', 7), (67, 'M', 10), (67, 'L', 11), (67, 'XL', 5);

-- ============================================================
-- VERIFICATION: Confirm every product's size stock sums to its total
-- Run this after the migration to check for mismatches
-- ============================================================
-- SELECT
--     p.id,
--     p.name,
--     p.stock AS product_stock,
--     COALESCE(SUM(ps.stock), 0) AS size_stock_total,
--     p.stock - COALESCE(SUM(ps.stock), 0) AS difference
-- FROM products p
-- LEFT JOIN product_sizes ps ON ps.product_id = p.id
-- GROUP BY p.id, p.name, p.stock
-- ORDER BY p.id;
