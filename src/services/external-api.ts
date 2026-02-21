interface ExternalAPIResponse {
  success: boolean;
  data?: any;
  error?: string;
}

export async function callExternalAPI(
  url: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
  body?: any,
  headers?: Record<string, string>
): Promise<ExternalAPIResponse> {
  try {
    // Validate URL
    if (!url || !url.startsWith('http')) {
      return {
        success: false,
        error: 'Invalid URL provided',
      };
    }

    // Create AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    // Prepare fetch options
    const options: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      signal: controller.signal,
    };

    // Add body for non-GET requests
    if (method !== 'GET' && body) {
      options.body = JSON.stringify(body);
    }

    try {
      const response = await fetch(url, options);
      clearTimeout(timeoutId);

      // Check if response is successful
      if (!response.ok) {
        return {
          success: false,
          error: `HTTP Error: ${response.status} ${response.statusText}`,
        };
      }

      // Try to parse JSON response
      let data;
      try {
        data = await response.json();
      } catch (parseError) {
        // If JSON parsing fails, return text content
        data = await response.text();
      }

      return {
        success: true,
        data,
      };
    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      
      if (fetchError.name === 'AbortError') {
        return {
          success: false,
          error: 'Request timeout after 10 seconds',
        };
      }

      return {
        success: false,
        error: fetchError.message || 'Network error occurred',
      };
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Unknown error occurred',
    };
  }
}