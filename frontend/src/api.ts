import type { Resident, MaintenanceFee, Notice, Complaint, Stats } from './types';

const BASE = '/api';

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error((err as { error: string }).error || `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

// Residents
export const getResidents = () => apiFetch<Resident[]>('/residents');
export const createResident = (data: Omit<Resident, 'id'>) =>
  apiFetch<Resident>('/residents', { method: 'POST', body: JSON.stringify(data) });
export const updateResident = (id: number, data: Omit<Resident, 'id'>) =>
  apiFetch<Resident>(`/residents/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteResident = (id: number) =>
  apiFetch<{ message: string }>(`/residents/${id}`, { method: 'DELETE' });

// Maintenance
export const getMaintenance = (params?: { status?: string; year?: number; month?: number }) => {
  const q = new URLSearchParams();
  if (params?.status) q.set('status', params.status);
  if (params?.year) q.set('year', String(params.year));
  if (params?.month) q.set('month', String(params.month));
  return apiFetch<MaintenanceFee[]>(`/maintenance?${q}`);
};
export const createMaintenance = (data: Omit<MaintenanceFee, 'id' | 'resident_name' | 'flat_number'>) =>
  apiFetch<MaintenanceFee>('/maintenance', { method: 'POST', body: JSON.stringify(data) });
export const updateMaintenance = (id: number, data: Omit<MaintenanceFee, 'id' | 'resident_name' | 'flat_number'>) =>
  apiFetch<MaintenanceFee>(`/maintenance/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteMaintenance = (id: number) =>
  apiFetch<{ message: string }>(`/maintenance/${id}`, { method: 'DELETE' });

// Notices
export const getNotices = () => apiFetch<Notice[]>('/notices');
export const createNotice = (data: Omit<Notice, 'id' | 'created_at'>) =>
  apiFetch<Notice>('/notices', { method: 'POST', body: JSON.stringify(data) });
export const updateNotice = (id: number, data: Omit<Notice, 'id' | 'created_at'>) =>
  apiFetch<Notice>(`/notices/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteNotice = (id: number) =>
  apiFetch<{ message: string }>(`/notices/${id}`, { method: 'DELETE' });

// Complaints
export const getComplaints = (params?: { status?: string; category?: string }) => {
  const q = new URLSearchParams();
  if (params?.status) q.set('status', params.status);
  if (params?.category) q.set('category', params.category);
  return apiFetch<Complaint[]>(`/complaints?${q}`);
};
export const createComplaint = (data: Omit<Complaint, 'id' | 'resident_name' | 'flat_number' | 'created_at'>) =>
  apiFetch<Complaint>('/complaints', { method: 'POST', body: JSON.stringify(data) });
export const updateComplaint = (id: number, data: Omit<Complaint, 'id' | 'resident_name' | 'flat_number' | 'created_at'>) =>
  apiFetch<Complaint>(`/complaints/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteComplaint = (id: number) =>
  apiFetch<{ message: string }>(`/complaints/${id}`, { method: 'DELETE' });

// Stats
export const getStats = () => apiFetch<Stats>('/stats');
