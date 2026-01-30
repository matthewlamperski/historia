import { ApiResponse, ApiError } from '../types';

const API_BASE_URL = __DEV__
  ? 'http://localhost:3000/api'
  : 'https://your-api.com/api';

class ApiService {
  private async request<T>(
    url: string,
    options: RequestInit = {},
  ): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(`${API_BASE_URL}${url}`, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new ApiError(
          errorData.message || `HTTP error! status: ${response.status}`,
          response.status,
          errorData,
        );
      }

      const data = await response.json();
      return data;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError('Network error occurred', 0, error);
    }
  }

  // GET request
  async get<T>(
    url: string,
    headers?: Record<string, string>,
  ): Promise<ApiResponse<T>> {
    return this.request<T>(url, { method: 'GET', headers });
  }

  // POST request
  async post<T>(
    url: string,
    data?: any,
    headers?: Record<string, string>,
  ): Promise<ApiResponse<T>> {
    return this.request<T>(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
    });
  }

  // PUT request
  async put<T>(
    url: string,
    data?: any,
    headers?: Record<string, string>,
  ): Promise<ApiResponse<T>> {
    return this.request<T>(url, {
      method: 'PUT',
      headers,
      body: JSON.stringify(data),
    });
  }

  // DELETE request
  async delete<T>(
    url: string,
    headers?: Record<string, string>,
  ): Promise<ApiResponse<T>> {
    return this.request<T>(url, { method: 'DELETE', headers });
  }
}

export const apiService = new ApiService();
