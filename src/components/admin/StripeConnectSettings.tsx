import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../lib/adminClient';
import { AlertCircle, CheckCircle, ChevronDown, CreditCard, Save, Settings2 } from 'lucide-react';
type ControllerLossesPayments = 'stripe' | 'application';
type ControllerFeesPayer = 'account' | 'application';
type ControllerRequirementCollection = 'stripe' | 'application';
type StripeDashboardType = 'full' | 'express' | 'none';
type AccountRole = 'primary_recipient' | 'secondary_recipient';
type SupportedCurrency = 'aud' | 'usd' | 'inr';

interface StripeConfig {
    tsc_id?: string;
    tsc_publishable_key: string;
    tsc_secret_key: string;
    tsc_is_live_mode: boolean;
    tsc_default_currency: SupportedCurrency;
    tsc_split_primary_percentage: number;
    tsc_split_secondary_percentage: number;
    tsc_split_is_fixed: boolean;
    tsc_connect_enabled: boolean;
}

interface StripeConnectAccount {
    tsca_id?: string;
    tsca_account_role: AccountRole;
    tsca_account_name: string;
    tsca_stripe_account_id: string;
    tsca_is_active: boolean;
    tsca_default_split_percentage: number;
    tsca_controller_losses_payments: ControllerLossesPayments;
    tsca_controller_fees_payer: ControllerFeesPayer;
    tsca_controller_requirement_collection: ControllerRequirementCollection;
    tsca_controller_stripe_dashboard_type: StripeDashboardType;
    tsca_capabilities_transfers_requested: boolean;
}

const defaultConfig: StripeConfig = {
    tsc_publishable_key: '',
    tsc_secret_key: '',
    tsc_is_live_mode: false,
    tsc_default_currency: 'aud',
    tsc_split_primary_percentage: 70,
    tsc_split_secondary_percentage: 30,
    tsc_split_is_fixed: true,
    tsc_connect_enabled: false,
};

const createDefaultAccount = (
    role: AccountRole,
    name: string,
    splitPercentage: number
): StripeConnectAccount => ({
    tsca_account_role: role,
    tsca_account_name: name,
    tsca_stripe_account_id: '',
    tsca_is_active: true,
    tsca_default_split_percentage: splitPercentage,
    tsca_controller_losses_payments: 'stripe',
    tsca_controller_fees_payer: 'account',
    tsca_controller_requirement_collection: 'stripe',
    tsca_controller_stripe_dashboard_type: 'full',
    tsca_capabilities_transfers_requested: true,
});

