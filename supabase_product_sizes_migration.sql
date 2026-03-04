-- SECTION-97 Product Sizes Migration
-- Splits each product's total stock across realistic size variants
-- Size stocks SUM to the product's total stock (single source of truth)
-- Run this in Supabase SQL Editor AFTER the products migration

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

-- 1: Red Supreme Hoodie (stock: 120)
(1, 'S', 24), (1, 'M', 36), (1, 'L', 42), (1, 'XL', 18),

-- 2: Black Supreme Hoodie (stock: 95)
(2, 'S', 19), (2, 'M', 29), (2, 'L', 33), (2, 'XL', 14),

-- 3: Blue Supreme Hoodie (stock: 150)
(3, 'S', 30), (3, 'M', 45), (3, 'L', 53), (3, 'XL', 22),

-- 4: Supreme Hoodie (stock: 80)
(4, 'S', 16), (4, 'M', 24), (4, 'L', 28), (4, 'XL', 12),

-- 5: Brown Supreme Hoodie (stock: 130)
(5, 'S', 26), (5, 'M', 39), (5, 'L', 46), (5, 'XL', 19),

-- 6: Blue Supreme Hoodie (stock: 65)
(6, 'S', 13), (6, 'M', 20), (6, 'L', 23), (6, 'XL', 9),

-- 7: Supreme Triple Hoodie (stock: 200)
(7, 'S', 40), (7, 'M', 60), (7, 'L', 70), (7, 'XL', 30),

-- 8: Black Supreme Jacket (stock: 75)
(8, 'S', 15), (8, 'M', 23), (8, 'L', 26), (8, 'XL', 11),

-- 9: Supreme Skull Shirt (stock: 180)
(9, 'S', 36), (9, 'M', 54), (9, 'L', 63), (9, 'XL', 27),

-- 10: Brown Supreme Shirt (stock: 110)
(10, 'S', 22), (10, 'M', 33), (10, 'L', 39), (10, 'XL', 16),

-- 11: Supreme Triple Shirts (stock: 60)
(11, 'S', 12), (11, 'M', 18), (11, 'L', 21), (11, 'XL', 9),

-- 12: Red Supreme Shirt (stock: 160)
(12, 'S', 32), (12, 'M', 48), (12, 'L', 56), (12, 'XL', 24),

-- 13: Green Supreme Shirt (stock: 100)
(13, 'S', 20), (13, 'M', 30), (13, 'L', 35), (13, 'XL', 15),

-- 14: Black Supreme Shirt (stock: 200)
(14, 'S', 40), (14, 'M', 60), (14, 'L', 70), (14, 'XL', 30),

-- 15: Black Supreme Pants (stock: 85)
(15, 'S', 17), (15, 'M', 26), (15, 'L', 30), (15, 'XL', 12),

-- 16: Supreme Shorts (stock: 140)
(16, 'S', 28), (16, 'M', 42), (16, 'L', 49), (16, 'XL', 21),

-- 17: Supreme Board (stock: 45)
(17, 'One Size', 45),

-- 18: Supreme Caps (stock: 250)
(18, 'One Size', 250),

-- ==================== CORTEIZ ====================

-- 19: Green Corteiz Hoodie (stock: 115)
(19, 'S', 23), (19, 'M', 35), (19, 'L', 40), (19, 'XL', 17),

-- 20: White Corteiz Hoodie (stock: 70)
(20, 'S', 14), (20, 'M', 21), (20, 'L', 25), (20, 'XL', 10),

-- 21: White Corteiz Hoodie (stock: 180)
(21, 'S', 36), (21, 'M', 54), (21, 'L', 63), (21, 'XL', 27),

-- 22: Black Corteiz Hoodie (stock: 80)
(22, 'S', 16), (22, 'M', 24), (22, 'L', 28), (22, 'XL', 12),

