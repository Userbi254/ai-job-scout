import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { CVData } from '@/types/job';

// A4 dimensions in mm
const A4_WIDTH_MM = 210;
const A4_HEIGHT_MM = 297;

export async function generateDirectPDF(cvData: CVData, templateName: string = 'cascade'): Promise<void> {
    const originalElement = document.getElementById('cv-preview');
    if (!originalElement) {
        console.error('CV Preview element not found');
        return;
    }

    try {
        // 1. Clone the element to manipulate it without affecting the UI
        const container = document.createElement('div');
        container.style.position = 'absolute';
        container.style.left = '-9999px';
        container.style.top = '0';
        container.style.width = `${originalElement.offsetWidth}px`; // Maintain original width
        document.body.appendChild(container);

        const clonedElement = originalElement.cloneNode(true) as HTMLElement;
        container.appendChild(clonedElement);

        // 2. Calculate Page Height in Pixels
        const contentWidth = clonedElement.offsetWidth;
        const pageHeightPx = contentWidth * (A4_HEIGHT_MM / A4_WIDTH_MM);

        // 3. Smart Pagination Logic (Spacer Based)
        const applySmartBreaks = (root: HTMLElement) => {
            // Target only top-level blocks that are safe to move.
            // We avoid targeting generic 'div's inside grids or flex-rows.
            // 'section' is usually a safe container in our templates.
            // '.mb-6' is also used for major blocks.
            // We explicitly exclude anything inside a grid.

            const candidates = root.querySelectorAll('section, .mb-6, .p-6 > div');

            const elements = Array.from(candidates).map(el => ({
                el: el as HTMLElement,
                rect: (el as HTMLElement).getBoundingClientRect()
            })).sort((a, b) => a.rect.top - b.rect.top);

            elements.forEach(({ el }) => {
                // Safety check: Don't insert spacers inside a grid or horizontal flex container
                const parentStyle = window.getComputedStyle(el.parentElement as Element);
                if (parentStyle.display === 'grid' || (parentStyle.display === 'flex' && parentStyle.flexDirection === 'row')) {
                    return;
                }

                // Re-measure because previous spacers might have shifted things
                const rect = el.getBoundingClientRect();
                const containerRect = container.getBoundingClientRect();
                const elTop = rect.top - containerRect.top;
                const elHeight = el.offsetHeight;
                const elBottom = elTop + elHeight;

                // Find which page this element starts on
                const startPage = Math.floor(elTop / pageHeightPx);
                const endPage = Math.floor(elBottom / pageHeightPx);

                // If element crosses a page boundary
                if (startPage !== endPage) {
                    // Calculate how much to push down to start on the next page
                    const nextPageStart = (startPage + 1) * pageHeightPx;
                    const diff = nextPageStart - elTop;

                    // Create a spacer
                    const spacer = document.createElement('div');
                    spacer.style.height = `${diff + 20}px`; // 20px safety buffer
                    spacer.style.width = '100%';
                    spacer.style.display = 'block';
                    spacer.setAttribute('data-pdf-spacer', 'true');

                    // Insert before the element
                    if (el.parentNode) {
                        el.parentNode.insertBefore(spacer, el);
                    }
                }
            });
        };

        // Apply to the clone
        applySmartBreaks(clonedElement);

        // 4. Capture with higher scale for better text quality
        const canvas = await html2canvas(clonedElement, {
            scale: 3, // High quality
            useCORS: true,
            logging: false,
            backgroundColor: '#ffffff'
        });

        // Cleanup
        document.body.removeChild(container);

        const imgData = canvas.toDataURL('image/png');
        const imgWidth = A4_WIDTH_MM;
        const imgHeight = (canvas.height * A4_WIDTH_MM) / canvas.width;

        const doc = new jsPDF('p', 'mm', 'a4');

        let heightLeft = imgHeight;
        let position = 0;

        // First page
        doc.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= A4_HEIGHT_MM;

        // Subsequent pages
        while (heightLeft > 0) {
            // Calculate position for next page
            const currentPage = doc.getNumberOfPages();
            const shift = currentPage * A4_HEIGHT_MM;

            doc.addPage();
            doc.addImage(imgData, 'PNG', 0, -shift, imgWidth, imgHeight);
            heightLeft -= A4_HEIGHT_MM;
        }

        const fileName = `${cvData.fullName.replace(/\s+/g, '_')}_CV.pdf`;
        doc.save(fileName);

    } catch (error) {
        console.error('Error generating PDF:', error);
        throw error;
    }
}
