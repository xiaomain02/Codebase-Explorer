// Моковый клиент — реальных запросов не будет
export const api = {
  get: async () => {
    throw new Error('This is a mock-only frontend. No real API calls.');
  },
  post: async () => {
    throw new Error('This is a mock-only frontend. No real API calls.');
  },
};