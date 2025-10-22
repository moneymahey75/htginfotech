import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { CreditCard, Plus, Edit2, Trash2, Save, DollarSign, Key } from 'lucide-react';

interface StripeConfig {
    tsc_id: string;
    tsc_publishable_key: string;
    tsc_secret_key: string;
    tsc_webhook_secret: string;
    tsc_platform_fee_percentage: number;
    tsc_is_live_mode: boolean;
}

interface StripeConnectAccount {
    tsca_id: string;
    tsca_admin_id: string;
    tsca_account_name: string;
    tsca_stripe_account_id: string;
    tsca_is_active: boolean;
    tsca_default_split_percentage: number;
}

interface PaymentSplit {
    tps_id: string;
    tps_course_id: string | null;
    tps_stripe_account_id: string;
    tps_split_percentage: number;
    tps_is_active: boolean;
    tbl_courses?: {
        tc_title: string;
    };
    tbl_stripe_connect_accounts?: {
        tsca_account_name: string;
    };
}

const StripeConnectSettings: React.FC = () => {
    const [config, setConfig] = useState<StripeConfig | null>(null);
    const [accounts, setAccounts] = useState<StripeConnectAccount[]>([]);
    const [splits, setSplits] = useState<PaymentSplit[]>([]);
    const [courses, setCourses] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState(false);
    const [editingAccount, setEditingAccount] = useState<string | null>(null);
    const [addingAccount, setAddingAccount] = useState(false);
    const [addingSplit, setAddingSplit] = useState(false);

    const [formData, setFormData] = useState({
        tsc_publishable_key: '',
        tsc_secret_key: '',
        tsc_webhook_secret: '',
        tsc_platform_fee_percentage: 0,
        tsc_is_live_mode: false,
    });

    const [accountForm, setAccountForm] = useState({
        tsca_account_name: '',
        tsca_stripe_account_id: '',
        tsca_default_split_percentage: 0,
    });

    const [splitForm, setSplitForm] = useState({
        tps_course_id: '',
        tps_stripe_account_id: '',
        tps_split_percentage: 0,
    });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const [configData, accountsData, splitsData, coursesData] = await Promise.all([
                supabase.from('tbl_stripe_config').select('*').maybeSingle(),
                supabase.from('tbl_stripe_connect_accounts').select('*').order('tsca_account_name'),
                supabase.from('tbl_payment_splits').select(`
          *,
          tbl_courses(tc_title),
          tbl_stripe_connect_accounts(tsca_account_name)
        `).order('tps_course_id'),
                supabase.from('tbl_courses').select('tc_id, tc_title').eq('tc_is_active', true).order('tc_title')
            ]);

            if (configData.data) {
                setConfig(configData.data);
                setFormData(configData.data);
            }
            if (accountsData.data) setAccounts(accountsData.data);
            if (splitsData.data) setSplits(splitsData.data);
            if (coursesData.data) setCourses(coursesData.data);
        } catch (error) {
            console.error('Failed to load Stripe settings:', error);
        } finally {
            setLoading(false);
        }
    };

    const saveConfig = async () => {
        try {
            if (config) {
                await supabase.from('tbl_stripe_config').update(formData).eq('tsc_id', config.tsc_id);
            } else {
                await supabase.from('tbl_stripe_config').insert(formData);
            }
            setEditing(false);
            loadData();
        } catch (error) {
            console.error('Failed to save config:', error);
            alert('Failed to save configuration');
        }
    };

    const saveAccount = async () => {
        try {
            if (editingAccount) {
                await supabase.from('tbl_stripe_connect_accounts').update(accountForm).eq('tsca_id', editingAccount);
            } else {
                await supabase.from('tbl_stripe_connect_accounts').insert({
                    ...accountForm,
                    tsca_is_active: true
                });
            }
            setAddingAccount(false);
            setEditingAccount(null);
            setAccountForm({ tsca_account_name: '', tsca_stripe_account_id: '', tsca_default_split_percentage: 0 });
            loadData();
        } catch (error) {
            console.error('Failed to save account:', error);
            alert('Failed to save account');
        }
    };

    const deleteAccount = async (id: string) => {
        if (!confirm('Are you sure you want to delete this account?')) return;
        try {
            await supabase.from('tbl_stripe_connect_accounts').delete().eq('tsca_id', id);
            loadData();
        } catch (error) {
            console.error('Failed to delete account:', error);
            alert('Failed to delete account');
        }
    };

    const saveSplit = async () => {
        try {
            await supabase.from('tbl_payment_splits').insert({
                ...splitForm,
                tps_course_id: splitForm.tps_course_id || null,
                tps_is_active: true
            });
            setAddingSplit(false);
            setSplitForm({ tps_course_id: '', tps_stripe_account_id: '', tps_split_percentage: 0 });
            loadData();
        } catch (error) {
            console.error('Failed to save split:', error);
            alert('Failed to save payment split');
        }
    };

    const deleteSplit = async (id: string) => {
        if (!confirm('Are you sure you want to delete this split?')) return;
        try {
            await supabase.from('tbl_payment_splits').delete().eq('tps_id', id);
            loadData();
        } catch (error) {
            console.error('Failed to delete split:', error);
            alert('Failed to delete split');
        }
    };

    if (loading) {
        return <div className="animate-pulse">Loading Stripe settings...</div>;
    }

    return (
        <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center space-x-3">
                        <CreditCard className="h-6 w-6 text-blue-600" />
                        <h2 className="text-2xl font-bold text-gray-900">Stripe Connect Configuration</h2>
                    </div>
                </div>

                <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-6">
                    <p className="text-sm text-blue-700">
                        Configure your Stripe Connect settings to enable payment processing with payment splitting across multiple accounts.
                    </p>
                </div>

                <div className="space-y-6">
                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-gray-900">API Configuration</h3>
                            {!editing && config && (
                                <button
                                    onClick={() => setEditing(true)}
                                    className="text-blue-600 hover:text-blue-700 flex items-center space-x-1"
                                >
                                    <Edit2 className="h-4 w-4" />
                                    <span>Edit</span>
                                </button>
                            )}
                        </div>

                        {editing || !config ? (
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Publishable Key
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.tsc_publishable_key}
                                        onChange={(e) => setFormData({ ...formData, tsc_publishable_key: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                        placeholder="pk_test_..."
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Secret Key
                                    </label>
                                    <input
                                        type="password"
                                        value={formData.tsc_secret_key}
                                        onChange={(e) => setFormData({ ...formData, tsc_secret_key: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                        placeholder="sk_test_..."
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Webhook Secret (Optional)
                                    </label>
                                    <input
                                        type="password"
                                        value={formData.tsc_webhook_secret}
                                        onChange={(e) => setFormData({ ...formData, tsc_webhook_secret: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                        placeholder="whsec_..."
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Platform Fee Percentage
                                    </label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        max="100"
                                        value={formData.tsc_platform_fee_percentage}
                                        onChange={(e) => setFormData({ ...formData, tsc_platform_fee_percentage: parseFloat(e.target.value) })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>

                                <div className="flex items-center space-x-2">
                                    <input
                                        type="checkbox"
                                        checked={formData.tsc_is_live_mode}
                                        onChange={(e) => setFormData({ ...formData, tsc_is_live_mode: e.target.checked })}
                                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                    />
                                    <label className="text-sm text-gray-700">Live Mode (Production)</label>
                                </div>

                                <div className="flex space-x-3">
                                    <button
                                        onClick={saveConfig}
                                        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2"
                                    >
                                        <Save className="h-4 w-4" />
                                        <span>Save Configuration</span>
                                    </button>
                                    {editing && (
                                        <button
                                            onClick={() => {
                                                setEditing(false);
                                                setFormData(config || formData);
                                            }}
                                            className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300"
                                        >
                                            Cancel
                                        </button>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                                <div className="flex items-center space-x-2">
                                    <Key className="h-4 w-4 text-gray-400" />
                                    <span className="text-sm text-gray-600">Publishable Key:</span>
                                    <code className="text-sm font-mono">{config.tsc_publishable_key.substring(0, 20)}...</code>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <DollarSign className="h-4 w-4 text-gray-400" />
                                    <span className="text-sm text-gray-600">Platform Fee:</span>
                                    <span className="text-sm font-medium">{config.tsc_platform_fee_percentage}%</span>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <span className="text-sm text-gray-600">Mode:</span>
                                    <span className={`px-2 py-1 rounded text-xs font-medium ${config.tsc_is_live_mode ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                    {config.tsc_is_live_mode ? 'Live' : 'Test'}
                  </span>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="border-t pt-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-gray-900">Connected Accounts</h3>
                            <button
                                onClick={() => setAddingAccount(true)}
                                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2"
                            >
                                <Plus className="h-4 w-4" />
                                <span>Add Account</span>
                            </button>
                        </div>

                        {addingAccount && (
                            <div className="bg-gray-50 p-4 rounded-lg mb-4 space-y-3">
                                <input
                                    type="text"
                                    placeholder="Account Name"
                                    value={accountForm.tsca_account_name}
                                    onChange={(e) => setAccountForm({ ...accountForm, tsca_account_name: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                />
                                <input
                                    type="text"
                                    placeholder="Stripe Account ID (acct_...)"
                                    value={accountForm.tsca_stripe_account_id}
                                    onChange={(e) => setAccountForm({ ...accountForm, tsca_stripe_account_id: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                />
                                <input
                                    type="number"
                                    placeholder="Default Split %"
                                    step="0.01"
                                    value={accountForm.tsca_default_split_percentage}
                                    onChange={(e) => setAccountForm({ ...accountForm, tsca_default_split_percentage: parseFloat(e.target.value) })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                />
                                <div className="flex space-x-2">
                                    <button onClick={saveAccount} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
                                        Save
                                    </button>
                                    <button onClick={() => setAddingAccount(false)} className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg">
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        )}

                        <div className="space-y-3">
                            {accounts.map((account) => (
                                <div key={account.tsca_id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                                    <div>
                                        <div className="font-medium text-gray-900">{account.tsca_account_name}</div>
                                        <div className="text-sm text-gray-600">
                                            <code className="text-xs">{account.tsca_stripe_account_id}</code>
                                        </div>
                                        <div className="text-sm text-gray-500">Default split: {account.tsca_default_split_percentage}%</div>
                                    </div>
                                    <div className="flex items-center space-x-2">
                    <span className={`px-2 py-1 rounded text-xs ${account.tsca_is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {account.tsca_is_active ? 'Active' : 'Inactive'}
                    </span>
                                        <button
                                            onClick={() => deleteAccount(account.tsca_id)}
                                            className="text-red-600 hover:text-red-700"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="border-t pt-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-gray-900">Payment Splits</h3>
                            <button
                                onClick={() => setAddingSplit(true)}
                                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2"
                            >
                                <Plus className="h-4 w-4" />
                                <span>Add Split</span>
                            </button>
                        </div>

                        {addingSplit && (
                            <div className="bg-gray-50 p-4 rounded-lg mb-4 space-y-3">
                                <select
                                    value={splitForm.tps_course_id}
                                    onChange={(e) => setSplitForm({ ...splitForm, tps_course_id: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                >
                                    <option value="">Global (All Courses)</option>
                                    {courses.map((course) => (
                                        <option key={course.tc_id} value={course.tc_id}>{course.tc_title}</option>
                                    ))}
                                </select>
                                <select
                                    value={splitForm.tps_stripe_account_id}
                                    onChange={(e) => setSplitForm({ ...splitForm, tps_stripe_account_id: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                >
                                    <option value="">Select Account</option>
                                    {accounts.filter(a => a.tsca_is_active).map((account) => (
                                        <option key={account.tsca_id} value={account.tsca_id}>{account.tsca_account_name}</option>
                                    ))}
                                </select>
                                <input
                                    type="number"
                                    placeholder="Split Percentage"
                                    step="0.01"
                                    min="0"
                                    max="100"
                                    value={splitForm.tps_split_percentage}
                                    onChange={(e) => setSplitForm({ ...splitForm, tps_split_percentage: parseFloat(e.target.value) })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                />
                                <div className="flex space-x-2">
                                    <button onClick={saveSplit} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
                                        Save
                                    </button>
                                    <button onClick={() => setAddingSplit(false)} className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg">
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        )}

                        <div className="space-y-3">
                            {splits.map((split) => (
                                <div key={split.tps_id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                                    <div>
                                        <div className="font-medium text-gray-900">
                                            {split.tbl_courses?.tc_title || 'Global (All Courses)'}
                                        </div>
                                        <div className="text-sm text-gray-600">
                                            {split.tbl_stripe_connect_accounts?.tsca_account_name}
                                        </div>
                                        <div className="text-sm text-gray-500">{split.tps_split_percentage}%</div>
                                    </div>
                                    <button
                                        onClick={() => deleteSplit(split.tps_id)}
                                        className="text-red-600 hover:text-red-700"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StripeConnectSettings;