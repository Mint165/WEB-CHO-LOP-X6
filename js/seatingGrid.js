/**
 * Seating Grid Manager
 * Generates the physical layout (HTML) for the classroom
 */
class SeatingGrid {
    constructor(containerId, cols = 4, rows = 6, seatsPerRow = 2) {
        this.container = document.getElementById(containerId);
        this.cols = cols;
        this.rows = rows;
        this.seatsPerRow = seatsPerRow;
        this.seatIds = []; // keep track of all valid seat IDs
    }

    renderEmptyGrid() {
        this.container.innerHTML = '';
        this.seatIds = [];

        for (let c = 1; c <= this.cols; c++) {
            const colGroup = document.createElement('div');
            colGroup.className = 'col-group';
            colGroup.dataset.col = 'c' + c;
            
            // Add a header for the column (Tổ 1, Tổ 2, ...) if needed
            // const colTitle = document.createElement('div');
            // colTitle.className = 'col-title';
            // colTitle.innerText = `DÃY ${c}`;
            // colTitle.style.textAlign = 'center';
            // colTitle.style.fontWeight = '600';
            // colTitle.style.marginBottom = '10px';
            // colGroup.appendChild(colTitle);

            for (let r = 1; r <= this.rows; r++) {
                const rowGroup = document.createElement('div');
                rowGroup.className = 'desk-row';

                for (let s = 1; s <= this.seatsPerRow; s++) {
                    const seatId = `seat-c${c}-r${r}-s${s}`;
                    this.seatIds.push(seatId);

                    const seat = document.createElement('div');
                    seat.className = 'seat droppable';
                    seat.dataset.seatId = seatId;
                    
                    rowGroup.appendChild(seat);
                }
                colGroup.appendChild(rowGroup);
            }
            this.container.appendChild(colGroup);
        }
    }

    getAllSeatIds() {
        return this.seatIds;
    }

    getColumnIds() {
        const cols = [];
        for (let c = 1; c <= this.cols; c++) {
            cols.push('c' + c);
        }
        return cols;
    }

    renderStudents(studentManager) {
        // Clear all seats first
        this.seatIds.forEach(seatId => {
            const seatElement = document.querySelector(`.seat[data-seat-id="${seatId}"]`);
            if (seatElement) seatElement.innerHTML = '';
        });

        // Get assigned students and place them
        const assigned = studentManager.getAssigned();
        assigned.forEach(student => {
            const seatElement = document.querySelector(`.seat[data-seat-id="${student.seatId}"]`);
            
            if (seatElement) {
                const content = document.createElement('div');
                content.className = 'seat-content draggable';
                content.draggable = true;
                content.dataset.studentId = student.id;
                content.title = 'Kéo để đổi chỗ hoặc nhấp đúp để chỉnh sửa';
                content.ondblclick = (e) => {
                    if (!document.body.classList.contains('is-admin')) return;
                    e.stopPropagation();
                    document.dispatchEvent(new CustomEvent('app:edit-student', { detail: { studentId: student.id } }));
                };
                
                const nameEl = document.createElement('div');
                nameEl.className = 'student-name-text';
                nameEl.innerText = student.name;
                content.appendChild(nameEl);
                
                if (student.role) {
                    const roleEl = document.createElement('div');
                    roleEl.className = 'student-role-text';
                    roleEl.innerText = student.role;
                    content.appendChild(roleEl);
                }

                if (student.isLocked) {
                    content.classList.add('is-locked');
                }

                // Lock / Unlock button
                const lockBtn = document.createElement('button');
                lockBtn.className = `btn-lock-seat ${student.isLocked ? 'locked' : ''}`;
                lockBtn.title = student.isLocked ? 'Đang khóa vị trí (Click để mở khóa)' : 'Khóa vị trí (Giữ nguyên khi xáo trộn)';
                lockBtn.innerHTML = `<i class="fa-solid ${student.isLocked ? 'fa-lock' : 'fa-lock-open'}"></i>`;
                lockBtn.onclick = (e) => {
                    e.stopPropagation();
                    document.dispatchEvent(new CustomEvent('app:toggle-lock', { detail: { studentId: student.id } }));
                };
                content.appendChild(lockBtn);

                // Remove button
                const rmBtn = document.createElement('button');
                rmBtn.className = 'btn-remove-seat';
                rmBtn.title = 'Hủy xếp chỗ';
                rmBtn.innerHTML = '<i class="fa-solid fa-xmark"></i>';
                rmBtn.onclick = (e) => {
                    e.stopPropagation();
                    // Custom event to handle unassigning
                    document.dispatchEvent(new CustomEvent('app:unassign', { detail: { studentId: student.id } }));
                };
                content.appendChild(rmBtn);

                seatElement.appendChild(content);
            }
        });
    }

    renderUnassigned(studentManager, searchQuery = '') {
        const listEl = document.getElementById('unassigned-list');
        const emptyState = document.getElementById('empty-state');
        listEl.innerHTML = '';
        
        let unassigned = studentManager.getUnassigned();
        
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            unassigned = unassigned.filter(s => s.name.toLowerCase().includes(q));
        }

        if (unassigned.length === 0) {
            emptyState.style.display = 'flex';
        } else {
            emptyState.style.display = 'none';
            unassigned.forEach(student => {
                const li = document.createElement('li');
                li.className = 'student-card draggable';
                li.draggable = true;
                li.dataset.studentId = student.id;
                
                const info = document.createElement('div');
                info.className = 'student-card-info';
                
                const name = document.createElement('div');
                name.className = 'student-card-name';
                name.innerText = student.name;
                info.appendChild(name);
                
                if (student.role) {
                    const role = document.createElement('div');
                    role.className = 'student-card-role';
                    role.innerText = student.role;
                    info.appendChild(role);
                }
                
                li.appendChild(info);

                // Actions (Edit, Delete)
                const actions = document.createElement('div');
                actions.className = 'student-card-actions';
                
                const btnEdit = document.createElement('button');
                btnEdit.className = 'btn-icon edit';
                btnEdit.title = 'Chỉnh sửa tên & chức danh';
                btnEdit.innerHTML = '<i class="fa-solid fa-pen-to-square"></i>';
                btnEdit.onclick = (e) => {
                    e.stopPropagation();
                    document.dispatchEvent(new CustomEvent('app:edit-student', { detail: { studentId: student.id } }));
                };
                actions.appendChild(btnEdit);

                const btnDelete = document.createElement('button');
                btnDelete.className = 'btn-icon delete';
                btnDelete.title = 'Xóa học sinh';
                btnDelete.innerHTML = '<i class="fa-solid fa-trash"></i>';
                btnDelete.onclick = (e) => {
                    e.stopPropagation();
                    document.dispatchEvent(new CustomEvent('app:delete-student', { detail: { studentId: student.id } }));
                };
                
                actions.appendChild(btnDelete);
                li.appendChild(actions);

                listEl.appendChild(li);
            });
        }
        
        // Update stats
        const total = studentManager.getAll().length;
        const assigned = studentManager.getAssigned().length;
        const unassignedCount = total - assigned;
        document.getElementById('stat-total').innerText = total;
        document.getElementById('stat-assigned').innerText = assigned;
        
        const badge = document.getElementById('mobile-unassigned-badge');
        if (badge) {
            badge.innerText = unassignedCount;
            badge.style.display = unassignedCount > 0 ? 'flex' : 'none';
        }
    }
}
