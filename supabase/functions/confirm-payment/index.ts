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

        const { paymentIntentId, userId, courseId } = await req.json();

        console.log("Confirm payment request:", { paymentIntentId, userId, courseId });

        if (!paymentIntentId || !userId || !courseId) {
            throw new Error(
                "Missing required fields: paymentIntentId, userId, courseId",
            );
        }

        // Get Stripe config
        const { data: stripeConfigArray, error: configError } = await supabase
            .from("tbl_stripe_config")
            .select("*")
            .limit(1);

        if (configError || !stripeConfigArray || stripeConfigArray.length === 0) {
            console.error("Stripe config error:", configError);
            throw new Error("Stripe configuration not found");
        }

        const stripeConfig = stripeConfigArray[0];

        const stripe = new Stripe(stripeConfig.tsc_secret_key, {
            apiVersion: "2024-11-20.acacia",
        });

        console.log("Retrieving payment intent from Stripe:", paymentIntentId);
        const paymentIntent = await stripe.paymentIntents.retrieve(
            paymentIntentId,
            {
                expand: ["latest_charge", "latest_charge.balance_transaction"],
            },
        );

        console.log("Payment intent status:", paymentIntent.status);

        if (paymentIntent.status === "succeeded") {
            const latestCharge = typeof paymentIntent.latest_charge === "object"
                ? paymentIntent.latest_charge
                : null;
            const latestBalanceTransaction = latestCharge &&
                typeof (latestCharge as any).balance_transaction === "object"
                ? (latestCharge as any).balance_transaction
                : null;
            const sourceTransferCurrency = String(
                latestBalanceTransaction?.currency ||
                latestCharge?.currency ||
                paymentIntent.currency ||
                "aud",
            ).toLowerCase();
            const transferGroup = paymentIntent.transfer_group ||
                `course-payment-${paymentIntentId}`;

            // Update payment record
            const { data: paymentArray, error: paymentUpdateError } = await supabase
                .from("tbl_payments")
                .update({
                    tp_payment_status: "completed",
                    tp_currency: sourceTransferCurrency,
                    tp_stripe_charge_id: latestCharge?.id || null,
                    tp_receipt_url: latestCharge?.receipt_url || null,
                })
                .eq("tp_stripe_payment_intent_id", paymentIntentId)
                .select();

            if (paymentUpdateError) {
                console.error("Error updating payment record:", paymentUpdateError);
                throw paymentUpdateError;
            }

            if (!paymentArray || paymentArray.length === 0) {
                throw new Error("Payment record not found");
            }

            const payment = paymentArray[0];
            const existingMetadata = payment.tp_metadata && typeof payment.tp_metadata === "object"
                ? payment.tp_metadata
                : {};

            const { data: splitTransactions } = await supabase
                .from("tbl_payment_split_transactions")
                .select(`
                    tpst_id,
                    tpst_split_amount,
                    tpst_split_percentage,
                    tpst_status,
                    tpst_stripe_transfer_id,
                    tbl_stripe_connect_accounts (
                        tsca_stripe_account_id
                    )
                `)
                .eq("tpst_payment_id", payment.tp_id);

            const transferFailures: Array<{ splitId: string; reason: string }> = [];

            if (latestCharge?.id && Array.isArray(splitTransactions) && splitTransactions.length > 0) {
                for (const splitTransaction of splitTransactions) {
                    const relatedAccount = Array.isArray((splitTransaction as any).tbl_stripe_connect_accounts)
                        ? (splitTransaction as any).tbl_stripe_connect_accounts[0]
                        : (splitTransaction as any).tbl_stripe_connect_accounts;
                    const stripeAccountId = relatedAccount?.tsca_stripe_account_id;
                    const splitAmount = Math.round(Number(splitTransaction.tpst_split_amount || 0) * 100);

                    if (splitTransaction.tpst_stripe_transfer_id) {
                        continue;
                    }

                    if (!stripeAccountId || splitAmount <= 0) {
                        const reason = !stripeAccountId
                            ? "Missing connected Stripe account ID for split transfer."
                            : "Invalid split amount.";
                        transferFailures.push({
                            splitId: splitTransaction.tpst_id,
                            reason,
                        });

                        await supabase
                            .from("tbl_payment_split_transactions")
                            .update({ tpst_status: "failed" })
                            .eq("tpst_id", splitTransaction.tpst_id);
                        continue;
                    }

                    try {
                        const connectedAccount = await stripe.accounts.retrieve(stripeAccountId);
                        const transfersCapability = connectedAccount.capabilities?.transfers;

                        if (transfersCapability && transfersCapability !== "active") {
                            throw new Error(
                                `Stripe account ${stripeAccountId} cannot receive transfers yet (transfers capability: ${transfersCapability}).`,
                            );
                        }

                        const transfer = await stripe.transfers.create({
                            amount: splitAmount,
                            currency: sourceTransferCurrency,
                            destination: stripeAccountId,
                            source_transaction: latestCharge.id,
                            transfer_group: transferGroup,
                            metadata: {
                                payment_id: payment.tp_id,
                                payment_intent_id: paymentIntentId,
                                course_id: courseId,
                                user_id: userId,
                                split_percentage: String(splitTransaction.tpst_split_percentage ?? ""),
                                source_transfer_currency: sourceTransferCurrency,
                            },
                        }, {
                            idempotencyKey: `payment-transfer-${payment.tp_id}-${splitTransaction.tpst_id}`,
                        });

                        await supabase
                            .from("tbl_payment_split_transactions")
                            .update({
                                tpst_status: "completed",
                                tpst_stripe_transfer_id: transfer.id,
                            })
                            .eq("tpst_id", splitTransaction.tpst_id);
                    } catch (transferError) {
                        console.error("Error creating Stripe transfer:", transferError);
                        transferFailures.push({
                            splitId: splitTransaction.tpst_id,
                            reason: transferError instanceof Error ? transferError.message : String(transferError),
                        });

                        await supabase
                            .from("tbl_payment_split_transactions")
                            .update({ tpst_status: "failed" })
                            .eq("tpst_id", splitTransaction.tpst_id);
                    }
                }
            } else {
                await supabase
                    .from("tbl_payment_split_transactions")
                    .update({ tpst_status: "completed" })
                    .eq("tpst_payment_id", payment.tp_id);
            }

            if (transferFailures.length > 0) {
                const primaryFailureReason = transferFailures[0]?.reason;
                const detailedFailureMessage = primaryFailureReason
                    ? `Payment was captured, but one or more Stripe split transfers failed. ${primaryFailureReason}`
                    : "Payment was captured, but one or more Stripe split transfers failed.";
                const transferFailureMetadata = {
                    ...existingMetadata,
                    splitTransferStatus: "failed",
                    splitTransferFailures: transferFailures,
                    sourceTransferCurrency,
                };

                const { error: transferFailedStatusError } = await supabase
                    .from("tbl_payments")
                    .update({
                        tp_payment_status: "transfer_failed",
                        tp_metadata: transferFailureMetadata,
                    })
                    .eq("tp_id", payment.tp_id);

                if (transferFailedStatusError) {
                    console.error("Error updating payment status to transfer_failed:", transferFailedStatusError);

                    const { error: fallbackStatusError } = await supabase
                        .from("tbl_payments")
                        .update({
                            tp_payment_status: "failed",
                            tp_metadata: transferFailureMetadata,
                        })
                        .eq("tp_id", payment.tp_id);

                    if (fallbackStatusError) {
                        console.error("Error updating payment status fallback to failed:", fallbackStatusError);
                    }
                }

                return new Response(
                    JSON.stringify({
                        success: false,
                        message: detailedFailureMessage,
                        payment: payment,
                        transferFailures,
                        sourceTransferCurrency,
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

            // Check for existing enrollment
            const { data: existingEnrollmentArray } = await supabase
                .from("tbl_course_enrollments")
                .select("*")
                .eq("tce_user_id", userId)
                .eq("tce_course_id", courseId)
                .limit(1);

            const existingEnrollment = existingEnrollmentArray && existingEnrollmentArray.length > 0
                ? existingEnrollmentArray[0]
                : null;

            if (!existingEnrollment) {
                // Get course details for expiry calculation
                const { data: courseArray } = await supabase
                    .from("tbl_courses")
                    .select("tc_title, tc_pricing_type, tc_access_days, tc_duration_hours")
                    .eq("tc_id", courseId)
                    .limit(1);

                const course = courseArray?.[0];
                let expiryDate = null;

                if (course?.tc_pricing_type === "paid_days" && course?.tc_access_days) {
                    const enrollmentDate = new Date();
                    expiryDate = new Date(enrollmentDate);
                    expiryDate.setDate(expiryDate.getDate() + course.tc_access_days);
                }

                const enrollmentData: any = {
                    tce_user_id: userId,
                    tce_course_id: courseId,
                    tce_enrollment_date: new Date().toISOString(),
                    tce_progress_percentage: 0,
                    tce_completion_status: "enrolled",
                    tce_payment_status: "completed",
                    tce_amount_paid: payment.tp_amount,
                    tce_is_active: true,
                };

                if (expiryDate) {
                    enrollmentData.tce_access_expires_at = expiryDate.toISOString();
                }

                const { data: newEnrollment, error: enrollError } = await supabase
                    .from("tbl_course_enrollments")
                    .insert(enrollmentData)
                    .select()
                    .single();

                if (enrollError) {
                    console.error("Error creating enrollment:", enrollError);
                    throw enrollError;
                }

                // Get learner and course details for notification
                const { data: learner } = await supabase
                    .from("tbl_users")
                    .select(`
                        tu_email,
                        tbl_user_profiles (
                            tup_first_name,
                            tup_last_name
                        )
                    `)
                    .eq("tu_id", userId)
                    .single();

                const courseDetails = course;

                // Send enrollment notification to admins
                if (newEnrollment && learner && courseDetails) {
                    try {
                        const profile = (learner as any).tbl_user_profiles?.[0];
                        const learnerName = profile
                            ? `${profile.tup_first_name || ""} ${profile.tup_last_name || ""}`.trim()
                            : "";

                        await supabase.functions.invoke("send-enrollment-notification", {
                            body: {
                                enrollmentId: newEnrollment.tce_id,
                                learnerEmail: (learner as any).tu_email,
                                learnerName: learnerName,
                                courseName: courseDetails.tc_title,
                            },
                        });
                        console.log("Enrollment notification sent successfully");
                    } catch (notifError) {
                        console.error("Error sending enrollment notification:", notifError);
                        // Don't fail the payment if notification fails
                    }

                    // Send payment success notification to learner
                    try {
                        await supabase.functions.invoke("send-payment-success-notification", {
                            body: {
                                userId: userId,
                                courseId: courseId,
                                amount: payment.tp_amount.toString(),
                                paymentId: payment.tp_id,
                            },
                        });
                        console.log("Payment success notification sent to learner");
                    } catch (paymentNotifError) {
                        console.error("Error sending payment success notification:", paymentNotifError);
                        // Don't fail the payment if notification fails
                    }
                }
            }

            return new Response(
                JSON.stringify({
                    success: true,
                    message: "Payment confirmed and enrollment created",
                    payment: payment,
                    transferFailures,
                    purchase: {
                        courseId,
                        courseTitle: payment.tp_metadata?.courseTitle || paymentIntent.metadata?.courseName || "Course",
                        amount: payment.tp_amount,
                        currency: payment.tp_currency,
                        paymentDate: payment.tp_payment_date,
                        receiptUrl: payment.tp_receipt_url,
                        paymentIntentId,
                        chargeId: payment.tp_stripe_charge_id,
                    },
                }),
                {
                    headers: {
                        ...corsHeaders,
                        "Content-Type": "application/json",
                    },
                },
            );
        } else {
            await supabase
                .from("tbl_payments")
                .update({
                    tp_payment_status: "failed",
                })
                .eq("tp_stripe_payment_intent_id", paymentIntentId);

            return new Response(
                JSON.stringify({
                    success: false,
                    message: "Payment not successful",
                    status: paymentIntent.status,
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
    } catch (error) {
        console.error("Error confirming payment:", error);

        return new Response(
            JSON.stringify({
                error: error.message || "Failed to confirm payment",
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
