import axios, { AxiosInstance } from 'axios';

const BASE_URL = process.env.API_URL || 'http://localhost:3000';

export interface User {
  id: string;
  email: string;
  nickname: string;
  partnerId?: string;
}

export interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  iv: string;
  createdAt: string;
}

class ApiClient {
  private client: AxiosInstance;
  private token: string | null = null;

  constructor() {
    this.client = axios.create({
      baseURL: BASE_URL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  setToken(token: string): void {
    this.token = token;
    this.client.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  }

  clearToken(): void {
    this.token = null;
    delete this.client.defaults.headers.common['Authorization'];
  }

  async register(email: string, password: string, nickname: string, partnerEmail?: string): Promise<{ token: string; user: User }> {
    const response = await this.client.post('/api/auth/register', {
      email, password, nickname, partnerEmail
    });
    return response.data;
  }

  async login(email: string, password: string): Promise<{ token: string; user: User }> {
    const response = await this.client.post('/api/auth/login', { email, password });
    return response.data;
  }

  async logout(): Promise<void> {
    await this.client.post('/api/auth/logout');
  }

  async getPartner(): Promise<User> {
    const response = await this.client.get('/api/auth/partner');
    return response.data;
  }

  async connectPartner(partnerEmail: string): Promise<void> {
    await this.client.post('/api/auth/partner', { partnerEmail });
  }

  async getMessages(limit?: number, offset?: number): Promise<Message[]> {
    const params = new URLSearchParams();
    if (limit) params.append('limit', limit.toString());
    if (offset) params.append('offset', offset.toString());
    const response = await this.client.get(`/api/messages?${params.toString()}`);
    return response.data.messages;
  }

  async sendMessage(content: string, iv: string): Promise<Message> {
    const response = await this.client.post('/api/messages', { content, iv });
    return response.data;
  }

  async syncMessages(lastId?: string): Promise<Message[]> {
    const params = lastId ? new URLSearchParams({ last_id: lastId }) : new URLSearchParams();
    const response = await this.client.get(`/api/messages/sync?${params.toString()}`);
    return response.data.messages;
  }
}

export const api = new ApiClient();