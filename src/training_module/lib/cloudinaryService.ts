// Cloudinary Upload Service for Frontend
// USES BACKEND API INSTEAD OF DIRECT CLOUDINARY ACCESS

const getApiBaseUrl = () => {
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL;
  }
  if (typeof window !== 'undefined') {
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    return isLocal ? 'http://localhost:5010' : 'https://v25platformtrainingbackend-production.up.railway.app';
  }
  return 'http://localhost:5010';
};

const API_BASE_URL = getApiBaseUrl();

const IMAGE_SIZE_LIMIT = (import.meta.env.VITE_CLOUDINARY_IMAGE_LIMIT_SIZE_BYTE || 10485760) as number; // 10MB
const DOCUMENT_SIZE_LIMIT = (import.meta.env.VITE_CLOUDINARY_DOCUMENT_LIMIT_SIZE_BYTE || 52428800) as number; // 50MB (PowerPoint can be large)
const VIDEO_SIZE_LIMIT = (import.meta.env.VITE_CLOUDINARY_VIDEO_LIMIT_SIZE_BYTE || 104857600) as number; // 100MB

export interface CloudinaryUploadResult {
  publicId: string;
  url: string;
  secureUrl: string;
  format: string;
  resourceType: string;
  bytes: number;
  width?: number;
  height?: number;
  duration?: number;
  thumbnailUrl?: string;
}

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

class CloudinaryService {
  private apiBaseUrl: string;

  constructor() {
    this.apiBaseUrl = API_BASE_URL;
  }

  /**
   * Upload an image to Cloudinary via Backend
   */
  async uploadImage(
    file: File,
    folder: string = 'trainings/images',
    onProgress?: (progress: UploadProgress) => void
  ): Promise<CloudinaryUploadResult> {
    this.validateImage(file);

    return this.uploadFileViaBackend(file, 'image', folder, onProgress);
  }

  /**
   * Upload a video to Cloudinary via Backend
   */
  async uploadVideo(
    file: File,
    folder: string = 'trainings/videos',
    onProgress?: (progress: UploadProgress) => void
  ): Promise<CloudinaryUploadResult> {
    this.validateVideo(file);

    return this.uploadFileViaBackend(file, 'video', folder, onProgress);
  }

  /**
   * Upload a document (PDF, Word, etc.) to Cloudinary via Backend
   */
  async uploadDocument(
    file: File,
    folder: string = 'trainings/documents',
    onProgress?: (progress: UploadProgress) => void
  ): Promise<CloudinaryUploadResult> {
    this.validateDocument(file);

    return this.uploadFileViaBackend(file, 'document', folder, onProgress);
  }

  /**
   * Upload any file to Cloudinary via Backend
   */
  private async uploadFileViaBackend(
    file: File,
    resourceType: 'image' | 'video' | 'document',
    folder: string,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<CloudinaryUploadResult> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder', folder);

    const url = `${this.apiBaseUrl}/api/upload/${resourceType}`;

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      // Track upload progress
      if (onProgress) {
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            const percentage = Math.round((e.loaded / e.total) * 100);
            onProgress({
              loaded: e.loaded,
              total: e.total,
              percentage,
            });
          }
        });
      }

      xhr.addEventListener('load', () => {
        if (xhr.status === 200) {
          const response = JSON.parse(xhr.responseText);

          const result: CloudinaryUploadResult = {
            publicId: response.publicId || response.public_id,
            url: response.url,
            secureUrl: response.secureUrl || response.secure_url,
            format: response.format,
            resourceType: response.resourceType || response.resource_type,
            bytes: response.bytes,
            width: response.width,
            height: response.height,
            duration: response.duration,
            thumbnailUrl: response.thumbnailUrl,
          };

          resolve(result);
        } else {
          // Parse error response
          let errorMessage = `Upload failed: ${xhr.statusText}`;
          try {
            const errorResponse = JSON.parse(xhr.responseText);
            errorMessage = errorResponse.error || errorResponse.message || errorMessage;
          } catch (e) {
            // Unable to parse error response
          }
          reject(new Error(errorMessage));
        }
      });

      xhr.addEventListener('error', () => {
        reject(new Error('Network error during upload. Make sure backend is running.'));
      });

      xhr.open('POST', url);
      xhr.send(formData);
    });
  }

  /**
   * Delete a file from Cloudinary via Backend
   */
  async deleteFile(publicId: string, resourceType: string = 'image'): Promise<void> {
    try {
      const response = await fetch(
        `${this.apiBaseUrl}/api/upload/${encodeURIComponent(publicId)}?resourceType=${resourceType}`,
        {
          method: 'DELETE',
        }
      );

      if (!response.ok) {
        throw new Error('Failed to delete file');
      }
    } catch (error) {
      console.error('Error deleting file:', error);
      throw error;
    }
  }

  // Validation methods
  private validateImage(file: File): void {
    if (!file.type.startsWith('image/')) {
      throw new Error('File must be an image');
    }

    if (file.size > IMAGE_SIZE_LIMIT) {
      const limitMB = IMAGE_SIZE_LIMIT / (1024 * 1024);
      throw new Error(`Image size must be less than ${limitMB}MB`);
    }
  }

  private validateVideo(file: File): void {
    if (!file.type.startsWith('video/')) {
      throw new Error('File must be a video');
    }

    if (file.size > VIDEO_SIZE_LIMIT) {
      const limitMB = VIDEO_SIZE_LIMIT / (1024 * 1024);
      throw new Error(`Video size must be less than ${limitMB}MB`);
    }
  }

  private validateDocument(file: File): void {
    const validTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    ];

    if (!validTypes.includes(file.type)) {
      throw new Error('File type not supported. Please upload PDF, Word, Excel, or PowerPoint files.');
    }

    if (file.size > DOCUMENT_SIZE_LIMIT) {
      const limitMB = DOCUMENT_SIZE_LIMIT / (1024 * 1024);
      throw new Error(`Document size must be less than ${limitMB}MB`);
    }
  }

  /**
   * Get file size in human-readable format
   */
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  }

  /**
   * Extract YouTube video ID from URL
   */
  extractYouTubeId(url: string): string | null {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  }

  /**
   * Generate YouTube embed URL
   */
  getYouTubeEmbedUrl(videoId: string): string {
    return `https://www.youtube.com/embed/${videoId}`;
  }
}

// Export singleton instance
export const cloudinaryService = new CloudinaryService();

