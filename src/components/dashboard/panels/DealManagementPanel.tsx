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
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

function DealManagementPanel() {
  interface Deal {
    Deal_Name: ReactNode;
    id: string;
    name: string;
    company: string;
    status: string;
    value: number;
    Email_1: string;
    Telephony: string;
    Location: string;
    Stage: string;
    metadata?: {
      ai_analysis?: {
        score?: string;
      };
    };
    updated_at?: string;
  }

  const [deals, setDeals] = useState<Deal[]>([]);

  const fetchDeals = async () => {
    let accessToken = localStorage.getItem("zoho_access_token");
    if (!accessToken) {
        window.location.href = `${import.meta.env.VITE_COMPANY_API_URL}/zoho/auth`;
        return;
    }
    try {
      const response = await fetch(`${import.meta.env.VITE_COMPANY_API_URL}/zoho/deals`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error("Erreur lors de la récupération des deals");
      }

      const result = await response.json();
      const fetchedDeals = result.data.data;
      console.log("Deals récupérés :", fetchedDeals);

      // Afficher les deals un par un avec un délai
      for (let i = 0; i < fetchedDeals.length; i++) {
        setTimeout(() => {
          setDeals((prevDeals) => [...prevDeals, fetchedDeals[i]]);
        }, i * 1000); // délai de 1 seconde (1000 ms) entre chaque deal
      }
    } catch (error) {
      console.error("Erreur :", error);
    }
  };

  useEffect(() => {
    fetchDeals();
  }, []);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-rose-100 rounded-lg">
              <Users className="w-6 h-6 text-rose-500" />
            </div>
            <h2 className="text-xl font-semibold text-gray-800" onClick={fetchDeals}>
              Deal Management
            </h2>
          </div>
          <div className="flex gap-2">
            <button className="px-4 py-2 bg-gradient-to-r from-rose-500 to-purple-600 text-white rounded-lg hover:from-rose-600 hover:to-purple-700 transition-all duration-200 flex items-center gap-2 shadow-md hover:shadow-lg">
              <Upload className="w-5 h-5" />
              Import Deals
            </button>
          </div>
        </div>

        {/* Statistiques */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <StatCard
            icon={<Users className="w-5 h-5 text-rose-500" />}
            title="Total Deals"
            value={deals.length}
            trend="12% increase"
            trendColor="text-emerald-600"
            bgColor="bg-rose-50"
          />
          <StatCard
            icon={<DollarSign className="w-5 h-5 text-emerald-600" />}
            title="Total Value"
            value={`$${deals.reduce((total, deal) => total + (deal.value || 0), 0).toLocaleString()}`}
            trend="8% increase"
            trendColor="text-emerald-600"
            bgColor="bg-emerald-50"
          />
          <StatCard
            icon={<Brain className="w-5 h-5 text-fuchsia-600" />}
            title="AI Score"
            value="85%"
            trend="5% increase"
            trendColor="text-emerald-600"
            bgColor="bg-fuchsia-50"
          />
          <StatCard
            icon={<Clock className="w-5 h-5 text-amber-600" />}
            title="Avg Response"
            value="2.4h"
            trend="3% decrease"
            trendColor="text-red-600"
            bgColor="bg-amber-50"
          />
        </div>

        {/* Tableau des deals */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-gray-700">
              <thead className="bg-gradient-to-r from-purple-50 via-rose-50 to-rose-50">
                <tr className="border-b border-gray-200">
                  <th className="py-4 px-6 font-semibold text-gray-900">
                    Deal Details
                  </th>
                  <th className="py-4 px-6 font-semibold text-gray-900 text-center">
                    Stage
                  </th>
                  <th className="py-4 px-6 font-semibold text-gray-900 text-center">
                    Value
                  </th>
                  <th className="py-4 px-6 font-semibold text-gray-900 text-center">
                    AI Insights
                  </th>
                  <th className="py-4 px-6 font-semibold text-gray-900 text-center">
                    Last Contact
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {deals.map((deal) => (
                  <tr
                    key={deal.id}
                    className="hover:bg-gradient-to-r hover:from-purple-50/30 hover:to-rose-50/30 transition-all duration-300"
                  >
                    <td className="py-4 px-6">
                      <div className="space-y-2">
                        <div className="font-medium text-gray-900 text-base hover:text-rose-500 cursor-pointer transition-colors duration-200">
                          {deal.Deal_Name || "N/A"}
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <div className="text-sm text-gray-500 flex items-center gap-2 hover:text-rose-400 transition-colors duration-200">
                            <MapPin className="w-4 h-4 text-orange-400" />
                            {deal.Location || "N/A"}
                          </div>
                          <div className="text-sm text-gray-500 flex items-center gap-2 hover:text-rose-400 transition-colors duration-200">
                            <Phone className="w-4 h-4 text-orange-400" />
                            {deal.Telephony || "123-456-7890"}
                          </div>
                          <div className="text-sm text-gray-500 flex items-center gap-2 hover:text-rose-400 transition-colors duration-200">
                            <Mail className="w-4 h-4 text-orange-400" />
                            {deal.Email_1 || "abc@gmail.com"}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-center">
                      <span className="px-4 py-1.5 text-sm font-medium rounded-full bg-gradient-to-r from-rose-50 to-rose-50 text-rose-600 border border-rose-100 shadow-sm">
                        {deal.Stage || "N/A"}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-center">
                      <span className="font-semibold text-emerald-700">
                        ${deal.value?.toLocaleString()}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-center">
                      <span className="px-4 py-1.5 text-sm font-medium rounded-full bg-gradient-to-r from-emerald-50 to-green-50 text-emerald-700 border border-emerald-100 shadow-sm">
                        {deal.metadata?.ai_analysis?.score || "N/A"}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-center">
                      <span className="text-gray-600">
                        {deal.updated_at
                          ? new Date(deal.updated_at).toLocaleDateString()
                          : "N/A"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
  bgColor: string;
}

const StatCard: React.FC<StatCardProps> = ({
  icon,
  title,
  value,
  trend,
  trendColor,
  bgColor,
}) => (
  <div className={`${bgColor} p-4 rounded-lg border border-gray-200 hover:shadow-md transition-shadow duration-200`}>
    <div className="flex items-center gap-2 mb-2">
      {icon}
      <span className="font-medium text-gray-700">{title}</span>
    </div>
    <div className="text-2xl font-bold text-gray-900">{value}</div>
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

export default DealManagementPanel;
