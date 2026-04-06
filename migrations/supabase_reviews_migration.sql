-- Product reviews for SECTION-97
-- Verified-purchase reviews with star ratings and fit feedback
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS reviews (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    product_id INTEGER REFERENCES products(id) ON DELETE CASCADE NOT NULL,
    rating SMALLINT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    fit TEXT CHECK (fit IN ('small', 'tts', 'large') OR fit IS NULL),
    body TEXT NOT NULL CHECK (char_length(body) >= 10 AND char_length(body) <= 500),
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    UNIQUE(user_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_reviews_product_id ON reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_reviews_user_id ON reviews(user_id);

-- Row Level Security
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- Anyone can read reviews (public product info)
CREATE POLICY "Reviews are publicly readable"
    ON reviews FOR SELECT
    USING (true);

-- Only authenticated users can insert their own review
CREATE POLICY "Users can create own reviews"
    ON reviews FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Users can update their own review
CREATE POLICY "Users can update own reviews"
    ON reviews FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Users can delete their own review
CREATE POLICY "Users can delete own reviews"
    ON reviews FOR DELETE
    USING (auth.uid() = user_id);

-- Verified purchase check function
-- Returns true if the user has a completed order containing this product
CREATE OR REPLACE FUNCTION has_purchased_product(p_user_id UUID, p_product_id INTEGER)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM orders o
        JOIN order_items oi ON oi.order_id = o.id
        WHERE o.user_id = p_user_id
          AND oi.product_id = p_product_id
          AND o.status IN ('confirmed', 'shipped', 'delivered')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC to submit a review (enforces verified purchase server-side)
CREATE OR REPLACE FUNCTION submit_review(
    p_product_id INTEGER,
    p_rating SMALLINT,
    p_fit TEXT DEFAULT NULL,
    p_body TEXT DEFAULT ''
)
RETURNS JSON AS $$
DECLARE
    v_user_id UUID;
    v_review reviews%ROWTYPE;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RETURN json_build_object('error', 'Not authenticated');
    END IF;

    -- Verify purchase
    IF NOT has_purchased_product(v_user_id, p_product_id) THEN
        RETURN json_build_object('error', 'You must purchase this product before reviewing');
    END IF;

    -- Upsert review (allows editing)
    INSERT INTO reviews (user_id, product_id, rating, fit, body)
    VALUES (v_user_id, p_product_id, p_rating, p_fit, p_body)
    ON CONFLICT (user_id, product_id)
    DO UPDATE SET rating = EXCLUDED.rating, fit = EXCLUDED.fit, body = EXCLUDED.body
    RETURNING * INTO v_review;

    RETURN json_build_object('success', true, 'review_id', v_review.id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC to delete own review
CREATE OR REPLACE FUNCTION delete_review(p_product_id INTEGER)
RETURNS JSON AS $$
DECLARE
    v_user_id UUID;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RETURN json_build_object('error', 'Not authenticated');
    END IF;

    DELETE FROM reviews WHERE user_id = v_user_id AND product_id = p_product_id;

    RETURN json_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
