// Fetches product data from Supabase
import { supabase } from '../config/supabase.js';

export async function fetchProducts() {
    try {
        const { data, error } = await supabase
            .from('products')
            .select('*, product_sizes (size, stock)')
            .order('id');

        if (error) {
            throw error;
        }

        const NEW_THRESHOLD_DAYS = 14;
        const now = Date.now();

        // Map Supabase fields to match existing frontend structure
        const products = data.map(product => ({
            id: product.id,
            name: product.name,
            price: product.price,
            imageSrc: product.image_front,
            imageBack: product.image_back,
            category: product.category,
            brand: product.brand,
            stock: product.stock,
            createdAt: product.created_at,
            isNew: product.created_at && (now - new Date(product.created_at).getTime()) < NEW_THRESHOLD_DAYS * 86400000,
            sizes: (product.product_sizes || []).map(s => ({
                size: s.size,
                stock: s.stock
            }))
        }));

        // Shuffle helper
        function shuffle(arr) {
            for (let i = arr.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [arr[i], arr[j]] = [arr[j], arr[i]];
            }
            return arr;
        }

        // Split into new and rest, shuffle each, new products go first
        const newProducts = shuffle(products.filter(p => p.isNew));
        const restProducts = shuffle(products.filter(p => !p.isNew));

        return [...newProducts, ...restProducts];
    } catch (error) {
        console.error('Error fetching products from Supabase:', error);
        return [];
    }
}

// Fetch a single product by ID (includes per-size stock from product_sizes)
export async function fetchProductById(id) {
    try {
        const { data, error } = await supabase
            .from('products')
            .select(`
                *,
                product_sizes (size, stock)
            `)
            .eq('id', id)
            .single();

        if (error) throw error;

        return {
            id: data.id,
            name: data.name,
            price: data.price,
            imageSrc: data.image_front,
            imageBack: data.image_back,
            category: data.category,
            brand: data.brand,
            stock: data.stock,
            sizes: (data.product_sizes || []).map(s => ({
                size: s.size,
                stock: s.stock
            }))
        };
    } catch (error) {
        console.error('Error fetching product:', error);
        return null;
    }
}
