/**
 * Keeps the seating chart in Supabase and mirrors changes from other devices.
 */
class StudentManager {
    constructor(sampleData) {
        this.students = [];
        this.sampleData = sampleData || [];
        this.classroomId = 'lop-x6';
        this.syncQueue = Promise.resolve();
        this.channel = null;
    }

    async init() {
        try {
            const [{ data: settings, error: settingsError }, { data: students, error: studentsError }] = await Promise.all([
                supabaseClient.from('classroom_settings').select('*').eq('id', this.classroomId).single(),
                supabaseClient.from('classroom_students').select('*').eq('classroom_id', this.classroomId).order('created_at')
            ]);

            if (settingsError) throw settingsError;
            if (studentsError) throw studentsError;

            if (students.length === 0) {
                // Nếu db rỗng (hoặc bị ẩn do RLS), ưu tiên lấy từ localStorage trước
                const localData = localStorage.getItem('lop-x6-students');
                if (localData) {
                    this.students = JSON.parse(localData);
                    await this.writeStudents(this.students);
                } else if (this.sampleData.length > 0) {
                    this.students = JSON.parse(JSON.stringify(this.sampleData));
                    this.students.forEach(student => {
                        student.role = this.formatRole(student.role || '');
                        student.isLocked = Boolean(student.isLocked);
                        student.showInChart = true;
                    });
                    await this.writeStudents(this.students);
                }
            } else {
                this.students = students.map(student => this.fromRow(student));
                // Backup to localStorage
                localStorage.setItem('lop-x6-students', JSON.stringify(this.students));
            }

            this.subscribeToRealtime();
            document.dispatchEvent(new Event('app:state-changed'));
            return settings;
        } catch (error) {
            console.warn('Lỗi kết nối Supabase, chuyển sang sử dụng local storage/dữ liệu mẫu:', error);
            
            // Fallback to local storage or sample data
            const localData = localStorage.getItem('lop-x6-students');
            if (localData) {
                this.students = JSON.parse(localData);
            } else if (this.sampleData.length > 0) {
                this.students = JSON.parse(JSON.stringify(this.sampleData));
                this.students.forEach(student => {
                    student.role = this.formatRole(student.role || '');
                    student.isLocked = Boolean(student.isLocked);
                    student.showInChart = true;
                });
            }
            
            document.dispatchEvent(new Event('app:state-changed'));
            return { title: 'SƠ ĐỒ LỚP 12/6', teacher_info: 'Giáo viên chủ nhiệm: ...' };
        }
    }

    fromRow(row) {
        return {
            id: row.id,
            name: row.name,
            fullName: row.full_name || '',
            role: this.formatRole(row.role || ''),
            dob: row.dob || '',
            phone: row.phone || '',
            parentPhone: row.parent_phone || '',
            seatId: row.seat_id || null,
            isLocked: Boolean(row.is_locked),
            showInChart: row.show_in_chart !== false
        };
    }

    toRow(student) {
        return {
            id: student.id,
            classroom_id: this.classroomId,
            name: student.name,
            full_name: student.fullName || '',
            role: student.role || '',
            dob: student.dob || null,
            phone: (student.phone || '').trim(),
            parent_phone: (student.parentPhone || '').trim(),
            seat_id: student.seatId,
            is_locked: student.isLocked,
            show_in_chart: student.showInChart !== false,
            updated_at: new Date().toISOString()
        };
    }

    subscribeToRealtime() {
        if (this.channel) supabaseClient.removeChannel(this.channel);
        this.channel = supabaseClient
            .channel('lop-x6-student-changes')
            .on('postgres_changes', {
                event: '*', schema: 'public', table: 'classroom_students',
                filter: `classroom_id=eq.${this.classroomId}`
            }, payload => this.applyRemoteStudentChange(payload))
            .subscribe(status => {
                document.dispatchEvent(new CustomEvent('app:sync-status', { detail: status }));
            });
    }

    applyRemoteStudentChange(payload) {
        if (payload.eventType === 'DELETE') {
            this.students = this.students.filter(student => student.id !== payload.old.id);
        } else {
            const incoming = this.fromRow(payload.new);
            const index = this.students.findIndex(student => student.id === incoming.id);
            if (index === -1) this.students.push(incoming);
            else this.students[index] = incoming;
        }
        document.dispatchEvent(new Event('app:state-changed'));
    }

    queue(task) {
        this.syncQueue = this.syncQueue
            .then(task)
            .catch(error => {
                console.error('Không thể đồng bộ sơ đồ lớp:', error);
                document.dispatchEvent(new CustomEvent('app:sync-error', { detail: error }));
            });
        return this.syncQueue;
    }

    writeStudents(students) {
        const rows = students.map(student => this.toRow(student));
        return this.queue(async () => {
            const { error } = await supabaseClient.from('classroom_students').upsert(rows);
            if (error) throw error;
        });
    }

    save() {
        // Luôn lưu bản sao vào localStorage để dự phòng
        localStorage.setItem('lop-x6-students', JSON.stringify(this.students));
        this.writeStudents(this.students);
    }

    getAll() { return this.students; }
    getAllSorted() {
        return [...this.students].sort((a, b) => {
            const nameA = (a.fullName || a.name || '').toLowerCase();
            const nameB = (b.fullName || b.name || '').toLowerCase();
            return nameA.localeCompare(nameB);
        });
    }
    getStudent(id) { return this.students.find(student => student.id === id); }
    getAssigned() { return this.students.filter(student => student.seatId && student.showInChart !== false); }
    getUnassigned() { return this.students.filter(student => !student.seatId && student.showInChart !== false); }
    getStudentAtSeat(seatId) { return this.students.find(student => student.seatId === seatId); }

