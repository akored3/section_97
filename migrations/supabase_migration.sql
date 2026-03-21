-- SECTION-97 Products Table Migration
-- Run this in Supabase SQL Editor

-- Drop existing table and recreate (fresh start)
DROP TABLE IF EXISTS products CASCADE;

-- Create products table
CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    price INTEGER NOT NULL,
    image_front VARCHAR(500) NOT NULL,
    image_back VARCHAR(500),
    category VARCHAR(50) NOT NULL,
    brand VARCHAR(100),
    stock INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security (allows public read)
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read products (public store)
CREATE POLICY "Products are viewable by everyone" ON products
    FOR SELECT USING (true);

-- ============================================================
-- PRICING GUIDE:
--   T-shirts: ₦10,000
--   Hoodies:  ₦15,000 – ₦25,000
--   Pants:    ₦15,000 – ₦20,000
--   Jackets:  ₦30,000+
--   Shoes:    ₦20,000 – ₦35,000
--   Bags:     ₦15,000 – ₦25,000
--   Other:    ₦8,000 – ₦20,000
-- STOCK: 50–250 per product (real-world levels)
-- ============================================================

INSERT INTO products (name, price, image_front, image_back, category, brand, stock) VALUES
-- Supreme Products
('Red Supreme Hoodie', 20000, 'images/red_supreme_hoodie1.jpeg', NULL, 'hoodies', 'Supreme', 120),
('Black Supreme Hoodie', 18000, 'images/black_supreme_hoodie2.jpeg', NULL, 'hoodies', 'Supreme', 95),
('Blue Supreme Hoodie', 22000, 'images/blue_supreme_hoodie5.jpeg', NULL, 'hoodies', 'Supreme', 150),
('Supreme Hoodie', 15000, 'images/supreme_hoodie6.jpeg', NULL, 'hoodies', 'Supreme', 80),
('Brown Supreme Hoodie', 20000, 'images/brown_supreme_hoodie8.jpeg', NULL, 'hoodies', 'Supreme', 130),
('Blue Supreme Hoodie', 17000, 'images/blue_supreme_hoodie13.jpeg', NULL, 'hoodies', 'Supreme', 65),
('Supreme Triple Hoodie', 25000, 'images/supreme_triple_hoodie10.jpeg', NULL, 'hoodies', 'Supreme', 200),
('Black Supreme Jacket', 35000, 'images/black_supreme_jacket3.jpeg', NULL, 'jackets', 'Supreme', 75),
('Supreme Skull Shirt', 10000, 'images/supreme_skull_shirt4.jpeg', NULL, 'tshirts', 'Supreme', 180),
('Brown Supreme Shirt', 10000, 'images/brown_supreme_shirt7.jpeg', NULL, 'tshirts', 'Supreme', 110),
('Supreme Triple Shirts', 10000, 'images/supreme_triple_shirts9.jpeg', NULL, 'tshirts', 'Supreme', 60),
('Red Supreme Shirt', 10000, 'images/red_supreme_shirt_front_38.jpeg', 'images/red_supreme_shirt_back38.jpeg', 'tshirts', 'Supreme', 160),
('Green Supreme Shirt', 10000, 'images/green_supreme_shirt_front39.jpeg', 'images/green_supreme_shirt_back39.jpeg', 'tshirts', 'Supreme', 100),
('Black Supreme Shirt', 10000, 'images/black_supreme_shirt_front40.jpeg', 'images/black_supreme_shirt_back40.jpeg', 'tshirts', 'Supreme', 200),
('Black Supreme Pants', 18000, 'images/black_supreme_pants1.jpeg', NULL, 'pants', 'Supreme', 85),
('Supreme Shorts', 15000, 'images/supreme_shorts11.jpeg', NULL, 'pants', 'Supreme', 140),
('Supreme Board', 20000, 'images/supreme_board12.jpeg', NULL, 'other', 'Supreme', 45),
('Supreme Caps', 8000, 'images/supreme_caps1.jpeg', NULL, 'other', 'Supreme', 250),

