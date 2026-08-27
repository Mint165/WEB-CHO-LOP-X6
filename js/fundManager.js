/**
 * FundManager
 * Quản lý dữ liệu Quỹ Lớp & Xử lý Vi Phạm:
 * - Vi phạm (Violations)
 * - Thanh toán & Thu tiền (Payments)
 * - Quy định mức phạt (Rules)
 * - Nhật ký hoạt động (Audit Logs)
 * - Phân quyền người dùng (Role Management)
 */

class FundManager {
    constructor(studentManager) {
        this.studentManager = studentManager;
        this.violations = [];
        this.payments = [];
        this.rules = [];
        this.auditLogs = [];
        this.currentRole = 'student'; // Mặc định là học sinh (chỉ xem) để bảo mật
        this.currentStudentId = null; // Used when role is 'student'
        this.currentUser = 'Học sinh / Khách xem';
        this.isAuthenticated = sessionStorage.getItem('weblop_is_authenticated') === 'true';
        
        // Cấu hình tài khoản bảo mật
        this.ADMIN_CREDENTIALS = {
            username: 'admin',
            password: 'g3'
        };
        
        this.STORAGE_KEYS = {
            VIOLATIONS: 'weblop_fund_violations',
            PAYMENTS: 'weblop_fund_payments',
            RULES: 'weblop_fund_rules',
            AUDIT: 'weblop_fund_audit_logs',
            ROLE: 'weblop_fund_current_role',
            STUDENT_ID: 'weblop_fund_selected_student',
            AUTH: 'weblop_is_authenticated'
        };
        this.classroomId = 'lop-x6';
    }

    async init() {
        this.loadRules();
        this.loadViolations();
        this.loadPayments();
        this.loadAuditLogs();
        this.loadRole();

        if (window.supabaseClient) {
            await this.syncFromSupabase();
            this.setupRealtimeSubscription();
        }
    }

    async syncFromSupabase() {
        if (!window.supabaseClient) return;
        try {
            // Rules
            const { data: rData } = await window.supabaseClient.from('fund_rules').select('*').eq('classroom_id', this.classroomId);
            if (rData && rData.length > 0) {
                this.rules = rData.map(r => ({
                    id: r.id,
                    name: r.name,
                    amount: Number(r.amount),
                    category: r.category || 'Nề nếp',
                    description: r.description || '',
                    isActive: r.is_active !== false
                }));
                this.saveRules();
            }

            // Violations
            const { data: vData } = await window.supabaseClient.from('fund_violations').select('*').eq('classroom_id', this.classroomId);
            if (vData && vData.length > 0) {
                this.violations = vData.map(v => ({
                    id: v.id,
                    studentId: v.student_id,
                    studentName: v.student_name,
                    violationType: v.violation_type,
                    amount: Number(v.amount),
                    date: v.date,
                    status: v.status || 'pending',
                    note: v.note || '',
                    recordedBy: v.recorded_by || 'Ban Cán Sự',
                    paidDate: v.paid_date,
                    paymentMethod: v.payment_method,
                    receiptNumber: v.receipt_number,
                    collector: v.collector,
                    createdAt: v.created_at
                }));
                this.saveViolations();
            }

            // Payments
            const { data: pData } = await window.supabaseClient.from('fund_payments').select('*').eq('classroom_id', this.classroomId);
            if (pData && pData.length > 0) {
                this.payments = pData.map(p => ({
                    id: p.id,
                    receiptNumber: p.receipt_number,
                    studentId: p.student_id,
                    studentName: p.student_name,
                    date: p.date,
                    amount: Number(p.amount),
                    method: p.method || 'Tiền mặt',
                    collector: p.collector || 'Thủ quỹ',
                    note: p.note || '',
                    violationIds: p.violation_ids || [],
                    items: p.items || [],
                    createdAt: p.created_at
                }));
                this.savePayments();
            }

            document.dispatchEvent(new CustomEvent('fund:state-changed'));
        } catch (e) {
            console.warn('Supabase fund sync error:', e);
        }
    }

    setupRealtimeSubscription() {
        if (!window.supabaseClient) return;
        try {
            window.supabaseClient
                .channel('fund-realtime-channel')
                .on('postgres_changes', { event: '*', schema: 'public', table: 'fund_violations' }, () => this.syncFromSupabase())
                .on('postgres_changes', { event: '*', schema: 'public', table: 'fund_payments' }, () => this.syncFromSupabase())
                .on('postgres_changes', { event: '*', schema: 'public', table: 'fund_rules' }, () => this.syncFromSupabase())
                .subscribe();
        } catch (e) {
            console.error('Realtime subscription error:', e);
        }
    }


