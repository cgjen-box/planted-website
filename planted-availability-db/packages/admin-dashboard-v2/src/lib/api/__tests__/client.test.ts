import { describe, it, expect, vi, beforeEach } from 'vitest';
import { get, post, put, patch, del, apiClient, ApiError, NetworkError } from '../client';
import { buildApiUrl } from '../endpoints';

// Mock firebase auth
vi.mock('@/lib/firebase', () => ({
  auth: {
    currentUser: {
      getIdToken: vi.fn().mockResolvedValue('mock-token'),
    },
  },
}));

describe('API Client', () => {
  beforeEach(() => {
    // Mock fetch globally
    global.fetch = vi.fn();

    // Mock navigator.onLine
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: true,
    });
    vi.clearAllMocks();
  });

  describe('GET Requests', () => {
    it('makes successful GET request', async () => {
      const mockResponse = { data: 'test' };
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await get('/test');

      expect(global.fetch).toHaveBeenCalledWith(
        buildApiUrl('/test'),
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            Authorization: 'Bearer mock-token',
          }),
        })
      );
      expect(result).toEqual(mockResponse);
    });

    it('includes auth token in GET request', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({}),
      });

      await get('/protected');

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer mock-token',
          }),
        })
      );
    });

    it('handles GET request without auth when requiresAuth is false', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({}),
      });

      await get('/public', { requiresAuth: false });

      const callArgs = (global.fetch as any).mock.calls[0][1];
      expect(callArgs.headers.Authorization).toBeUndefined();
    });
  });

  describe('POST Requests', () => {
    it('makes successful POST request with data', async () => {
      const requestData = { name: 'test' };
      const mockResponse = { id: 1, ...requestData };

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await post('/create', requestData);

      expect(global.fetch).toHaveBeenCalledWith(
        buildApiUrl('/create'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(requestData),
        })
      );
      expect(result).toEqual(mockResponse);
    });

    it('makes POST request without body', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({}),
      });

      await post('/action');

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          method: 'POST',
          body: undefined,
        })
      );
    });
  });

  describe('PUT Requests', () => {
    it('makes successful PUT request', async () => {
      const updateData = { name: 'updated' };
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => updateData,
      });

      const result = await put('/update/1', updateData);

      expect(global.fetch).toHaveBeenCalledWith(
        buildApiUrl('/update/1'),
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify(updateData),
        })
      );
      expect(result).toEqual(updateData);
    });
  });

  describe('PATCH Requests', () => {
    it('makes successful PATCH request', async () => {
      const patchData = { status: 'active' };
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => patchData,
      });

      const result = await patch('/patch/1', patchData);

      expect(global.fetch).toHaveBeenCalledWith(
        buildApiUrl('/patch/1'),
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify(patchData),
        })
      );
      expect(result).toEqual(patchData);
    });
  });

  describe('DELETE Requests', () => {
    it('makes successful DELETE request', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
      });

      const result = await del('/delete/1');

      expect(global.fetch).toHaveBeenCalledWith(
        buildApiUrl('/delete/1'),
        expect.objectContaining({
          method: 'DELETE',
        })
      );
      expect(result).toEqual({ success: true });
    });
  });

  describe('Error Handling', () => {
    it('throws ApiError on 404', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: false,
        status: 404,
        json: async () => ({ message: 'Not found' }),
      });

      await expect(get('/notfound')).rejects.toThrow(ApiError);
      await expect(get('/notfound')).rejects.toThrow('Not found');
    });

    it('throws ApiError on 500', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({ error: 'Server error' }),
      });

      await expect(get('/error')).rejects.toThrow(ApiError);
    });

    it('throws ApiError with status code', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: false,
        status: 403,
        json: async () => ({ message: 'Forbidden' }),
      });

      try {
        await get('/forbidden');
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        expect((error as ApiError).status).toBe(403);
        expect((error as ApiError).message).toBe('Forbidden');
      }
    });

    it('handles error response without json body', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => {
          throw new Error('Invalid JSON');
        },
      });

      await expect(get('/error')).rejects.toThrow(ApiError);
    });

    it('throws NetworkError on fetch failure', async () => {
      (global.fetch as any).mockRejectedValue(new Error('Network failure'));

      await expect(get('/test')).rejects.toThrow(NetworkError);
    });
  });

  describe('Retry Logic', () => {
    it('retries on 500 error', async () => {
      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          json: async () => ({ error: 'Server error' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true }),
        });

      const result = await get('/test', { retries: 1 });

      expect(global.fetch).toHaveBeenCalledTimes(2);
      expect(result).toEqual({ success: true });
    });

    it('does not retry on 400 error', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: false,
        status: 400,
        json: async () => ({ error: 'Bad request' }),
      });

      await expect(get('/test', { retries: 3 })).rejects.toThrow(ApiError);
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('Network Status', () => {
    it('throws error when offline', async () => {
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false,
      });

      await expect(get('/test')).rejects.toThrow(NetworkError);
      await expect(get('/test')).rejects.toThrow('No internet connection');
    });

    it('proceeds when online', async () => {
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: true,
      });

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
      });

      const result = await get('/test');
      expect(result).toEqual({ success: true });
    });
  });

  describe('Custom Headers', () => {
    it('merges custom headers with default headers', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({}),
      });

      await get('/test', {
        headers: {
          'X-Custom-Header': 'custom-value',
        },
      });

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'X-Custom-Header': 'custom-value',
            Authorization: 'Bearer mock-token',
          }),
        })
      );
    });
  });

  describe('API Client Object', () => {
    it('exports all HTTP methods', () => {
      expect(apiClient.get).toBeDefined();
      expect(apiClient.post).toBeDefined();
      expect(apiClient.put).toBeDefined();
      expect(apiClient.patch).toBeDefined();
      expect(apiClient.delete).toBeDefined();
    });

    it('apiClient.get works', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ data: 'test' }),
      });

      const result = await apiClient.get('/test');
      expect(result).toEqual({ data: 'test' });
    });

    it('apiClient.post works', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ id: 1 }),
      });

      const result = await apiClient.post('/create', { name: 'test' });
      expect(result).toEqual({ id: 1 });
    });

    it('apiClient.delete works', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
      });

      const result = await apiClient.delete('/delete/1');
      expect(result).toEqual({ success: true });
    });
  });

  describe('Error Classes', () => {
    it('ApiError has correct properties', () => {
      const error = new ApiError('Test error', 404, 'NOT_FOUND', {
        detail: 'Resource not found',
      });

      expect(error).toBeInstanceOf(Error);
      expect(error.message).toBe('Test error');
      expect(error.status).toBe(404);
      expect(error.code).toBe('NOT_FOUND');
      expect(error.details).toEqual({ detail: 'Resource not found' });
      expect(error.name).toBe('ApiError');
    });

    it('NetworkError has correct properties', () => {
      const originalError = new Error('Connection failed');
      const error = new NetworkError('Network error', originalError);

      expect(error).toBeInstanceOf(Error);
      expect(error.message).toBe('Network error');
      expect(error.originalError).toBe(originalError);
      expect(error.name).toBe('NetworkError');
    });
  });

  describe('Edge Cases', () => {
    it('handles empty response body', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => null,
      });

      const result = await get('/empty');
      expect(result).toBeNull();
    });

    it('handles undefined request data', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({}),
      });

      await post('/test', undefined);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: undefined,
        })
      );
    });
  });

  describe('Type Safety', () => {
    it('returns typed response for GET', async () => {
      interface TestResponse {
        id: number;
        name: string;
      }

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ id: 1, name: 'test' }),
      });

      const result = await get<TestResponse>('/test');
      expect(result.id).toBe(1);
      expect(result.name).toBe('test');
    });

    it('returns typed response for POST', async () => {
      interface CreateResponse {
        id: number;
      }

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ id: 1 }),
      });

      const result = await post<CreateResponse>('/create', { name: 'test' });
      expect(result.id).toBe(1);
    });
  });
});