const StripeConnectSettings: React.FC = () => {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [config, setConfig] = useState<StripeConfig>(defaultConfig);
    const [primaryAccount, setPrimaryAccount] = useState<StripeConnectAccount>(
        createDefaultAccount('primary_recipient', 'Primary Recipient', 70)
    );
    const [secondaryAccount, setSecondaryAccount] = useState<StripeConnectAccount>(
        createDefaultAccount('secondary_recipient', 'Secondary Recipient', 30)
    );

    useEffect(() => {
        loadData();
    }, []);

    const totalSplit = useMemo(
        () =>
            Number(config.tsc_split_primary_percentage || 0) +
            Number(config.tsc_split_secondary_percentage || 0),
        [config.tsc_split_primary_percentage, config.tsc_split_secondary_percentage]
    );

    const normalizeSplitPercentage = (value: number) => {
        if (!Number.isFinite(value)) {
            return 0;
        }

        return Math.min(100, Math.max(0, Number(value.toFixed(2))));
    };

    const normalizeCurrency = (value: unknown): SupportedCurrency => {
        const normalized = String(value || '')
            .trim()
            .toLowerCase();

        if (normalized === 'aud' || normalized === 'usd' || normalized === 'inr') {
            return normalized;
        }

        return 'aud';
    };

    const parseSystemSettingValue = (value: unknown) => {
        if (typeof value !== 'string') {
            return value;
        }

        try {
            return JSON.parse(value);
        } catch {
            return value;
        }
    };

    const isMissingColumnError = (error: any) => {
        const message = String(error?.message || error || '');
        return (
            /column .* does not exist/i.test(message) ||
            /could not find the '.*' column of '.*' in the schema cache/i.test(message)
        );
    };

    const loadData = async () => {
        try {
            setLoading(true);
            setError('');

            const [configResponse, accountsResponse, connectEnabledSettingResponse, accountSelectionSettingsResponse, currencySettingResponse] = await Promise.all([
                supabase.from('tbl_stripe_config').select('*').maybeSingle(),
                supabase
                    .from('tbl_stripe_connect_accounts')
                    .select('*')
                    .order('tsca_created_at', { ascending: true }),
                supabase
                    .from('tbl_system_settings')
                    .select('tss_setting_value')
                    .eq('tss_setting_key', 'stripe_connect_enabled')
                    .maybeSingle(),
                supabase
                    .from('tbl_system_settings')
                    .select('tss_setting_key, tss_setting_value')
                    .in('tss_setting_key', [
                        'stripe_primary_connect_account_id',
                        'stripe_secondary_connect_account_id',
                    ]),
                supabase
                    .from('tbl_system_settings')
                    .select('tss_setting_value')
                    .eq('tss_setting_key', 'stripe_default_currency')
                    .maybeSingle(),
            ]);

            if (configResponse.error) {
                throw configResponse.error;
            }

            if (accountsResponse.error) {
                throw accountsResponse.error;
            }

            if (
                connectEnabledSettingResponse.error &&
                !isMissingColumnError(connectEnabledSettingResponse.error)
            ) {
                throw connectEnabledSettingResponse.error;
            }

            if (
                accountSelectionSettingsResponse.error &&
                !isMissingColumnError(accountSelectionSettingsResponse.error)
            ) {
                throw accountSelectionSettingsResponse.error;
            }

            if (
                currencySettingResponse.error &&
                !isMissingColumnError(currencySettingResponse.error)
            ) {
                throw currencySettingResponse.error;
            }

            const configData = configResponse.data;
            const accounts = accountsResponse.data || [];
            const accountSelectionSettings = (accountSelectionSettingsResponse.data || []).reduce<Record<string, string>>(
                (acc, row: any) => {
                    acc[row.tss_setting_key] = String(parseSystemSettingValue(row.tss_setting_value) || '');
                    return acc;
                },
                {}
            );
            const fallbackConnectEnabled = (() => {
                const rawValue = parseSystemSettingValue(connectEnabledSettingResponse.data?.tss_setting_value);

                if (typeof rawValue === 'boolean') {
                    return rawValue;
                }

                if (typeof rawValue === 'string') {
                    try {
                        return Boolean(JSON.parse(rawValue));
                    } catch {
                        return rawValue === 'true';
                    }
                }

                return false;
            })();
            const fallbackCurrency = normalizeCurrency(
                parseSystemSettingValue(currencySettingResponse.data?.tss_setting_value)
            );
            const configuredSecondaryId = accountSelectionSettings.stripe_secondary_connect_account_id;
            const secondary =
                accounts.find((account) => account.tsca_id === configuredSecondaryId) ||
                accounts.find((account) => account.tsca_account_role === 'secondary_recipient') ||
                accounts[accounts.length - 1] ||
                accounts[0];

            if (configData) {
                setConfig({
                    tsc_id: configData.tsc_id,
                    tsc_publishable_key: configData.tsc_publishable_key || '',
                    tsc_secret_key: configData.tsc_secret_key || '',
                    tsc_is_live_mode: Boolean(configData.tsc_is_live_mode),
                    tsc_default_currency: normalizeCurrency(configData.tsc_default_currency ?? fallbackCurrency),
                    tsc_split_primary_percentage: Number(configData.tsc_split_primary_percentage ?? 70),
                    tsc_split_secondary_percentage: Number(configData.tsc_split_secondary_percentage ?? 30),
                    tsc_split_is_fixed: configData.tsc_split_is_fixed ?? true,
                    tsc_connect_enabled: configData.tsc_connect_enabled ?? fallbackConnectEnabled,
                });
            } else {
                setConfig({
                    ...defaultConfig,
                    tsc_default_currency: fallbackCurrency,
                    tsc_connect_enabled: fallbackConnectEnabled,
                });
            }

            setPrimaryAccount(
                createDefaultAccount(
                    'primary_recipient',
                    'Platform Account',
                    Number(configData?.tsc_split_primary_percentage ?? 70)
                )
            );

            setSecondaryAccount(
                secondary
                    ? {
                          ...createDefaultAccount(
                              'secondary_recipient',
                              secondary.tsca_account_name || 'Secondary Recipient',
                              Number(secondary.tsca_default_split_percentage || 30)
                          ),
                          ...secondary,
                          tsca_account_role: 'secondary_recipient',
                      }
                    : createDefaultAccount(
                          'secondary_recipient',
                          'Secondary Recipient',
                          Number(configData?.tsc_split_secondary_percentage ?? 30)
                      )
            );
        } catch (loadError: any) {
            console.error('Failed to load Stripe Connect settings:', loadError);
            setError(loadError.message || 'Failed to load Stripe Connect settings.');
        } finally {
            setLoading(false);
        }
    };

    const updateConfig = <K extends keyof StripeConfig>(key: K, value: StripeConfig[K]) => {
        setConfig((prev) => ({ ...prev, [key]: value }));
    };

    const updateAccount = (
        role: AccountRole,
        key: keyof StripeConnectAccount,
        value: string | boolean | number
    ) => {
        const setter = role === 'primary_recipient' ? setPrimaryAccount : setSecondaryAccount;
        setter((prev) => ({ ...prev, [key]: value }));
    };

    const validateForm = () => {
        if (!config.tsc_publishable_key.trim()) {
            return 'Publishable key is required.';
        }

        if (!config.tsc_secret_key.trim()) {
            return 'Secret key is required.';
        }

        if (!secondaryAccount.tsca_account_name.trim() || !secondaryAccount.tsca_stripe_account_id.trim()) {
            return 'Secondary recipient account name and Stripe account ID are required.';
        }

        if (totalSplit !== 100) {
            return 'Split percentages must total 100%.';
        }

        return '';
    };

    const upsertRecipientAccount = async (account: StripeConnectAccount, splitPercentage: number) => {
        const payload = {
            tsca_account_role: account.tsca_account_role,
            tsca_account_name: account.tsca_account_name.trim(),
            tsca_stripe_account_id: account.tsca_stripe_account_id.trim(),
            tsca_is_active: account.tsca_is_active,
            tsca_default_split_percentage: splitPercentage,
            tsca_controller_losses_payments: account.tsca_controller_losses_payments,
            tsca_controller_fees_payer: account.tsca_controller_fees_payer,
            tsca_controller_requirement_collection: account.tsca_controller_requirement_collection,
            tsca_controller_stripe_dashboard_type: account.tsca_controller_stripe_dashboard_type,
            tsca_capabilities_transfers_requested: account.tsca_capabilities_transfers_requested,
        };

        const legacyPayload = {
            tsca_account_name: account.tsca_account_name.trim(),
            tsca_stripe_account_id: account.tsca_stripe_account_id.trim(),
            tsca_is_active: account.tsca_is_active,
            tsca_default_split_percentage: splitPercentage,
        };

        const executeQuery = async (queryPayload: typeof payload | typeof legacyPayload) => {
            const query = account.tsca_id
                ? supabase
                      .from('tbl_stripe_connect_accounts')
                      .update(queryPayload)
                      .eq('tsca_id', account.tsca_id)
                      .select()
                      .single()
                : supabase.from('tbl_stripe_connect_accounts').insert(queryPayload).select().single();

            return query;
        };

        let { data, error: upsertError } = await executeQuery(payload);

        if (upsertError && isMissingColumnError(upsertError)) {
            ({ data, error: upsertError } = await executeQuery(legacyPayload));
        }

        if (upsertError) {
            throw upsertError;
        }

        return data;
    };

    const syncGlobalSplits = async (secondaryId: string) => {
        const { error: deleteError } = await supabase
            .from('tbl_payment_splits')
            .delete()
            .is('tps_course_id', null);

        if (deleteError) {
            throw deleteError;
        }

        const { error: insertError } = await supabase.from('tbl_payment_splits').insert(
            {
                tps_course_id: null,
                tps_stripe_account_id: secondaryId,
                tps_split_percentage: config.tsc_split_secondary_percentage,
                tps_is_active: secondaryAccount.tsca_is_active,
            }
        );

        if (insertError) {
            throw insertError;
        }
    };

    const saveSystemSetting = async (
        key: string,
        value: string,
        description: string
    ) => {
        const existingSettingResponse = await supabase
            .from('tbl_system_settings')
            .select('tss_setting_key')
            .eq('tss_setting_key', key)
            .limit(1)
            .maybeSingle();

        if (existingSettingResponse.error) {
            throw existingSettingResponse.error;
        }

        if (existingSettingResponse.data?.tss_setting_key) {
            const { error } = await supabase
                .from('tbl_system_settings')
                .update({
                    tss_setting_value: value,
                    tss_description: description,
                })
                .eq('tss_setting_key', key);

            if (error) {
                throw error;
            }

            return;
        }

        const { error } = await supabase.from('tbl_system_settings').insert({
            tss_setting_key: key,
            tss_setting_value: value,
            tss_description: description,
        });

        if (error) {
            throw error;
        }
    };

    const syncAccountSelectionSettings = async (secondaryId: string) => {
        await saveSystemSetting(
            'stripe_secondary_connect_account_id',
            JSON.stringify(secondaryId),
            'Secondary Stripe Connect recipient account ID'
        );
    };

    const handleSave = async () => {
        const validationMessage = validateForm();
        if (validationMessage) {
            setError(validationMessage);
            setSuccess('');
            return;
        }

        try {
            setSaving(true);
            setError('');
            setSuccess('');

            const configPayload = {
                tsc_publishable_key: config.tsc_publishable_key.trim(),
                tsc_secret_key: config.tsc_secret_key.trim(),
                tsc_is_live_mode: config.tsc_is_live_mode,
                tsc_default_currency: config.tsc_default_currency.trim().toLowerCase(),
                tsc_split_primary_percentage: Number(config.tsc_split_primary_percentage || 0),
                tsc_split_secondary_percentage: Number(config.tsc_split_secondary_percentage || 0),
                tsc_split_is_fixed: true,
                tsc_connect_enabled: config.tsc_connect_enabled,
            };

            const legacyConfigPayload = {
                tsc_publishable_key: config.tsc_publishable_key.trim(),
                tsc_secret_key: config.tsc_secret_key.trim(),
                tsc_is_live_mode: config.tsc_is_live_mode,
            };

            const executeConfigQuery = async (queryPayload: typeof configPayload | typeof legacyConfigPayload) => {
                const configQuery = config.tsc_id
                    ? supabase.from('tbl_stripe_config').update(queryPayload).eq('tsc_id', config.tsc_id)
                    : supabase.from('tbl_stripe_config').insert(queryPayload);

                return configQuery;
            };

            let { error: configError } = await executeConfigQuery(configPayload);
            let usedLegacyFallback = false;

            if (configError && isMissingColumnError(configError)) {
                usedLegacyFallback = true;
                ({ error: configError } = await executeConfigQuery(legacyConfigPayload));
            }

            if (configError) {
                throw new Error(`Stripe config save failed: ${configError.message || configError}`);
            }

            try {
                await saveSystemSetting(
                    'stripe_connect_enabled',
                    JSON.stringify(config.tsc_connect_enabled),
                    'Enable or disable Stripe Connect split payment configuration'
                );
            } catch (settingError: any) {
                throw new Error(`Stripe connect toggle save failed: ${settingError?.message || settingError}`);
            }

            try {
                await saveSystemSetting(
                    'stripe_default_currency',
                    JSON.stringify(normalizeCurrency(config.tsc_default_currency)),
                    'Default Stripe payment currency'
                );
            } catch (currencySettingError: any) {
                throw new Error(`Stripe currency save failed: ${currencySettingError?.message || currencySettingError}`);
            }

            let savedSecondary;
            try {
                savedSecondary = await upsertRecipientAccount(
                    secondaryAccount,
                    Number(config.tsc_split_secondary_percentage || 0)
                );
            } catch (secondaryError: any) {
                throw new Error(`Secondary recipient account save failed: ${secondaryError?.message || secondaryError}`);
            }

            try {
                await syncGlobalSplits(savedSecondary.tsca_id);
            } catch (splitSyncError: any) {
                throw new Error(`Global split sync failed: ${splitSyncError?.message || splitSyncError}`);
            }

            try {
                await syncAccountSelectionSettings(savedSecondary.tsca_id);
            } catch (accountSelectionError: any) {
                console.warn('Primary/secondary account selection save skipped:', accountSelectionError);
            }

            setSuccess(
                usedLegacyFallback
                    ? 'Stripe Connect settings saved successfully using legacy database fields.'
                    : 'Stripe Connect configuration saved successfully.'
            );
            await loadData();
        } catch (saveError: any) {
            console.error('Failed to save Stripe Connect settings:', saveError);
            setError(saveError.message || 'Failed to save Stripe Connect settings.');
        } finally {
            setSaving(false);
        }
    };

    const renderAccountCard = (
        title: string,
        description: string,
        role: AccountRole,
        account: StripeConnectAccount,
        splitPercentage: number
    ) => (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-4">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
                    <p className="text-sm text-gray-600 mt-1">{description}</p>
                </div>
                <div className="text-right">
                    <div className="text-sm text-gray-500">Fixed split</div>
                    <div className="text-2xl font-bold text-blue-700">{splitPercentage}%</div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Account Label</label>
                    <input
                        type="text"
                        value={account.tsca_account_name}
                        onChange={(e) => updateAccount(role, 'tsca_account_name', e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Primary Admin Stripe Account"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Stripe Account ID</label>
                    <input
                        type="text"
                        value={account.tsca_stripe_account_id}
                        onChange={(e) => updateAccount(role, 'tsca_stripe_account_id', e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="acct_..."
                    />
                </div>
            </div>

            <div className="flex flex-wrap gap-6 pt-2">
                <label className="flex items-center space-x-3">
                    <input
                        type="checkbox"
                        checked={account.tsca_capabilities_transfers_requested}
                        onChange={(e) =>
                            updateAccount(role, 'tsca_capabilities_transfers_requested', e.target.checked)
                        }
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">Request `transfers` capability</span>
                </label>

                <label className="flex items-center space-x-3">
                    <input
                        type="checkbox"
                        checked={account.tsca_is_active}
                        onChange={(e) => updateAccount(role, 'tsca_is_active', e.target.checked)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">Account active</span>
                </label>
            </div>
        </div>
    );

    if (loading) {
        return <div className="animate-pulse text-gray-600">Loading Stripe Connect settings...</div>;
    }

    return (
        <div className="space-y-6">
            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center">
                    <AlertCircle className="h-5 w-5 mr-2" />
                    {error}
                </div>
            )}

            {success && (
                <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-center">
                    <CheckCircle className="h-5 w-5 mr-2" />
                    {success}
                </div>
            )}

            <div className="bg-white rounded-xl shadow-sm p-6">
                <div className="flex items-start gap-4">
                    <div className="bg-blue-100 p-3 rounded-lg">
                        <CreditCard className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900">Stripe Connect Configuration</h2>
                        <p className="text-gray-600 mt-1">
                            Configure Stripe Connect for separate charges and transfers with two fixed recipient accounts.
                        </p>
                    </div>
                </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
                <div className="flex items-start gap-3">
                    <Settings2 className="h-5 w-5 text-blue-700 mt-0.5" />
                    <div className="space-y-2 text-sm text-blue-900">
                        <p>
                            This setup now uses <strong>separate charges and transfers</strong>. The customer payment is
                            collected on your platform first, your configured primary share stays on the platform,
                            and Stripe transfers only the secondary share to the connected account.
                        </p>
                        <p>
                            Use this feature when you need one course payment to be split between your platform and one
                            connected recipient. Enter the secondary connected account ID, keep the percentages at 100%
                            total, and Stripe will transfer only the secondary percentage after the platform charge succeeds.
                        </p>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6 space-y-6">
                <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Platform API Settings</h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Publishable Key</label>
                            <input
                                type="text"
                                value={config.tsc_publishable_key}
                                onChange={(e) => updateConfig('tsc_publishable_key', e.target.value)}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder="pk_test_..."
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Secret Key</label>
                            <input
                                type="password"
                                value={config.tsc_secret_key}
                                onChange={(e) => updateConfig('tsc_secret_key', e.target.value)}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder="sk_test_..."
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_auto_auto] gap-4 mt-6 items-end">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Default Currency</label>
                            <div className="relative">
                                <select
                                    value={config.tsc_default_currency}
                                    onChange={(e) =>
                                        updateConfig('tsc_default_currency', normalizeCurrency(e.target.value))
                                    }
                                    className="w-full appearance-none bg-white px-4 py-3 pr-11 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                >
                                    <option value="aud">AUD</option>
                                    <option value="usd">USD</option>
                                    <option value="inr">INR</option>
                                </select>
                                <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                            </div>
                        </div>
                        <label className="flex items-center space-x-3 h-[52px] px-4 border border-gray-300 rounded-lg">
                            <input
                                type="checkbox"
                                checked={config.tsc_connect_enabled}
                                onChange={(e) => updateConfig('tsc_connect_enabled', e.target.checked)}
                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="text-sm text-gray-700">Enable Stripe Connect configuration</span>
                        </label>

                        <label className="flex items-center space-x-3 h-[52px] px-4 border border-gray-300 rounded-lg">
                            <input
                                type="checkbox"
                                checked={config.tsc_is_live_mode}
                                onChange={(e) => updateConfig('tsc_is_live_mode', e.target.checked)}
                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="text-sm text-gray-700">Live mode</span>
                        </label>
                    </div>
                </div>

                <div className="border-t border-gray-200 pt-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Fixed Split Settings</h3>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Primary Split %</label>
                            <input
                                type="number"
                                min="0"
                                max="100"
                                step="0.01"
                                value={config.tsc_split_primary_percentage}
                                onChange={(e) => {
                                    const nextValue = normalizeSplitPercentage(Number(e.target.value || 0));
                                    updateConfig('tsc_split_primary_percentage', nextValue);
                                    updateConfig('tsc_split_secondary_percentage', normalizeSplitPercentage(100 - nextValue));
                                }}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Secondary Split %</label>
                            <input
                                type="number"
                                min="0"
                                max="100"
                                step="0.01"
                                value={config.tsc_split_secondary_percentage}
                                onChange={(e) => {
                                    const nextValue = normalizeSplitPercentage(Number(e.target.value || 0));
                                    updateConfig('tsc_split_secondary_percentage', nextValue);
                                    updateConfig('tsc_split_primary_percentage', normalizeSplitPercentage(100 - nextValue));
                                }}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </div>

                        <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3">
                            <div className="text-sm font-medium text-gray-700">Split Total</div>
                            <div className={`text-2xl font-bold ${totalSplit === 100 ? 'text-green-700' : 'text-red-700'}`}>
                                {totalSplit}%
                            </div>
                            <div className="text-xs text-gray-500 mt-1">The two percentages must equal 100%.</div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-4">
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900">Platform Retained Share</h3>
                        <p className="text-sm text-gray-600 mt-1">
                            This percentage remains in your platform Stripe account after payment. No connected-account transfer is created for this portion.
                        </p>
                    </div>
                    <div className="text-right">
                        <div className="text-sm text-gray-500">Platform keeps</div>
                        <div className="text-2xl font-bold text-blue-700">{config.tsc_split_primary_percentage}%</div>
                    </div>
                </div>
            </div>

            {renderAccountCard(
                'Secondary Connected Account',
                'Connected Stripe account that receives its configured share from the platform charge after payment succeeds.',
                'secondary_recipient',
                secondaryAccount,
                config.tsc_split_secondary_percentage
            )}

            <div className="flex justify-end">
                <button
                    type="button"
                    onClick={handleSave}
                    disabled={saving}
                    className={`px-6 py-3 rounded-lg text-white font-medium flex items-center space-x-2 ${
                        saving ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
                    }`}
                >
                    <Save className="h-4 w-4" />
                    <span>{saving ? 'Saving...' : 'Save Stripe Connect Settings'}</span>
                </button>
            </div>
        </div>
    );
};

export default StripeConnectSettings;
