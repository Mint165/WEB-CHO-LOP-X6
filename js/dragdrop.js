/**
 * Drag and Drop Manager
 * Handles all drag-and-drop interactions across the grid and sidebar
 */
class DragDropManager {
    constructor(studentManager, seatingGrid) {
        this.studentManager = studentManager;
        this.seatingGrid = seatingGrid;
        
        this.draggedStudentId = null;
        this.sourceSeatId = null; // null if from sidebar
        
        // Tap-to-place state
        this.selectedStudentId = null;
        this.selectedSourceSeatId = null;
    }

    init() {
        // Setup Drag start on all draggables
        document.addEventListener('dragstart', (e) => {
            const draggable = e.target.closest('.draggable');
            if (draggable) {
                this.draggedStudentId = draggable.dataset.studentId;
                
                // Determine source
                const seatElement = draggable.closest('.seat');
                this.sourceSeatId = seatElement ? seatElement.dataset.seatId : null;
                
                e.dataTransfer.effectAllowed = 'move';
                // For Firefox
                e.dataTransfer.setData('text/plain', this.draggedStudentId); 
                
                setTimeout(() => draggable.classList.add('is-dragging'), 0);
            }
        });

        document.addEventListener('dragend', (e) => {
            const draggable = e.target.closest('.draggable');
            if (draggable) {
                draggable.classList.remove('is-dragging');
                this.draggedStudentId = null;
                this.sourceSeatId = null;
                
                // Remove all drag-over visual cues
                document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
            }
        });

        // Setup Drag Over and Drop on seats
        const gridContainer = document.getElementById('grid-container');
        
        gridContainer.addEventListener('dragover', (e) => {
            e.preventDefault();
            const seat = e.target.closest('.seat');
            if (seat) {
                e.dataTransfer.dropEffect = 'move';
                
                // Only add visual cue to the current hovered seat
                document.querySelectorAll('.seat.drag-over').forEach(el => {
                    if (el !== seat) el.classList.remove('drag-over');
                });
                seat.classList.add('drag-over');
            }
        });

        gridContainer.addEventListener('dragleave', (e) => {
            const seat = e.target.closest('.seat');
            if (seat) {
                seat.classList.remove('drag-over');
            }
        });

        gridContainer.addEventListener('drop', (e) => {
            e.preventDefault();
            const seat = e.target.closest('.seat');
            if (seat) {
                seat.classList.remove('drag-over');
                
                const targetSeatId = seat.dataset.seatId;
                const studentId = this.draggedStudentId;
                
                if (!studentId) return;

                // Check if target seat is occupied
                const existingStudent = this.studentManager.getStudentAtSeat(targetSeatId);
                
                if (existingStudent) {
                    if (this.sourceSeatId) {
                        // Swap two seated students
                        this.studentManager.swapSeats(studentId, existingStudent.id);
                    } else {
                        // Swap with sidebar student (target student goes to sidebar, dragged goes to seat)
                        this.studentManager.unassignSeat(existingStudent.id);
                        this.studentManager.assignSeat(studentId, targetSeatId);
                    }
                } else {
                    // Target is empty
                    this.studentManager.assignSeat(studentId, targetSeatId);
                }
                
                // Trigger re-render
                document.dispatchEvent(new CustomEvent('app:state-changed'));
            }
        });

        // Setup drop on Sidebar (unassigning)
        const sidebarListWrapper = document.querySelector('.unassigned-list-wrapper');
        
        sidebarListWrapper.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            document.getElementById('unassigned-list').classList.add('drag-over');
        });

        sidebarListWrapper.addEventListener('dragleave', (e) => {
            document.getElementById('unassigned-list').classList.remove('drag-over');
        });

        sidebarListWrapper.addEventListener('drop', (e) => {
            e.preventDefault();
            document.getElementById('unassigned-list').classList.remove('drag-over');
            
            const studentId = this.draggedStudentId;
            if (studentId && this.sourceSeatId) {
                // Dragged from a seat to sidebar
                this.studentManager.unassignSeat(studentId);
                document.dispatchEvent(new CustomEvent('app:state-changed'));
            }
        });

        // Setup Tap-to-Place / Click interactions
        document.addEventListener('click', (e) => {
            // Ignore clicks on action buttons
            if (e.target.closest('button') || e.target.closest('.btn-icon')) return;

            // 1. Click on a draggable student
            const draggable = e.target.closest('.draggable');
            if (draggable) {
                const studentId = draggable.dataset.studentId;
                const seatElement = draggable.closest('.seat');
                const sourceSeatId = seatElement ? seatElement.dataset.seatId : null;

                // If already selected, deselect
                if (this.selectedStudentId === studentId) {
                    this.clearSelection();
                    return;
                }

                // If another is selected, check if we are clicking a seat with a student (Swap intent)
                if (this.selectedStudentId && seatElement) {
                    this.handleTapDrop(seatElement.dataset.seatId);
                    return;
                }

                // Otherwise, select this student
                this.clearSelection();
                this.selectedStudentId = studentId;
                this.selectedSourceSeatId = sourceSeatId;
                draggable.classList.add('is-selected');
                
                // Highlight valid targets visually
                document.querySelectorAll('.seat').forEach(s => s.classList.add('tap-target'));
                
                return;
            }

            // 2. Click on an empty seat
            const seat = e.target.closest('.seat');
            if (seat && this.selectedStudentId) {
                this.handleTapDrop(seat.dataset.seatId);
                return;
            }

            // 3. Click on the sidebar to unassign
            const sidebar = e.target.closest('.sidebar');
            if (sidebar && this.selectedStudentId && this.selectedSourceSeatId) {
                this.studentManager.unassignSeat(this.selectedStudentId);
                document.dispatchEvent(new CustomEvent('app:state-changed'));
                this.clearSelection();
                return;
            }
            
            // 4. Click elsewhere clears selection
            this.clearSelection();
        });
    }

    clearSelection() {
        this.selectedStudentId = null;
        this.selectedSourceSeatId = null;
        document.querySelectorAll('.is-selected').forEach(el => el.classList.remove('is-selected'));
        document.querySelectorAll('.tap-target').forEach(el => el.classList.remove('tap-target'));
    }

    handleTapDrop(targetSeatId) {
        if (!this.selectedStudentId) return;

        const studentId = this.selectedStudentId;
        const sourceSeatId = this.selectedSourceSeatId;
        const existingStudent = this.studentManager.getStudentAtSeat(targetSeatId);

        if (existingStudent) {
            if (sourceSeatId) {
                this.studentManager.swapSeats(studentId, existingStudent.id);
            } else {
                this.studentManager.unassignSeat(existingStudent.id);
                this.studentManager.assignSeat(studentId, targetSeatId);
            }
        } else {
            this.studentManager.assignSeat(studentId, targetSeatId);
        }
        
        document.dispatchEvent(new CustomEvent('app:state-changed'));
        this.clearSelection();
    }
}
