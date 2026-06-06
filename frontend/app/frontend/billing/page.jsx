"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function CustomerBillingPortal() {
  const [subscription, setSubscription] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [processing, setProcessing] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetchBillingData();
  }, []);

  const fetchBillingData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const headers = { 'Authorization': `Bearer ${token}` };

      // Fetch active subscription
      const subRes = await fetch('http://127.0.0.1:8000/api/v1/billing/subscription/', { headers });
      if (subRes.ok) {
        const subData = await subRes.json();
        if (subData.results && subData.results.length > 0) {
          setSubscription(subData.results[0]);
        }
      }

      // Fetch invoices
      const invRes = await fetch('http://127.0.0.1:8000/api/v1/billing/invoices/', { headers });
      if (invRes.ok) {
        const invData = await invRes.json();
        setInvoices(invData.results || []);
      }

      // Fetch available plans
      const planRes = await fetch('http://127.0.0.1:8000/api/v1/billing/plans/', { headers });
      if (planRes.ok) {
        const planData = await planRes.json();
        setPlans(planData.results || []);
      }

    } catch (err) {
      setError("Failed to load billing data");
    } finally {
      setLoading(false);
    }
  };

  const handleCheckout = async (planId) => {
    try {
      setProcessing(true);
      const token = localStorage.getItem('token');
      const res = await fetch('http://127.0.0.1:8000/api/v1/billing/create-checkout-session/', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          plan_id: planId,
          billing_cycle: 'monthly',
          success_url: window.location.href,
          cancel_url: window.location.href
        })
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      alert("Failed to initiate checkout");
    } finally {
      setProcessing(false);
    }
  };

  const handleChangePlan = async (planId) => {
    if (!confirm("Are you sure you want to change your plan?")) return;
    try {
      setProcessing(true);
      const token = localStorage.getItem('token');
      const res = await fetch('http://127.0.0.1:8000/api/v1/billing/change-plan/', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ plan_id: planId })
      });
      if (res.ok) {
        alert("Plan changed successfully!");
        fetchBillingData();
      }
    } catch (err) {
      alert("Failed to change plan");
    } finally {
      setProcessing(false);
    }
  };

  const handleCancelSubscription = async () => {
    if (!confirm("Are you sure you want to cancel your subscription? You will lose access at the end of the billing period.")) return;
    try {
      setProcessing(true);
      const token = localStorage.getItem('token');
      const res = await fetch('http://127.0.0.1:8000/api/v1/billing/cancel-subscription/', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (res.ok) {
        alert("Subscription cancelled.");
        fetchBillingData();
      }
    } catch (err) {
      alert("Failed to cancel subscription");
    } finally {
      setProcessing(false);
    }
  };

  if (loading) return <div className="p-8 text-center"><div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div><p>Loading Billing Information...</p></div>;

  return (
    <div className="min-h-screen bg-gray-50 p-8 text-gray-900">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Subscription Status */}
        <section className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
            <h2 className="text-xl font-bold text-gray-800">Current Subscription</h2>
            {subscription && (
              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                subscription.status === 'active' ? 'bg-green-100 text-green-800' :
                subscription.status === 'trialing' ? 'bg-blue-100 text-blue-800' :
                subscription.status === 'grace_period' ? 'bg-yellow-100 text-yellow-800' :
                subscription.status === 'past_due' ? 'bg-red-100 text-red-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {subscription.status.replace('_', ' ').toUpperCase()}
              </span>
            )}
          </div>
          
          <div className="p-6">
            {subscription ? (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm text-gray-500">Plan</p>
                    <p className="text-lg font-semibold">{subscription.plan?.name || "Unknown"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Price</p>
                    <p className="text-lg font-semibold">${subscription.locked_price} / {subscription.billing_cycle}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Next Billing Date</p>
                    <p className="text-lg font-semibold">
                      {subscription.next_billing_date ? new Date(subscription.next_billing_date).toLocaleDateString() : "N/A"}
                    </p>
                  </div>
                </div>

                {subscription.cancel_at_period_end && (
                  <div className="bg-yellow-50 text-yellow-800 p-4 rounded-md text-sm mt-4">
                    Your subscription is scheduled to cancel at the end of the current billing period.
                  </div>
                )}

                {subscription.status === 'grace_period' && (
                  <div className="bg-red-50 text-red-800 p-4 rounded-md text-sm mt-4 border border-red-200">
                    <strong>Payment Failed!</strong> Your latest payment failed. You are in a grace period until {new Date(subscription.grace_period_ends_at).toLocaleDateString()}. Please update your payment method to avoid suspension.
                  </div>
                )}

                <div className="flex justify-end space-x-3 pt-4 border-t border-gray-100 mt-6">
                  {subscription.status !== 'cancelled' && !subscription.cancel_at_period_end && (
                    <button 
                      onClick={handleCancelSubscription}
                      disabled={processing}
                      className="px-4 py-2 text-sm text-red-600 bg-red-50 hover:bg-red-100 rounded-md transition"
                    >
                      Cancel Subscription
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500 mb-4">You do not have an active subscription.</p>
              </div>
            )}
          </div>
        </section>

        {/* Available Plans */}
        <section>
          <h2 className="text-xl font-bold text-gray-800 mb-4">Available Plans</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {plans.map(plan => (
              <div key={plan.id} className={`bg-white rounded-xl shadow-sm border p-6 flex flex-col ${subscription?.plan?.id === plan.id ? 'border-blue-500 ring-2 ring-blue-100' : 'border-gray-100'}`}>
                <h3 className="text-lg font-bold text-gray-900 mb-2">{plan.name}</h3>
                <p className="text-3xl font-extrabold text-gray-900 mb-4">${plan.base_price_monthly}<span className="text-sm font-normal text-gray-500">/mo</span></p>
                <p className="text-sm text-gray-600 flex-grow mb-6">{plan.description}</p>
                
                {subscription?.plan?.id === plan.id ? (
                  <button disabled className="w-full py-2 bg-gray-100 text-gray-500 rounded-md font-medium cursor-not-allowed">
                    Current Plan
                  </button>
                ) : subscription ? (
                  <button 
                    onClick={() => handleChangePlan(plan.id)}
                    disabled={processing}
                    className="w-full py-2 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-md font-medium transition"
                  >
                    Switch to {plan.name}
                  </button>
                ) : (
                  <button 
                    onClick={() => handleCheckout(plan.id)}
                    disabled={processing}
                    className="w-full py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-md font-medium transition"
                  >
                    Subscribe
                  </button>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Invoices */}
        <section className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100 bg-gray-50">
            <h2 className="text-xl font-bold text-gray-800">Billing History</h2>
          </div>
          <div className="p-0">
            {invoices.length > 0 ? (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-white border-b border-gray-100">
                    <th className="p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Amount</th>
                    <th className="p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Invoice</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {invoices.map(inv => (
                    <tr key={inv.id} className="hover:bg-gray-50 transition">
                      <td className="p-4 text-sm text-gray-900">{new Date(inv.created_at).toLocaleDateString()}</td>
                      <td className="p-4 text-sm font-medium text-gray-900">${inv.amount_paid || inv.amount_due}</td>
                      <td className="p-4">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          inv.status === 'paid' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {inv.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        {inv.pdf_url ? (
                          <a href={inv.pdf_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 text-sm font-medium">Download</a>
                        ) : (
                          <span className="text-gray-400 text-sm">N/A</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="p-8 text-center text-gray-500">
                No invoices found.
              </div>
            )}
          </div>
        </section>

      </div>
    </div>
  );
}