-- Corteiz Products
('Green Corteiz Hoodie', 19000, 'images/green_corteiz_hoodie16.jpeg', NULL, 'hoodies', 'Corteiz', 115),
('White Corteiz Hoodie', 16000, 'images/white_corteiz_hoodie17.jpeg', NULL, 'hoodies', 'Corteiz', 70),
('White Corteiz Hoodie', 22000, 'images/white_corteiz_hoodie22.jpeg', NULL, 'hoodies', 'Corteiz', 180),
('Black Corteiz Hoodie', 18000, 'images/black_corteiz_hoodie24.jpeg', NULL, 'hoodies', 'Corteiz', 80),
('Black Corteiz Jacket', 38000, 'images/black_corteiz_jacket23.jpeg', NULL, 'jackets', 'Corteiz', 50),
('Corteiz Denim Jacket', 35000, 'images/corteiz_denim_jacket19.jpeg', NULL, 'jackets', 'Corteiz', 140),
('White Corteiz Shirt', 10000, 'images/white_corteiz_shirt20.jpeg', NULL, 'tshirts', 'Corteiz', 220),
('Green Corteiz Pants', 17000, 'images/green_corteiz_pants14.jpeg', NULL, 'pants', 'Corteiz', 75),
('Corteiz Denim Pants', 20000, 'images/corteiz_denim_pants15.jpeg', NULL, 'pants', 'Corteiz', 170),
('White Corteiz Pants', 16000, 'images/white_corteiz_pants18.jpeg', NULL, 'pants', 'Corteiz', 110),
('Black Corteiz Pants', 18000, 'images/black_corteiz_pants21.jpeg', NULL, 'pants', 'Corteiz', 190),

-- Balenciaga NBA Products
('Black Balenciaga NBA Jersey', 10000, 'images/black_balenciaga_nba_jersey25.jpeg', NULL, 'tshirts', 'Balenciaga', 65),
('Black Balenciaga NBA Boots', 30000, 'images/black_balenciaga_nba_shoe26.jpeg', NULL, 'shoes', 'Balenciaga', 40),
('Red Balenciaga NBA Jacket', 45000, 'images/red_balenciaga_nba_jacket27.jpeg', NULL, 'jackets', 'Balenciaga', 55),
('White Balenciaga NBA Jacket', 42000, 'images/white_balenciaga_nba_jacket28.jpeg', NULL, 'jackets', 'Balenciaga', 90),
('Balenciaga NBA Slides', 20000, 'images/balenciaga_nba_slides_shoe29.jpeg', NULL, 'shoes', 'Balenciaga', 200),
('Balenciaga NBA Backpack', 25000, 'images/balenciaga_nba_backpack30.jpeg', NULL, 'bags', 'Balenciaga', 70),
('Blue Balenciaga NBA Shirt', 10000, 'images/blue_balenciaga_nba_shirt31.jpeg', NULL, 'tshirts', 'Balenciaga', 130),
('Balenciaga NBA Jacket', 40000, 'images/balenciaga_nba_jacket_32.jpeg', NULL, 'jackets', 'Balenciaga', 60),

-- Stussy Products
('Green Stussy Hoodie', 17000, 'images/green_stussy_hoodie33.jpeg', NULL, 'hoodies', 'Stussy', 155),
('Black Stussy Hoodie', 16000, 'images/black_stussy_hoodie34.jpeg', NULL, 'hoodies', 'Stussy', 100),
('Black & Blue Stussy Sweatshirt', 19000, 'images/black_and_blue_stussy_sweatshirt35.jpeg', NULL, 'hoodies', 'Stussy', 175),
('Brown Stussy Sweatshirt', 15000, 'images/brown_stussy_sweatshirt37.jpeg', NULL, 'hoodies', 'Stussy', 120),
('Brown Stussy Pants', 16000, 'images/brown_stussy_pants36.jpeg', NULL, 'pants', 'Stussy', 80),