    // ==========================================
    // AUTHENTICATION & LOGIN (Xác thực tk:admin mk:g3)
    // ==========================================
    login(username, password) {
        if (username.trim() === this.ADMIN_CREDENTIALS.username && password === this.ADMIN_CREDENTIALS.password) {
            this.isAuthenticated = true;
            sessionStorage.setItem(this.STORAGE_KEYS.AUTH, 'true');
            this.logActivity('Hệ thống bảo mật', 'Đăng nhập thành công', `Người dùng đã xác thực quyền quản trị (tk: ${username})`);
            return { success: true };
        }
        return { success: false, message: 'Tên đăng nhập hoặc mật khẩu không chính xác!' };
    }

    logout() {
        this.isAuthenticated = false;
        sessionStorage.removeItem(this.STORAGE_KEYS.AUTH);
        this.setRole('student', this.currentStudentId);
        this.logActivity('Hệ thống bảo mật', 'Đăng xuất', 'Đã khóa quyền quản trị và chuyển về chế độ Học sinh xem');
    }

    // ==========================================
    // DATA RESET & SETUP FOR NEW SCHOOL YEAR
    // ==========================================
    clearAllFundData() {
        this.violations = [];
        this.payments = [];
        this.saveViolations();
        this.savePayments();
        this.logActivity(this.currentUser, 'Khởi tạo năm học mới', 'Đã dọn sạch toàn bộ dữ liệu vi phạm và giao dịch quỹ về 0đ sẵn sàng cho năm học mới');
    }

    restoreSampleData() {
        this.violations = this.generateSampleViolations();
        this.saveViolations();
        this.payments = [];
        this.violations.filter(v => v.status === 'paid').forEach(v => {
            this.payments.push({
                id: 'pay_' + v.id.replace('vio_', ''),
                receiptNumber: 'BL-' + (1000 + this.payments.length + 1),
                studentId: v.studentId,
                studentName: v.studentName,
                date: v.paidDate || v.date,
                amount: v.amount,
                method: v.paymentMethod || 'Tiền mặt',
                collector: v.collector || 'Lớp trưởng (Khánh Quân)',
                note: `Nộp phạt lỗi: ${v.violationType}`,
                violationIds: [v.id],
                items: [
                    { type: v.violationType, amount: v.amount, date: v.date }
                ],
                createdAt: v.paidDate || v.date
            });
        });
        this.savePayments();
        this.logActivity(this.currentUser, 'Khôi phục dữ liệu mẫu', 'Đã nạp lại dữ liệu vi phạm mẫu thử nghiệm');
    }

    // ==========================================
    // RULES MANAGEMENT (Quy định mức phạt)
    // ==========================================
    getDefaultRules() {
        return [
            { id: 'rule_1', name: 'Đi muộn', amount: 10000, category: 'Nề nếp', icon: 'fa-clock' },
            { id: 'rule_2', name: 'Không mặc đồng phục', amount: 20000, category: 'Đồng phục', icon: 'fa-shirt' },
            { id: 'rule_3', name: 'Không làm bài tập', amount: 5000, category: 'Học tập', icon: 'fa-book' },
            { id: 'rule_4', name: 'Nói chuyện trong giờ', amount: 5000, category: 'Kỷ luật', icon: 'fa-comments' },
            { id: 'rule_5', name: 'Nghỉ học không phép', amount: 30000, category: 'Chuyên cần', icon: 'fa-user-slash' },
            { id: 'rule_6', name: 'Sử dụng điện thoại trong giờ', amount: 20000, category: 'Kỷ luật', icon: 'fa-mobile-screen' },
            { id: 'rule_7', name: 'Ăn quà vặt trong lớp', amount: 10000, category: 'Vệ sinh', icon: 'fa-cookie-bite' },
            { id: 'rule_8', name: 'Không trực nhật', amount: 15000, category: 'Vệ sinh', icon: 'fa-broom' },
            { id: 'rule_9', name: 'Khác (Tự nhập tiền)', amount: 10000, category: 'Khác', icon: 'fa-pen' }
        ];
    }

    loadRules() {
        const stored = localStorage.getItem(this.STORAGE_KEYS.RULES);
        if (stored) {
            try {
                this.rules = JSON.parse(stored);
            } catch (e) {
                this.rules = this.getDefaultRules();
            }
        } else {
            this.rules = this.getDefaultRules();
            this.saveRules();
        }
    }

    saveRules() {
        localStorage.setItem(this.STORAGE_KEYS.RULES, JSON.stringify(this.rules));
    }

    getRules() {
        return this.rules;
    }

    getRuleByName(name) {
        return this.rules.find(r => r.name.toLowerCase() === name.toLowerCase());
    }

    addRule(name, amount, category = 'Khác') {
        const id = 'rule_' + Date.now();
        const rule = {
            id,
            name: name.trim(),
            amount: Number(amount) || 0,
            category: category.trim() || 'Khác',
            icon: 'fa-triangle-exclamation'
        };
        this.rules.push(rule);
        this.saveRules();
        this.logActivity(this.currentUser, 'Thêm quy định mức phạt', `Thêm lỗi: "${rule.name}" - ${this.formatCurrency(rule.amount)}`);
        return rule;
    }