-- 23: Black Corteiz Jacket (stock: 50)
(23, 'S', 10), (23, 'M', 15), (23, 'L', 18), (23, 'XL', 7),

-- 24: Corteiz Denim Jacket (stock: 140)
(24, 'S', 28), (24, 'M', 42), (24, 'L', 49), (24, 'XL', 21),

-- 25: White Corteiz Shirt (stock: 220)
(25, 'S', 44), (25, 'M', 66), (25, 'L', 77), (25, 'XL', 33),

-- 26: Green Corteiz Pants (stock: 75)
(26, 'S', 15), (26, 'M', 23), (26, 'L', 26), (26, 'XL', 11),

-- 27: Corteiz Denim Pants (stock: 170)
(27, 'S', 34), (27, 'M', 51), (27, 'L', 60), (27, 'XL', 25),

-- 28: White Corteiz Pants (stock: 110)
(28, 'S', 22), (28, 'M', 33), (28, 'L', 39), (28, 'XL', 16),

-- 29: Black Corteiz Pants (stock: 190)
(29, 'S', 38), (29, 'M', 57), (29, 'L', 67), (29, 'XL', 28),

-- ==================== BALENCIAGA NBA ====================

-- 30: Black Balenciaga NBA Jersey (stock: 65)
(30, 'S', 13), (30, 'M', 20), (30, 'L', 23), (30, 'XL', 9),

-- 31: Black Balenciaga NBA Boots (stock: 40) — SHOES
(31, '7', 4), (31, '8', 6), (31, '9', 10), (31, '10', 10), (31, '11', 6), (31, '12', 4),

-- 32: Red Balenciaga NBA Jacket (stock: 55)
(32, 'S', 11), (32, 'M', 17), (32, 'L', 19), (32, 'XL', 8),

-- 33: White Balenciaga NBA Jacket (stock: 90)
(33, 'S', 18), (33, 'M', 27), (33, 'L', 32), (33, 'XL', 13),

-- 34: Balenciaga NBA Slides (stock: 200) — SHOES
(34, '7', 20), (34, '8', 30), (34, '9', 50), (34, '10', 50), (34, '11', 30), (34, '12', 20),

-- 35: Balenciaga NBA Backpack (stock: 70) — BAG
(35, 'One Size', 70),

-- 36: Blue Balenciaga NBA Shirt (stock: 130)
(36, 'S', 26), (36, 'M', 39), (36, 'L', 46), (36, 'XL', 19),

-- 37: Balenciaga NBA Jacket (stock: 60)
(37, 'S', 12), (37, 'M', 18), (37, 'L', 21), (37, 'XL', 9),

-- ==================== STUSSY ====================

-- 38: Green Stussy Hoodie (stock: 155)
(38, 'S', 31), (38, 'M', 47), (38, 'L', 54), (38, 'XL', 23),

-- 39: Black Stussy Hoodie (stock: 100)
(39, 'S', 20), (39, 'M', 30), (39, 'L', 35), (39, 'XL', 15),

-- 40: Black & Blue Stussy Sweatshirt (stock: 175)
(40, 'S', 35), (40, 'M', 53), (40, 'L', 61), (40, 'XL', 26),

-- 41: Brown Stussy Sweatshirt (stock: 120)
(41, 'S', 24), (41, 'M', 36), (41, 'L', 42), (41, 'XL', 18),

-- 42: Brown Stussy Pants (stock: 80)
(42, 'S', 16), (42, 'M', 24), (42, 'L', 28), (42, 'XL', 12),

-- ==================== NIKE ====================

-- 43: Green Nike Shirt (stock: 230)
(43, 'S', 46), (43, 'M', 69), (43, 'L', 81), (43, 'XL', 34),

-- 44: Black Nike Shirt (stock: 150)
(44, 'S', 30), (44, 'M', 45), (44, 'L', 53), (44, 'XL', 22),

-- 45: White Nike Shirt (stock: 195)
(45, 'S', 39), (45, 'M', 59), (45, 'L', 68), (45, 'XL', 29),

