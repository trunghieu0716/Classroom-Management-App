// Debug utility to intercept and log fetch requests
(function() {
  const originalFetch = window.fetch;
  
  window.fetch = function() {
    const url = arguments[0];
    console.log('🔄 Fetch request to:', url);
    console.log('🔄 Fetch method:', arguments[1]?.method || 'GET');
    
    if (arguments[1]?.body) {
      try {
        const body = JSON.parse(arguments[1].body);
        console.log('🔄 Fetch body:', body);
      } catch (e) {
        console.log('🔄 Fetch body (raw):', arguments[1].body);
      }
    }
    
    return originalFetch.apply(this, arguments)
      .then(response => {
        // Clone the response to read its body
        const clonedResponse = response.clone();
        
        // Log response status
        console.log(`✅ Response from ${url}: ${response.status} ${response.statusText}`);
        
        // Try to parse JSON response
        clonedResponse.json()
          .then(data => {
            console.log('✅ Response data:', data);
          })
          .catch(() => {
            // Not JSON data, that's fine
            console.log('✅ Response is not JSON');
          });
        
        return response;
      })
      .catch(error => {
        console.error(`❌ Error for ${url}:`, error);
        throw error;
      });
  };
  
  console.log('✨ Fetch API intercepted for debugging');
})();