    updateRule(id, name, amount, category) {
        const rule = this.rules.find(r => r.id === id);
        if (rule) {
            const oldAmount = rule.amount;
            rule.name = name.trim();
            rule.amount = Number(amount) || 0;
            if (category) rule.category = category.trim();
            this.saveRules();
            this.logActivity(this.currentUser, 'Sửa quy định mức phạt', `Sửa lỗi "${rule.name}": ${this.formatCurrency(oldAmount)} ➔ ${this.formatCurrency(rule.amount)}`);
        }
    }

    deleteRule(id) {
        const rule = this.rules.find(r => r.id === id);
        if (rule) {
            this.rules = this.rules.filter(r => r.id !== id);
            this.saveRules();
            this.logActivity(this.currentUser, 'Xóa quy định mức phạt', `Đã xóa quy định: "${rule.name}"`);
        }
    }

    // ==========================================
    // VIOLATIONS MANAGEMENT (Sổ Vi Phạm)
    // ==========================================
    loadViolations() {
        const stored = localStorage.getItem(this.STORAGE_KEYS.VIOLATIONS);
        if (stored) {
            try {
                this.violations = JSON.parse(stored);
            } catch (e) {
                this.violations = this.generateSampleViolations();
            }
        } else {
            this.violations = this.generateSampleViolations();
            this.saveViolations();
        }
    }

    saveViolations() {
        localStorage.setItem(this.STORAGE_KEYS.VIOLATIONS, JSON.stringify(this.violations));
    }

    generateSampleViolations() {
        const now = new Date();
        const formatDate = (daysAgo, hour = 7, min = 15) => {
            const d = new Date(now);
            d.setDate(d.getDate() - daysAgo);
            d.setHours(hour, min, 0, 0);
            return d.toISOString();
        };

        return [
            {
                id: 'vio_1',
                studentId: 'hs_1',
                studentName: 'TRỌNG TÍN',
                date: formatDate(2, 7, 15),
                violationType: 'Đi muộn',
                note: 'Muộn 15 phút tiết 1',
                amount: 10000,
                recorder: 'Trần Dương Anh Tú (GVCN)',
                status: 'paid', // 'unpaid' | 'paid' | 'waived' | 'cancelled'
                paidDate: formatDate(1, 10, 0),
                paidAmount: 10000,
                paymentMethod: 'Tiền mặt',
                collector: 'Lớp trưởng (Khánh Quân)',
                createdAt: formatDate(2, 7, 15)
            },
            {
                id: 'vio_2',
                studentId: 'hs_2',
                studentName: 'NGHIỆP TƯỜNG',
                date: formatDate(1, 7, 20),
                violationType: 'Không mặc đồng phục',
                note: 'Mặc áo khoác ngoài sai quy định',
                amount: 20000,
                recorder: 'Sao đỏ tuần',
                status: 'unpaid',
                paidDate: null,
                paidAmount: 0,
                paymentMethod: null,
                collector: null,
                createdAt: formatDate(1, 7, 20)
            },
            {
                id: 'vio_3',
                studentId: 'hs_13',
                studentName: 'QUỐC MINH',
                date: formatDate(3, 8, 45),
                violationType: 'Nói chuyện trong giờ',
                note: 'Tiết Hóa',
                amount: 5000,
                recorder: 'Lớp phó học tập',
                status: 'paid',
                paidDate: formatDate(2, 11, 30),
                paidAmount: 5000,
                paymentMethod: 'Tiền mặt',
                collector: 'Lớp trưởng (Khánh Quân)',
                createdAt: formatDate(3, 8, 45)
            },
            {
                id: 'vio_4',
                studentId: 'hs_24',
                studentName: 'KHÁNH QUÂN',
                date: formatDate(5, 7, 10),
                violationType: 'Đi muộn',
                note: 'Kẹt xe',
                amount: 10000,
                recorder: 'Sao đỏ tuần',
                status: 'paid',
                paidDate: formatDate(4, 9, 15),
                paidAmount: 10000,
                paymentMethod: 'Tiền mặt',
                collector: 'Thủ quỹ',
                createdAt: formatDate(5, 7, 10)
            },
            {
                id: 'vio_5',
                studentId: 'hs_26',
                studentName: 'BÁCH ĐẠT',
                date: formatDate(0, 7, 25),
                violationType: 'Không làm bài tập',
                note: 'Chưa làm 3 bài tập Toán',
                amount: 5000,
                recorder: 'Lớp phó học tập',
                status: 'unpaid',
                paidDate: null,
                paidAmount: 0,
                paymentMethod: null,
                collector: null,
                createdAt: formatDate(0, 7, 25)
            },
            {
                id: 'vio_6',
                studentId: 'hs_26',
                studentName: 'BÁCH ĐẠT',
                date: formatDate(2, 9, 30),
                violationType: 'Sử dụng điện thoại trong giờ',
                note: 'Chơi game giờ Sinh',
                amount: 20000,
                recorder: 'Giáo viên bộ môn',
                status: 'unpaid',
                paidDate: null,
                paidAmount: 0,
                paymentMethod: null,
                collector: null,
                createdAt: formatDate(2, 9, 30)
            },
            {
                id: 'vio_7',
                studentId: 'hs_36',
                studentName: 'TUẤN KIỆT',
                date: formatDate(4, 7, 0),
                violationType: 'Nghỉ học không phép',
                note: 'Không có giấy phép phụ huynh',
                amount: 30000,
                recorder: 'Trần Dương Anh Tú (GVCN)',
                status: 'unpaid',
                paidDate: null,
                paidAmount: 0,
                paymentMethod: null,
                collector: null,
                createdAt: formatDate(4, 7, 0)
            },
            {
                id: 'vio_8',
                studentId: 'hs_17',
                studentName: 'MINH QUÂN',
                date: formatDate(6, 14, 15),
                violationType: 'Ăn quà vặt trong lớp',
                note: 'Ăn bánh tráng giờ ra chơi không dọn',
                amount: 10000,
                recorder: 'Tổ trưởng tổ 2',
                status: 'paid',
                paidDate: formatDate(5, 10, 0),
                paidAmount: 10000,
                paymentMethod: 'Chuyển khoản',
                collector: 'Lớp trưởng (Khánh Quân)',
                createdAt: formatDate(6, 14, 15)
            },
            {
                id: 'vio_9',
                studentId: 'hs_4',
                studentName: 'KHÁNH TRÂM',
                date: formatDate(8, 7, 10),
                violationType: 'Đi muộn',
                note: 'Hỏng xe có phụ huynh xin phép',
                amount: 10000,
                recorder: 'Sao đỏ tuần',
                status: 'waived', // Được miễn
                paidDate: null,
                paidAmount: 0,
                paymentMethod: null,
                collector: null,
                createdAt: formatDate(8, 7, 10)
            }
        ];
    }

