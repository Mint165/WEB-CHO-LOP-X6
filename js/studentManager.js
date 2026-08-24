/**
 * Student Manager
 * Handles the state of all students (assigned and unassigned)
 */
class StudentManager {
    constructor(sampleData) {
        this.students = [];
        this.sampleData = sampleData || [];
    }

    init() {
        this.loadFromStorage();
    }

    loadFromStorage() {
        const stored = localStorage.getItem('seatingStudents');
        if (stored) {
            this.students = JSON.parse(stored);
            this.students.forEach(s => {
                if (s.role) s.role = this.formatRole(s.role);
                if (typeof s.isLocked === 'undefined') s.isLocked = false;
            });
        } else {
            // Load sample data if nothing in storage
            this.students = JSON.parse(JSON.stringify(this.sampleData));
            this.students.forEach(s => {
                if (s.role) s.role = this.formatRole(s.role);
                s.isLocked = false;
            });
            this.saveToStorage();
        }
    }

    saveToStorage() {
        localStorage.setItem('seatingStudents', JSON.stringify(this.students));
    }

    getAll() {
        return this.students;
    }

    getStudent(id) {
        return this.students.find(s => s.id === id);
    }

    getAssigned() {
        return this.students.filter(s => s.seatId);
    }

    getUnassigned() {
        return this.students.filter(s => !s.seatId);
    }

    getStudentAtSeat(seatId) {
        return this.students.find(s => s.seatId === seatId);
    }

    formatRole(role) {
        if (!role) return '';
        let clean = role.trim();
        if (!clean) return '';
        if (!clean.startsWith('(')) {
            clean = '(' + clean;
        }
        if (!clean.endsWith(')')) {
            clean = clean + ')';
        }
        return clean;
    }

    addStudent(name, role, dob = '', phone = '', parentPhone = '') {
        const id = 'hs_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
        this.students.push({
            id,
            name: name.trim(),
            role: this.formatRole(role),
            dob: dob.trim(),
            phone: phone.trim(),
            parentPhone: parentPhone.trim(),
            seatId: null,
            isLocked: false
        });
        this.saveToStorage();
        return id;
    }

    updateStudent(id, name, role, dob = '', phone = '', parentPhone = '') {
        const student = this.getStudent(id);
        if (student) {
            student.name = name.trim();
            student.role = this.formatRole(role);
            student.dob = dob.trim();
            student.phone = phone.trim();
            student.parentPhone = parentPhone.trim();
            this.saveToStorage();
        }
    }

    toggleLock(studentId) {
        const student = this.getStudent(studentId);
        if (student && student.seatId) {
            student.isLocked = !student.isLocked;
            this.saveToStorage();
        }
    }

    removeStudent(id) {
        this.students = this.students.filter(s => s.id !== id);
        this.saveToStorage();
    }

    assignSeat(studentId, seatId) {
        const student = this.getStudent(studentId);
        if (student) {
            student.seatId = seatId;
            this.saveToStorage();
        }
    }

    unassignSeat(studentId) {
        const student = this.getStudent(studentId);
        if (student) {
            student.seatId = null;
            student.isLocked = false;
            this.saveToStorage();
        }
    }

    swapSeats(studentId1, studentId2) {
        const s1 = this.getStudent(studentId1);
        const s2 = this.getStudent(studentId2);
        
        if (s1 && s2) {
            const tempSeat = s1.seatId;
            s1.seatId = s2.seatId;
            s2.seatId = tempSeat;
            this.saveToStorage();
        }
    }

    clearAllSeats() {
        // Only clear unlocked students
        this.students.forEach(s => {
            if (!s.isLocked) {
                s.seatId = null;
            }
        });
        this.saveToStorage();
    }

    randomizeSeats(seatIds) {
        // Identify locked students and their seats
        const lockedSeats = new Set(
            this.students.filter(s => s.isLocked && s.seatId).map(s => s.seatId)
        );

        // Available seats are all seats NOT occupied by a locked student
        const availableSeats = seatIds.filter(id => !lockedSeats.has(id));

        // Students to shuffle are all students that are NOT locked (both unassigned and currently in unlocked seats)
        const toShuffle = this.students.filter(s => !s.isLocked);
        
        // Reset their seats before reshuffling
        toShuffle.forEach(s => s.seatId = null);

        // Fisher-Yates shuffle
        for (let i = toShuffle.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [toShuffle[i], toShuffle[j]] = [toShuffle[j], toShuffle[i]];
        }

        // Assign shuffled students into available seats
        const numToAssign = Math.min(toShuffle.length, availableSeats.length);
        for (let i = 0; i < numToAssign; i++) {
            toShuffle[i].seatId = availableSeats[i];
        }

        this.saveToStorage();
    }
    
    rotateColumns(columns) {
        // columns is an array of column ids [c1, c2, c3, c4]
        // This function will move all students from c1 -> c2, c2 -> c3, c3 -> c4, c4 -> c1
        const shifts = {};
        for(let i=0; i<columns.length; i++) {
            const nextIdx = (i + 1) % columns.length;
            shifts[columns[i]] = columns[nextIdx];
        }

        const assigned = this.getAssigned();
        assigned.forEach(student => {
            // seatId format: seat-c1-r1-s1
            const parts = student.seatId.split('-'); // ["seat", "c1", "r1", "s1"]
            const col = parts[1];
            if (shifts[col]) {
                parts[1] = shifts[col];
                student.seatId = parts.join('-');
            }
        });
        
        this.saveToStorage();
    }

    importBulk(text) {
        const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
        let addedCount = 0;
        
        lines.forEach(line => {
            // Format can be "Name" or "Name, Role"
            const parts = line.split(',');
            const name = parts[0];
            const role = parts.length > 1 ? parts[1].trim() : '';
            this.addStudent(name, role);
            addedCount++;
        });
        
        return addedCount;
    }
}
