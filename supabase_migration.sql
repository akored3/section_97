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

-- Insert all products with random stock (5-50)
INSERT INTO products (name, price, image_front, image_back, category, brand, stock) VALUES
-- Supreme Products
('Red Supreme Hoodie', 1300, 'images/red_supreme_hoodie1.jpeg', NULL, 'hoodies', 'Supreme', 23),
('Black Supreme Hoodie', 1300, 'images/black_supreme_hoodie2.jpeg', NULL, 'hoodies', 'Supreme', 18),
('Blue Supreme Hoodie', 1300, 'images/blue_supreme_hoodie5.jpeg', NULL, 'hoodies', 'Supreme', 31),
('Supreme Hoodie', 1300, 'images/supreme_hoodie6.jpeg', NULL, 'hoodies', 'Supreme', 12),
('Brown Supreme Hoodie', 1300, 'images/brown_supreme_hoodie8.jpeg', NULL, 'hoodies', 'Supreme', 27),
('Blue Supreme Hoodie', 1300, 'images/blue_supreme_hoodie13.jpeg', NULL, 'hoodies', 'Supreme', 9),
('Supreme Triple Hoodie', 1100, 'images/supreme_triple_hoodie10.jpeg', NULL, 'hoodies', 'Supreme', 45),
('Black Supreme Jacket', 1800, 'images/black_supreme_jacket3.jpeg', NULL, 'jackets', 'Supreme', 14),
('Supreme Skull Shirt', 900, 'images/supreme_skull_shirt4.jpeg', NULL, 'tshirts', 'Supreme', 36),
('Brown Supreme Shirt', 900, 'images/brown_supreme_shirt7.jpeg', NULL, 'tshirts', 'Supreme', 21),
('Supreme Triple Shirts', 1100, 'images/supreme_triple_shirts9.jpeg', NULL, 'tshirts', 'Supreme', 8),
('Red Supreme Shirt', 900, 'images/red_supreme_shirt_front_38.jpeg', 'images/red_supreme_shirt_back38.jpeg', 'tshirts', 'Supreme', 33),
('Green Supreme Shirt', 900, 'images/green_supreme_shirt_front39.jpeg', 'images/green_supreme_shirt_back39.jpeg', 'tshirts', 'Supreme', 19),
('Black Supreme Shirt', 900, 'images/black_supreme_shirt_front40.jpeg', 'images/black_supreme_shirt_back40.jpeg', 'tshirts', 'Supreme', 42),
('Black Supreme Pants', 1400, 'images/black_supreme_pants1.jpeg', NULL, 'pants', 'Supreme', 16),
('Supreme Shorts', 1000, 'images/supreme_shorts11.jpeg', NULL, 'pants', 'Supreme', 28),
('Supreme Board', 1400, 'images/supreme_board12.jpeg', NULL, 'other', 'Supreme', 7),
('Supreme Caps', 550, 'images/supreme_caps1.jpeg', NULL, 'other', 'Supreme', 50),

-- Corteiz Products
('Green Corteiz Hoodie', 1200, 'images/green_corteiz_hoodie16.jpeg', NULL, 'hoodies', 'Corteiz', 24),
('White Corteiz Hoodie', 1200, 'images/white_corteiz_hoodie17.jpeg', NULL, 'hoodies', 'Corteiz', 11),
('White Corteiz Hoodie', 1200, 'images/white_corteiz_hoodie22.jpeg', NULL, 'hoodies', 'Corteiz', 38),
('Black Corteiz Hoodie', 1200, 'images/black_corteiz_hoodie24.jpeg', NULL, 'hoodies', 'Corteiz', 15),
('Black Corteiz Jacket', 2200, 'images/black_corteiz_jacket23.jpeg', NULL, 'jackets', 'Corteiz', 6),
('Corteiz Denim Jacket', 2200, 'images/corteiz_denim_jacket19.jpeg', NULL, 'jackets', 'Corteiz', 29),
('White Corteiz Shirt', 900, 'images/white_corteiz_shirt20.jpeg', NULL, 'tshirts', 'Corteiz', 47),
('Green Corteiz Pants', 1500, 'images/green_corteiz_pants14.jpeg', NULL, 'pants', 'Corteiz', 13),
('Corteiz Denim Pants', 1500, 'images/corteiz_denim_pants15.jpeg', NULL, 'pants', 'Corteiz', 35),
('White Corteiz Pants', 1300, 'images/white_corteiz_pants18.jpeg', NULL, 'pants', 'Corteiz', 22),
('Black Corteiz Pants', 1300, 'images/black_corteiz_pants21.jpeg', NULL, 'pants', 'Corteiz', 40),

-- Balenciaga NBA Products
('Black Balenciaga NBA Jersey', 1500, 'images/black_balenciaga_nba_jersey25.jpeg', NULL, 'tshirts', 'Balenciaga', 10),
('Black Balenciaga NBA Boots', 1800, 'images/black_balenciaga_nba_shoe26.jpeg', NULL, 'shoes', 'Balenciaga', 5),
('Red Balenciaga NBA Jacket', 2500, 'images/red_balenciaga_nba_jacket27.jpeg', NULL, 'jackets', 'Balenciaga', 8),
('White Balenciaga NBA Jacket', 2500, 'images/white_balenciaga_nba_jacket28.jpeg', NULL, 'jackets', 'Balenciaga', 17),
('Balenciaga NBA Slides', 800, 'images/balenciaga_nba_slides_shoe29.jpeg', NULL, 'shoes', 'Balenciaga', 44),
('Balenciaga NBA Backpack', 2000, 'images/balenciaga_nba_backpack30.jpeg', NULL, 'bags', 'Balenciaga', 12),
('Blue Balenciaga NBA Shirt', 1500, 'images/blue_balenciaga_nba_shirt31.jpeg', NULL, 'tshirts', 'Balenciaga', 26),
('Balenciaga NBA Jacket', 2500, 'images/balenciaga_nba_jacket_32.jpeg', NULL, 'jackets', 'Balenciaga', 9),

