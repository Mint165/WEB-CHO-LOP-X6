/**
 * Main Application Logic
 */
document.addEventListener('DOMContentLoaded', async () => {
    // Load Supabase on demand so this integration does not require editing the HTML shell.
    if (!window.supabase) {
        await new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
            script.onload = resolve;
            script.onerror = () => reject(new Error('Không thể tải Supabase'));
            document.head.appendChild(script);
        });
    }

    window.supabaseClient = window.supabaseClient || window.supabase.createClient(
        'https://uiovckfbifsuswevfnir.supabase.co',
        'sb_publishable_iGzyoOJ2aqSxeL9pNRCYUw_R9T3XBrn',
        { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } }
    );
    const supabaseClient = window.supabaseClient;
    // 1. Initialize Managers
    const studentManager = new StudentManager(typeof sampleStudents !== 'undefined' ? sampleStudents : []);
    studentManager.init();

    const seatingGrid = new SeatingGrid('grid-container', 4, 6, 2);
    seatingGrid.renderEmptyGrid();

    const dragDropManager = new DragDropManager(studentManager, seatingGrid);
    dragDropManager.init();

    const exporterManager = new ExporterManager('capture-area');

    // 1.5 Routing Logic
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetPage = link.getAttribute('data-page');
            
            // Update active link
            document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
            link.classList.add('active');
            
            // Update active page
            document.querySelectorAll('.page-view').forEach(page => {
                page.style.display = 'none';
                page.classList.remove('active-page');
            });
            const targetEl = document.getElementById(targetPage);
            targetEl.style.display = 'flex';
            targetEl.classList.add('active-page');

            if (targetPage === 'page-student-info') {
                renderStudentInfoTable();
            }
        });
    });

    // Helper to format date DD/MM/YYYY
    const formatDateVN = (dateStr) => {
        if (!dateStr) return '<span class="text-empty">Chưa có</span>';
        const parts = dateStr.split('-');
        if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
        return dateStr;
    };

    // 2. Global Render Function
    const renderStudentInfoTable = () => {
        const tbody = document.getElementById('student-info-tbody');
        const badge = document.getElementById('info-total-badge');
        const searchInput = document.getElementById('student-info-search');
        const query = searchInput ? searchInput.value.toLowerCase().trim() : '';

        if (!tbody) return;
        tbody.innerHTML = '';
        
        let allStudents = studentManager.getAllSorted();
        if (badge) badge.textContent = `${allStudents.length} học sinh`;

        const filtered = allStudents.filter(s => {
            if (!query) return true;
            return (s.fullName && s.fullName.toLowerCase().includes(query)) ||
                   (s.name && s.name.toLowerCase().includes(query)) ||
                   (s.role && s.role.toLowerCase().includes(query)) ||
                   (s.phone && s.phone.includes(query)) ||
                   (s.parentPhone && s.parentPhone.includes(query));
        });

        if (filtered.length === 0) {
            const tr = document.createElement('tr');
            tr.innerHTML = `<td colspan="6" style="text-align: center; padding: 32px; color: var(--text-muted);">Không tìm thấy học sinh nào phù hợp</td>`;
            tbody.appendChild(tr);
            return;
        }

        filtered.forEach((student, index) => {
            const tr = document.createElement('tr');
            const phoneHtml = student.phone || '<span class="text-empty">Chưa có</span>';
            const parentPhoneHtml = student.parentPhone || '<span class="text-empty">Chưa có</span>';

            const rawName = (student.fullName || student.name).trim();
            const titleCaseName = rawName.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');

            tr.innerHTML = `
                <td style="text-align: center; font-weight: 500; color: var(--text-muted);">${index + 1}</td>
                <td style="font-weight: 600;">${titleCaseName}</td>
                <td>${formatDateVN(student.dob)}</td>
                <td>${phoneHtml}</td>
                <td>${parentPhoneHtml}</td>
                <td>
                    <div class="table-actions">
                        <button class="btn-icon edit" data-id="${student.id}" title="Chỉnh sửa"><i class="fa-solid fa-pen"></i></button>
                        <button class="btn-icon delete" data-id="${student.id}" title="Xóa"><i class="fa-solid fa-trash"></i></button>
                    </div>
                </td>
            `;
            tbody.appendChild(tr);
        });

        // Add event listeners for edit and delete buttons in the table
        tbody.querySelectorAll('.btn-icon.edit').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = btn.getAttribute('data-id');
                document.dispatchEvent(new CustomEvent('app:edit-student', { detail: { studentId: id } }));
            });
        });

        tbody.querySelectorAll('.btn-icon.delete').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = btn.getAttribute('data-id');
                document.dispatchEvent(new CustomEvent('app:delete-student', { detail: { studentId: id, source: 'info-table' } }));
            });
        });
    };

    const renderAll = () => {
        seatingGrid.renderStudents(studentManager);
        
        const searchQuery = document.getElementById('search-input').value;
        seatingGrid.renderUnassigned(studentManager, searchQuery);

        // Also render the student info table if it's currently visible
        if (document.getElementById('page-student-info').classList.contains('active-page')) {
            renderStudentInfoTable();
        }
    };

    // Listen to info search box
    const infoSearchEl = document.getElementById('student-info-search');
    if (infoSearchEl) {
        infoSearchEl.addEventListener('input', renderStudentInfoTable);
    }

    // 3. Listen to state changes
    document.addEventListener('app:state-changed', renderAll);
    
    document.addEventListener('app:unassign', (e) => {
        studentManager.unassignSeat(e.detail.studentId);
        renderAll();
    });

    document.addEventListener('app:toggle-lock', (e) => {
        studentManager.toggleLock(e.detail.studentId);
        renderAll();
    });

    document.addEventListener('app:delete-student', (e) => {
        const isFromInfoPage = e.detail.source === 'info-table';
        const msg = isFromInfoPage 
            ? 'Bạn có chắc chắn muốn xóa vĩnh viễn học sinh này khỏi danh sách?' 
            : 'Bạn có muốn ẩn học sinh này khỏi sơ đồ lớp không? (Thông tin vẫn được giữ trong Danh sách)';
            
        if (confirm(msg)) {
            studentManager.removeStudent(e.detail.studentId, isFromInfoPage);
            renderAll();
        }
    });

    // 4. Toolbar Event Listeners
    document.getElementById('btn-randomize').addEventListener('click', () => {
        const lockedCount = studentManager.getAll().filter(s => s.isLocked && s.seatId).length;
        const msg = lockedCount > 0 
            ? `Xáo trộn chỗ ngồi ngẫu nhiên? (${lockedCount} học sinh có khóa 🔒 sẽ được giữ nguyên vị trí)`
            : 'Tự động xáo trộn vị trí chỗ ngồi ngẫu nhiên cho lớp?';
        if (confirm(msg)) {
            const allSeatIds = seatingGrid.getAllSeatIds();
            studentManager.randomizeSeats(allSeatIds);
            renderAll();
        }
    });

    document.getElementById('btn-rotate').addEventListener('click', () => {
        if (confirm('Đảo vị trí các tổ (Tổ 1 -> 2, 2 -> 3, 3 -> 4, 4 -> 1)?')) {
            const cols = seatingGrid.getColumnIds();
            studentManager.rotateColumns(cols);
            renderAll();
        }
    });

    document.getElementById('btn-clear').addEventListener('click', () => {
        if (confirm('Bạn có chắc chắn muốn đưa tất cả học sinh về danh sách chờ?')) {
            studentManager.clearAllSeats();
            renderAll();
        }
    });

    document.getElementById('btn-export-img').addEventListener('click', () => {
        exporterManager.exportToImage();
    });

    document.getElementById('btn-print').addEventListener('click', () => {
        exporterManager.print();
    });

    // 5. Sidebar Listeners (Search)
    document.getElementById('search-input').addEventListener('input', renderAll);

    // 5.1 Mobile Sidebar Toggle
    const sidebar = document.getElementById('app-sidebar');
    const sidebarBackdrop = document.getElementById('sidebar-backdrop');
    const btnToggleSidebar = document.getElementById('btn-toggle-sidebar');
    const btnCloseSidebar = document.getElementById('btn-close-sidebar');

    const toggleSidebar = (forceState) => {
        if (!sidebar || !sidebarBackdrop) return;
        const isOpen = forceState !== undefined ? forceState : !sidebar.classList.contains('open');
        sidebar.classList.toggle('open', isOpen);
        sidebarBackdrop.classList.toggle('show', isOpen);
    };

    if (btnToggleSidebar) btnToggleSidebar.addEventListener('click', () => toggleSidebar(true));
    if (btnCloseSidebar) btnCloseSidebar.addEventListener('click', () => toggleSidebar(false));
    if (sidebarBackdrop) sidebarBackdrop.addEventListener('click', () => toggleSidebar(false));


    // 6. Modals Logic
    const modalAdd = document.getElementById('modal-add-student');
    const modalEdit = document.getElementById('modal-edit-student');
    const modalImport = document.getElementById('modal-import');

    const editStudentId = document.getElementById('edit-student-id');
    const editStudentName = document.getElementById('edit-student-name');
    const editStudentRole = document.getElementById('edit-student-role');
    const editStudentDob = document.getElementById('edit-student-dob');
    const editStudentPhone = document.getElementById('edit-student-phone');
    const editStudentParentPhone = document.getElementById('edit-student-parent-phone');

    // Listen to edit student event from sidebar cards
    document.addEventListener('app:edit-student', (e) => {
        const student = studentManager.getStudent(e.detail.studentId);
        if (student) {
            editStudentId.value = student.id;
            const isFromInfoPage = e.detail.source === 'info-table' || document.getElementById('page-student-info').classList.contains('active-page');
            
            // Gán dữ liệu vào form tuỳ thuộc vào trang
            if (isFromInfoPage) {
                editStudentName.value = student.fullName || student.name;
            } else {
                editStudentName.value = student.name;
            }
            
            editStudentRole.value = student.role ? student.role.replace(/[()]/g, '') : '';
            editStudentDob.value = student.dob || '';
            editStudentPhone.value = student.phone || '';
            editStudentParentPhone.value = student.parentPhone || '';

            // Ẩn/hiện các ô nhập tuỳ theo context
            const roleGroup = document.getElementById('form-group-edit-role');
            const dobGroup = document.getElementById('form-group-edit-dob');
            const phoneGroup = document.getElementById('form-group-edit-phone');
            const parentPhoneGroup = document.getElementById('form-group-edit-parent-phone');

            if (isFromInfoPage) {
                if (roleGroup) roleGroup.style.display = 'none';
                if (dobGroup) dobGroup.style.display = 'block';
                if (phoneGroup) phoneGroup.style.display = 'block';
                if (parentPhoneGroup) parentPhoneGroup.style.display = 'block';
            } else {
                if (roleGroup) roleGroup.style.display = 'block';
                if (dobGroup) dobGroup.style.display = 'none';
                if (phoneGroup) phoneGroup.style.display = 'none';
                if (parentPhoneGroup) parentPhoneGroup.style.display = 'none';
            }

            modalEdit.classList.add('show');
            setTimeout(() => {
                editStudentName.focus();
                editStudentName.select();
            }, 100);
        }
    });

    document.getElementById('btn-add-student').addEventListener('click', () => {
        const roleGroup = document.getElementById('form-group-add-role');
        const dobGroup = document.getElementById('form-group-add-dob');
        const phoneGroup = document.getElementById('form-group-add-phone');
        const parentPhoneGroup = document.getElementById('form-group-add-parent-phone');

        if (roleGroup) roleGroup.style.display = 'block';
        if (dobGroup) dobGroup.style.display = 'none';
        if (phoneGroup) phoneGroup.style.display = 'none';
        if (parentPhoneGroup) parentPhoneGroup.style.display = 'none';

        modalAdd.classList.add('show');
        document.getElementById('input-student-name').focus();
    });

    document.getElementById('btn-add-student-info').addEventListener('click', () => {
        const roleGroup = document.getElementById('form-group-add-role');
        const dobGroup = document.getElementById('form-group-add-dob');
        const phoneGroup = document.getElementById('form-group-add-phone');
        const parentPhoneGroup = document.getElementById('form-group-add-parent-phone');

        if (roleGroup) roleGroup.style.display = 'none';
        if (dobGroup) dobGroup.style.display = 'block';
        if (phoneGroup) phoneGroup.style.display = 'block';
        if (parentPhoneGroup) parentPhoneGroup.style.display = 'block';

        document.getElementById('input-student-role').value = '';
        modalAdd.classList.add('show');
        document.getElementById('input-student-name').focus();
    });

    document.getElementById('btn-import-bulk').addEventListener('click', () => {
        modalImport.classList.add('show');
        document.getElementById('input-bulk-data').focus();
    });

    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.target.closest('.modal').classList.remove('show');
        });
    });

    // Close modal when clicking outside modal-content
    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            e.target.classList.remove('show');
        }
    });

    // Save single student
    document.getElementById('btn-save-student').addEventListener('click', () => {
        const name = document.getElementById('input-student-name').value;
        const dob = document.getElementById('input-student-dob').value;
        const phone = document.getElementById('input-student-phone').value;
        const parentPhone = document.getElementById('input-student-parent-phone').value;
        
        const roleGroup = document.getElementById('form-group-add-role');
        const isFromInfoPage = (roleGroup && roleGroup.style.display === 'none');
        const role = !isFromInfoPage ? document.getElementById('input-student-role').value : undefined;

        if (name.trim()) {
            if (isFromInfoPage) {
                // Thêm từ trang Thông tin -> Không hiện trên sơ đồ (showInChart = false)
                studentManager.addStudent(name, undefined, dob, phone, parentPhone, name, false);
            } else {
                // Thêm từ trang Sơ đồ -> Hiện trên sơ đồ (showInChart = true)
                studentManager.addStudent(name, role, dob, phone, parentPhone, '', true);
            }
            
            document.getElementById('input-student-name').value = '';
            document.getElementById('input-student-role').value = '';
            document.getElementById('input-student-dob').value = '';
            document.getElementById('input-student-phone').value = '';
            document.getElementById('input-student-parent-phone').value = '';
            modalAdd.classList.remove('show');
            renderAll();
        } else {
            alert('Vui lòng nhập tên học sinh');
        }
    });

    // Handle Enter key for Add Modal
    document.getElementById('input-student-name').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') document.getElementById('btn-save-student').click();
    });
    document.getElementById('input-student-role').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') document.getElementById('btn-save-student').click();
    });

    // Update edited student
    document.getElementById('btn-update-student').addEventListener('click', () => {
        const id = editStudentId.value;
        const name = editStudentName.value;
        const dob = editStudentDob.value;
        const phone = editStudentPhone.value;
        const parentPhone = editStudentParentPhone.value;
        
        const roleGroup = document.getElementById('form-group-edit-role');
        const role = (roleGroup && roleGroup.style.display !== 'none') ? editStudentRole.value : undefined;
        const isFromInfoPage = (roleGroup && roleGroup.style.display === 'none');

        if (name.trim()) {
            if (isFromInfoPage) {
                // Sửa từ trang Thông tin -> name ở input chính là fullName
                studentManager.updateStudent(id, undefined, undefined, dob, phone, parentPhone, name);
            } else {
                // Sửa từ trang Sơ đồ lớp -> chỉ sửa short name (tham số thứ 2)
                studentManager.updateStudent(id, name, role, dob, phone, parentPhone, undefined);
            }
            modalEdit.classList.remove('show');
            renderAll();
        } else {
            alert('Vui lòng nhập tên học sinh');
        }
    });

    // Handle Enter key for Edit Modal
    editStudentName.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') document.getElementById('btn-update-student').click();
    });
    editStudentRole.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') document.getElementById('btn-update-student').click();
    });

    // Save bulk import
    document.getElementById('btn-save-bulk').addEventListener('click', () => {
        const data = document.getElementById('input-bulk-data').value;
        if (data.trim()) {
            const count = studentManager.importBulk(data);
            document.getElementById('input-bulk-data').value = '';
            modalImport.classList.remove('show');
            alert(`Đã nhập thành công ${count} học sinh!`);
            renderAll();
        }
    });

    // 7. Load, save and mirror the common classroom heading through Supabase.
    const mainTitleEl = document.getElementById('chart-main-title');
    const teacherInfoEl = document.getElementById('chart-teacher-info');
    const applyClassroomSettings = (settings) => {
        if (!settings) return;
        mainTitleEl.textContent = settings.title;
        teacherInfoEl.textContent = settings.teacher_info;
    };
    const loadClassroomSettings = async () => {
        const { data, error } = await supabaseClient.from('classroom_settings').select('*').eq('id', 'lop-x6').single();
        if (error) return console.error('Không thể tải thông tin lớp:', error);
        applyClassroomSettings(data);
    };
    loadClassroomSettings();
    supabaseClient.channel('lop-x6-settings-changes')
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'classroom_settings', filter: 'id=eq.lop-x6' },
            ({ new: settings }) => applyClassroomSettings(settings))
        .subscribe();
    const saveClassroomSettings = async () => {
        const { error } = await supabaseClient.from('classroom_settings').update({
            title: mainTitleEl.textContent.trim(),
            teacher_info: teacherInfoEl.textContent.trim(),
            updated_at: new Date().toISOString()
        }).eq('id', 'lop-x6');
        if (error) console.error('Không thể lưu thông tin lớp:', error);
    };
    mainTitleEl.addEventListener('blur', saveClassroomSettings);
    teacherInfoEl.addEventListener('blur', saveClassroomSettings);
    // Initial render
    renderAll();
});
