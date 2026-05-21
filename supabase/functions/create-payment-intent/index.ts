import { createClient } from "npm:@supabase/supabase-js@2.54.0";
import Stripe from "npm:stripe@17.5.0";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers":
        "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
    if (req.method === "OPTIONS") {
        return new Response(null, {
            status: 200,
            headers: corsHeaders,
        });
    }

    try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        const { courseId, userId, amount } = await req.json();

        if (!courseId || !userId || !amount) {
            throw new Error("Missing required fields: courseId, userId, amount");
        }

        // Check if user is already enrolled
        const { data: existingEnrollment } = await supabase
            .from("tbl_course_enrollments")
            .select("tce_id")
            .eq("tce_user_id", userId)
            .eq("tce_course_id", courseId)
            .maybeSingle();

        if (existingEnrollment) {
            throw new Error("You are already enrolled in this course");
        }

        const { data: stripeConfigArray, error: configError } = await supabase
            .from("tbl_stripe_config")
            .select("*")
            .limit(1);

        if (configError || !stripeConfigArray || stripeConfigArray.length === 0) {
            throw new Error("Stripe configuration not found");
        }

        const stripeConfig = stripeConfigArray[0];

        if (!stripeConfig.tsc_publishable_key || !stripeConfig.tsc_secret_key) {
            throw new Error("Stripe configuration is incomplete");
        }

        const stripe = new Stripe(stripeConfig.tsc_secret_key, {
            apiVersion: "2024-11-20.acacia",
        });

        const { data: currencySettingRow } = await supabase
            .from("tbl_system_settings")
            .select("tss_setting_value")
            .eq("tss_setting_key", "stripe_default_currency")
            .maybeSingle();

        const { data: courseArray, error: courseError } = await supabase
            .from("tbl_courses")
            .select("tc_id, tc_title, tc_price, tc_pricing_type, tc_access_days, tc_duration_hours")
            .eq("tc_id", courseId)
            .limit(1);

        if (courseError || !courseArray || courseArray.length === 0) {
            throw new Error("Course not found");
        }

        const course = courseArray[0];

        const loadSecondaryTransferConfiguration = async () => {
            const primarySplitPercentage = Number(stripeConfig.tsc_split_primary_percentage ?? 70);
            const secondarySplitPercentage = Number(stripeConfig.tsc_split_secondary_percentage ?? 30);
            const configTotal = primarySplitPercentage + secondarySplitPercentage;

            if (Math.round(configTotal * 100) !== 10000) {
                throw new Error("Admin Stripe split percentages must total 100%.");
            }

            const { data: accountRows, error: accountsError } = await supabase
                .from("tbl_stripe_connect_accounts")
                .select(`
                    tsca_id,
                    tsca_account_name,
                    tsca_stripe_account_id,
                    tsca_is_active
                `)
                .eq("tsca_is_active", true)
                .order("tsca_created_at", { ascending: true });

            if (accountsError) {
                throw accountsError;
            }

            const activeAccounts = accountRows || [];

            const { data: globalSplitRows, error: globalSplitsError } = await supabase
                .from("tbl_payment_splits")
                .select(`
                    tps_id,
                    tps_split_percentage,
                    tps_created_at,
                    tbl_stripe_connect_accounts (
                        tsca_id,
                        tsca_account_name,
                        tsca_stripe_account_id,
                        tsca_is_active
                    )
                `)
                .is("tps_course_id", null)
                .eq("tps_is_active", true)
                .order("tps_created_at", { ascending: true });

            if (globalSplitsError) {
                throw globalSplitsError;
            }

            const normalizedGlobalSplits = (globalSplitRows || [])
                .map((split: any) => {
                    const account = Array.isArray(split.tbl_stripe_connect_accounts)
                        ? split.tbl_stripe_connect_accounts[0]
                        : split.tbl_stripe_connect_accounts;

                    if (!account || !account.tsca_is_active || !account.tsca_stripe_account_id) {
                        return null;
                    }

                    return {
                        account_id: account.tsca_id,
                        account_name: account.tsca_account_name,
                        stripe_account_id: account.tsca_stripe_account_id,
                        split_percentage: Number(split.tps_split_percentage || 0),
                        created_at: split.tps_created_at,
                    };
                })
                .filter(Boolean);

            const { data: accountSelectionSettingsRows, error: accountSelectionSettingsError } = await supabase
                .from("tbl_system_settings")
                .select("tss_setting_key, tss_setting_value")
                .in("tss_setting_key", ["stripe_secondary_connect_account_id"]);

            let configuredSecondaryAccount: any = null;
            if (!accountSelectionSettingsError) {
                const accountSelectionSettings = (accountSelectionSettingsRows || []).reduce(
                    (acc: Record<string, string>, row: any) => {
                        const rawValue = row.tss_setting_value;
                        acc[row.tss_setting_key] = typeof rawValue === "string"
                            ? rawValue.replace(/^"(.*)"$/, "$1")
                            : String(rawValue || "");
                        return acc;
                    },
                    {},
                );
                const configuredSecondaryId = accountSelectionSettings.stripe_secondary_connect_account_id;
                configuredSecondaryAccount = configuredSecondaryId
                    ? activeAccounts.find((account: any) => account.tsca_id === configuredSecondaryId)
                    : null;
            }

            let secondaryAccount =
                normalizedGlobalSplits.find(
                    (split: any) => Math.round(Number(split.split_percentage || 0) * 100) === Math.round(secondarySplitPercentage * 100),
                ) || configuredSecondaryAccount;

            const { data: roleBasedAccounts, error: roleBasedAccountsError } = await supabase
                .from("tbl_stripe_connect_accounts")
                .select(`
                    tsca_id,
                    tsca_account_name,
                    tsca_stripe_account_id,
                    tsca_is_active,
                    tsca_account_role
                `)
                .eq("tsca_is_active", true)
                .order("tsca_created_at", { ascending: true });

            if (!roleBasedAccountsError && roleBasedAccounts && roleBasedAccounts.length > 0) {
                const roleSecondary =
                    roleBasedAccounts.find((account: any) => account.tsca_account_role === "secondary_recipient");

                if (!secondaryAccount && roleSecondary) {
                    secondaryAccount = roleSecondary;
                }
            }

            if (!secondaryAccount) {
                secondaryAccount = activeAccounts[activeAccounts.length - 1] || activeAccounts[0];
            }

            if (!secondaryAccount) {
                throw new Error("Stripe Connect must have an active secondary recipient account configured in admin settings.");
            }

            if (!secondaryAccount.tsca_stripe_account_id) {
                throw new Error("Secondary Stripe recipient account must have a Stripe account ID.");
            }

            return {
                platform_retained_percentage: primarySplitPercentage,
                secondary_transfer: {
                    account_id: secondaryAccount.account_id || secondaryAccount.tsca_id,
                    account_name: secondaryAccount.account_name || secondaryAccount.tsca_account_name,
                    stripe_account_id: secondaryAccount.stripe_account_id || secondaryAccount.tsca_stripe_account_id,
                    split_percentage: secondarySplitPercentage,
                },
                source: normalizedGlobalSplits.some(
                    (split: any) => split.account_id === (secondaryAccount.account_id || secondaryAccount.tsca_id),
                )
                    ? "global_split_rows"
                    : configuredSecondaryAccount && (secondaryAccount.tsca_id === configuredSecondaryAccount.tsca_id)
                    ? "system_settings_account"
                    : "fallback_accounts",
            };
        };

        const splitConfiguration = await loadSecondaryTransferConfiguration();
        const secondaryTransfer = splitConfiguration.secondary_transfer;

        try {
            const connectedAccount = await stripe.accounts.retrieve(secondaryTransfer.stripe_account_id);
            const transfersCapability = connectedAccount.capabilities?.transfers;

            if (transfersCapability && transfersCapability !== "active") {
                throw new Error(
                    `Stripe account ${secondaryTransfer.stripe_account_id} cannot receive transfers yet (transfers capability: ${transfersCapability}).`,
                );
            }
        } catch (accountError) {
            const message = accountError instanceof Error ? accountError.message : String(accountError);
            throw new Error(
                `Stripe recipient account ${secondaryTransfer.stripe_account_id} is not ready for split transfers. ${message}`,
            );
        }

        console.log('Payment splits query result:', {
            courseId,
            splitsCount: secondaryTransfer ? 1 : 0,
            splits: secondaryTransfer ? [secondaryTransfer] : [],
            splitSource: splitConfiguration.source,
            platformRetainedPercentage: splitConfiguration.platform_retained_percentage,
        });

        const normalizedAmount = Number(course.tc_price ?? amount ?? 0);

        if (!Number.isFinite(normalizedAmount) || normalizedAmount <= 0) {
            throw new Error("Invalid course price");
        }

        const amountInCents = Math.round(normalizedAmount * 100);
        const rawCurrencyValue = stripeConfig.tsc_default_currency ?? currencySettingRow?.tss_setting_value;
        const normalizedCurrency = ["aud", "usd", "inr"].includes(
            String(rawCurrencyValue || "").trim().toLowerCase().replace(/^"(.*)"$/, "$1"),
        )
            ? String(rawCurrencyValue).trim().toLowerCase().replace(/^"(.*)"$/, "$1")
            : "aud";
        const secondaryTransferAmount = Number(
            ((normalizedAmount * Number(secondaryTransfer.split_percentage || 0)) / 100).toFixed(2),
        );
        const platformRetainedAmount = Number((normalizedAmount - secondaryTransferAmount).toFixed(2));
        const transferGroup = `course-payment-${courseId}-${Date.now()}`;

        const paymentIntentData: any = {
            amount: amountInCents,
            currency: normalizedCurrency,
            transfer_group: transferGroup,
            payment_method_types: ["card"],
            metadata: {
                courseId: courseId,
                userId: userId,
                courseName: course.tc_title,
                chargeType: "separate_charges_and_transfers",
                platformRetainedPercentage: String(splitConfiguration.platform_retained_percentage),
                secondaryTransferPercentage: String(secondaryTransfer.split_percentage),
                secondaryStripeAccountId: secondaryTransfer.stripe_account_id,
            },
            description: `Payment for course: ${course.tc_title}`,
        };

        const paymentIntent = await stripe.paymentIntents.create(
            paymentIntentData,
        );

        // Create payment record with all correct column names
        const { data: paymentArray, error: paymentError } = await supabase
            .from("tbl_payments")
            .insert({
                tp_user_id: userId,
                tp_course_id: courseId,
                tp_amount: normalizedAmount,
                tp_currency: normalizedCurrency,
                tp_payment_method: "stripe",
                tp_payment_status: "pending",
                tp_stripe_payment_intent_id: paymentIntent.id,
                tp_payment_date: new Date().toISOString(),
                tp_metadata: {
                    courseTitle: course.tc_title,
                    courseDurationHours: course.tc_duration_hours,
                    pricingType: course.tc_pricing_type,
                    accessDays: course.tc_access_days,
                    requestedAmount: amount,
                    chargeType: "separate_charges_and_transfers",
                    platformRetainedPercentage: splitConfiguration.platform_retained_percentage,
                    platformRetainedAmount,
                    secondaryTransferAmount,
                    splits: [secondaryTransfer],
                },
            })
            .select();

        if (paymentError) {
            console.error("Error creating payment record:", paymentError);
            throw paymentError;
        }

        const payment = paymentArray?.[0];

        // Create payment split transactions if splits exist
        if (payment) {
            await supabase.from("tbl_payment_split_transactions").insert({
                tpst_payment_id: payment.tp_id,
                tpst_stripe_account_id: secondaryTransfer.account_id,
                tpst_split_amount: secondaryTransferAmount,
                tpst_split_percentage: secondaryTransfer.split_percentage,
                tpst_status: "pending",
            });
        }

        return new Response(
            JSON.stringify({
                clientSecret: paymentIntent.client_secret,
                paymentIntentId: paymentIntent.id,
                publishableKey: stripeConfig.tsc_publishable_key,
                currency: normalizedCurrency,
                payment: {
                    id: payment?.tp_id,
                    amount: normalizedAmount,
                    currency: normalizedCurrency,
                    status: "pending",
                },
                course: {
                    id: course.tc_id,
                    title: course.tc_title,
                    price: normalizedAmount,
                    pricingType: course.tc_pricing_type,
                    accessDays: course.tc_access_days,
                    durationHours: course.tc_duration_hours,
                },
            }),
            {
                headers: {
                    ...corsHeaders,
                    "Content-Type": "application/json",
                },
            },
        );
    } catch (error) {
        console.error("Error creating payment intent:", error);
        return new Response(
            JSON.stringify({
                error: error.message || "Failed to create payment intent",
                details: error.toString(),
            }),
            {
                status: 400,
                headers: {
                    ...corsHeaders,
                    "Content-Type": "application/json",
                },
            },
        );
    }
});