    getAllViolations() {
        return this.violations;
    }

    getViolation(id) {
        return this.violations.find(v => v.id === id);
    }

    addViolation(data) {
        const id = 'vio_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
        const record = {
            id,
            studentId: data.studentId || '',
            studentName: data.studentName || 'Học sinh',
            date: data.date || new Date().toISOString(),
            violationType: data.violationType || 'Vi phạm nề nếp',
            note: data.note || '',
            amount: Number(data.amount) || 0,
            recorder: data.recorder || this.currentUser,
            status: data.status || 'unpaid',
            paidDate: data.status === 'paid' ? (data.paidDate || new Date().toISOString()) : null,
            paidAmount: data.status === 'paid' ? Number(data.amount) : 0,
            paymentMethod: data.paymentMethod || null,
            collector: data.status === 'paid' ? (data.collector || this.currentUser) : null,
            createdAt: new Date().toISOString()
        };

        this.violations.unshift(record);
        this.saveViolations();

        this.logActivity(
            this.currentUser,
            'Ghi nhận vi phạm',
            `${record.recorder} thêm vi phạm cho "${record.studentName}" ➔ ${record.violationType} (${this.formatCurrency(record.amount)})`
        );

        if (record.status === 'paid') {
            this.createPaymentRecord({
                studentId: record.studentId,
                studentName: record.studentName,
                date: record.paidDate,
                amount: record.amount,
                method: record.paymentMethod || 'Tiền mặt',
                collector: record.collector || this.currentUser,
                note: `Thanh toán lỗi: ${record.violationType}`,
                violationIds: [record.id]
            });
        }

        return record;
    }

    updateViolation(id, data) {
        const violation = this.getViolation(id);
        if (!violation) return false;

        violation.studentId = data.studentId !== undefined ? data.studentId : violation.studentId;
        violation.studentName = data.studentName !== undefined ? data.studentName : violation.studentName;
        violation.date = data.date || violation.date;
        violation.violationType = data.violationType || violation.violationType;
        violation.note = data.note !== undefined ? data.note : violation.note;
        violation.amount = data.amount !== undefined ? Number(data.amount) : violation.amount;
        violation.recorder = data.recorder || violation.recorder;

        if (data.status && data.status !== violation.status) {
            violation.status = data.status;
            if (data.status === 'paid') {
                violation.paidDate = data.paidDate || new Date().toISOString();
                violation.paidAmount = violation.amount;
                violation.paymentMethod = data.paymentMethod || 'Tiền mặt';
                violation.collector = data.collector || this.currentUser;
            }
        }

        this.saveViolations();
        this.logActivity(
            this.currentUser,
            'Cập nhật vi phạm',
            `Chỉnh sửa bản ghi vi phạm của "${violation.studentName}" (${violation.violationType}: ${this.formatCurrency(violation.amount)})`
        );
        return true;
    }

