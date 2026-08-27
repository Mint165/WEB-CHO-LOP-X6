class AdminManager {
    constructor() {
        this.isAdmin = false;
        this.settings = {
            require_password: true,
            hide_phones: false,
            hide_tabs: false
        };
        
        // Modal elements
        this.modalUnlock = document.getElementById('modal-unlock');
        this.modalDashboard = document.getElementById('modal-admin-dashboard');
        
        // Buttons
        this.btnUnlock = document.getElementById('btn-admin-unlock');
        this.btnSubmitUnlock = document.getElementById('btn-submit-unlock');
        this.btnLogout = document.getElementById('btn-admin-logout');
        
        // Inputs
        this.inputPassword = document.getElementById('input-admin-password');
        this.errorMsg = document.getElementById('unlock-error');
        
        // Toggles
        this.toggleRequirePassword = document.getElementById('toggle-require-password');
        this.toggleHidePhones = document.getElementById('toggle-hide-phones');
        this.toggleHideTabs = document.getElementById('toggle-hide-tabs');

        this.adminEmail = 'admin@lop12-6.com';
    }

    async init() {
        // Load initial session
        const { data: { session } } = await window.supabaseClient.auth.getSession();
        this.updateAdminState(session !== null);

        // Listen for auth changes
        window.supabaseClient.auth.onAuthStateChange((event, session) => {
            this.updateAdminState(session !== null);
        });

        this.setupEventListeners();
    }

    updateAdminState(isAdmin) {
        this.isAdmin = isAdmin;
        
        const titleEl = document.getElementById('chart-main-title');
        const teacherEl = document.getElementById('chart-teacher-info');

        if (isAdmin || !this.settings.require_password) {
            document.body.classList.add('is-admin');
            if (this.btnUnlock) {
                this.btnUnlock.innerHTML = '<i class="fa-solid fa-lock-open"></i>';
                this.btnUnlock.title = "Bảng Điều Khiển Admin (Đang mở khóa)";
            }
            if (titleEl) titleEl.setAttribute('contenteditable', 'true');
            if (teacherEl) teacherEl.setAttribute('contenteditable', 'true');
        } else {
            document.body.classList.remove('is-admin');
            if (this.btnUnlock) {
                this.btnUnlock.innerHTML = '<i class="fa-solid fa-lock"></i>';
                this.btnUnlock.title = "Đăng nhập Admin (Đang khóa)";
            }
            if (titleEl) titleEl.removeAttribute('contenteditable');
            if (teacherEl) teacherEl.removeAttribute('contenteditable');
        }
    }

    applySettings(settingsData) {
        if (!settingsData) return;
        
        if (settingsData.require_password !== undefined) {
            this.settings.require_password = settingsData.require_password;
            if (this.toggleRequirePassword) this.toggleRequirePassword.checked = this.settings.require_password;
        }
        
        if (settingsData.hide_phones !== undefined) {
            this.settings.hide_phones = settingsData.hide_phones;
            if (this.toggleHidePhones) this.toggleHidePhones.checked = this.settings.hide_phones;
            if (this.settings.hide_phones) {
                document.body.classList.add('hide-phones');
            } else {
                document.body.classList.remove('hide-phones');
            }
        }

        if (settingsData.hidden_tabs && Array.isArray(settingsData.hidden_tabs)) {
            this.settings.hide_tabs = settingsData.hidden_tabs.includes('page-student-info');
            if (this.toggleHideTabs) this.toggleHideTabs.checked = this.settings.hide_tabs;
            
            if (this.settings.hide_tabs) {
                document.body.classList.add('hide-tabs');
                // If currently on info page, switch back to seating
                const infoPage = document.getElementById('page-student-info');
                if (infoPage && infoPage.style.display !== 'none' && infoPage.classList.contains('active-page')) {
                    document.querySelector('.nav-link[data-page="page-seating"]').click();
                }
            } else {
                document.body.classList.remove('hide-tabs');
            }
        }
        
        // Re-evaluate admin state based on new require_password setting
        this.updateAdminState(this.isAdmin);
    }

    setupEventListeners() {
        if (!this.btnUnlock) return;

        // Open unlock or dashboard modal
        this.btnUnlock.addEventListener('click', () => {
            if (this.isAdmin) {
                if (this.modalDashboard) this.modalDashboard.classList.add('show');
            } else {
                if (this.modalUnlock) {
                    this.inputPassword.value = '';
                    this.errorMsg.style.display = 'none';
                    this.modalUnlock.classList.add('show');
                    setTimeout(() => this.inputPassword.focus(), 100);
                }
            }
        });

        // Handle Unlock Submit
        const submitLogin = async () => {
            const password = this.inputPassword.value;
            if (!password) return;
            
            this.btnSubmitUnlock.disabled = true;
            this.btnSubmitUnlock.textContent = 'Đang kiểm tra...';
            
            const { data, error } = await window.supabaseClient.auth.signInWithPassword({
                email: this.adminEmail,
                password: password
            });

            this.btnSubmitUnlock.disabled = false;
            this.btnSubmitUnlock.textContent = 'Mở Khóa';

            if (error) {
                this.errorMsg.style.display = 'block';
            } else {
                this.modalUnlock.classList.remove('show');
                if (this.modalDashboard) {
                    this.modalDashboard.classList.add('show');
                }
            }
        };

        if (this.btnSubmitUnlock) {
            this.btnSubmitUnlock.addEventListener('click', submitLogin);
        }

        if (this.inputPassword) {
            this.inputPassword.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') submitLogin();
            });
        }

        // Handle Change Password in Dashboard
        const inputNewPassword = document.getElementById('input-new-admin-password');
        const btnChangePassword = document.getElementById('btn-change-admin-password');
        const changePwdStatus = document.getElementById('change-pwd-status');

        if (btnChangePassword && inputNewPassword) {
            btnChangePassword.addEventListener('click', async () => {
                const newPassword = inputNewPassword.value.trim();
                if (!newPassword || newPassword.length < 6) {
                    if (changePwdStatus) {
                        changePwdStatus.style.display = 'block';
                        changePwdStatus.style.color = 'var(--danger-color)';
                        changePwdStatus.textContent = 'Mật khẩu phải có ít nhất 6 ký tự!';
                    }
                    return;
                }

                btnChangePassword.disabled = true;
                btnChangePassword.textContent = 'Đang lưu...';

                const { data, error } = await window.supabaseClient.auth.updateUser({
                    password: newPassword
                });

                btnChangePassword.disabled = false;
                btnChangePassword.textContent = 'Lưu mật khẩu';

                if (changePwdStatus) {
                    changePwdStatus.style.display = 'block';
                    if (error) {
                        changePwdStatus.style.color = 'var(--danger-color)';
                        changePwdStatus.textContent = 'Lỗi: ' + error.message;
                    } else {
                        changePwdStatus.style.color = 'var(--success-color, #10b981)';
                        changePwdStatus.textContent = 'Đã đổi mật khẩu thành công!';
                        inputNewPassword.value = '';
                    }
                }
            });
        }

        // Handle Logout
        if (this.btnLogout) {
            this.btnLogout.addEventListener('click', async () => {
                await window.supabaseClient.auth.signOut();
                if (this.modalDashboard) this.modalDashboard.classList.remove('show');
            });
        }

        // Toggles in Dashboard
        const updateSettings = async (updates) => {
            if (!this.isAdmin) return;
            try {
                const { error } = await window.supabaseClient.from('classroom_settings')
                    .update(updates)
                    .eq('id', 'lop-x6');
                
                if (error) {
                    console.error('Lỗi khi lưu cài đặt:', error);
                    alert('Lỗi lưu cài đặt');
                }
            } catch (err) {
                console.error(err);
            }
        };

        if (this.toggleRequirePassword) {
            this.toggleRequirePassword.addEventListener('change', (e) => {
                updateSettings({ require_password: e.target.checked });
            });
        }

        if (this.toggleHidePhones) {
            this.toggleHidePhones.addEventListener('change', (e) => {
                updateSettings({ hide_phones: e.target.checked });
            });
        }

        if (this.toggleHideTabs) {
            this.toggleHideTabs.addEventListener('change', (e) => {
                const tabs = e.target.checked ? ['page-student-info'] : [];
                updateSettings({ hidden_tabs: tabs });
            });
        }
    }
}