-- Stussy Products
('Green Stussy Hoodie', 1100, 'images/green_stussy_hoodie33.jpeg', NULL, 'hoodies', 'Stussy', 32),
('Black Stussy Hoodie', 1100, 'images/black_stussy_hoodie34.jpeg', NULL, 'hoodies', 'Stussy', 20),
('Black & Blue Stussy Sweatshirt', 1000, 'images/black_and_blue_stussy_sweatshirt35.jpeg', NULL, 'hoodies', 'Stussy', 37),
('Brown Stussy Sweatshirt', 1000, 'images/brown_stussy_sweatshirt37.jpeg', NULL, 'hoodies', 'Stussy', 25),
('Brown Stussy Pants', 1200, 'images/brown_stussy_pants36.jpeg', NULL, 'pants', 'Stussy', 14),

-- Nike Products
('Green Nike Shirt', 800, 'images/green_nike_shirt41.jpeg', NULL, 'tshirts', 'Nike', 48),
('Black Nike Shirt', 800, 'images/black_nike_shirt42.jpeg', NULL, 'tshirts', 'Nike', 30),
('White Nike Shirt', 800, 'images/white_nike_shirt42.jpeg', NULL, 'tshirts', 'Nike', 41),
('Grey Nike x Carhartt Jacket', 1600, 'images/grey_nikeXcarhatt_front43.jpeg', 'images/grey_nikeXcarhatt_back43.jpeg', 'hoodies', 'Nike', 11),

-- Aime Leon Dore Products
('Brown Aime Leon Dore Sweatshirt', 1400, 'images/brown_aimeleonedon_sweatshirt44.jpeg', NULL, 'jackets', 'Aime Leon Dore', 7),
('Aime Leon Dore Pants', 1300, 'images/aimeleonedon_pants48.jpeg', NULL, 'pants', 'Aime Leon Dore', 19),

-- Yard Sale Products
('Yard Sale Vest', 900, 'images/yard_sale_vest45.jpeg', NULL, 'hoodies', 'Yard Sale', 34),
('White Yard Sale Hoodie', 1000, 'images/white_yardsale_hoodie46.jpeg', NULL, 'hoodies', 'Yard Sale', 16),
('Black Yard Sale Hoodie', 1000, 'images/black_yardsale_hoodie47.jpeg', NULL, 'hoodies', 'Yard Sale', 43),
('Checkered Yard Sale Hoodie', 1100, 'images/checkered_yardsale_hooodie51.jpeg', NULL, 'hoodies', 'Yard Sale', 28),
('Blue Denim Yard Sale Hoodie', 1100, 'images/blue_denim_yardsale_hoodie54.jpeg', NULL, 'hoodies', 'Yard Sale', 13),
('Purple Yard Sale Hoodie', 1000, 'images/purple_yardsale_hoodie55.jpeg', NULL, 'hoodies', 'Yard Sale', 39),
('Beige Yard Sale Hoodie', 1000, 'images/beige_yardsale_hoodie56.jpeg', NULL, 'hoodies', 'Yard Sale', 22),
('Purple Yard Sale Hoodie', 1000, 'images/purple_yardsale_hoodie58.jpeg', NULL, 'hoodies', 'Yard Sale', 31),
('Checkered Yard Sale Hoodie', 1100, 'images/checkered_yardsale_hoodie63.jpeg', NULL, 'hoodies', 'Yard Sale', 8),
('Blue Yard Sale Hoodie', 1000, 'images/blue_yardsale_hoodie64.jpeg', NULL, 'hoodies', 'Yard Sale', 46),
('Yard Sale Shirt', 750, 'images/yardsale_shirt49.jpeg', NULL, 'tshirts', 'Yard Sale', 50),
('Red Yard Sale Shirt', 750, 'images/red_yardsale_shirt52.jpeg', NULL, 'tshirts', 'Yard Sale', 17),
('Black Yard Sale Shirt', 750, 'images/black_yardsale_shirt53.jpeg', NULL, 'tshirts', 'Yard Sale', 24),
('White Yard Sale Shirt', 750, 'images/white_yardsale_shirt59.jpeg', NULL, 'tshirts', 'Yard Sale', 36),
('Black Yard Sale Shirt', 750, 'images/black_yardsale_shirt60.jpeg', NULL, 'tshirts', 'Yard Sale', 12),
('Grey Yard Sale Shirt', 750, 'images/grey_yardsale_shirt61.jpeg', NULL, 'tshirts', 'Yard Sale', 29),
('Black Yard Sale Shirt', 750, 'images/black_yardsale_shirt62.jpeg', NULL, 'tshirts', 'Yard Sale', 41),
('Yard Sale Bag', 600, 'images/yardsale_bag50.jpeg', NULL, 'bags', 'Yard Sale', 15),
('Brown Yard Sale Cargo Pants', 1100, 'images/brown_yardsale_cargo_pants57.jpeg', NULL, 'pants', 'Yard Sale', 33);

-- Create index for faster category filtering
CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_products_brand ON products(brand);