    deleteViolation(id) {
        const violation = this.getViolation(id);
        if (violation) {
            this.violations = this.violations.filter(v => v.id !== id);
            this.saveViolations();
            this.logActivity(
                this.currentUser,
                'Xóa vi phạm',
                `Đã xóa bản ghi vi phạm của "${violation.studentName}" (${violation.violationType} - ${this.formatCurrency(violation.amount)})`
            );
            return true;
        }
        return false;
    }

    setViolationStatus(id, newStatus, reason = '') {
        const violation = this.getViolation(id);
        if (!violation) return false;

        violation.status = newStatus;

        if (newStatus === 'waived') {
            violation.note = (violation.note ? violation.note + ' | ' : '') + `Được miễn phạt: ${reason || 'Theo phê duyệt của GVCN'}`;
            this.logActivity(this.currentUser, 'Miễn tiền phạt', `Miễn phạt cho "${violation.studentName}" (${violation.violationType}) - Lý do: ${reason || 'Không'}`);
        } else if (newStatus === 'cancelled') {
            violation.note = (violation.note ? violation.note + ' | ' : '') + `Đã hủy: ${reason || 'Ghi nhầm / Hủy biên bản'}`;
            this.logActivity(this.currentUser, 'Hủy vi phạm', `Hủy vi phạm của "${violation.studentName}" (${violation.violationType}) - Lý do: ${reason || 'Ghi nhầm'}`);
        }

        this.saveViolations();
        return true;
    }

    // ==========================================
    // PAYMENTS & DEBT COLLECTION (Thu tiền nợ & Giao dịch)
    // ==========================================
    loadPayments() {
        const stored = localStorage.getItem(this.STORAGE_KEYS.PAYMENTS);
        if (stored) {
            try {
                this.payments = JSON.parse(stored);
            } catch (e) {
                this.payments = [];
            }
        } else {
            this.payments = [];
            // Generate initial payments based on initial paid violations
            this.violations.filter(v => v.status === 'paid').forEach(v => {
                this.payments.push({
                    id: 'pay_' + v.id.replace('vio_', ''),
                    receiptNumber: 'BL-' + (1000 + this.payments.length + 1),
                    studentId: v.studentId,
                    studentName: v.studentName,
                    date: v.paidDate || v.date,
                    amount: v.amount,
                    method: v.paymentMethod || 'Tiền mặt',
                    collector: v.collector || 'Lớp trưởng (Khánh Quân)',
                    note: `Nộp phạt lỗi: ${v.violationType}`,
                    violationIds: [v.id],
                    items: [
                        { type: v.violationType, amount: v.amount, date: v.date }
                    ],
                    createdAt: v.paidDate || v.date
                });
            });
            this.savePayments();
        }
    }

    savePayments() {
        localStorage.setItem(this.STORAGE_KEYS.PAYMENTS, JSON.stringify(this.payments));
    }

    createPaymentRecord(data) {
        const nextNum = 1000 + this.payments.length + 1;
        const receipt = {
            id: 'pay_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
            receiptNumber: 'BL-' + nextNum,
            studentId: data.studentId,
            studentName: data.studentName,
            date: data.date || new Date().toISOString(),
            amount: Number(data.amount) || 0,
            method: data.method || 'Tiền mặt',
            collector: data.collector || this.currentUser,
            note: data.note || 'Nộp tiền quỹ phạt',
            violationIds: data.violationIds || [],
            items: data.items || [],
            createdAt: new Date().toISOString()
        };

        this.payments.unshift(receipt);
        this.savePayments();
        return receipt;
    }

