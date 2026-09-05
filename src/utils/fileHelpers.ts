import { ResolutionAttachment } from '../types';

export function getAttachmentType(fileName: string, mimeType?: string): ResolutionAttachment['type'] {
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  
  if (ext === 'pdf' || mimeType?.includes('pdf')) {
    return 'pdf';
  }
  if (['xlsx', 'xls', 'csv', 'ods'].includes(ext) || mimeType?.includes('sheet') || mimeType?.includes('excel') || mimeType?.includes('csv')) {
    return 'excel';
  }
  if (['docx', 'doc', 'odt', 'rtf'].includes(ext) || mimeType?.includes('word') || mimeType?.includes('document')) {
    return 'word';
  }
  if (['pptx', 'ppt', 'odp'].includes(ext) || mimeType?.includes('presentation') || mimeType?.includes('powerpoint')) {
    return 'powerpoint';
  }
  if (['png', 'jpg', 'jpeg', 'svg', 'webp', 'gif'].includes(ext) || mimeType?.startsWith('image/')) {
    return 'image';
  }
  return 'other';
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function downloadAttachment(attachment: ResolutionAttachment) {
  if (!attachment.dataUrl) {
    // Generate dummy downloadable file if no base64 content
    const blob = new Blob([`Inhalt des Dokuments: ${attachment.name}`], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = attachment.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    return;
  }

  const a = document.createElement('a');
  a.href = attachment.dataUrl;
  a.download = attachment.name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
