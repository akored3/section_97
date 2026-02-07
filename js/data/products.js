// Fetches product data from Supabase
import { supabase } from '../config/supabase.js';

export async function fetchProducts() {
    try {
        const { data, error } = await supabase
            .from('products')
            .select('*')
            .order('id');

        if (error) {
            throw error;
        }

        // Map Supabase fields to match existing frontend structure
        return data.map(product => ({
            id: product.id,
            name: product.name,
            price: product.price,
            imageSrc: product.image_front,
            imageBack: product.image_back,
            category: product.category,
            brand: product.brand,
            stock: product.stock
        }));
    } catch (error) {
        console.error('Error fetching products from Supabase:', error);
        // Fallback to local JSON if Supabase fails
        try {
            const response = await fetch('./js/data/products.json');
            if (response.ok) {
                return await response.json();
            }
        } catch (fallbackError) {
            console.error('Fallback also failed:', fallbackError);
        }
        return [];
    }
}

// Fetch a single product by ID
export async function fetchProductById(id) {
    try {
        const { data, error } = await supabase
            .from('products')
            .select('*')
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
            stock: data.stock
        };
    } catch (error) {
        console.error('Error fetching product:', error);
        return null;
    }
}
