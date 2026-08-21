/**
 * Exporter Manager
 * Handles exporting the grid to an image or printing
 */
class ExporterManager {
    constructor(captureAreaId) {
        this.captureArea = document.getElementById(captureAreaId);
    }

    async exportToImage() {
        if (!window.html2canvas) {
            alert("Thư viện html2canvas chưa được tải. Vui lòng thử lại sau.");
            return;
        }

        try {
            const chartTitle = document.getElementById('chart-main-title') ? document.getElementById('chart-main-title').innerText : 'So_Do_Lop';
            
            // Calculate total scroll height of capture area
            const fullHeight = this.captureArea.scrollHeight;
            const fullWidth = this.captureArea.scrollWidth;

            // Capture with html2canvas with full dimensions and cloned isolation
            const canvas = await html2canvas(this.captureArea, {
                scale: 2.5, // Ultra High resolution
                backgroundColor: '#ffffff',
                useCORS: true,
                logging: false,
                scrollX: 0,
                scrollY: 0,
                width: fullWidth,
                height: fullHeight,
                windowWidth: Math.max(1400, fullWidth + 100),
                windowHeight: Math.max(1200, fullHeight + 200),
                onclone: (clonedDoc) => {
                    const clonedTarget = clonedDoc.getElementById('capture-area');
                    if (clonedTarget) {
                        clonedTarget.classList.add('is-exporting');
                        clonedTarget.style.position = 'relative';
                        clonedTarget.style.overflow = 'visible';
                        clonedTarget.style.height = 'auto';
                        clonedTarget.style.minHeight = `${fullHeight}px`;

                        // Remove edit/delete/lock action buttons from clone
                        clonedTarget.querySelectorAll('.btn-remove-seat, .btn-lock-seat').forEach(el => el.remove());

                        // Make sure all ancestors in clone are overflow visible
                        let parent = clonedTarget.parentElement;
                        while (parent && parent !== clonedDoc.body) {
                            parent.style.overflow = 'visible';
                            parent.style.height = 'auto';
                            parent = parent.parentElement;
                        }

                        // Ensure front-room is explicitly displayed in clone
                        const frontRoom = clonedTarget.querySelector('.front-room');
                        if (frontRoom) {
                            frontRoom.style.display = 'flex';
                            frontRoom.style.visibility = 'visible';
                            frontRoom.style.opacity = '1';
                        }
                    }
                }
            });

            // Trigger download
            const imageStr = canvas.toDataURL("image/png");
            const a = document.createElement('a');
            a.href = imageStr;
            const safeName = chartTitle.replace(/[^a-zA-Z0-9\u00C0-\u024F\u1EA0-\u1EF9]/g, '_').substring(0, 50);
            a.download = `${safeName || 'SoDoLop'}.png`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            
        } catch (error) {
            console.error("Lỗi khi xuất ảnh:", error);
            alert("Đã xảy ra lỗi khi xuất ảnh. Vui lòng xem console.");
        }
    }

    print() {
        this.captureArea.classList.add('is-exporting');
        window.print();
        setTimeout(() => {
            this.captureArea.classList.remove('is-exporting');
        }, 500);
    }
}
