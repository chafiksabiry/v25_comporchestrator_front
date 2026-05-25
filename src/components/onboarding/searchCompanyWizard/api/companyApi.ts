import axios from "axios";
import Cookies from "js-cookie";

const apiUrl = () => import.meta.env.VITE_COMPANY_API_URL;

export function extractApiError(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data;
    if (typeof data === "string" && data.trim()) return data;
    if (data && typeof data === "object") {
      const o = data as Record<string, unknown>;
      if (typeof o.message === "string" && o.message.trim()) return o.message;
      if (typeof o.error === "string" && o.error.trim()) return o.error;
      if (Array.isArray(o.errors)) {
        return o.errors.map((e) => String(e)).join(", ");
      }
      if (o.errors && typeof o.errors === "object") {
        return Object.values(o.errors as Record<string, unknown>)
          .map((v) => String(v))
          .join(", ");
      }
    }
    return err.message || `HTTP ${err.response?.status ?? "error"}`;
  }
  if (err instanceof Error) return err.message;
  return "Request failed";
}

export async function saveCompanyData(companyData: unknown) {
  const response = await axios.post(`${apiUrl()}/companies`, companyData, {
    headers: { "Content-Type": "application/json" },
  });
  return response.data;
}

/** Update an existing company (use when companyId cookie already set — avoids duplicate create 400). */
export async function updateCompanyData(companyId: string, companyData: unknown) {
  const response = await axios.put(`${apiUrl()}/companies/${companyId}`, companyData, {
    headers: { "Content-Type": "application/json" },
  });
  return response.data;
}

/**
 * Create or update company profile. Prefers PUT when `companyId` cookie matches an existing record.
 */
export async function publishCompanyData(companyData: unknown): Promise<{ _id: string; data?: unknown }> {
  const existingId = Cookies.get("companyId");
  if (existingId) {
    try {
      const response = await updateCompanyData(existingId, companyData);
      const id =
        response?.data?._id ?? response?.data?.id ?? existingId;
      return { _id: String(id), data: response.data };
    } catch (putErr) {
      const message = extractApiError(putErr);
      throw new Error(
        message ||
          "Impossible de mettre à jour la société existante. Vérifiez les champs obligatoires (nom, description)."
      );
    }
  }

  try {
    const response = await saveCompanyData(companyData);
    const id = response?.data?._id ?? response?.data?.id;
    if (!id) {
      throw new Error("Réponse API sans identifiant société (_id).");
    }
    return { _id: String(id), data: response.data };
  } catch (postErr) {
    throw new Error(extractApiError(postErr));
  }
}

/** Removes a company draft created by a legacy generate-profile that persisted to DB */
export async function discardDraftCompany(companyId: string) {
  await axios.delete(`${apiUrl()}/companies/${companyId}`);
}