-- Nike Products
('Green Nike Shirt', 10000, 'images/green_nike_shirt41.jpeg', NULL, 'tshirts', 'Nike', 230),
('Black Nike Shirt', 10000, 'images/black_nike_shirt42.jpeg', NULL, 'tshirts', 'Nike', 150),
('White Nike Shirt', 10000, 'images/white_nike_shirt42.jpeg', NULL, 'tshirts', 'Nike', 195),
('Grey Nike x Carhartt Jacket', 32000, 'images/grey_nikeXcarhatt_front43.jpeg', 'images/grey_nikeXcarhatt_back43.jpeg', 'jackets', 'Nike', 70),

-- Aime Leon Dore Products
('Brown Aime Leon Dore Sweatshirt', 30000, 'images/brown_aimeleonedon_sweatshirt44.jpeg', NULL, 'jackets', 'Aime Leon Dore', 50),
('Aime Leon Dore Pants', 19000, 'images/aimeleonedon_pants48.jpeg', NULL, 'pants', 'Aime Leon Dore', 95),

-- Yard Sale Products
('Yard Sale Vest', 15000, 'images/yard_sale_vest45.jpeg', NULL, 'hoodies', 'Yard Sale', 165),
('White Yard Sale Hoodie', 16000, 'images/white_yardsale_hoodie46.jpeg', NULL, 'hoodies', 'Yard Sale', 85),
('Black Yard Sale Hoodie', 18000, 'images/black_yardsale_hoodie47.jpeg', NULL, 'hoodies', 'Yard Sale', 205),
('Checkered Yard Sale Hoodie', 20000, 'images/checkered_yardsale_hooodie51.jpeg', NULL, 'hoodies', 'Yard Sale', 135),
('Blue Denim Yard Sale Hoodie', 19000, 'images/blue_denim_yardsale_hoodie54.jpeg', NULL, 'hoodies', 'Yard Sale', 75),
('Purple Yard Sale Hoodie', 17000, 'images/purple_yardsale_hoodie55.jpeg', NULL, 'hoodies', 'Yard Sale', 185),
('Beige Yard Sale Hoodie', 15000, 'images/beige_yardsale_hoodie56.jpeg', NULL, 'hoodies', 'Yard Sale', 110),
('Purple Yard Sale Hoodie', 16000, 'images/purple_yardsale_hoodie58.jpeg', NULL, 'hoodies', 'Yard Sale', 150),
('Checkered Yard Sale Hoodie', 21000, 'images/checkered_yardsale_hoodie63.jpeg', NULL, 'hoodies', 'Yard Sale', 55),
('Blue Yard Sale Hoodie', 18000, 'images/blue_yardsale_hoodie64.jpeg', NULL, 'hoodies', 'Yard Sale', 215),
('Yard Sale Shirt', 10000, 'images/yardsale_shirt49.jpeg', NULL, 'tshirts', 'Yard Sale', 240),
('Red Yard Sale Shirt', 10000, 'images/red_yardsale_shirt52.jpeg', NULL, 'tshirts', 'Yard Sale', 90),
('Black Yard Sale Shirt', 10000, 'images/black_yardsale_shirt53.jpeg', NULL, 'tshirts', 'Yard Sale', 120),
('White Yard Sale Shirt', 10000, 'images/white_yardsale_shirt59.jpeg', NULL, 'tshirts', 'Yard Sale', 175),
('Black Yard Sale Shirt', 10000, 'images/black_yardsale_shirt60.jpeg', NULL, 'tshirts', 'Yard Sale', 70),
('Grey Yard Sale Shirt', 10000, 'images/grey_yardsale_shirt61.jpeg', NULL, 'tshirts', 'Yard Sale', 145),
('Black Yard Sale Shirt', 10000, 'images/black_yardsale_shirt62.jpeg', NULL, 'tshirts', 'Yard Sale', 195),
('Yard Sale Bag', 15000, 'images/yardsale_bag50.jpeg', NULL, 'bags', 'Yard Sale', 80),
('Brown Yard Sale Cargo Pants', 17000, 'images/brown_yardsale_cargo_pants57.jpeg', NULL, 'pants', 'Yard Sale', 160);

-- Create index for faster category filtering
CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_products_brand ON products(brand);
