/**
 * Main Application Logic
 */
document.addEventListener('DOMContentLoaded', () => {
    // 1. Initialize Managers
    const studentManager = new StudentManager(typeof sampleStudents !== 'undefined' ? sampleStudents : []);
    studentManager.init();

    const seatingGrid = new SeatingGrid('grid-container', 4, 6, 2);
    seatingGrid.renderEmptyGrid();

    const dragDropManager = new DragDropManager(studentManager, seatingGrid);
    dragDropManager.init();

    const exporterManager = new ExporterManager('capture-area');

    // 2. Global Render Function
    const renderAll = () => {
        seatingGrid.renderStudents(studentManager);
        
        const searchQuery = document.getElementById('search-input').value;
        seatingGrid.renderUnassigned(studentManager, searchQuery);
    };

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
        if (confirm('Bạn có chắc chắn muốn xóa học sinh này không?')) {
            studentManager.removeStudent(e.detail.studentId);
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

    // 6. Modals Logic
    const modalAdd = document.getElementById('modal-add-student');
    const modalEdit = document.getElementById('modal-edit-student');
    const modalImport = document.getElementById('modal-import');

    const editStudentId = document.getElementById('edit-student-id');
    const editStudentName = document.getElementById('edit-student-name');
    const editStudentRole = document.getElementById('edit-student-role');

    // Listen to edit student event from sidebar cards
    document.addEventListener('app:edit-student', (e) => {
        const student = studentManager.getStudent(e.detail.studentId);
        if (student) {
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

    document.getElementById('btn-add-student').addEventListener('click', () => {
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
        const role = document.getElementById('input-student-role').value;
        if (name.trim()) {
            studentManager.addStudent(name, role);
            document.getElementById('input-student-name').value = '';
            document.getElementById('input-student-role').value = '';
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
        const role = editStudentRole.value;
        if (name.trim()) {
            studentManager.updateStudent(id, name, role);
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

    // 7. Load and save chart header title
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
