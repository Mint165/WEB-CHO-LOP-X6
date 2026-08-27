-- =============================================================================
-- Migration: Tạo các bảng Quản Lý Quỹ Lớp (Fund Management)
-- =============================================================================

-- 1. Bảng Quy định mức phạt (Fund Rules)
CREATE TABLE IF NOT EXISTS public.fund_rules (
    id TEXT PRIMARY KEY,
    classroom_id TEXT NOT NULL DEFAULT 'lop-x6',
    name TEXT NOT NULL,
    amount BIGINT NOT NULL DEFAULT 5000,
    category TEXT DEFAULT 'Nề nếp',
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Bảng Sổ ghi nhận vi phạm (Fund Violations)
CREATE TABLE IF NOT EXISTS public.fund_violations (
    id TEXT PRIMARY KEY,
    classroom_id TEXT NOT NULL DEFAULT 'lop-x6',
    student_id TEXT NOT NULL,
    student_name TEXT NOT NULL,
    violation_type TEXT NOT NULL,
    amount BIGINT NOT NULL,
    date TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    note TEXT,
    recorded_by TEXT DEFAULT 'Ban Cán Sự',
    paid_date TEXT,
    payment_method TEXT,
    receipt_number TEXT,
    collector TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Bảng Phiếu thu tiền / Biên lai (Fund Payments)
CREATE TABLE IF NOT EXISTS public.fund_payments (
    id TEXT PRIMARY KEY,
    classroom_id TEXT NOT NULL DEFAULT 'lop-x6',
    receipt_number TEXT NOT NULL,
    student_id TEXT NOT NULL,
    student_name TEXT NOT NULL,
    date TEXT NOT NULL,
    amount BIGINT NOT NULL,
    method TEXT DEFAULT 'Tiền mặt',
    collector TEXT,
    note TEXT,
    violation_ids JSONB DEFAULT '[]'::jsonb,
    items JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Bảng Nhật ký hoạt động quỹ (Fund Audit Logs)
CREATE TABLE IF NOT EXISTS public.fund_audit_logs (
    id TEXT PRIMARY KEY,
    classroom_id TEXT NOT NULL DEFAULT 'lop-x6',
    user_name TEXT NOT NULL,
    action TEXT NOT NULL,
    details TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bật Row Level Security (RLS)
ALTER TABLE public.fund_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fund_violations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fund_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fund_audit_logs ENABLE ROW LEVEL SECURITY;

-- Tạo chính sách phân quyền cho phép xem công khai
CREATE POLICY "Allow public read fund_rules" ON public.fund_rules FOR SELECT USING (true);
CREATE POLICY "Allow public read fund_violations" ON public.fund_violations FOR SELECT USING (true);
CREATE POLICY "Allow public read fund_payments" ON public.fund_payments FOR SELECT USING (true);
CREATE POLICY "Allow public read fund_audit_logs" ON public.fund_audit_logs FOR SELECT USING (true);

-- Cho phép sửa đổi dữ liệu
CREATE POLICY "Allow all modify fund_rules" ON public.fund_rules FOR ALL USING (true);
CREATE POLICY "Allow all modify fund_violations" ON public.fund_violations FOR ALL USING (true);
CREATE POLICY "Allow all modify fund_payments" ON public.fund_payments FOR ALL USING (true);
CREATE POLICY "Allow all modify fund_audit_logs" ON public.fund_audit_logs FOR ALL USING (true);
