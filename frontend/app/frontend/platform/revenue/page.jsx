"use client";

import React, { useEffect, useState } from 'react';

export default function PlatformRevenueCenter() {
  const [revenueData, setRevenueData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchRevenueData = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch('http://127.0.0.1:8000/api/v1/billing/platform-admin/revenue/', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (!res.ok) throw new Error('Failed to fetch revenue data');
        const data = await res.json();
        setRevenueData(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchRevenueData();
  }, []);

  if (loading) return <div className="p-8 text-center"><div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div><p>Loading Revenue Data...</p></div>;
  if (error) return <div className="p-8 text-center text-red-500">Error: {error}</div>;

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold mb-8 text-gray-800">Platform Revenue Center</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-2">Monthly Recurring Revenue (MRR)</h3>
            <p className="text-3xl font-bold text-gray-900">${parseFloat(revenueData.mrr).toFixed(2)}</p>
          </div>
          
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-2">Annual Run Rate (ARR)</h3>
            <p className="text-3xl font-bold text-gray-900">${parseFloat(revenueData.arr).toFixed(2)}</p>
          </div>
          
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-2">Active Subscriptions</h3>
            <p className="text-3xl font-bold text-gray-900">{revenueData.active_subscriptions}</p>
          </div>
        </div>

        <h2 className="text-2xl font-bold mb-6 text-gray-800 mt-12">Trailing 30 Days</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 border-l-4 border-l-green-500">
            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-2">New Subscriptions (30d)</h3>
            <p className="text-3xl font-bold text-gray-900">{revenueData.new_subscriptions_last_30_days}</p>
          </div>
          
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 border-l-4 border-l-red-500">
            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-2">Churned Subscriptions (30d)</h3>
            <p className="text-3xl font-bold text-gray-900">{revenueData.churned_subscriptions_last_30_days}</p>
          </div>
          
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 border-l-4 border-l-blue-500">
            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-2">Collected Revenue (30d)</h3>
            <p className="text-3xl font-bold text-gray-900">${parseFloat(revenueData.total_revenue_last_30_days).toFixed(2)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
