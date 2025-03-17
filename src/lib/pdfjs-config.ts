declare global {
  interface Window {
    electron?: any;
  }
}

import { pdfjs } from 'react-pdf';

if (window.electron) {
  // For Electron environment
  if (window.location.protocol === 'file:') {
    if (window.electron.isPackaged) {
      pdfjs.GlobalWorkerOptions.workerSrc = `app://pdf.worker.min.js`;
    } else {
      const basePath = window.location.href.substring(0, window.location.href.lastIndexOf('/') + 1);
      pdfjs.GlobalWorkerOptions.workerSrc = `${basePath}pdf.worker.min.js`;
    }
  } else {
    pdfjs.GlobalWorkerOptions.workerSrc = `${window.location.origin}/pdf.worker.min.js`;
  }
} else {
  // For web environment
  pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.mjs`;
}

export default pdfjs; 