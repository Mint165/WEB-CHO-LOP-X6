/**
 * Main Application Logic
 * Integrates Seating Grid, Student Manager, and Fund Management
 */
document.addEventListener('DOMContentLoaded', () => {
    // 1. Initialize Student Manager
    const studentManager = new StudentManager(typeof sampleStudents !== 'undefined' ? sampleStudents : []);
    studentManager.init();

    // 2. Initialize Seating Grid & Tools
    const seatingGrid = new SeatingGrid('grid-container', 4, 6, 2);
    seatingGrid.renderEmptyGrid();

    const dragDropManager = new DragDropManager(studentManager, seatingGrid);
    dragDropManager.init();

    const exporterManager = new ExporterManager('capture-area');

    // 3. Initialize Fund Management
    const fundManager = new FundManager(studentManager);
    fundManager.init();

    const fundUI = new FundUI(fundManager, studentManager);
    fundUI.init();

    // 4. Global Render Function
    const renderAll = () => {
        seatingGrid.renderStudents(studentManager);
        
        const searchInput = document.getElementById('search-input');
        const searchQuery = searchInput ? searchInput.value : '';
        seatingGrid.renderUnassigned(studentManager, searchQuery);

        // Sync students to fund UI
        fundUI.populateRoleStudentOptions();
        if (fundUI.activeTab === 'students') {
            fundUI.renderStudents();
        }
    };

    // 5. Left Navigation Bar Switching (Sơ Đồ Lớp vs Thủ Quỹ)
    const navItemSeating = document.getElementById('nav-item-seating');
    const navItemFund = document.getElementById('nav-item-fund');
    const viewSeating = document.getElementById('view-seating');
    const viewFund = document.getElementById('view-fund');

    if (navItemSeating && navItemFund && viewSeating && viewFund) {
        navItemSeating.addEventListener('click', () => {
            navItemSeating.classList.add('active');
            navItemFund.classList.remove('active');
            viewSeating.classList.add('active');
            viewFund.classList.remove('active');
            renderAll();
        });

        navItemFund.addEventListener('click', () => {
            navItemFund.classList.add('active');
            navItemSeating.classList.remove('active');
            viewFund.classList.add('active');
            viewSeating.classList.remove('active');
            fundUI.renderAll();
        });
    }

    // 6. Listen to state changes
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
        if (confirm('Bạn có chắc chắn muốn xóa học sinh này không?')) {
            studentManager.removeStudent(e.detail.studentId);
            renderAll();
            fundUI.renderAll();
        }
    });

    // 7. Seating Toolbar Event Listeners
    const btnRandomize = document.getElementById('btn-randomize');
    if (btnRandomize) {
        btnRandomize.addEventListener('click', () => {
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
    }

    const btnRotate = document.getElementById('btn-rotate');
    if (btnRotate) {
        btnRotate.addEventListener('click', () => {
            if (confirm('Đảo vị trí các tổ (Tổ 1 -> 2, 2 -> 3, 3 -> 4, 4 -> 1)?')) {
                const cols = seatingGrid.getColumnIds();
                studentManager.rotateColumns(cols);
                renderAll();
            }
        });
    }

    const btnClear = document.getElementById('btn-clear');
    if (btnClear) {
        btnClear.addEventListener('click', () => {
            if (confirm('Bạn có chắc chắn muốn đưa tất cả học sinh về danh sách chờ?')) {
                studentManager.clearAllSeats();
                renderAll();
            }
        });
    }

    const btnExportImg = document.getElementById('btn-export-img');
    if (btnExportImg) {
        btnExportImg.addEventListener('click', () => {
            exporterManager.exportToImage();
        });
    }

    const btnPrint = document.getElementById('btn-print');
    if (btnPrint) {
        btnPrint.addEventListener('click', () => {
            exporterManager.print();
        });
    }

    // 8. Sidebar Listeners (Search)
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.addEventListener('input', renderAll);
    }

    // 9. Modals Logic
    const modalAdd = document.getElementById('modal-add-student');
    const modalEdit = document.getElementById('modal-edit-student');
    const modalImport = document.getElementById('modal-import');

    const editStudentId = document.getElementById('edit-student-id');
    const editStudentName = document.getElementById('edit-student-name');
    const editStudentRole = document.getElementById('edit-student-role');

    // Listen to edit student event from sidebar cards
    document.addEventListener('app:edit-student', (e) => {
        const student = studentManager.getStudent(e.detail.studentId);
        if (student && modalEdit) {
            editStudentId.value = student.id;
            editStudentName.value = student.name;
            editStudentRole.value = student.role || '';
            modalEdit.classList.add('show');
            setTimeout(() => {
                editStudentName.focus();
                editStudentName.select();
            }, 100);
        }
    });

    const btnAddStudent = document.getElementById('btn-add-student');
    if (btnAddStudent && modalAdd) {
        btnAddStudent.addEventListener('click', () => {
            modalAdd.classList.add('show');
            document.getElementById('input-student-name').focus();
        });
    }

    const btnImportBulk = document.getElementById('btn-import-bulk');
    if (btnImportBulk && modalImport) {
        btnImportBulk.addEventListener('click', () => {
            modalImport.classList.add('show');
            document.getElementById('input-bulk-data').focus();
        });
    }

    // Close all modal handlers
    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const m = e.target.closest('.modal');
            if (m) m.classList.remove('show');
        });
    });

    // Close modal when clicking outside modal-content
    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            e.target.classList.remove('show');
        }
    });

    // Save single student
    const btnSaveStudent = document.getElementById('btn-save-student');
    if (btnSaveStudent) {
        btnSaveStudent.addEventListener('click', () => {
            const name = document.getElementById('input-student-name').value;
            const role = document.getElementById('input-student-role').value;
            if (name.trim()) {
                studentManager.addStudent(name, role);
                document.getElementById('input-student-name').value = '';
                document.getElementById('input-student-role').value = '';
                if (modalAdd) modalAdd.classList.remove('show');
                renderAll();
                fundUI.renderAll();
            } else {
                alert('Vui lòng nhập tên học sinh');
            }
        });
    }

    // Handle Enter key for Add Modal
    const inputStudentName = document.getElementById('input-student-name');
    if (inputStudentName) {
        inputStudentName.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && btnSaveStudent) btnSaveStudent.click();
        });
    }
    const inputStudentRole = document.getElementById('input-student-role');
    if (inputStudentRole) {
        inputStudentRole.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && btnSaveStudent) btnSaveStudent.click();
        });
    }

    // Update edited student
    const btnUpdateStudent = document.getElementById('btn-update-student');
    if (btnUpdateStudent) {
        btnUpdateStudent.addEventListener('click', () => {
            const id = editStudentId.value;
            const name = editStudentName.value;
            const role = editStudentRole.value;
            if (name.trim()) {
                studentManager.updateStudent(id, name, role);
                if (modalEdit) modalEdit.classList.remove('show');
                renderAll();
                fundUI.renderAll();
            } else {
                alert('Vui lòng nhập tên học sinh');
            }
        });
    }

    // Save bulk import
    const btnSaveBulk = document.getElementById('btn-save-bulk');
    if (btnSaveBulk) {
        btnSaveBulk.addEventListener('click', () => {
            const data = document.getElementById('input-bulk-data').value;
            if (data.trim()) {
                const count = studentManager.importBulk(data);
                document.getElementById('input-bulk-data').value = '';
                if (modalImport) modalImport.classList.remove('show');
                alert(`Đã nhập thành công ${count} học sinh!`);
                renderAll();
                fundUI.renderAll();
            }
        });
    }

    // 10. Load and save chart header title
    const mainTitleEl = document.getElementById('chart-main-title');
    const teacherInfoEl = document.getElementById('chart-teacher-info');

    const savedTitle = localStorage.getItem('seatingChartTitle_v2');
    const savedTeacher = localStorage.getItem('seatingChartTeacher_v2');
    if (savedTitle && mainTitleEl) mainTitleEl.innerHTML = savedTitle;
    if (savedTeacher && teacherInfoEl) teacherInfoEl.innerHTML = savedTeacher;

    if (mainTitleEl) {
        mainTitleEl.addEventListener('blur', () => {
            localStorage.setItem('seatingChartTitle_v2', mainTitleEl.innerHTML);
        });
    }
    if (teacherInfoEl) {
        teacherInfoEl.addEventListener('blur', () => {
            localStorage.setItem('seatingChartTeacher_v2', teacherInfoEl.innerHTML);
        });
    }

    // Initial render
    renderAll();
});
