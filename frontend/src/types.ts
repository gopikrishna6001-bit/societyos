export interface Resident {
  id: number;
  flat_number: string;
  name: string;
  email: string;
  phone: string;
  move_in_date: string;
  status: 'active' | 'inactive';
}

export interface MaintenanceFee {
  id: number;
  resident_id: number;
  resident_name: string;
  flat_number: string;
  amount: number;
  month: number;
  year: number;
  status: 'paid' | 'pending' | 'overdue';
  paid_date: string | null;
}

export interface Notice {
  id: number;
  title: string;
  content: string;
  category: 'general' | 'urgent' | 'event';
  created_at: string;
  created_by: string;
}

export interface Complaint {
  id: number;
  resident_id: number;
  resident_name: string;
  flat_number: string;
  title: string;
  description: string;
  category: 'maintenance' | 'security' | 'noise' | 'other';
  status: 'open' | 'in_progress' | 'resolved';
  created_at: string;
}

export interface Stats {
  totalResidents: number;
  activeResidents: number;
  pendingMaintenance: number;
  openComplaints: number;
  monthlyCollection: number;
}
