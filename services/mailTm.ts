import { API_BASE_URL } from '../constants';
import { Account, Domain, Message } from '../types';

// Helper to handle API errors
const handleResponse = async (response: Response) => {
  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('UNAUTHORIZED');
    }
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || errorData.detail || 'API request failed');
  }
  // Some endpoints return 204 No Content
  if (response.status === 204) return null;
  return response.json();
};

// 1. Get available domains
export const getDomains = async (): Promise<Domain[]> => {
  const response = await fetch(`${API_BASE_URL}/domains`);
  const data = await handleResponse(response);
  return data['hydra:member'];
};

// 2. Create Account
export const createAccount = async (address: string, password: string): Promise<Account> => {
  const response = await fetch(`${API_BASE_URL}/accounts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ address, password }),
  });
  return handleResponse(response);
};

// 3. Get Auth Token
export const getToken = async (address: string, password: string): Promise<string> => {
  const response = await fetch(`${API_BASE_URL}/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ address, password }),
  });
  const data = await handleResponse(response);
  return data.token;
};

// 4. Get Messages
export const getMessages = async (token: string, page: number = 1): Promise<Message[]> => {
  const response = await fetch(`${API_BASE_URL}/messages?page=${page}`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  const data = await handleResponse(response);
  return data['hydra:member'];
};

// 5. Get Single Message Details
export const getMessage = async (token: string, id: string): Promise<Message> => {
  const response = await fetch(`${API_BASE_URL}/messages/${id}`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  return handleResponse(response);
};

// 6. Delete Account (Optional, usually we just throw away the creds, but good to clean up)
export const deleteAccount = async (token: string, id: string): Promise<void> => {
  const response = await fetch(`${API_BASE_URL}/accounts/${id}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token}` },
  });
  return handleResponse(response);
};

// Utility: Generate a random account
export const generateRandomAccount = async (): Promise<Account> => {
  const domains = await getDomains();
  if (!domains || domains.length === 0) throw new Error('No domains available');
  
  const domain = domains[0].domain;
  const randomString = Math.random().toString(36).substring(2, 10);
  const address = `gvail_${randomString}@${domain}`;
  const password = Math.random().toString(36).substring(2, 15);

  const account = await createAccount(address, password);
  const token = await getToken(address, password);

  return { ...account, password, token };
};
