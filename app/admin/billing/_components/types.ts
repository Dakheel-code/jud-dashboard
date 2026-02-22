export interface Summary {
  period: string;
  invoices: { count: number; total_paid: number; total_unpaid: number; total_void: number };
  commissions: { total: number; paid: number; pending: number };
  bonuses: { total: number };
  net_revenue: number;
}

export interface Invoice {
  id: string;
  store_id: string;
  period: string;
  invoice_number: string;
  amount: number;
  vat_amount: number;
  total_amount: number;
  status: 'unpaid' | 'partial' | 'paid' | 'void';
  issue_date: string;
  due_date: string | null;
  paid_at: string | null;
  notes: string | null;
  store: { id: string; store_name: string; store_url: string; owner_name: string } | null;
}

export interface Commission {
  id: string;
  employee_id: string;
  period: string;
  base_amount: number;
  commission_amount: number;
  status: 'pending' | 'approved' | 'paid' | 'canceled';
  created_at: string;
  paid_at: string | null;
  notes: string | null;
  employee: { id: string; name: string; username: string } | null;
  store: { id: string; store_name: string } | null;
  invoice: { id: string; invoice_number: string; total_amount: number } | null;
}

export interface Bonus {
  id: string;
  employee_id: string;
  period: string;
  base_value: number;
  bonus_amount: number;
  status: 'pending' | 'approved' | 'paid' | 'canceled';
  created_at: string;
  paid_at: string | null;
  notes: string | null;
  employee: { id: string; name: string; username: string } | null;
  rule: { id: string; name: string; rate_type: string; rate_value: number } | null;
}

export const INV_STATUS: Record<string, { label: string; cls: string }> = {
  unpaid:  { label: 'غير مدفوع', cls: 'bg-red-500/15 text-red-400 border-red-500/20' },
  partial: { label: 'جزئي',      cls: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/20' },
  paid:    { label: 'مدفوع',     cls: 'bg-green-500/15 text-green-400 border-green-500/20' },
  void:    { label: 'ملغي',      cls: 'bg-gray-500/15 text-gray-400 border-gray-500/20' },
};

export const PAY_STATUS: Record<string, { label: string; cls: string }> = {
  pending:  { label: 'معلق',  cls: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/20' },
  approved: { label: 'موافق', cls: 'bg-blue-500/15 text-blue-400 border-blue-500/20' },
  paid:     { label: 'مدفوع', cls: 'bg-green-500/15 text-green-400 border-green-500/20' },
  canceled: { label: 'ملغي',  cls: 'bg-gray-500/15 text-gray-400 border-gray-500/20' },
};

export function fmt(n: number) {
  return Number(n || 0).toLocaleString('ar-SA', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

