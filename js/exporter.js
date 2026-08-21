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
            // Prepare for capture
            const exportHeader = document.querySelector('.export-header');
            const classTitleInput = document.getElementById('class-title').innerText;
            const classSubtitleInput = document.getElementById('class-subtitle').innerText;
            
            document.getElementById('export-title').innerText = classTitleInput;
            document.getElementById('export-subtitle').innerText = classSubtitleInput;
            
            // Show header inside capture area
            exportHeader.style.display = 'block';
            this.captureArea.classList.add('is-exporting');

            // Add slight padding to capture area temporarily for better image framing
            const originalPadding = this.captureArea.style.padding;
            this.captureArea.style.padding = '60px';

            // Capture
            const canvas = await html2canvas(this.captureArea, {
                scale: 2, // High resolution
                backgroundColor: '#ffffff',
                useCORS: true,
                logging: false,
                windowWidth: 1200 // Ensure a consistent width
            });

            // Revert changes
            exportHeader.style.display = 'none';
            this.captureArea.classList.remove('is-exporting');
            this.captureArea.style.padding = originalPadding;

            // Trigger download
            const imageStr = canvas.toDataURL("image/png");
            const a = document.createElement('a');
            a.href = imageStr;
            a.download = `SoDoLop_${classTitleInput.replace(/\s+/g, '_')}.png`;
            a.click();
            
        } catch (error) {
            this.captureArea.classList.remove('is-exporting');
            console.error("Lỗi khi xuất ảnh:", error);
            alert("Đã xảy ra lỗi khi xuất ảnh. Vui lòng xem console.");
        }
    }

    print() {
        const classTitleInput = document.getElementById('class-title').innerText;
        const classSubtitleInput = document.getElementById('class-subtitle').innerText;
        
        // Use a simple window.print approach with a special print stylesheet logic injected
        const originalContent = document.body.innerHTML;
        
        // Clone the capture area
        const printArea = this.captureArea.cloneNode(true);
        
        // Make the header visible in print
        printArea.querySelector('.export-header').style.display = 'block';
        printArea.querySelector('#export-title').innerText = classTitleInput;
        printArea.querySelector('#export-subtitle').innerText = classSubtitleInput;

        // Strip action buttons in print view
        printArea.querySelectorAll('.btn-remove-seat, .btn-lock-seat').forEach(btn => btn.remove());

        // Create a clean print environment
        const printWindow = window.open('', '', 'width=900,height=650');
        printWindow.document.write(`
            <html>
            <head>
                <title>In Sơ Đồ Lớp</title>
                <link rel="stylesheet" href="css/style.css">
                <style>
                    body {
                        background: white;
                        margin: 0;
                        padding: 20px;
                        display: flex;
                        justify-content: center;
                    }
                    .seating-wrapper {
                        box-shadow: none;
                        padding: 0;
                        width: 100%;
                        min-width: auto;
                    }
                    @page {
                        size: landscape;
                        margin: 1cm;
                    }
                </style>
            </head>
            <body>
                ${printArea.outerHTML}
                <script>
                    setTimeout(() => {
                        window.print();
                        window.close();
                    }, 500);
                </script>
            </body>
            </html>
        `);
        printWindow.document.close();
    }
}
