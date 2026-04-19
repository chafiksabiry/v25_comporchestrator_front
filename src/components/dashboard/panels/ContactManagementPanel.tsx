import React, { ReactNode, useEffect, useState } from "react";
import {
  Users,
  Search,
  Filter,
  Plus,
  Upload,
  ArrowUpRight,
  ArrowDownRight,
  DollarSign,
  Brain,
  Clock,
  Building2,
  MapPin,
  Phone,
  Mail,
} from "lucide-react";

function ContactManagementPanel() {
  interface Contact {
    id: string;
    First_Name: string;
    Last_Name: string;
    Email_1: string;
    Phone: string;
    Address: string;
    Postal_Code: string;
    City: string;
    Date_of_Birth: string;
    Stage: string;
    Pipeline: string;
    updatedAt: string;
    metadata?: {
      ai_analysis?: {
        score?: string;
      };
    };
  }

  const [contacts, setContacts] = useState<Contact[]>([]);

  const fetchContacts = async () => {
    let accessToken = localStorage.getItem("zoho_access_token");
    if (!accessToken) {
      window.location.href = `${import.meta.env.VITE_COMPANY_API_URL}/zoho/auth`;
      return;
    }

    try {
      const response = await fetch(`${import.meta.env.VITE_COMPANY_API_URL}/zoho/contacts`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error("Erreur lors de la récupération des contacts");
      }

      const result = await response.json();
      setContacts(result.data); // Backend returns the array in .data
      console.log("Contacts récupérés :", result.data);
    } catch (error) {
      console.error("Erreur :", error);
    }
  };


  useEffect(() => {
    fetchContacts();
  }, []);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-rose-100 rounded-lg">
              <Users className="w-6 h-6 text-rose-500" />
            </div>
            <h2 className="text-xl font-semibold" onClick={fetchContacts}>
              Contact Management
            </h2>
          </div>
          <div className="flex gap-2">
            <button className="px-4 py-2 bg-rose-500 text-white rounded-lg hover:bg-rose-600 flex items-center gap-2">
              <Upload className="w-5 h-5" />
              Import Contacts
            </button>
          </div>
        </div>

        {/* Statistiques */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <StatCard
            icon={<Users className="w-5 h-5 text-rose-500" />}
            title="Total Contacts"
            value={contacts.length}
            trend="12% increase"
            trendColor="text-green-600"
          />
          <StatCard
            icon={<DollarSign className="w-5 h-5 text-green-600" />}
            title="Total Value"
            value={`$${contacts
              .reduce((total, contact) => total + (contact.value || 0), 0)
              .toLocaleString()}`}
            trend="8% increase"
            trendColor="text-green-600"
          />
          <StatCard
            icon={<Brain className="w-5 h-5 text-purple-600" />}
            title="AI Score"
            value="85%"
            trend="5% increase"
            trendColor="text-green-600"
          />
          <StatCard
            icon={<Clock className="w-5 h-5 text-yellow-600" />}
            title="Avg Response"
            value="2.4h"
            trend="3% decrease"
            trendColor="text-red-600"
          />
        </div>

        {/* Tableau des contacts */}
        <div className="overflow-x-auto max-h-screen border border-gray-200 rounded-lg shadow-lg">
          <table className="w-full text-sm text-gray-700">
            <thead className="sticky top-0 bg-gray-100">
              <tr className="text-left border-b bg-gray-50 text-center">
                <th className="py-3 px-3 font-semibold text-gray-600 uppercase text-xs">Last Name</th>
                <th className="py-3 px-3 font-semibold text-gray-600 uppercase text-xs">First Name</th>
                <th className="py-3 px-3 font-semibold text-gray-600 uppercase text-xs">Email</th>
                <th className="py-3 px-3 font-semibold text-gray-600 uppercase text-xs">Address</th>
                <th className="py-3 px-3 font-semibold text-gray-600 uppercase text-xs">Postal Code</th>
                <th className="py-3 px-3 font-semibold text-gray-600 uppercase text-xs">City</th>
                <th className="py-3 px-3 font-semibold text-gray-600 uppercase text-xs">Date of Birth</th>
                <th className="py-3 px-3 font-semibold text-gray-600 uppercase text-xs">Mobile</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {contacts.map((contact) => (
                <tr
                  key={contact.id}
                  className="hover:bg-gray-50 transition duration-300 text-center divide-x border-b"
                >
                  <td className="py-3 px-3 text-gray-900">{contact.Last_Name || "-"}</td>
                  <td className="py-3 px-3 text-gray-900">{contact.First_Name || "-"}</td>
                  <td className="py-3 px-3 text-rose-500 italic font-medium">{contact.Email_1 || "-"}</td>
                  <td className="py-3 px-3 text-gray-600">{contact.Address || "-"}</td>
                  <td className="py-3 px-3 text-gray-900">{contact.Postal_Code || "-"}</td>
                  <td className="py-3 px-3 text-gray-900">{contact.City || "-"}</td>
                  <td className="py-3 px-3 text-gray-900">{contact.Date_of_Birth || "-"}</td>
                  <td className="py-3 px-3 font-semibold text-gray-900">{contact.Phone || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

interface StatCardProps {
  icon: React.ReactNode;
  title: string;
  value: string | number;
  trend: string;
  trendColor: string;
}

const StatCard: React.FC<StatCardProps> = ({
  icon,
  title,
  value,
  trend,
  trendColor,
}) => (
  <div className="bg-gray-50 p-4 rounded-lg">
    <div className="flex items-center gap-2 mb-2">
      {icon}
      <span className="font-medium">{title}</span>
    </div>
    <div className="text-2xl font-bold">{value}</div>
    <div className={`text-sm flex items-center gap-1 ${trendColor}`}>
      {trend.includes("increase") ? (
        <ArrowUpRight className="w-4 h-4" />
      ) : (
        <ArrowDownRight className="w-4 h-4" />
      )}
      {trend}
    </div>
  </div>
);

export default ContactManagementPanel;