    collectStudentDebt(studentId, options = {}) {
        const student = this.studentManager.getStudent(studentId);
        const studentName = student ? student.name : (options.studentName || 'Học sinh');
        const unpaidList = this.violations.filter(v => v.studentId === studentId && v.status === 'unpaid');

        if (unpaidList.length === 0 && (!options.customAmount || options.customAmount <= 0)) {
            return { success: false, message: 'Học sinh này hiện không có khoản nợ nào cần thu!' };
        }

        const totalDebt = unpaidList.reduce((sum, v) => sum + v.amount, 0);
        const amountToPay = options.amount !== undefined ? Number(options.amount) : totalDebt;
        const payDate = options.date || new Date().toISOString();
        const payMethod = options.method || 'Tiền mặt';
        const collector = options.collector || this.currentUser;
        const note = options.note || 'Thanh toán tiền phạt vi phạm';

        let remainingToDistribute = amountToPay;
        const paidViolationIds = [];
        const receiptItems = [];

        // Apply payment to unpaid violations (oldest first)
        const sortedUnpaid = [...unpaidList].sort((a, b) => new Date(a.date) - new Date(b.date));

        for (const v of sortedUnpaid) {
            if (remainingToDistribute >= v.amount) {
                v.status = 'paid';
                v.paidDate = payDate;
                v.paidAmount = v.amount;
                v.paymentMethod = payMethod;
                v.collector = collector;
                remainingToDistribute -= v.amount;
                paidViolationIds.push(v.id);
                receiptItems.push({
                    id: v.id,
                    type: v.violationType,
                    amount: v.amount,
                    date: v.date,
                    note: v.note
                });
            } else if (remainingToDistribute > 0) {
                // Partial payment handling: mark portion as paid item
                receiptItems.push({
                    id: v.id,
                    type: `${v.violationType} (Đóng một phần ${this.formatCurrency(remainingToDistribute)}/${this.formatCurrency(v.amount)})`,
                    amount: remainingToDistribute,
                    date: v.date,
                    note: v.note
                });
                v.note = (v.note ? v.note + ' | ' : '') + `Đã nộp trước ${this.formatCurrency(remainingToDistribute)}`;
                remainingToDistribute = 0;
            }
        }

        this.saveViolations();

        // Create transaction receipt
        const receipt = this.createPaymentRecord({
            studentId,
            studentName,
            date: payDate,
            amount: amountToPay,
            method: payMethod,
            collector,
            note,
            violationIds: paidViolationIds,
            items: receiptItems.length > 0 ? receiptItems : [{ type: 'Khoản thu nộp bổ sung', amount: amountToPay, date: payDate }]
        });

        this.logActivity(
            this.currentUser,
            'Thu tiền nộp phạt',
            `${collector} xác nhận "${studentName}" đã nộp +${this.formatCurrency(amountToPay)} (${payMethod}) ➔ Mã biên nhận: ${receipt.receiptNumber}`
        );

        return {
            success: true,
            receipt,
            paidCount: paidViolationIds.length,
            amountPaid: amountToPay
        };
    }

    getAllPayments() {
        return this.payments;
    }

    getPaymentById(id) {
        return this.payments.find(p => p.id === id || p.receiptNumber === id);
    }

    // ==========================================
    // AUDIT LOGGING (Nhật ký thay đổi)
    // ==========================================
    loadAuditLogs() {
        const stored = localStorage.getItem(this.STORAGE_KEYS.AUDIT);
        if (stored) {
            try {
                this.auditLogs = JSON.parse(stored);
            } catch (e) {
                this.auditLogs = [];
            }
        } else {
            this.auditLogs = this.generateSampleAuditLogs();
            this.saveAuditLogs();
        }
    }

    saveAuditLogs() {
        localStorage.setItem(this.STORAGE_KEYS.AUDIT, JSON.stringify(this.auditLogs));
    }

    generateSampleAuditLogs() {
        const now = new Date();
        const formatDate = (daysAgo, hour = 8, min = 0) => {
            const d = new Date(now);
            d.setDate(d.getDate() - daysAgo);
            d.setHours(hour, min, 0, 0);
            return d.toISOString();
        };

        return [
            {
                id: 'log_1',
                timestamp: formatDate(2, 7, 20),
                user: 'Khánh Quân (Lớp trưởng)',
                action: 'Ghi nhận vi phạm',
                details: 'Quân thêm vi phạm cho TRỌNG TÍN ➔ Đi muộn: 10.000đ'
            },
            {
                id: 'log_2',
                timestamp: formatDate(1, 10, 5),
                user: 'Khánh Quân (Lớp trưởng)',
                action: 'Thu tiền nộp phạt',
                details: 'Khánh Quân xác nhận TRỌNG TÍN đã nộp +10.000đ ➔ Mã biên nhận: BL-1001'
            },
            {
                id: 'log_3',
                timestamp: formatDate(1, 7, 25),
                user: 'Sao đỏ tuần',
                action: 'Ghi nhận vi phạm',
                details: 'Thêm vi phạm cho NGHIỆP TƯỜNG ➔ Không mặc đồng phục: 20.000đ'
            },
            {
                id: 'log_4',
                timestamp: formatDate(0, 7, 30),
                user: 'Quốc Minh (LPHT)',
                action: 'Ghi nhận vi phạm',
                details: 'Thêm vi phạm cho BÁCH ĐẠT ➔ Không làm bài tập: 5.000đ'
            }
        ];
    }

    logActivity(user, action, details) {
        const log = {
            id: 'log_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
            timestamp: new Date().toISOString(),
            user: user || this.currentUser,
            action: action || 'Hoạt động',
            details: details || ''
        };
        this.auditLogs.unshift(log);
        if (this.auditLogs.length > 200) {
            this.auditLogs = this.auditLogs.slice(0, 200);
        }
        this.saveAuditLogs();
        return log;
    }

