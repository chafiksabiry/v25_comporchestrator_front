import axios from "axios";

const apiUrl = () => import.meta.env.VITE_COMPANY_API_URL;

export interface UploadImageResponse {
  success: boolean;
  url: string;
  publicId?: string;
}

export async function uploadImage(file: File, folder = "harx/companies/logos"): Promise<UploadImageResponse> {
  const form = new FormData();
  form.append("file", file);
  form.append("folder", folder);

  const res = await axios.post<UploadImageResponse>(`${apiUrl()}/uploads/image`, form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
}
