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

            if (students.length === 0 && this.sampleData.length > 0) {
                this.students = JSON.parse(JSON.stringify(this.sampleData));
                this.students.forEach(student => {
                    student.role = this.formatRole(student.role || '');
                    student.isLocked = Boolean(student.isLocked);
                });
                await this.writeStudents(this.students);
            } else {
                this.students = students.map(student => this.fromRow(student));
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
            role: this.formatRole(row.role || ''),
            dob: row.dob || '',
            phone: row.phone || '',
            parentPhone: row.parent_phone || '',
            seatId: row.seat_id || null,
            isLocked: Boolean(row.is_locked)
        };
    }

    toRow(student) {
        return {
            id: student.id,
            classroom_id: this.classroomId,
            name: student.name.trim(),
            role: this.formatRole(student.role || ''),
            dob: student.dob || null,
            phone: (student.phone || '').trim(),
            parent_phone: (student.parentPhone || '').trim(),
            seat_id: student.seatId || null,
            is_locked: Boolean(student.isLocked),
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
    getStudent(id) { return this.students.find(student => student.id === id); }
    getAssigned() { return this.students.filter(student => student.seatId); }
    getUnassigned() { return this.students.filter(student => !student.seatId); }
    getStudentAtSeat(seatId) { return this.students.find(student => student.seatId === seatId); }

    formatRole(role) {
        const clean = (role || '').trim();
        if (!clean) return '';
        return `(${clean.replace(/^\(+|\)+$/g, '')})`;
    }

    addStudent(name, role, dob = '', phone = '', parentPhone = '') {
        const id = `hs_${crypto.randomUUID()}`;
        this.students.push({ id, name: name.trim(), role: role !== undefined ? this.formatRole(role) : '', dob: dob.trim(), phone: phone.trim(), parentPhone: parentPhone.trim(), seatId: null, isLocked: false });
        this.save();
        return id;
    }

    updateStudent(id, name, role, dob = '', phone = '', parentPhone = '') {
        const student = this.getStudent(id);
        if (!student) return;
        student.name = name.trim();
        if (role !== undefined) {
            student.role = this.formatRole(role);
        }
        student.dob = dob.trim();
        student.phone = phone.trim();
        student.parentPhone = parentPhone.trim();
        this.save();
    }

    toggleLock(studentId) {
        const student = this.getStudent(studentId);
        if (!student || !student.seatId) return;
        student.isLocked = !student.isLocked;
        this.save();
    }

    removeStudent(id) {
        this.students = this.students.filter(student => student.id !== id);
        this.queue(async () => {
            const { error } = await supabaseClient.from('classroom_students').delete().eq('id', id).eq('classroom_id', this.classroomId);
            if (error) throw error;
        });
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
                isLocked: false
            });
        });
        this.save();
        return lines.length;
    }
}