    deleteAuditLog(id) {
        const log = this.auditLogs.find(l => l.id === id);
        if (log) {
            this.auditLogs = this.auditLogs.filter(l => l.id !== id);
            this.saveAuditLogs();
            return true;
        }
        return false;
    }

    clearAuditLogs() {
        this.auditLogs = [];
        this.saveAuditLogs();
    }

    getAllAuditLogs() {
        return this.auditLogs;
    }

    // ==========================================
    // ROLE & PERMISSIONS (Phân quyền)
    // ==========================================
    loadRole() {
        const storedRole = localStorage.getItem(this.STORAGE_KEYS.ROLE);
        const storedStudentId = localStorage.getItem(this.STORAGE_KEYS.STUDENT_ID);
        if (storedRole) this.currentRole = storedRole;
        if (storedStudentId) this.currentStudentId = storedStudentId;
        this.updateCurrentUserLabel();
    }

    saveRole() {
        localStorage.setItem(this.STORAGE_KEYS.ROLE, this.currentRole);
        if (this.currentStudentId) {
            localStorage.setItem(this.STORAGE_KEYS.STUDENT_ID, this.currentStudentId);
        } else {
            localStorage.removeItem(this.STORAGE_KEYS.STUDENT_ID);
        }
    }

    setRole(role, studentId = null) {
        this.currentRole = role; // 'admin' | 'student'
        this.currentStudentId = studentId;
        this.updateCurrentUserLabel();
        this.saveRole();
    }

    updateCurrentUserLabel() {
        if (this.currentRole === 'admin') {
            this.currentUser = 'Quản trị viên (Admin)';
        } else {
            const st = this.studentManager ? this.studentManager.getStudent(this.currentStudentId) : null;
            this.currentUser = st ? `Học sinh (${st.name})` : 'Học sinh / Thành viên';
        }
    }

    getRole() {
        return this.currentRole;
    }

    canEdit() {
        return this.isAuthenticated && this.currentRole === 'admin';
    }

    canRecordViolation() {
        return this.isAuthenticated && this.currentRole === 'admin';
    }

    canCollectMoney() {
        return this.isAuthenticated && this.currentRole === 'admin';
    }

    canEditRules() {
        return this.isAuthenticated && this.currentRole === 'admin';
    }

    // ==========================================
    // STATISTICS & REPORTS (Thống kê quỹ)
    // ==========================================
    getStats(timeframe = 'all') {
        let list = this.violations;

        if (timeframe !== 'all') {
            const now = new Date();
            list = list.filter(v => {
                const d = new Date(v.date);
                if (timeframe === 'month') {
                    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
                } else if (timeframe === 'week') {
                    const oneWeekAgo = new Date();
                    oneWeekAgo.setDate(now.getDate() - 7);
                    return d >= oneWeekAgo;
                }
                return true;
            });
        }

        // Active violations that require fine (excluding cancelled and waived)
        const totalPayable = list
            .filter(v => v.status === 'paid' || v.status === 'unpaid')
            .reduce((sum, v) => sum + v.amount, 0);

        const totalCollected = list
            .filter(v => v.status === 'paid')
            .reduce((sum, v) => sum + (v.paidAmount || v.amount), 0);

        const totalRemaining = list
            .filter(v => v.status === 'unpaid')
            .reduce((sum, v) => sum + v.amount, 0);

        const totalViolationsCount = list.length;
        const totalPaidCount = list.filter(v => v.status === 'paid').length;
        const totalUnpaidCount = list.filter(v => v.status === 'unpaid').length;
        const totalWaivedCount = list.filter(v => v.status === 'waived').length;
        const totalCancelledCount = list.filter(v => v.status === 'cancelled').length;

        const collectionRate = totalPayable > 0 ? Math.round((totalCollected / totalPayable) * 100) : 100;

        return {
            totalPayable,
            totalCollected,
            totalRemaining,
            totalViolationsCount,
            totalPaidCount,
            totalUnpaidCount,
            totalWaivedCount,
            totalCancelledCount,
            collectionRate
        };
    }

    getStudentSummary(studentId) {
        const studentViolations = this.violations.filter(v => v.studentId === studentId);
        
        const payableList = studentViolations.filter(v => v.status === 'paid' || v.status === 'unpaid');
        const totalAmount = payableList.reduce((sum, v) => sum + v.amount, 0);
        const paidAmount = studentViolations.filter(v => v.status === 'paid').reduce((sum, v) => sum + (v.paidAmount || v.amount), 0);
        const remainingAmount = studentViolations.filter(v => v.status === 'unpaid').reduce((sum, v) => sum + v.amount, 0);
        
        const unpaidCount = studentViolations.filter(v => v.status === 'unpaid').length;
        const paidCount = studentViolations.filter(v => v.status === 'paid').length;
        const waivedCount = studentViolations.filter(v => v.status === 'waived').length;

        const studentPayments = this.payments.filter(p => p.studentId === studentId);

        return {
            studentId,
            totalViolations: studentViolations.length,
            totalAmount,
            paidAmount,
            remainingAmount,
            unpaidCount,
            paidCount,
            waivedCount,
            violations: studentViolations,
            payments: studentPayments
        };
    }

