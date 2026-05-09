import axios from 'axios';

// Используем относительный путь - nginx проксирует /api/ к backend:8000
export const api = axios.create({
  baseURL: '/',
  timeout: 60000,
});