import { pdfjs } from 'react-pdf';
import './pdfjs-config';

export async function extractTextFromPDF(file: File): Promise<string> {
    let blobUrl: string | null = null;

    try {
        blobUrl = URL.createObjectURL(file);

        const loadingTask = pdfjs.getDocument({
            url: blobUrl,
            cMapUrl: 'https://unpkg.com/pdfjs-dist@5.0.375/cmaps/',
            cMapPacked: true,
        });

        const pdf = await loadingTask.promise;
        const numPages = pdf.numPages;
        let extractedText = '';

        for (let pageNumber = 1; pageNumber <= numPages; pageNumber++) {
            const page = await pdf.getPage(pageNumber);
            const textContent = await page.getTextContent();
            const pageText = textContent.items.map((item: any) => item.str).join(' ');

            extractedText += pageText + '\n\n';
        }

        return extractedText.trim();
    } catch (error) {
        console.error('Error extracting text from PDF:', error);
        throw new Error(`Failed to extract text from PDF: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
        if (blobUrl) {
            URL.revokeObjectURL(blobUrl);
        }
    }
}