    getAllStudentsWithDebt() {
        const allStudents = this.studentManager ? this.studentManager.getAll() : [];
        const result = [];

        // Check all registered students
        allStudents.forEach(st => {
            const summary = this.getStudentSummary(st.id);
            if (summary.remainingAmount > 0) {
                result.push({
                    student: st,
                    name: st.name,
                    role: st.role,
                    ...summary
                });
            }
        });

        // Also check any violations with studentId not in allStudents (if any)
        const knownIds = new Set(allStudents.map(s => s.id));
        const orphanStudentIds = new Set(
            this.violations.filter(v => !knownIds.has(v.studentId) && v.status === 'unpaid').map(v => v.studentId)
        );

        orphanStudentIds.forEach(stId => {
            const summary = this.getStudentSummary(stId);
            const vSample = this.violations.find(v => v.studentId === stId);
            if (summary.remainingAmount > 0) {
                result.push({
                    student: { id: stId, name: vSample ? vSample.studentName : 'Chưa rõ', role: '' },
                    name: vSample ? vSample.studentName : 'Chưa rõ',
                    role: '',
                    ...summary
                });
            }
        });

        // Sort by remaining debt descending
        return result.sort((a, b) => b.remainingAmount - a.remainingAmount);
    }

    getTopViolators(limit = 5) {
        const map = {};
        this.violations.forEach(v => {
            if (v.status !== 'cancelled') {
                const key = v.studentId || v.studentName;
                if (!map[key]) {
                    map[key] = {
                        studentId: v.studentId,
                        studentName: v.studentName,
                        count: 0,
                        totalAmount: 0,
                        remaining: 0
                    };
                }
                map[key].count++;
                if (v.status === 'paid' || v.status === 'unpaid') {
                    map[key].totalAmount += v.amount;
                }
                if (v.status === 'unpaid') {
                    map[key].remaining += v.amount;
                }
            }
        });

        const list = Object.values(map);
        return list.sort((a, b) => b.count - a.count).slice(0, limit);
    }

    getViolationsByType() {
        const map = {};
        this.violations.forEach(v => {
            if (v.status !== 'cancelled') {
                const type = v.violationType || 'Khác';
                map[type] = (map[type] || 0) + 1;
            }
        });

        const sorted = Object.entries(map).sort((a, b) => b[1] - a[1]);
        return {
            labels: sorted.map(item => item[0]),
            counts: sorted.map(item => item[1])
        };
    }

    getWeeklyMonthlyRevenue() {
        // Group amounts by week or day of current month
        const now = new Date();
        const days = [];
        const amounts = [];
        const counts = [];

        // Last 7 days
        for (let i = 6; i >= 0; i--) {
            const d = new Date(now);
            d.setDate(d.getDate() - i);
            const dateStr = d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
            days.push(dateStr);

            const dayViolations = this.violations.filter(v => {
                const vd = new Date(v.date);
                return vd.toDateString() === d.toDateString() && v.status !== 'cancelled';
            });

            const dayTotal = dayViolations.reduce((sum, v) => sum + v.amount, 0);
            amounts.push(dayTotal);
            counts.push(dayViolations.length);
        }

        return {
            labels: days,
            amounts,
            counts
        };
    }

    // Helper: format currency VND
    formatCurrency(num) {
        if (!num && num !== 0) return '0đ';
        return Number(num).toLocaleString('vi-VN') + 'đ';
    }

    // Helper: format date time
    formatDateTime(dateStr) {
        if (!dateStr) return '';
        try {
            const d = new Date(dateStr);
            const pad = (n) => String(n).padStart(2, '0');
            const day = pad(d.getDate());
            const month = pad(d.getMonth() + 1);
            const year = d.getFullYear();
            const hours = pad(d.getHours());
            const mins = pad(d.getMinutes());
            return `${hours}:${mins} ${day}/${month}/${year}`;
        } catch (e) {
            return dateStr;
        }
    }

    formatDateOnly(dateStr) {
        if (!dateStr) return '';
        try {
            const d = new Date(dateStr);
            const pad = (n) => String(n).padStart(2, '0');
            const day = pad(d.getDate());
            const month = pad(d.getMonth() + 1);
            const year = d.getFullYear();
            return `${day}/${month}/${year}`;
        } catch (e) {
            return dateStr;
        }
    }
}
