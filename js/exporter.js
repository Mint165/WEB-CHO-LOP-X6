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
            this.captureArea.classList.add('is-exporting');

            // Add slight padding to capture area temporarily for better image framing
            const originalPadding = this.captureArea.style.padding;
            this.captureArea.style.padding = '50px 40px';

            // Capture with html2canvas
            const canvas = await html2canvas(this.captureArea, {
                scale: 2.5, // Ultra High resolution
                backgroundColor: '#ffffff',
                useCORS: true,
                logging: false,
                windowWidth: 1200
            });

            // Revert changes
            this.captureArea.classList.remove('is-exporting');
            this.captureArea.style.padding = originalPadding;

            // Trigger download
            const imageStr = canvas.toDataURL("image/png");
            const a = document.createElement('a');
            a.href = imageStr;
            const safeName = chartTitle.replace(/[^a-zA-Z0-9\u00C0-\u024F\u1EA0-\u1EF9]/g, '_').substring(0, 50);
            a.download = `${safeName || 'SoDoLop'}.png`;
            a.click();
            
        } catch (error) {
            this.captureArea.classList.remove('is-exporting');
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
