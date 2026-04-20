
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { callsApi, Call } from "../services/api/calls";
import {
  Phone,
  PhoneIncoming,
  PhoneOutgoing,
  PhoneMissed,
  Clock,
  Filter,
  Calendar,
  PhoneCall,
  MessageCircle,
  Share2,
  LineChart,
  PieChart,
  X,
  Info
} from 'lucide-react';
import { CallInterface } from '../components/CallInterface';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import { GlobalAIAssistant } from '../components/GlobalAIAssistant';
import { AIAssistantAPI } from '../components/GlobalAIAssistant';

interface ActiveCall {
  number: string;
  agentId: string;
  callId: string;
}

function CallsPanel() {
  const [activeFilter, setActiveFilter] = useState('all');
  const [activeCall, setActiveCall] = useState<ActiveCall | null>(null);
  const [allCalls, setCalls] = useState<Call[]>([]);
  const [showPhoneInput, setShowPhoneInput] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedProvider, setSelectedProvider] = useState<'twilio' | 'qalqul'>('twilio');
  const navigate = useNavigate();
  const { currentUser, loading: authLoading } = useAuth();

  useEffect(() => {
    AIAssistantAPI.showPanel();
    
    return () => {
      AIAssistantAPI.hidePanel();
    };
  }, []);

  const handleCall = (phoneNumber: string) => {
    const phoneRegex = /^(\+|00)([1-9]{1})\d{1,14}$/;
    if (phoneRegex.test(phoneNumber)) {
      if (!currentUser) {
        setError('You must be logged in to make calls');
        return;
      }
      setActiveCall({
        number: phoneNumber,
        agentId: currentUser.id,
        callId: `call_${Date.now()}`
      });
      setShowPhoneInput(false);
      setError('');
    } else {
      setError('Please enter a valid international phone number (e.g. +13024440090 or 0013024440090)');
    }
  };

  const fetchCalls = async () => {
    try {
      if (!currentUser?.id) return;
      
      const response = await axios.get(`${import.meta.env.VITE_API_URL_CALL}/api/calls`, {
        params: { userId: currentUser.id }
      });
      
       setCalls(response.data.data);
      //
      setLoading(false);
    } catch (error) {
      console.error('Error fetching calls:', error);
      setError('Failed to fetch calls');
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading) {
      fetchCalls();
    }
  }, [currentUser?.id, authLoading]);

  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-gray-500">Please log in to access calls.</p>
      </div>
    );
  }
  //
  return (
    <>
      <div className="space-y-6">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-rose-100 rounded-lg">
                <Phone className="w-6 h-6 text-rose-500" />
              </div>
              <h2 className="text-xl font-semibold">Calls Dashboard</h2>
            </div>
            {!showPhoneInput ? (
              <button
                onClick={() => setShowPhoneInput(true)}
                className="px-4 py-2 bg-rose-500 text-white rounded-lg hover:bg-rose-600"
              >
                New Call
              </button>
            ) : (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="Enter phone number"
                  className="px-4 py-2 border border-gray-300 rounded-lg"
                />
                <button
                  onClick={() => handleCall(phoneNumber)}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  Call
                </button>
              </div>
            )}
          </div>

          {error && (
            <div className="bg-red-100 text-red-600 text-sm p-3 rounded-lg mb-6">
              {error}
            </div>
          )}


          <div className="flex items-center gap-4 mb-6">
            <button
              className={`px-4 py-2 rounded-lg ${activeFilter === 'all'
                ? 'bg-rose-500 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              onClick={() => setActiveFilter('all')}
            >
              All Calls
            </button>
            <button
              className={`px-4 py-2 rounded-lg ${activeFilter === 'incoming'
                ? 'bg-rose-500 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              onClick={() => setActiveFilter('incoming')}
            >
              Incoming
            </button>
            <button
              className={`px-4 py-2 rounded-lg ${activeFilter === 'outgoing'
                ? 'bg-rose-500 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              onClick={() => setActiveFilter('outgoing')}
            >
              Outgoing
            </button>
            <button
              className={`px-4 py-2 rounded-lg ${activeFilter === 'missed'
                ? 'bg-rose-500 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              onClick={() => setActiveFilter('missed')}
            >
              Missed
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left border-b">
                  <th className="pb-3">Type</th>
                  <th className="pb-3">Customer</th>
                  <th className="pb-3">Time</th>
                  <th className="pb-3">Duration</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {Array.isArray(allCalls) && allCalls.map((call, index) => (
                  <tr key={call._id} className="hover:bg-gray-50">
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        {call.direction === "inbound" ? (
                          <PhoneIncoming className="w-5 h-5 text-green-600" />
                        ) : (
                          <PhoneOutgoing className="w-5 h-5 text-rose-500" />
                        )}
                        <span>{call.direction.charAt(0).toUpperCase() + call.direction.slice(1)}</span>
                      </div>
                    </td>
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        <img
                          src={`https://i.pravatar.cc/32?img=${index + 10}`}
                          alt="Customer"
                          className="w-8 h-8 rounded-full"
                        />
                        <div>
                          <div className="font-medium">{(call.lead) ? call.lead.name : ""}</div>
                          <div className="text-sm text-gray-500">{(call.lead) ? call.lead.phone : ""}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3">{new Date(call.createdAt).toLocaleString()}</td>
                    <td className="py-3">{call.duration} sec</td>
                    <td className="py-3">
                      <span
                        className={`px-2 py-1 rounded-full text-sm ${call.status === "completed"
                          ? "bg-green-100 text-green-600"
                          : call.status === "missed"
                            ? "bg-red-100 text-red-600"
                            : "bg-gray-100 text-gray-600"
                          }`}
                      >
                        {call.status ? call.status.charAt(0).toUpperCase() + call.status.slice(1) : ''}
                      </span>
                    </td>
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        <button
                          className="p-2 hover:bg-gray-100 rounded-lg"
                          onClick={() => handleCall(call.lead.phone)}
                        >
                          <PhoneCall className="w-5 h-5" />
                        </button>
                        <button className="p-2 hover:bg-gray-100 rounded-lg">
                          <MessageCircle className="w-5 h-5" />
                        </button>
                        <button
                          className="p-2 hover:bg-gray-100 rounded-lg"
                          onClick={() => navigate(`/call-report`, { state: { call } })}
                        >
                          <Info className="w-5 h-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <GlobalAIAssistant />

      {activeCall && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full relative">
            <button
              onClick={() => setActiveCall(null)}
              className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-full"
            >
              <X className="w-5 h-5" />
            </button>
            <CallInterface
              phoneNumber={activeCall.number}
              agentId={activeCall.agentId}
              onEnd={() => {
                setActiveCall(null);
              }}
              onCallSaved={fetchCalls}
              provider={selectedProvider}
              callId={activeCall.callId}
            />
          </div>
        </div>
      )}

      {showPhoneInput && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Call Provider
              </label>
              <div className="flex gap-4">
                <button
                  onClick={() => setSelectedProvider('twilio')}
                  className={`px-4 py-2 rounded-lg ${
                    selectedProvider === 'twilio'
                      ? 'bg-rose-500 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  Twilio
                </button>
                <button
                  onClick={() => setSelectedProvider('qalqul')}
                  className={`px-4 py-2 rounded-lg ${
                    selectedProvider === 'qalqul'
                      ? 'bg-rose-500 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  Qalqul
                </button>
              </div>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="Enter phone number"
                className="px-4 py-2 border border-gray-300 rounded-lg flex-1"
              />
              <button
                onClick={() => handleCall(phoneNumber)}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                Call
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default CallsPanel;