-- 46: Grey Nike x Carhartt Jacket (stock: 70)
(46, 'S', 14), (46, 'M', 21), (46, 'L', 25), (46, 'XL', 10),

-- ==================== AIME LEON DORE ====================

-- 47: Brown Aime Leon Dore Sweatshirt (stock: 50)
(47, 'S', 10), (47, 'M', 15), (47, 'L', 18), (47, 'XL', 7),

-- 48: Aime Leon Dore Pants (stock: 95)
(48, 'S', 19), (48, 'M', 29), (48, 'L', 33), (48, 'XL', 14),

-- ==================== YARD SALE ====================

-- 49: Yard Sale Vest (stock: 165)
(49, 'S', 33), (49, 'M', 50), (49, 'L', 58), (49, 'XL', 24),

-- 50: White Yard Sale Hoodie (stock: 85)
(50, 'S', 17), (50, 'M', 26), (50, 'L', 30), (50, 'XL', 12),

-- 51: Black Yard Sale Hoodie (stock: 205)
(51, 'S', 41), (51, 'M', 62), (51, 'L', 72), (51, 'XL', 30),

-- 52: Checkered Yard Sale Hoodie (stock: 135)
(52, 'S', 27), (52, 'M', 41), (52, 'L', 47), (52, 'XL', 20),

-- 53: Blue Denim Yard Sale Hoodie (stock: 75)
(53, 'S', 15), (53, 'M', 23), (53, 'L', 26), (53, 'XL', 11),

-- 54: Purple Yard Sale Hoodie (stock: 185)
(54, 'S', 37), (54, 'M', 56), (54, 'L', 65), (54, 'XL', 27),

-- 55: Beige Yard Sale Hoodie (stock: 110)
(55, 'S', 22), (55, 'M', 33), (55, 'L', 39), (55, 'XL', 16),

-- 56: Purple Yard Sale Hoodie (stock: 150)
(56, 'S', 30), (56, 'M', 45), (56, 'L', 53), (56, 'XL', 22),

-- 57: Checkered Yard Sale Hoodie (stock: 55)
(57, 'S', 11), (57, 'M', 17), (57, 'L', 19), (57, 'XL', 8),

-- 58: Blue Yard Sale Hoodie (stock: 215)
(58, 'S', 43), (58, 'M', 65), (58, 'L', 75), (58, 'XL', 32),

-- 59: Yard Sale Shirt (stock: 240)
(59, 'S', 48), (59, 'M', 72), (59, 'L', 84), (59, 'XL', 36),

-- 60: Red Yard Sale Shirt (stock: 90)
(60, 'S', 18), (60, 'M', 27), (60, 'L', 32), (60, 'XL', 13),

-- 61: Black Yard Sale Shirt (stock: 120)
(61, 'S', 24), (61, 'M', 36), (61, 'L', 42), (61, 'XL', 18),

-- 62: White Yard Sale Shirt (stock: 175)
(62, 'S', 35), (62, 'M', 53), (62, 'L', 61), (62, 'XL', 26),

-- 63: Black Yard Sale Shirt (stock: 70)
(63, 'S', 14), (63, 'M', 21), (63, 'L', 25), (63, 'XL', 10),

-- 64: Grey Yard Sale Shirt (stock: 145)
(64, 'S', 29), (64, 'M', 44), (64, 'L', 51), (64, 'XL', 21),

-- 65: Black Yard Sale Shirt (stock: 195)
(65, 'S', 39), (65, 'M', 59), (65, 'L', 68), (65, 'XL', 29),

-- 66: Yard Sale Bag (stock: 80) — BAG
(66, 'One Size', 80),

-- 67: Brown Yard Sale Cargo Pants (stock: 160)
(67, 'S', 32), (67, 'M', 48), (67, 'L', 56), (67, 'XL', 24);

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
