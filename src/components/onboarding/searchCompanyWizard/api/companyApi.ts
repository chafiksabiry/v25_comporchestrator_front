import axios from "axios";

const apiUrl = () => import.meta.env.VITE_COMPANY_API_URL;

export async function saveCompanyData(companyData: unknown) {
  const response = await axios.post(`${apiUrl()}/companies`, companyData, {
    headers: { "Content-Type": "application/json" },
  });
  return response.data;
}

/** Removes a company draft created by a legacy generate-profile that persisted to DB */
export async function discardDraftCompany(companyId: string) {
  await axios.delete(`${apiUrl()}/companies/${companyId}`);
}
