import { toast } from 'sonner';
import { ApiResponse } from '../types/api';
import { ApiService } from './api.service';

export type UploadType = 'invoice' | 'evidence' | 'profile' | 'product' | 'document';

export interface UploadResponse {
  url: string;
  filename: string;
  mimeType: string;
  size: number;
  uploadedAt: string;
}

export class UploadService {
  private apiService: ApiService;

  constructor() {
    this.apiService = ApiService.getInstance();
  }

  async uploadFile(file: File, type?: UploadType): Promise<ApiResponse<UploadResponse>> {
    try {
      const formData = new FormData();
      formData.append('file', file);
      if (type) {
        formData.append('type', type);
      }

      const response = await this.apiService.post<ApiResponse<UploadResponse>>('/upload', formData);
      return response.data;
    } catch (error) {
      toast.error('Failed to upload file');
      throw error;
    }
  }
}
