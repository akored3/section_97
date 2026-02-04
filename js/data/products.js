// Fetches product data from JSON file
export async function fetchProducts() {
    try {
        const response = await fetch('./js/data/products.json');

        if (!response.ok) {
            throw new Error(`Failed to load products: ${response.status}`);
        }

        const products = await response.json();
        return products;
    } catch (error) {
        console.error('Error fetching products:', error);
        return [];
    }
}
