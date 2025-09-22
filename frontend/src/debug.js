/**
 * Debug utility to intercept and log network requests
 */

// Store original fetch function
const originalFetch = window.fetch;

// Override fetch with our interceptor
window.fetch = async function(input, init) {
    const url = typeof input === 'string' ? input : input.url;
    const method = init?.method || 'GET';
    
    console.log(`🔍 DEBUG: Fetch request: ${method} ${url}`);
    if (init?.body) {
        try {
            const body = JSON.parse(init.body);
            console.log('📦 DEBUG: Request payload:', body);
        } catch (e) {
            console.log('📦 DEBUG: Request payload:', init.body);
        }
    }
    
    try {
        const response = await originalFetch(input, init);
        
        // Clone the response so we can read the body without consuming it
        const clonedResponse = response.clone();
        
        try {
            const data = await clonedResponse.json();
            console.log(`✅ DEBUG: Response (${response.status}):`, data);
        } catch (e) {
            console.log(`✅ DEBUG: Response (${response.status}): [Not JSON]`);
        }
        
        return response;
    } catch (error) {
        console.log('❌ DEBUG: Fetch error:', error);
        throw error;
    }
};

console.log('🔧 DEBUG: Network request interceptor initialized');