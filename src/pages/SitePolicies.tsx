import React, { useState } from 'react';
import { AlertTriangle, CheckCircle, Eye, FileText, Shield } from 'lucide-react';
import ManagedContent from '../components/content/ManagedContent';
import { ContentKey } from '../lib/content';

const tabs: Array<{ id: string; key: ContentKey; label: string; icon: typeof FileText }> = [
  { id: 'terms', key: 'terms_of_service', label: 'Terms of Service', icon: FileText },
  { id: 'privacy', key: 'privacy_policy', label: 'Privacy Policy', icon: Eye },
  { id: 'security', key: 'security_policy', label: 'Security Policy', icon: Shield },
  { id: 'refund', key: 'refund_policy', label: 'Refund Policy', icon: AlertTriangle },
  { id: 'compliance', key: 'compliance', label: 'Compliance', icon: CheckCircle },
];

const SitePolicies: React.FC = () => {
  const [activeTab, setActiveTab] = useState('terms');
  const selectedTab = tabs.find((tab) => tab.id === activeTab) || tabs[0];

  return (
    <div className="min-h-screen bg-gray-50">
      <section className="bg-gradient-to-r from-gray-900 to-indigo-900 text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center space-x-2 bg-white/10 backdrop-blur-sm rounded-full px-6 py-3 mb-6 border border-white/20">
            <Shield className="h-5 w-5" />
            <span className="text-sm font-medium">Legal & Policies</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-bold mb-6">Site Policies</h1>
          <p className="text-xl md:text-2xl text-gray-300 max-w-3xl mx-auto">
            Transparent policies that protect your rights and ensure a safe, secure platform experience.
          </p>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="bg-white rounded-2xl shadow-lg mb-8">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-6 overflow-x-auto px-5 sm:space-x-8 sm:px-6">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'border-indigo-500 text-indigo-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <tab.icon className="h-4 w-4" />
                  <span>{tab.label}</span>
                </button>
              ))}
            </nav>
          </div>

          <div className="px-5 pb-5 pt-4 sm:px-8 sm:pb-8 sm:pt-5">
            <ManagedContent contentKey={selectedTab.key} className="policy-content" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default SitePolicies;