    formatRole(role) {
        const clean = (role || '').trim();
        if (!clean) return '';
        return `(${clean.replace(/^\(+|\)+$/g, '')})`;
    }

    addStudent(name, role, dob = '', phone = '', parentPhone = '', fullName = '', showInChart = true) {
        const id = `hs_${crypto.randomUUID()}`;
        this.students.push({ 
            id, 
            name: name.trim(), 
            fullName: fullName.trim(),
            role: role !== undefined ? this.formatRole(role) : '', 
            dob: dob.trim(), 
            phone: phone.trim(), 
            parentPhone: parentPhone.trim(), 
            seatId: null, 
            isLocked: false,
            showInChart: showInChart
        });
        this.save();
        return id;
    }

    updateStudent(id, name, role, dob = '', phone = '', parentPhone = '', fullName = '') {
        const student = this.getStudent(id);
        if (!student) return;
        if (name !== undefined && name !== null) student.name = name.trim();
        if (fullName !== undefined && fullName !== null) student.fullName = fullName.trim();
        if (role !== undefined) {
            student.role = this.formatRole(role);
        }
        if (dob !== undefined) student.dob = dob.trim();
        if (phone !== undefined) student.phone = phone.trim();
        if (parentPhone !== undefined) student.parentPhone = parentPhone.trim();
        this.save();
    }

    toggleLock(studentId) {
        const student = this.getStudent(studentId);
        if (!student || !student.seatId) return;
        student.isLocked = !student.isLocked;
        this.save();
    }

    removeStudent(id, completely = false) {
        if (completely) {
            this.students = this.students.filter(student => student.id !== id);
            this.queue(async () => {
                const { error } = await supabaseClient.from('classroom_students').delete().eq('id', id).eq('classroom_id', this.classroomId);
                if (error) throw error;
            });
        } else {
            const student = this.getStudent(id);
            if (student) {
                student.showInChart = false;
                student.seatId = null;
                this.save();
            }
        }
    }

    assignSeat(studentId, seatId) {
        const student = this.getStudent(studentId);
        if (!student) return;
        student.seatId = seatId;
        this.save();
    }

    unassignSeat(studentId) {
        const student = this.getStudent(studentId);
        if (!student) return;
        student.seatId = null;
        student.isLocked = false;
        this.save();
    }

    swapSeats(studentId1, studentId2) {
        const first = this.getStudent(studentId1);
        const second = this.getStudent(studentId2);
        if (!first || !second) return;
        [first.seatId, second.seatId] = [second.seatId, first.seatId];
        this.save();
    }

    clearAllSeats() {
        this.students.forEach(student => {
            if (!student.isLocked) student.seatId = null;
        });
        this.save();
    }

    randomizeSeats(seatIds) {
        const lockedSeats = new Set(this.students.filter(student => student.isLocked && student.seatId).map(student => student.seatId));
        const availableSeats = seatIds.filter(seatId => !lockedSeats.has(seatId));
        const toShuffle = this.students.filter(student => !student.isLocked);
        toShuffle.forEach(student => { student.seatId = null; });
        for (let index = toShuffle.length - 1; index > 0; index--) {
            const randomIndex = Math.floor(Math.random() * (index + 1));
            [toShuffle[index], toShuffle[randomIndex]] = [toShuffle[randomIndex], toShuffle[index]];
        }
        toShuffle.slice(0, availableSeats.length).forEach((student, index) => { student.seatId = availableSeats[index]; });
        this.save();
    }

    rotateColumns(columns) {
        const shifts = Object.fromEntries(columns.map((column, index) => [column, columns[(index + 1) % columns.length]]));
        this.getAssigned().forEach(student => {
            const parts = student.seatId.split('-');
            if (shifts[parts[1]]) {
                parts[1] = shifts[parts[1]];
                student.seatId = parts.join('-');
            }
        });
        this.save();
    }

    importBulk(text) {
        const lines = text.split('\n').map(line => line.trim()).filter(Boolean);
        lines.forEach(line => {
            const [name, ...roleParts] = line.split(',');
            this.students.push({
                id: `hs_${crypto.randomUUID()}`,
                name: name.trim(),
                role: this.formatRole(roleParts.join(',').trim()),
                dob: '',
                phone: '',
                parentPhone: '',
                seatId: null,
                isLocked: false,
                showInChart: true
            });
        });
        this.save();
        return lines.length;
    }

    findMatchingStudents(fullName) {
        const upperFull = fullName.trim().toUpperCase();
        if (!upperFull) return [];
        const fullWords = upperFull.split(/\s+/);
        
        return this.students.filter(student => {
            if (student.showInChart === false) return false;
            if (!student.name) return false;
            
            const shortName = student.name.trim().toUpperCase();
            
            // Cách 1: Chứa chuỗi con trực tiếp (Ví dụ NGUYỄN QUỐC MINH chứa QUỐC MINH)
            if (upperFull.includes(shortName)) return true;
            
            // Cách 2: Khớp từng từ theo đúng thứ tự (Ví dụ PHẠM PHAN BẢO NGỌC khớp PHẠM BẢO NGỌC)
            const shortWords = shortName.split(/\s+/);
            let matchIndex = 0;
            for (let i = 0; i < fullWords.length; i++) {
                if (fullWords[i] === shortWords[matchIndex]) {
                    matchIndex++;
                }
                if (matchIndex === shortWords.length) return true;
            }
            
            return false;
        });
    }
}

