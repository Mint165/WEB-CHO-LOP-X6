/**
 * FundUI
 * ─Éiß╗üu khiß╗ân giao diß╗çn Quß║ún L├╜ Thß╗º Quß╗╣:
 * - Render Dashboard & Biß╗âu ─æß╗ô Chart.js
 * - Render Sß╗ò Vi Phß║ím & Bß╗Ö Lß╗ìc
 * - Render Hß╗ô S╞í Hß╗ìc Sinh
 * - Render Quß║ún L├╜ Nß╗ú & Thu Tiß╗ün
 * - Render Quy ─Éß╗ïnh Mß╗⌐c Phß║ít & Nhß║¡t K├╜
 * - Xß╗¡ l├╜ Modal & In Bi├¬n Lai
 */

class FundUI {
    constructor(fundManager, studentManager) {
        this.fundManager = fundManager;
        this.studentManager = studentManager;
        this.activeTab = 'overview';
        this.charts = {};
        this.filterState = {
            search: '',
            status: 'all',
            category: 'all',
            dateRange: 'all',
            sortBy: 'newest'
        };
        this.studentFilterSearch = '';
    }

    init() {
        this.bindEvents();
        this.renderAll();
    }

    bindEvents() {
        // Sub-tabs navigation
        const tabBtns = document.querySelectorAll('.fund-tab-btn');
        tabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const tab = btn.getAttribute('data-tab');
                this.switchTab(tab);
            });
        });

        // Timeframe selector on overview
        const timeframeSelect = document.getElementById('fund-timeframe-select');
        if (timeframeSelect) {
            timeframeSelect.addEventListener('change', () => {
                this.renderOverview();
            });
        }

        // Violations filters
        const searchInput = document.getElementById('vio-search-input');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.filterState.search = e.target.value;
                this.renderViolationsTable();
            });
        }

        const statusFilter = document.getElementById('vio-status-filter');
        if (statusFilter) {
            statusFilter.addEventListener('change', (e) => {
                this.filterState.status = e.target.value;
                this.renderViolationsTable();
            });
        }

        const categoryFilter = document.getElementById('vio-category-filter');
        if (categoryFilter) {
            categoryFilter.addEventListener('change', (e) => {
                this.filterState.category = e.target.value;
                this.renderViolationsTable();
            });
        }

        const sortFilter = document.getElementById('vio-sort-filter');
        if (sortFilter) {
            sortFilter.addEventListener('change', (e) => {
                this.filterState.sortBy = e.target.value;
                this.renderViolationsTable();
            });
        }

        // Students search
        const studentSearch = document.getElementById('fund-student-search');
        if (studentSearch) {
            studentSearch.addEventListener('input', (e) => {
                this.studentFilterSearch = e.target.value;
                this.renderStudentsGrid();
            });
        }

        // Role selector with Password Protection (tk: admin, mk: g3)
        const roleSelect = document.getElementById('user-role-select');
        const roleStudentSelect = document.getElementById('role-student-select');

        if (roleSelect) {
            roleSelect.value = this.fundManager.getRole();
            roleSelect.addEventListener('change', (e) => {
                const newRole = e.target.value;
                if (newRole === 'student') {
                    if (roleStudentSelect) roleStudentSelect.style.display = 'inline-block';
                    const selectedStId = roleStudentSelect ? roleStudentSelect.value : null;
                    this.fundManager.setRole(newRole, selectedStId);
                    this.applyRolePermissions();
                    this.renderAll();
                } else {
                    // Admin hoß║╖c Teacher cß║ºn x├íc thß╗▒c mß║¡t khß║⌐u
                    if (this.fundManager.isAuthenticated) {
                        if (roleStudentSelect) roleStudentSelect.style.display = 'none';
                        this.fundManager.setRole(newRole, null);
                        this.applyRolePermissions();
                        this.renderAll();
                    } else {
                        // Mß╗ƒ popup y├¬u cß║ºu ─æ─âng nhß║¡p mß║¡t khß║⌐u
                        this.pendingRole = newRole;
                        this.openAuthModal();
                    }
                }
            });
        }

        if (roleStudentSelect) {
            roleStudentSelect.addEventListener('change', (e) => {
                this.fundManager.setRole('student', e.target.value);
                this.applyRolePermissions();
                this.renderAll();
            });
        }

        // Logout Button Handler
        const btnLogout = document.getElementById('btn-fund-logout');
        if (btnLogout) {
            btnLogout.addEventListener('click', () => {
                this.fundManager.logout();
                if (roleSelect) roleSelect.value = 'student';
                if (roleStudentSelect) roleStudentSelect.style.display = 'inline-block';
                this.applyRolePermissions();
                this.renderAll();
                alert('─É├ú ─æ─âng xuß║Ñt quyß╗ün quß║ún trß╗ï. ─Éang ß╗ƒ chß║┐ ─æß╗Ö xem cß╗ºa hß╗ìc sinh.');
            });
        }

        // Modal triggers
        this.setupModals();
    }

    openAuthModal() {
        const modal = document.getElementById('modal-auth-login');
        if (!modal) return;
        const userInput = document.getElementById('auth-username');
        const passInput = document.getElementById('auth-password');
        const errorMsg = document.getElementById('auth-error-msg');
        
        if (userInput) userInput.value = '';
        if (passInput) passInput.value = '';
        if (errorMsg) errorMsg.style.display = 'none';

        modal.classList.add('show');
        setTimeout(() => {
            if (userInput) userInput.focus();
        }, 100);
    }

    handleAuthSubmit() {
        const userInput = document.getElementById('auth-username');
        const passInput = document.getElementById('auth-password');
        const errorMsg = document.getElementById('auth-error-msg');
        const modal = document.getElementById('modal-auth-login');
        const roleSelect = document.getElementById('user-role-select');
        const roleStudentSelect = document.getElementById('role-student-select');

        const username = userInput ? userInput.value : '';
        const password = passInput ? passInput.value : '';

        const res = this.fundManager.login(username, password);
        if (res.success) {
            if (modal) modal.classList.remove('show');
            const targetRole = this.pendingRole || 'admin';
            if (roleStudentSelect) roleStudentSelect.style.display = 'none';
            if (roleSelect) roleSelect.value = targetRole;
            this.fundManager.setRole(targetRole, null);
            this.applyRolePermissions();
            this.renderAll();
        } else {
            if (errorMsg) {
                errorMsg.textContent = res.message;
                errorMsg.style.display = 'block';
            }
        }
    }

    switchTab(tabName) {
        this.activeTab = tabName;
        document.querySelectorAll('.fund-tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.getAttribute('data-tab') === tabName);
        });

        document.querySelectorAll('.fund-tab-content').forEach(content => {
            content.classList.toggle('active', content.id === `tab-${tabName}`);
        });

        if (tabName === 'overview') this.renderOverview();
        if (tabName === 'violations') this.renderViolations();
        if (tabName === 'students') this.renderStudents();
        if (tabName === 'debts') this.renderDebts();
        if (tabName === 'rules') this.renderRules();
        if (tabName === 'audit') this.renderAuditLogs();
    }

    renderAll() {
        this.populateRoleStudentOptions();
        this.applyRolePermissions();
        this.renderOverview();
        this.renderViolations();
        this.renderStudents();
        this.renderDebts();
        this.renderRules();
        this.renderAuditLogs();
    }

    populateRoleStudentOptions() {
        const select = document.getElementById('role-student-select');
        const vioStudentSelect = document.getElementById('input-vio-student');
        if (!select && !vioStudentSelect) return;

        const students = this.studentManager.getAll();
        
        if (select) {
            select.innerHTML = '';
            students.forEach(s => {
                const opt = document.createElement('option');
                opt.value = s.id;
                opt.textContent = `${s.name} ${s.role || ''}`;
                if (s.id === this.fundManager.currentStudentId) opt.selected = true;
                select.appendChild(opt);
            });
            if (this.fundManager.getRole() === 'student') {
                select.style.display = 'inline-block';
            } else {
                select.style.display = 'none';
            }
        }

        if (vioStudentSelect) {
            vioStudentSelect.innerHTML = '<option value="">-- Chß╗ìn hß╗ìc sinh vi phß║ím --</option>';
            students.forEach(s => {
                const opt = document.createElement('option');
                opt.value = s.id;
                opt.textContent = `${s.name} ${s.role || ''}`;
                vioStudentSelect.appendChild(opt);
            });
        }
    }

    applyRolePermissions() {
        const role = this.fundManager.getRole();
        const roleBadge = document.getElementById('current-role-badge');
        if (roleBadge) {
            if (role === 'admin') {
                roleBadge.innerHTML = '<i class="fa-solid fa-user-shield"></i> Quß║ún trß╗ï vi├¬n (─É├ú mß╗ƒ kh├│a)';
                roleBadge.className = 'role-badge badge-admin';
            } else {
                const st = this.studentManager.getStudent(this.fundManager.currentStudentId);
                roleBadge.innerHTML = `<i class="fa-solid fa-user-graduate"></i> Hß╗ìc sinh: ${st ? st.name : 'C├í nh├ón'}`;
                roleBadge.className = 'role-badge badge-student';
            }
        }

        // Hide/disable admin action buttons if not admin
        const adminElements = document.querySelectorAll('.admin-only');
        adminElements.forEach(el => {
            el.style.display = this.fundManager.canEdit() ? '' : 'none';
        });

        const recordViolationElements = document.querySelectorAll('.can-record-vio');
        recordViolationElements.forEach(el => {
            el.style.display = this.fundManager.canRecordViolation() ? '' : 'none';
        });
    }

    // ==========================================
    // TAB 1: OVERVIEW & DASHBOARD
    // ==========================================
    renderOverview() {
        const timeframeEl = document.getElementById('fund-timeframe-select');
        const timeframe = timeframeEl ? timeframeEl.value : 'all';
        const stats = this.fundManager.getStats(timeframe);

        // Update KPI Cards
        const totalPayableEl = document.getElementById('stat-total-payable');
        const totalCollectedEl = document.getElementById('stat-total-collected');
        const totalRemainingEl = document.getElementById('stat-total-remaining');
        const totalVioCountEl = document.getElementById('stat-total-violations');

        if (totalPayableEl) totalPayableEl.textContent = this.fundManager.formatCurrency(stats.totalPayable);
        if (totalCollectedEl) totalCollectedEl.textContent = this.fundManager.formatCurrency(stats.totalCollected);
        if (totalRemainingEl) totalRemainingEl.textContent = this.fundManager.formatCurrency(stats.totalRemaining);
        if (totalVioCountEl) totalVioCountEl.textContent = stats.totalViolationsCount + ' lß║ºn';

        // Update Progress Bar
        const progressFill = document.getElementById('fund-progress-fill');
        const progressPercent = document.getElementById('fund-progress-percent');
        const progressDetails = document.getElementById('fund-progress-details');

        if (progressFill) progressFill.style.width = `${stats.collectionRate}%`;
        if (progressPercent) progressPercent.textContent = `${stats.collectionRate}%`;
        if (progressDetails) {
            progressDetails.innerHTML = `
                <span><i class="fa-solid fa-circle-check text-success"></i> ─É├ú thu: <b>${this.fundManager.formatCurrency(stats.totalCollected)}</b></span>
                <span><i class="fa-solid fa-circle-exclamation text-danger"></i> C├▓n thiß║┐u: <b>${this.fundManager.formatCurrency(stats.totalRemaining)}</b></span>
            `;
        }

        // Render Top 5 Types
        const topTypesContainer = document.getElementById('overview-top-types');
        if (topTypesContainer) {
            const typesData = this.fundManager.getViolationsByType();
            if (typesData.labels.length === 0) {
                topTypesContainer.innerHTML = '<p class="empty-text">Ch╞░a c├│ vi phß║ím n├áo</p>';
            } else {
                let html = '<ul class="top-list">';
                const maxCount = Math.max(...typesData.counts, 1);
                for (let i = 0; i < Math.min(typesData.labels.length, 5); i++) {
                    const label = typesData.labels[i];
                    const count = typesData.counts[i];
                    const pct = Math.round((count / maxCount) * 100);
                    html += `
                        <li class="top-list-item">
                            <div class="top-item-header">
                                <span class="top-item-name"><i class="fa-solid fa-triangle-exclamation"></i> ${label}</span>
                                <span class="top-item-badge">${count} lß║ºn</span>
                            </div>
                            <div class="mini-progress-bar"><div class="mini-progress-fill" style="width: ${pct}%;"></div></div>
                        </li>
                    `;
                }
                html += '</ul>';
                topTypesContainer.innerHTML = html;
            }
        }

        // Render Recent Violations
        const recentContainer = document.getElementById('overview-recent-violations');
        if (recentContainer) {
            const violations = this.fundManager.getAllViolations().slice(0, 5);
            if (violations.length === 0) {
                recentContainer.innerHTML = '<p class="empty-text">Ch╞░a c├│ vi phß║ím gß║ºn ─æ├óy</p>';
            } else {
                let html = '<div class="recent-list">';
                violations.forEach(v => {
                    const statusClass = v.status === 'paid' ? 'status-paid' : (v.status === 'unpaid' ? 'status-unpaid' : 'status-waived');
                    const statusLabel = v.status === 'paid' ? '─É├ú nß╗Öp' : (v.status === 'unpaid' ? 'Ch╞░a nß╗Öp' : (v.status === 'waived' ? '─É╞░ß╗úc miß╗àn' : '─É├ú hß╗ºy'));
                    html += `
                        <div class="recent-item">
                            <div class="recent-avatar"><i class="fa-solid fa-user"></i></div>
                            <div class="recent-info">
                                <div class="recent-title"><b>${v.studentName}</b> ΓÇô <span class="vio-name">${v.violationType}</span></div>
                                <div class="recent-meta">${this.fundManager.formatDateOnly(v.date)} ΓÇó ${v.recorder}</div>
                            </div>
                            <div class="recent-amount">
                                <div class="amount-val">${this.fundManager.formatCurrency(v.amount)}</div>
                                <span class="badge ${statusClass}">${statusLabel}</span>
                            </div>
                        </div>
                    `;
                });
                html += '</div>';
                recentContainer.innerHTML = html;
            }
        }

        // Render Charts
        this.renderCharts();
    }

    renderCharts() {
        if (typeof Chart === 'undefined') return;

        // Chart 1: Revenue / Fines over time (Line / Bar)
        const ctxRevenue = document.getElementById('chart-revenue');
        if (ctxRevenue) {
            const revData = this.fundManager.getWeeklyMonthlyRevenue();
            if (this.charts.revenue) this.charts.revenue.destroy();
            this.charts.revenue = new Chart(ctxRevenue, {
                type: 'bar',
                data: {
                    labels: revData.labels,
                    datasets: [{
                        label: 'Tiß╗ün phß║ít (VN─É)',
                        data: revData.amounts,
                        backgroundColor: 'rgba(79, 70, 229, 0.75)',
                        borderColor: '#4F46E5',
                        borderWidth: 1.5,
                        borderRadius: 6
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            callbacks: {
                                label: (ctx) => `Tiß╗ün phß║ít: ${Number(ctx.raw).toLocaleString('vi-VN')}─æ`
                            }
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: {
                                callback: (val) => `${val / 1000}k`
                            },
                            grid: { color: 'rgba(0,0,0,0.05)' }
                        },
                        x: {
                            grid: { display: false }
                        }
                    }
                }
            });
        }

        // Chart 2: Violations by Category (Doughnut)
        const ctxTypes = document.getElementById('chart-types');
        if (ctxTypes) {
            const typesData = this.fundManager.getViolationsByType();
            if (this.charts.types) this.charts.types.destroy();
            const bgColors = [
                '#4F46E5', '#EF4444', '#F59E0B', '#10B981', '#6366F1',
                '#EC4899', '#8B5CF6', '#14B8A6', '#F97316'
            ];
            this.charts.types = new Chart(ctxTypes, {
                type: 'doughnut',
                data: {
                    labels: typesData.labels.length > 0 ? typesData.labels : ['Ch╞░a c├│ dß╗» liß╗çu'],
                    datasets: [{
                        data: typesData.counts.length > 0 ? typesData.counts : [1],
                        backgroundColor: typesData.labels.length > 0 ? bgColors.slice(0, typesData.labels.length) : ['#E5E7EB'],
                        borderWidth: 2,
                        borderColor: '#FFFFFF'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: { boxWidth: 12, font: { size: 11 } }
                        }
                    },
                    cutout: '65%'
                }
            });
        }

        // Chart 3: Top Violators (Horizontal Bar)
        const ctxTop = document.getElementById('chart-top-violators');
        if (ctxTop) {
            const topList = this.fundManager.getTopViolators(5);
            if (this.charts.top) this.charts.top.destroy();
            this.charts.top = new Chart(ctxTop, {
                type: 'bar',
                data: {
                    labels: topList.map(t => t.studentName),
                    datasets: [{
                        label: 'Sß╗æ lß║ºn vi phß║ím',
                        data: topList.map(t => t.count),
                        backgroundColor: 'rgba(239, 68, 68, 0.8)',
                        borderColor: '#EF4444',
                        borderWidth: 1.5,
                        borderRadius: 6
                    }]
                },
                options: {
                    indexAxis: 'y',
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false }
                    },
                    scales: {
                        x: {
                            beginAtZero: true,
                            ticks: { stepSize: 1 },
                            grid: { color: 'rgba(0,0,0,0.05)' }
                        },
                        y: {
                            grid: { display: false }
                        }
                    }
                }
            });
        }
    }

    // ==========================================
    // TAB 2: VIOLATIONS MANAGEMENT
    // ==========================================
    renderViolations() {
        this.populateViolationTypeDropdowns();
        this.renderViolationsTable();
    }

    populateViolationTypeDropdowns() {
        const rules = this.fundManager.getRules();
        const select = document.getElementById('input-vio-type');
        const filterSelect = document.getElementById('vio-category-filter');

        if (select) {
            select.innerHTML = '<option value="">-- Chß╗ìn loß║íi vi phß║ím quy ─æß╗ïnh --</option>';
            rules.forEach(r => {
                const opt = document.createElement('option');
                opt.value = r.name;
                opt.setAttribute('data-amount', r.amount);
                opt.textContent = `${r.name} (${this.fundManager.formatCurrency(r.amount)})`;
                select.appendChild(opt);
            });
        }

        if (filterSelect && filterSelect.options.length <= 1) {
            rules.forEach(r => {
                const opt = document.createElement('option');
                opt.value = r.name;
                opt.textContent = r.name;
                filterSelect.appendChild(opt);
            });
        }
    }

    renderViolationsTable() {
        const tbody = document.getElementById('violations-tbody');
        const countDisplay = document.getElementById('violations-count-display');
        if (!tbody) return;

        let list = this.fundManager.getAllViolations();

        // If logged in as student, only show their violations
        if (this.fundManager.getRole() === 'student' && this.fundManager.currentStudentId) {
            list = list.filter(v => v.studentId === this.fundManager.currentStudentId);
        }

        // Apply Search Filter
        if (this.filterState.search.trim()) {
            const q = this.filterState.search.toLowerCase().trim();
            list = list.filter(v => 
                v.studentName.toLowerCase().includes(q) ||
                v.violationType.toLowerCase().includes(q) ||
                (v.note && v.note.toLowerCase().includes(q)) ||
                (v.recorder && v.recorder.toLowerCase().includes(q))
            );
        }

        // Apply Status Filter
        if (this.filterState.status !== 'all') {
            list = list.filter(v => v.status === this.filterState.status);
        }

        // Apply Category Filter
        if (this.filterState.category !== 'all') {
            list = list.filter(v => v.violationType === this.filterState.category);
        }

        // Apply Sorting
        list.sort((a, b) => {
            if (this.filterState.sortBy === 'newest') return new Date(b.date) - new Date(a.date);
            if (this.filterState.sortBy === 'oldest') return new Date(a.date) - new Date(b.date);
            if (this.filterState.sortBy === 'amount-desc') return b.amount - a.amount;
            if (this.filterState.sortBy === 'amount-asc') return a.amount - b.amount;
            return 0;
        });

        if (countDisplay) {
            countDisplay.textContent = `Hiß╗ân thß╗ï ${list.length} bß║ún ghi`;
        }

        if (list.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center py-5">
                        <div class="empty-table-state">
                            <i class="fa-solid fa-clipboard-check text-muted" style="font-size: 2.5rem; margin-bottom: 8px;"></i>
                            <p class="text-muted">Kh├┤ng t├¼m thß║Ñy bß║ún ghi vi phß║ím n├áo ph├╣ hß╗úp</p>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }

        let html = '';
        list.forEach(v => {
            const statusConfig = {
                paid: { label: '─É├ú nß╗Öp', class: 'status-paid', icon: 'fa-check' },
                unpaid: { label: 'Ch╞░a nß╗Öp', class: 'status-unpaid', icon: 'fa-circle-xmark' },
                waived: { label: '─É╞░ß╗úc miß╗àn', class: 'status-waived', icon: 'fa-shield-halved' },
                cancelled: { label: '─É├ú hß╗ºy', class: 'status-cancelled', icon: 'fa-ban' }
            }[v.status] || { label: v.status, class: 'status-unpaid', icon: 'fa-circle' };

            const canEdit = this.fundManager.canEdit();
            const canCollect = this.fundManager.canCollectMoney();

            let actionButtons = '';
            if (canEdit || canCollect) {
                actionButtons = `
                    <div class="table-actions">
                        ${v.status === 'unpaid' ? `
                            <button class="btn-action btn-action-pay btn-mark-paid" data-id="${v.id}" title="Thu tiß╗ün / ─É├ính dß║Ñu ─æ├ú nß╗Öp">
                                <i class="fa-solid fa-money-bill-wave"></i> Thu tiß╗ün
                            </button>
                        ` : ''}
                        ${v.status === 'paid' ? `
                            <button class="btn-action btn-action-receipt btn-view-receipt" data-id="${v.id}" title="Xem & in phiß║┐u bi├¬n nhß║¡n">
                                <i class="fa-solid fa-receipt"></i> Phiß║┐u thu
                            </button>
                        ` : ''}
                        ${canEdit ? `
                            <button class="btn-action btn-action-edit btn-edit-violation" data-id="${v.id}" title="Chß╗ënh sß╗¡a">
                                <i class="fa-solid fa-pen-to-square"></i>
                            </button>
                            <button class="btn-action btn-action-danger btn-delete-violation" data-id="${v.id}" title="X├│a">
                                <i class="fa-solid fa-trash"></i>
                            </button>
                        ` : ''}
                    </div>
                `;
            } else {
                actionButtons = v.status === 'paid' ? `
                    <button class="btn-action btn-action-receipt btn-view-receipt" data-id="${v.id}" title="Xem phiß║┐u bi├¬n nhß║¡n">
                        <i class="fa-solid fa-receipt"></i> Phiß║┐u thu
                    </button>
                ` : '<span class="text-muted">ΓÇô</span>';
            }

            html += `
                <tr data-id="${v.id}">
                    <td>
                        <div class="student-cell" data-student-id="${v.studentId}">
                            <div class="student-avatar-mini"><i class="fa-solid fa-user"></i></div>
                            <div>
                                <b class="student-name-link">${v.studentName}</b>
                            </div>
                        </div>
                    </td>
                    <td>
                        <div class="vio-date">${this.fundManager.formatDateOnly(v.date)}</div>
                        <div class="vio-time text-muted">${new Date(v.date).toLocaleTimeString('vi-VN', {hour: '2-digit', minute: '2-digit'})}</div>
                    </td>
                    <td>
                        <span class="badge-vio-type">${v.violationType}</span>
                    </td>
                    <td>
                        <span class="vio-note-text" title="${v.note || 'Kh├┤ng c├│ ghi ch├║'}">${v.note || 'ΓÇô'}</span>
                    </td>
                    <td>
                        <b class="text-amount">${this.fundManager.formatCurrency(v.amount)}</b>
                    </td>
                    <td>
                        <span class="text-recorder">${v.recorder}</span>
                    </td>
                    <td>
                        <span class="badge ${statusConfig.class}">
                            <i class="fa-solid ${statusConfig.icon}"></i> ${statusConfig.label}
                        </span>
                    </td>
                    <td>
                        ${actionButtons}
                    </td>
                </tr>
            `;
        });

        tbody.innerHTML = html;
        this.attachViolationTableListeners();
    }

    attachViolationTableListeners() {
        // Mark Paid quick button
        document.querySelectorAll('.btn-mark-paid').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.currentTarget.getAttribute('data-id');
                const v = this.fundManager.getViolation(id);
                if (v) {
                    this.openPayDebtModal(v.studentId, v.amount, [v.id]);
                }
            });
        });

        // View Receipt button
        document.querySelectorAll('.btn-view-receipt').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.currentTarget.getAttribute('data-id');
                const v = this.fundManager.getViolation(id);
                if (v) {
                    this.openReceiptModalForViolation(v);
                }
            });
        });

        // Edit Violation
        document.querySelectorAll('.btn-edit-violation').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.currentTarget.getAttribute('data-id');
                this.openEditViolationModal(id);
            });
        });

        // Delete Violation
        document.querySelectorAll('.btn-delete-violation').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.currentTarget.getAttribute('data-id');
                if (confirm('Bß║ín c├│ chß║»c chß║»n muß╗æn x├│a bß║ún ghi vi phß║ím n├áy?')) {
                    this.fundManager.deleteViolation(id);
                    this.renderAll();
                }
            });
        });

        // Click student name to open their profile ledger
        document.querySelectorAll('.student-cell, .student-name-link').forEach(el => {
            el.addEventListener('click', (e) => {
                const cell = e.currentTarget.closest('.student-cell');
                const stId = cell ? cell.getAttribute('data-student-id') : null;
                if (stId) {
                    this.openStudentLedgerModal(stId);
                }
            });
        });
    }

    // ==========================================
    // TAB 3: STUDENT PROFILES & LEDGERS
    // ==========================================
    renderStudents() {
        this.renderStudentsGrid();
    }

    renderStudentsGrid() {
        const grid = document.getElementById('fund-students-grid');
        if (!grid) return;

        let students = this.studentManager.getAll();

        if (this.studentFilterSearch.trim()) {
            const q = this.studentFilterSearch.toLowerCase().trim();
            students = students.filter(s => s.name.toLowerCase().includes(q) || (s.role && s.role.toLowerCase().includes(q)));
        }

        if (students.length === 0) {
            grid.innerHTML = '<div class="col-span-full py-5 text-center text-muted">Kh├┤ng t├¼m thß║Ñy hß╗ìc sinh n├áo</div>';
            return;
        }

        let html = '';
        students.forEach(s => {
            const summary = this.fundManager.getStudentSummary(s.id);
            const hasDebt = summary.remainingAmount > 0;

            html += `
                <div class="fund-student-card ${hasDebt ? 'has-debt' : ''}" data-student-id="${s.id}">
                    <div class="student-card-top">
                        <div class="student-avatar-large">
                            <i class="fa-solid fa-user-graduate"></i>
                        </div>
                        <div class="student-main-info">
                            <h3 class="student-card-name">${s.name}</h3>
                            <span class="student-card-role">${s.role || 'Hß╗ìc sinh'}</span>
                        </div>
                        ${hasDebt ? `<span class="debt-badge">Nß╗ú ${this.fundManager.formatCurrency(summary.remainingAmount)}</span>` : '<span class="clear-badge">─É├ú nß╗Öp ─æß╗º</span>'}
                    </div>
                    
                    <div class="student-card-stats">
                        <div class="student-stat-item">
                            <span class="stat-label">Tß╗òng vi phß║ím</span>
                            <span class="stat-value"><b>${summary.totalViolations}</b> lß║ºn</span>
                        </div>
                        <div class="student-stat-item">
                            <span class="stat-label">Tß╗òng tiß╗ün phß║ít</span>
                            <span class="stat-value text-primary"><b>${this.fundManager.formatCurrency(summary.totalAmount)}</b></span>
                        </div>
                        <div class="student-stat-item">
                            <span class="stat-label">─É├ú nß╗Öp</span>
                            <span class="stat-value text-success"><b>${this.fundManager.formatCurrency(summary.paidAmount)}</b></span>
                        </div>
                        <div class="student-stat-item">
                            <span class="stat-label">C├▓n thiß║┐u</span>
                            <span class="stat-value ${hasDebt ? 'text-danger font-bold' : 'text-muted'}"><b>${this.fundManager.formatCurrency(summary.remainingAmount)}</b></span>
                        </div>
                    </div>

                    <div class="student-card-footer">
                        <button class="btn btn-sm btn-outline btn-view-profile w-100" data-student-id="${s.id}">
                            <i class="fa-solid fa-folder-open"></i> Xem chi tiß║┐t hß╗ô s╞í
                        </button>
                    </div>
                </div>
            `;
        });

        grid.innerHTML = html;

        // Attach click listeners to cards
        grid.querySelectorAll('.fund-student-card, .btn-view-profile').forEach(el => {
            el.addEventListener('click', (e) => {
                const stId = e.currentTarget.getAttribute('data-student-id') || e.currentTarget.closest('.fund-student-card').getAttribute('data-student-id');
                if (stId) {
                    this.openStudentLedgerModal(stId);
                }
            });
        });
    }

    openStudentLedgerModal(studentId) {
        const student = this.studentManager.getStudent(studentId);
        if (!student) return;

        const modal = document.getElementById('modal-student-ledger');
        if (!modal) return;

        const summary = this.fundManager.getStudentSummary(studentId);

        // Fill Student Header Info
        document.getElementById('ledger-student-name').textContent = student.name;
        document.getElementById('ledger-student-role').textContent = student.role || 'Hß╗ìc sinh lß╗¢p';
        
        // Fill KPI stats
        document.getElementById('ledger-stat-violations').textContent = `${summary.totalViolations} lß║ºn`;
        document.getElementById('ledger-stat-total').textContent = this.fundManager.formatCurrency(summary.totalAmount);
        document.getElementById('ledger-stat-paid').textContent = this.fundManager.formatCurrency(summary.paidAmount);
        document.getElementById('ledger-stat-remaining').textContent = this.fundManager.formatCurrency(summary.remainingAmount);

        // Fill action buttons in modal
        const payBtn = document.getElementById('btn-ledger-pay');
        if (payBtn) {
            if (summary.remainingAmount > 0 && this.fundManager.canCollectMoney()) {
                payBtn.style.display = 'inline-flex';
                payBtn.onclick = () => {
                    modal.classList.remove('show');
                    this.openPayDebtModal(studentId, summary.remainingAmount);
                };
            } else {
                payBtn.style.display = 'none';
            }
        }

        const addVioBtn = document.getElementById('btn-ledger-add-vio');
        if (addVioBtn) {
            addVioBtn.style.display = this.fundManager.canRecordViolation() ? 'inline-flex' : 'none';
            addVioBtn.onclick = () => {
                modal.classList.remove('show');
                this.openAddViolationModal(studentId);
            };
        }

        // Fill Timeline / History Table
        const historyTbody = document.getElementById('ledger-history-tbody');
        if (historyTbody) {
            if (summary.violations.length === 0) {
                historyTbody.innerHTML = '<tr><td colspan="5" class="text-center py-4 text-muted">Hß╗ìc sinh ch╞░a c├│ ghi nhß║¡n vi phß║ím n├áo!</td></tr>';
            } else {
                let html = '';
                summary.violations.forEach(v => {
                    const statusClass = v.status === 'paid' ? 'status-paid' : (v.status === 'unpaid' ? 'status-unpaid' : 'status-waived');
                    const statusLabel = v.status === 'paid' ? 'Γ£à ─É├ú nß╗Öp' : (v.status === 'unpaid' ? '≡ƒö┤ Ch╞░a nß╗Öp' : '≡ƒ¢í∩╕Å Miß╗àn/Hß╗ºy');
                    html += `
                        <tr>
                            <td><b>${this.fundManager.formatDateOnly(v.date)}</b></td>
                            <td><span class="badge-vio-type">${v.violationType}</span></td>
                            <td>${v.note || 'ΓÇô'}</td>
                            <td><b>${this.fundManager.formatCurrency(v.amount)}</b></td>
                            <td><span class="badge ${statusClass}">${statusLabel}</span></td>
                        </tr>
                    `;
                });
                historyTbody.innerHTML = html;
            }
        }

        modal.classList.add('show');
    }

    // ==========================================
    // TAB 4: DEBT TRACKING & COLLECTIONS
    // ==========================================
    renderDebts() {
        const debtListContainer = document.getElementById('debt-students-list');
        const debtSummaryTotal = document.getElementById('debt-summary-total');
        const debtSummaryCount = document.getElementById('debt-summary-count');

        if (!debtListContainer) return;

        const debtors = this.fundManager.getAllStudentsWithDebt();
        const totalDebt = debtors.reduce((sum, d) => sum + d.remainingAmount, 0);

        if (debtSummaryTotal) debtSummaryTotal.textContent = this.fundManager.formatCurrency(totalDebt);
        if (debtSummaryCount) debtSummaryCount.textContent = `${debtors.length} hß╗ìc sinh`;

        if (debtors.length === 0) {
            debtListContainer.innerHTML = `
                <div class="empty-debt-state">
                    <i class="fa-solid fa-circle-check text-success" style="font-size: 3rem; margin-bottom: 12px;"></i>
                    <h3>Tuyß╗çt vß╗¥i! Kh├┤ng c├│ hß╗ìc sinh n├áo nß╗ú tiß╗ün quß╗╣</h3>
                    <p class="text-muted">Tß║Ñt cß║ú c├íc khoß║ún phß║ít vi phß║ím ─æ├ú ─æ╞░ß╗úc ho├án th├ánh ─æß║ºy ─æß╗º.</p>
                </div>
            `;
        } else {
            let html = '';
            debtors.forEach((d, idx) => {
                html += `
                    <div class="debt-card">
                        <div class="debt-rank">#${idx + 1}</div>
                        <div class="debt-student-info">
                            <h4 class="debt-student-name">${d.name} <span class="debt-student-role">${d.role || ''}</span></h4>
                            <div class="debt-student-meta">
                                <span><i class="fa-solid fa-triangle-exclamation text-danger"></i> ${d.unpaidCount} khoß║ún ch╞░a nß╗Öp</span>
                                <span><i class="fa-solid fa-clock-rotate-left"></i> Tß╗òng phß║ít: ${this.fundManager.formatCurrency(d.totalAmount)}</span>
                            </div>
                        </div>
                        <div class="debt-amount-box">
                            <span class="debt-label">Sß╗æ tiß╗ün c├▓n thiß║┐u</span>
                            <b class="debt-value">${this.fundManager.formatCurrency(d.remainingAmount)}</b>
                        </div>
                        <div class="debt-action">
                            ${this.fundManager.canCollectMoney() ? `
                                <button class="btn btn-primary btn-sm btn-collect-debt" data-student-id="${d.student.id}" data-amount="${d.remainingAmount}">
                                    <i class="fa-solid fa-check-circle"></i> ─É├ính dß║Ñu ─æ├ú nß╗Öp
                                </button>
                            ` : '<span class="badge badge-unpaid">Ch╞░a ho├án th├ánh</span>'}
                        </div>
                    </div>
                `;
            });
            debtListContainer.innerHTML = html;

            debtListContainer.querySelectorAll('.btn-collect-debt').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const stId = e.currentTarget.getAttribute('data-student-id');
                    const amount = e.currentTarget.getAttribute('data-amount');
                    this.openPayDebtModal(stId, amount);
                });
            });
        }

        // Render Transaction History in tab
        this.renderPaymentHistory();
    }

    renderPaymentHistory() {
        const tbody = document.getElementById('payment-history-tbody');
        if (!tbody) return;

        const payments = this.fundManager.getAllPayments();
        if (payments.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center py-4 text-muted">Ch╞░a c├│ giao dß╗ïch thu tiß╗ün n├áo</td></tr>';
            return;
        }

        let html = '';
        payments.forEach(p => {
            html += `
                <tr>
                    <td><b class="text-primary">${p.receiptNumber}</b></td>
                    <td>${this.fundManager.formatDateTime(p.date)}</td>
                    <td><b>${p.studentName}</b></td>
                    <td><b class="text-success">+${this.fundManager.formatCurrency(p.amount)}</b></td>
                    <td><span class="badge badge-method">${p.method || 'Tiß╗ün mß║╖t'}</span></td>
                    <td>${p.collector}</td>
                    <td>
                        <button class="btn-action btn-action-receipt btn-view-receipt-obj" data-id="${p.id}" title="Xem & In phiß║┐u thu">
                            <i class="fa-solid fa-receipt"></i> Phiß║┐u thu
                        </button>
                    </td>
                </tr>
            `;
        });
        tbody.innerHTML = html;

        tbody.querySelectorAll('.btn-view-receipt-obj').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.currentTarget.getAttribute('data-id');
                const payment = this.fundManager.getPaymentById(id);
                if (payment) {
                    this.openReceiptModal(payment);
                }
            });
        });
    }

    // ==========================================
    // TAB 5: RULES CONFIGURATION
    // ==========================================
    renderRules() {
        const tbody = document.getElementById('rules-tbody');
        if (!tbody) return;

        const rules = this.fundManager.getRules();
        let html = '';
        rules.forEach(r => {
            html += `
                <tr data-id="${r.id}">
                    <td>
                        <div class="rule-title-cell">
                            <i class="fa-solid ${r.icon || 'fa-triangle-exclamation'} text-primary"></i>
                            <b>${r.name}</b>
                        </div>
                    </td>
                    <td><span class="badge badge-category">${r.category || 'Nß╗ü nß║┐p'}</span></td>
                    <td><b class="text-amount">${this.fundManager.formatCurrency(r.amount)}</b></td>
                    <td>
                        ${this.fundManager.canEditRules() ? `
                            <div class="table-actions">
                                <button class="btn-action btn-action-edit btn-edit-rule" data-id="${r.id}" title="Chß╗ënh sß╗¡a mß╗⌐c phß║ít">
                                    <i class="fa-solid fa-pen"></i> Sß╗¡a
                                </button>
                                <button class="btn-action btn-action-danger btn-delete-rule" data-id="${r.id}" title="X├│a">
                                    <i class="fa-solid fa-trash"></i>
                                </button>
                            </div>
                        ` : '<span class="text-muted">ΓÇô</span>'}
                    </td>
                </tr>
            `;
        });
        tbody.innerHTML = html;

        tbody.querySelectorAll('.btn-edit-rule').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.currentTarget.getAttribute('data-id');
                this.openEditRuleModal(id);
            });
        });

        tbody.querySelectorAll('.btn-delete-rule').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.currentTarget.getAttribute('data-id');
                if (confirm('Bß║ín c├│ chß║»c muß╗æn x├│a loß║íi mß╗⌐c phß║ít n├áy?')) {
                    this.fundManager.deleteRule(id);
                    this.renderRules();
                    this.populateViolationTypeDropdowns();
                }
            });
        });
    }

    // ==========================================
    // TAB 6: AUDIT LOGS
    // ==========================================
    renderAuditLogs() {
        const stream = document.getElementById('audit-log-stream');
        if (!stream) return;

        const logs = this.fundManager.getAllAuditLogs();
        if (logs.length === 0) {
            stream.innerHTML = '<p class="text-center text-muted py-4"><i class="fa-solid fa-inbox"></i> Ch╞░a c├│ nhß║¡t k├╜ hoß║ít ─æß╗Öng n├áo</p>';
            return;
        }

        const canEdit = this.fundManager.canEdit();
        let html = '<div class="timeline-container">';
        logs.forEach(log => {
            html += `
                <div class="timeline-item">
                    <div class="timeline-marker"></div>
                    <div class="timeline-content">
                        <div class="timeline-header">
                            <span class="timeline-user"><i class="fa-solid fa-user-shield"></i> ${log.user}</span>
                            <span class="timeline-badge">${log.action}</span>
                            <span class="timeline-time">${this.fundManager.formatDateTime(log.timestamp)}</span>
                            ${canEdit ? `
                                <div class="timeline-actions">
                                    <button class="btn-delete-log" data-id="${log.id}" title="X├│a d├▓ng nhß║¡t k├╜ n├áy">
                                        <i class="fa-solid fa-trash-can"></i>
                                    </button>
                                </div>
                            ` : ''}
                        </div>
                        <div class="timeline-body">${log.details}</div>
                    </div>
                </div>
            `;
        });
        html += '</div>';
        stream.innerHTML = html;

        if (canEdit) {
            stream.querySelectorAll('.btn-delete-log').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const id = e.currentTarget.getAttribute('data-id');
                    if (confirm('X├│a bß║ún ghi nhß║¡t k├╜ hoß║ít ─æß╗Öng n├áy?')) {
                        this.fundManager.deleteAuditLog(id);
                        this.renderAuditLogs();
                    }
                });
            });
        }
    }

    // ==========================================
    // MODALS SETUP & ACTIONS
    // ==========================================
    setupModals() {
        // Modal Add Violation
        const btnOpenAddVio = document.getElementById('btn-open-add-violation');
        if (btnOpenAddVio) {
            btnOpenAddVio.addEventListener('click', () => {
                this.openAddViolationModal();
            });
        }

        // Auto populate fine amount when selecting violation type
        const selectVioType = document.getElementById('input-vio-type');
        const inputVioAmount = document.getElementById('input-vio-amount');
        if (selectVioType && inputVioAmount) {
            selectVioType.addEventListener('change', (e) => {
                const selectedOpt = selectVioType.options[selectVioType.selectedIndex];
                const amt = selectedOpt.getAttribute('data-amount');
                if (amt) inputVioAmount.value = amt;
            });
        }

        // Save Violation Form
        const btnSaveVio = document.getElementById('btn-save-violation');
        if (btnSaveVio) {
            btnSaveVio.addEventListener('click', () => {
                this.handleSaveViolation();
            });
        }

        // Save Payment Form (Thu tiß╗ün nß╗ú)
        const btnConfirmPay = document.getElementById('btn-confirm-payment');
        if (btnConfirmPay) {
            btnConfirmPay.addEventListener('click', () => {
                this.handleConfirmPayment();
            });
        }

        // Modal Add Rule
        const btnOpenAddRule = document.getElementById('btn-open-add-rule');
        if (btnOpenAddRule) {
            btnOpenAddRule.addEventListener('click', () => {
                this.openAddRuleModal();
            });
        }

        const btnSaveRule = document.getElementById('btn-save-rule');
        if (btnSaveRule) {
            btnSaveRule.addEventListener('click', () => {
                this.handleSaveRule();
            });
        }

        // Print Receipt Button
        const btnPrintReceipt = document.getElementById('btn-print-receipt');
        if (btnPrintReceipt) {
            btnPrintReceipt.addEventListener('click', () => {
                window.print();
            });
        }

        // Auth Login Form Handlers
        const btnAuthSubmit = document.getElementById('btn-auth-submit');
        if (btnAuthSubmit) {
            btnAuthSubmit.addEventListener('click', () => {
                this.handleAuthSubmit();
            });
        }

        const authPassInput = document.getElementById('auth-password');
        if (authPassInput) {
            authPassInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    this.handleAuthSubmit();
                }
            });
        }

        // Data Reset / Setup for New School Year Handlers
        const btnClearFund = document.getElementById('btn-clear-fund-data');
        if (btnClearFund) {
            btnClearFund.addEventListener('click', () => {
                if (!this.fundManager.canEdit()) {
                    alert('Bß║ín cß║ºn ─æ─âng nhß║¡p quyß╗ün Admin ─æß╗â thß╗▒c hiß╗çn thao t├íc n├áy!');
                    return;
                }
                const confirmClear = confirm('Cß║óNH B├üO: Bß║ín c├│ chß║»c chß║»n muß╗æn X├ôA TO├ÇN Bß╗ÿ vi phß║ím & giao dß╗ïch quß╗╣ vß╗ü 0─æ ─æß╗â bß║»t ─æß║ºu n─âm hß╗ìc mß╗¢i 2026-2027?\n\n(Danh s├ích hß╗ìc sinh v├á Bß║úng quy ─æß╗ïnh mß╗⌐c phß║ít vß║½n ─æ╞░ß╗úc giß╗» nguy├¬n).');
                if (confirmClear) {
                    this.fundManager.clearAllFundData();
                    this.renderAll();
                    alert('─É├ú dß╗ìn sß║ích dß╗» liß╗çu quß╗╣ vß╗ü 0─æ th├ánh c├┤ng!');
                }
            });
        }

        const btnRestoreFund = document.getElementById('btn-restore-fund-data');
        if (btnRestoreFund) {
            btnRestoreFund.addEventListener('click', () => {
                if (!this.fundManager.canEdit()) {
                    alert('Bß║ín cß║ºn ─æ─âng nhß║¡p quyß╗ün Quß║ún trß╗ï vi├¬n ─æß╗â thß╗▒c hiß╗çn thao t├íc n├áy!');
                    return;
                }
                if (confirm('Kh├┤i phß╗Ñc lß║íi dß╗» liß╗çu vi phß║ím mß║½u thß╗¡ nghiß╗çm ban ─æß║ºu?')) {
                    this.fundManager.restoreSampleData();
                    this.renderAll();
                    alert('─É├ú nß║íp lß║íi dß╗» liß╗çu vi phß║ím mß║½u th├ánh c├┤ng!');
                }
            });
        }

        // Clear All Audit Logs Handler
        const btnClearAudit = document.getElementById('btn-clear-audit-logs');
        if (btnClearAudit) {
            btnClearAudit.addEventListener('click', () => {
                if (!this.fundManager.canEdit()) {
                    alert('Bß║ín cß║ºn ─æ─âng nhß║¡p quyß╗ün Quß║ún trß╗ï vi├¬n ─æß╗â thß╗▒c hiß╗çn thao t├íc n├áy!');
                    return;
                }
                if (confirm('Bß║ín c├│ chß║»c chß║»n muß╗æn X├ôA TO├ÇN Bß╗ÿ nhß║¡t k├╜ hoß║ít ─æß╗Öng kh├┤ng?')) {
                    this.fundManager.clearAuditLogs();
                    this.renderAuditLogs();
                    alert('─É├ú x├│a sß║ích to├án bß╗Ö nhß║¡t k├╜ hoß║ít ─æß╗Öng!');
                }
            });
        }

        // Close Auth Modal cancel handler
        const modalAuth = document.getElementById('modal-auth-login');
        if (modalAuth) {
            modalAuth.querySelectorAll('.close-modal').forEach(btn => {
                btn.addEventListener('click', () => {
                    if (!this.fundManager.isAuthenticated) {
                        const roleSelect = document.getElementById('user-role-select');
                        if (roleSelect) roleSelect.value = this.fundManager.getRole();
                    }
                });
            });
        }
    }

    openAddViolationModal(presetStudentId = null) {
        const modal = document.getElementById('modal-add-violation');
        if (!modal) return;

        this.populateRoleStudentOptions();
        this.populateViolationTypeDropdowns();

        const studentSelect = document.getElementById('input-vio-student');
        const dateInput = document.getElementById('input-vio-date');
        const typeSelect = document.getElementById('input-vio-type');
        const amountInput = document.getElementById('input-vio-amount');
        const noteInput = document.getElementById('input-vio-note');
        const recorderInput = document.getElementById('input-vio-recorder');
        const statusSelect = document.getElementById('input-vio-status');

        if (presetStudentId && studentSelect) {
            studentSelect.value = presetStudentId;
        } else if (studentSelect) {
            studentSelect.value = '';
        }

        if (dateInput) {
            const now = new Date();
            const pad = n => String(n).padStart(2, '0');
            dateInput.value = `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
        }

        if (typeSelect) typeSelect.value = '';
        if (amountInput) amountInput.value = '10000';
        if (noteInput) noteInput.value = '';
        if (recorderInput) recorderInput.value = this.fundManager.currentUser;
        if (statusSelect) statusSelect.value = 'unpaid';

        modal.classList.add('show');
    }

    handleSaveViolation() {
        const studentSelect = document.getElementById('input-vio-student');
        const dateInput = document.getElementById('input-vio-date');
        const typeSelect = document.getElementById('input-vio-type');
        const amountInput = document.getElementById('input-vio-amount');
        const noteInput = document.getElementById('input-vio-note');
        const recorderInput = document.getElementById('input-vio-recorder');
        const statusSelect = document.getElementById('input-vio-status');

        if (!studentSelect.value) {
            alert('Vui l├▓ng chß╗ìn hß╗ìc sinh vi phß║ím!');
            return;
        }
        if (!typeSelect.value) {
            alert('Vui l├▓ng chß╗ìn loß║íi vi phß║ím!');
            return;
        }

        const student = this.studentManager.getStudent(studentSelect.value);
        const studentName = student ? student.name : 'Hß╗ìc sinh';

        this.fundManager.addViolation({
            studentId: studentSelect.value,
            studentName: studentName,
            date: dateInput.value ? new Date(dateInput.value).toISOString() : new Date().toISOString(),
            violationType: typeSelect.value,
            amount: Number(amountInput.value) || 0,
            note: noteInput.value.trim(),
            recorder: recorderInput.value.trim() || this.fundManager.currentUser,
            status: statusSelect.value || 'unpaid'
        });

        document.getElementById('modal-add-violation').classList.remove('show');
        this.renderAll();
    }

    openEditViolationModal(id) {
        const v = this.fundManager.getViolation(id);
        if (!v) return;

        const modal = document.getElementById('modal-edit-violation');
        if (!modal) return;

        document.getElementById('edit-vio-id').value = v.id;
        document.getElementById('edit-vio-student-name').textContent = v.studentName;
        document.getElementById('edit-vio-type').value = v.violationType;
        document.getElementById('edit-vio-amount').value = v.amount;
        document.getElementById('edit-vio-note').value = v.note || '';
        document.getElementById('edit-vio-recorder').value = v.recorder;
        document.getElementById('edit-vio-status').value = v.status;

        const btnUpdate = document.getElementById('btn-update-violation');
        btnUpdate.onclick = () => {
            this.fundManager.updateViolation(v.id, {
                violationType: document.getElementById('edit-vio-type').value,
                amount: Number(document.getElementById('edit-vio-amount').value) || 0,
                note: document.getElementById('edit-vio-note').value.trim(),
                recorder: document.getElementById('edit-vio-recorder').value.trim(),
                status: document.getElementById('edit-vio-status').value
            });
            modal.classList.remove('show');
            this.renderAll();
        };

        modal.classList.add('show');
    }

    openPayDebtModal(studentId, defaultAmount, violationIds = []) {
        const student = this.studentManager.getStudent(studentId);
        const modal = document.getElementById('modal-collect-payment');
        if (!modal) return;

        document.getElementById('pay-student-id').value = studentId;
        document.getElementById('pay-student-name').textContent = student ? student.name : 'Hß╗ìc sinh';
        
        const amountInput = document.getElementById('pay-amount-input');
        if (amountInput) amountInput.value = defaultAmount || 0;

        const dateInput = document.getElementById('pay-date-input');
        if (dateInput) {
            const now = new Date();
            const pad = n => String(n).padStart(2, '0');
            dateInput.value = `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}`;
        }

        const collectorInput = document.getElementById('pay-collector-input');
        if (collectorInput) collectorInput.value = this.fundManager.currentUser;

        modal.classList.add('show');
    }

    handleConfirmPayment() {
        const studentId = document.getElementById('pay-student-id').value;
        const amount = Number(document.getElementById('pay-amount-input').value) || 0;
        const date = document.getElementById('pay-date-input').value;
        const method = document.getElementById('pay-method-select').value;
        const collector = document.getElementById('pay-collector-input').value;
        const note = document.getElementById('pay-note-input').value;

        if (amount <= 0) {
            alert('Vui l├▓ng nhß║¡p sß╗æ tiß╗ün hß╗úp lß╗ç lß╗¢n h╞ín 0!');
            return;
        }

        const res = this.fundManager.collectStudentDebt(studentId, {
            amount,
            date: date ? new Date(date).toISOString() : new Date().toISOString(),
            method,
            collector: collector.trim() || this.fundManager.currentUser,
            note: note.trim()
        });

        if (res.success) {
            document.getElementById('modal-collect-payment').classList.remove('show');
            this.renderAll();
            // Show receipt immediately
            this.openReceiptModal(res.receipt);
        } else {
            alert(res.message || 'Lß╗ùi khi thu tiß╗ün!');
        }
    }

    openReceiptModal(receipt) {
        const modal = document.getElementById('modal-receipt');
        if (!modal || !receipt) return;

        document.getElementById('receipt-number').textContent = receipt.receiptNumber;
        document.getElementById('receipt-date').textContent = this.fundManager.formatDateTime(receipt.date);
        document.getElementById('receipt-student-name').textContent = receipt.studentName;
        document.getElementById('receipt-method').textContent = receipt.method || 'Tiß╗ün mß║╖t';
        document.getElementById('receipt-total-amount').textContent = this.fundManager.formatCurrency(receipt.amount);
        document.getElementById('receipt-collector-name').textContent = receipt.collector;
        document.getElementById('receipt-note').textContent = receipt.note || 'Nß╗Öp tiß╗ün quß╗╣ phß║ít vi phß║ím nß╗ü nß║┐p';

        const itemsTbody = document.getElementById('receipt-items-tbody');
        if (itemsTbody) {
            let html = '';
            if (receipt.items && receipt.items.length > 0) {
                receipt.items.forEach((item, idx) => {
                    html += `
                        <tr>
                            <td>${idx + 1}</td>
                            <td>${item.type}</td>
                            <td class="text-end"><b>${this.fundManager.formatCurrency(item.amount)}</b></td>
                        </tr>
                    `;
                });
            } else {
                html = `
                    <tr>
                        <td>1</td>
                        <td>${receipt.note || 'Thu tiß╗ün phß║ít nß╗ü nß║┐p'}</td>
                        <td class="text-end"><b>${this.fundManager.formatCurrency(receipt.amount)}</b></td>
                    </tr>
                `;
            }
            itemsTbody.innerHTML = html;
        }

        modal.classList.add('show');
    }

    openReceiptModalForViolation(violation) {
        const fakeReceipt = {
            receiptNumber: 'BL-VIO-' + violation.id.replace('vio_', ''),
            date: violation.paidDate || violation.date,
            studentName: violation.studentName,
            method: violation.paymentMethod || 'Tiß╗ün mß║╖t',
            amount: violation.paidAmount || violation.amount,
            collector: violation.collector || 'Lß╗¢p tr╞░ß╗ƒng',
            note: `Thanh to├ín lß╗ùi: ${violation.violationType} (${violation.note || '─É├ú ho├án th├ánh'})`,
            items: [
                { type: violation.violationType, amount: violation.amount }
            ]
        };
        this.openReceiptModal(fakeReceipt);
    }

    openAddRuleModal() {
        const modal = document.getElementById('modal-add-rule');
        if (!modal) return;

        const titleEl = document.getElementById('modal-rule-title');
        const idInput = document.getElementById('input-rule-id');
        const nameInput = document.getElementById('input-rule-name');
        const amountInput = document.getElementById('input-rule-amount');
        const catInput = document.getElementById('input-rule-category');

        if (titleEl) titleEl.innerHTML = '<i class="fa-solid fa-gavel text-primary"></i> Th├¬m Quy ─Éß╗ïnh Mß╗⌐c Phß║ít';
        if (idInput) idInput.value = '';
        if (nameInput) nameInput.value = '';
        if (amountInput) amountInput.value = '10000';
        if (catInput) catInput.value = 'Nß╗ü nß║┐p';

        modal.classList.add('show');
    }

    openEditRuleModal(ruleId) {
        const rule = this.fundManager.getRules().find(r => r.id === ruleId);
        if (!rule) return;

        const modal = document.getElementById('modal-add-rule');
        if (!modal) return;

        const titleEl = document.getElementById('modal-rule-title');
        const idInput = document.getElementById('input-rule-id');
        const nameInput = document.getElementById('input-rule-name');
        const amountInput = document.getElementById('input-rule-amount');
        const catInput = document.getElementById('input-rule-category');

        if (titleEl) titleEl.innerHTML = '<i class="fa-solid fa-pen-to-square text-primary"></i> Chß╗ënh Sß╗¡a Quy ─Éß╗ïnh Mß╗⌐c Phß║ít';
        if (idInput) idInput.value = rule.id;
        if (nameInput) nameInput.value = rule.name;
        if (amountInput) amountInput.value = rule.amount;
        if (catInput) catInput.value = rule.category || 'Nß╗ü nß║┐p';

        modal.classList.add('show');
    }

    handleSaveRule() {
        const idInput = document.getElementById('input-rule-id');
        const ruleId = idInput ? idInput.value : '';
        const name = document.getElementById('input-rule-name').value.trim();
        const amount = Number(document.getElementById('input-rule-amount').value) || 0;
        const category = document.getElementById('input-rule-category').value.trim();

        if (!name) {
            alert('Vui l├▓ng nhß║¡p t├¬n loß║íi lß╗ùi vi phß║ím!');
            return;
        }

        if (ruleId) {
            this.fundManager.updateRule(ruleId, name, amount, category);
        } else {
            this.fundManager.addRule(name, amount, category);
        }

        const modal = document.getElementById('modal-add-rule');
        if (modal) modal.classList.remove('show');
        this.renderRules();
        this.populateViolationTypeDropdowns();
    }
}
