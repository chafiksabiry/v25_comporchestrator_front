import React, { useState } from 'react';
import {
  CheckCircle,
  XCircle,
  CreditCard,
  Building2,
  Users,
  Phone,
  BarChart,
  MessageSquare,
  HelpCircle
} from 'lucide-react';

const SubscriptionPlan = () => {
  const [selectedPlan, setSelectedPlan] = useState('standard');
  const [billingCycle, setBillingCycle] = useState('monthly');

  const plans = [
    {
      id: 'free',
      name: 'Free',
      price: { monthly: 0, annual: 0 },
      description: 'Perfect for trying out our services',
      features: [
        { name: 'Up to 5 active gigs', included: true },
        { name: 'Basic REP matching', included: true },
        { name: 'Standard support', included: true },
        { name: 'Basic analytics', included: true },
        { name: 'Single phone number', included: true },
        { name: 'Email support', included: true },
        { name: 'API access', included: false },
        { name: 'Custom branding', included: false },
        { name: 'Priority matching', included: false },
        { name: 'Advanced analytics', included: false }
      ]
    },
    {
      id: 'standard',
      name: 'Standard',
      price: { monthly: 99, annual: 990 },
      description: 'Great for growing businesses',
      features: [
        { name: 'Up to 20 active gigs', included: true },
        { name: 'Advanced REP matching', included: true },
        { name: 'Priority support', included: true },
        { name: 'Advanced analytics', included: true },
        { name: 'Multiple phone numbers', included: true },
        { name: 'Chat support', included: true },
        { name: 'API access', included: true },
        { name: 'Custom branding', included: true },
        { name: 'Priority matching', included: false },
        { name: 'White-label solution', included: false }
      ]
    },
    {
      id: 'premium',
      name: 'Premium',
      price: { monthly: 299, annual: 2990 },
      description: 'For enterprises with advanced needs',
      features: [
        { name: 'Unlimited active gigs', included: true },
        { name: 'Premium REP matching', included: true },
        { name: 'Dedicated support', included: true },
        { name: 'Enterprise analytics', included: true },
        { name: 'Unlimited phone numbers', included: true },
        { name: '24/7 phone support', included: true },
        { name: 'Advanced API access', included: true },
        { name: 'Custom branding', included: true },
        { name: 'Priority matching', included: true },
        { name: 'White-label solution', included: true }
      ]
    }
  ];

  const getFeatureIcon = (feature: string) => {
    switch (feature) {
      case 'Up to 5 active gigs':
      case 'Up to 20 active gigs':
      case 'Unlimited active gigs':
        return Building2;
      case 'Basic REP matching':
      case 'Advanced REP matching':
      case 'Premium REP matching':
        return Users;
      case 'Single phone number':
      case 'Multiple phone numbers':
      case 'Unlimited phone numbers':
        return Phone;
      case 'Basic analytics':
      case 'Advanced analytics':
      case 'Enterprise analytics':
        return BarChart;
      case 'Email support':
      case 'Chat support':
      case '24/7 phone support':
        return MessageSquare;
      default:
        return HelpCircle;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Choose Your Plan</h2>
          <p className="text-sm text-gray-500">Select the plan that best fits your needs</p>
        </div>
        <div className="flex items-center space-x-2 rounded-lg bg-gray-100 p-1">
          <button
            className={`rounded-md px-3 py-1.5 text-sm font-medium ${
              billingCycle === 'monthly'
                ? 'bg-white text-gray-900 shadow'
                : 'text-gray-500 hover:text-gray-900'
            }`}
            onClick={() => setBillingCycle('monthly')}
          >
            Monthly
          </button>
          <button
            className={`rounded-md px-3 py-1.5 text-sm font-medium ${
              billingCycle === 'annual'
                ? 'bg-white text-gray-900 shadow'
                : 'text-gray-500 hover:text-gray-900'
            }`}
            onClick={() => setBillingCycle('annual')}
          >
            Annual
            <span className="ml-1 text-xs text-green-600">Save 20%</span>
          </button>
        </div>
      </div>

      {/* Plan Comparison */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {plans.map((plan) => {
          const isSelected = selectedPlan === plan.id;
          return (
            <div
              key={plan.id}
              className={`relative rounded-lg bg-white p-6 shadow ${
                isSelected ? 'ring-2 ring-indigo-600' : ''
              }`}
            >
              {isSelected && (
                <div className="absolute -top-2 -right-2 rounded-full bg-indigo-600 p-1 text-white">
                  <CheckCircle className="h-4 w-4" />
                </div>
              )}
              <div className="mb-4">
                <h3 className="text-lg font-medium text-gray-900">{plan.name}</h3>
                <p className="mt-1 text-sm text-gray-500">{plan.description}</p>
              </div>
              <div className="mb-6">
                <p className="text-3xl font-bold text-gray-900">
                  ${plan.price[billingCycle]}
                  <span className="text-base font-normal text-gray-500">
                    /{billingCycle === 'monthly' ? 'mo' : 'yr'}
                  </span>
                </p>
              </div>
              <ul className="mb-6 space-y-4">
                {plan.features.map((feature, index) => {
                  const FeatureIcon = getFeatureIcon(feature.name);
                  return (
                    <li key={index} className="flex items-start">
                      {feature.included ? (
                        <CheckCircle className="mr-2 h-5 w-5 text-green-500" />
                      ) : (
                        <XCircle className="mr-2 h-5 w-5 text-gray-300" />
                      )}
                      <span
                        className={`text-sm ${
                          feature.included ? 'text-gray-900' : 'text-gray-500'
                        }`}
                      >
                        {feature.name}
                      </span>
                    </li>
                  );
                })}
              </ul>
              <button
                onClick={() => setSelectedPlan(plan.id)}
                className={`w-full rounded-lg px-4 py-2 text-sm font-medium ${
                  isSelected
                    ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                    : 'bg-white text-indigo-600 ring-1 ring-inset ring-indigo-200 hover:ring-indigo-300'
                }`}
              >
                {isSelected ? 'Current Plan' : 'Select Plan'}
              </button>
            </div>
          );
        })}
      </div>

      {/* Payment Information */}
      <div className="rounded-lg bg-white p-6 shadow">
        <h3 className="text-lg font-medium text-gray-900">Payment Information</h3>
        <div className="mt-6 grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
          <div className="sm:col-span-4">
            <label className="block text-sm font-medium text-gray-700">Card Number</label>
            <div className="mt-1 flex rounded-md shadow-sm">
              <span className="inline-flex items-center rounded-l-md border border-r-0 border-gray-300 bg-gray-50 px-3 text-gray-500 sm:text-sm">
                <CreditCard className="h-4 w-4" />
              </span>
              <input
                type="text"
                className="block w-full flex-1 rounded-none rounded-r-md border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                placeholder="4242 4242 4242 4242"
              />
            </div>
          </div>

          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700">Expiration</label>
            <input
              type="text"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              placeholder="MM/YY"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700">CVC</label>
            <input
              type="text"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              placeholder="123"
            />
          </div>

          <div className="sm:col-span-4">
            <label className="block text-sm font-medium text-gray-700">Name on Card</label>
            <input
              type="text"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              placeholder="John Smith"
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700">
            Confirm Subscription
          </button>
        </div>
      </div>

      {/* Additional Information */}
      <div className="rounded-lg bg-gray-50 p-6">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <HelpCircle className="h-5 w-5 text-gray-400" />
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-gray-900">Need help choosing?</h3>
            <div className="mt-2 text-sm text-gray-500">
              <p>
                Our team is here to help you select the best plan for your needs. Contact us for a
                personalized consultation.
              </p>
            </div>
            <div className="mt-4">
              <a
                href="#"
                className="text-sm font-medium text-indigo-600 hover:text-indigo-500"
              >
                Schedule a Call →
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionPlan;