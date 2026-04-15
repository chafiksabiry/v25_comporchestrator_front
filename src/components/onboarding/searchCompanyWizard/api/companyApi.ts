import axios from "axios";

export async function saveCompanyData(companyData: unknown) {
  const response = await axios.post(`${import.meta.env.VITE_COMPANY_API_URL}/companies`, companyData, {
    headers: { "Content-Type": "application/json" },
  });
  return response.data;
}
