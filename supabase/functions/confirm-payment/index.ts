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

        const { data: stripeConfig, error: configError } = await supabase
            .from("tbl_stripe_config")
            .select("*")
            .single();

        if (configError || !stripeConfig) {
            console.error("Stripe config error:", configError);
            throw new Error("Stripe configuration not found");
        }

        const stripe = new Stripe(stripeConfig.tsc_secret_key, {
            apiVersion: "2024-11-20.acacia",
        });

        console.log("Retrieving payment intent from Stripe:", paymentIntentId);
        const paymentIntent = await stripe.paymentIntents.retrieve(
            paymentIntentId,
        );

        console.log("Payment intent status:", paymentIntent.status);

        if (paymentIntent.status === "succeeded") {
            const { data: payment, error: paymentUpdateError } = await supabase
                .from("tbl_payments")
                .update({
                    tp_payment_status: "completed",
                    tp_stripe_charge_id: paymentIntent.charges?.data[0]?.id || null,
                    tp_receipt_url:
                        paymentIntent.charges?.data[0]?.receipt_url || null,
                })
                .eq("tp_stripe_payment_intent_id", paymentIntentId)
                .select()
                .single();

            if (paymentUpdateError) {
                console.error("Error updating payment record:", paymentUpdateError);
                throw paymentUpdateError;
            }

            await supabase
                .from("tbl_payment_split_transactions")
                .update({ tpst_status: "completed" })
                .eq("tpst_payment_id", payment.tp_id);

            const { data: existingEnrollment } = await supabase
                .from("tbl_course_enrollments")
                .select("*")
                .eq("tce_user_id", userId)
                .eq("tce_course_id", courseId)
                .maybeSingle();

            if (!existingEnrollment) {
                const { error: enrollError } = await supabase
                    .from("tbl_course_enrollments")
                    .insert({
                        tce_user_id: userId,
                        tce_course_id: courseId,
                        tce_enrollment_date: new Date().toISOString(),
                        tce_progress_percentage: 0,
                        tce_completion_status: "enrolled",
                        tce_payment_status: "paid",
                        tce_amount_paid: payment.tp_amount,
                        tce_is_active: true,
                    });

                if (enrollError) {
                    console.error("Error creating enrollment:", enrollError);
                    throw enrollError;
                }
            }

            return new Response(
                JSON.stringify({
                    success: true,
                    message: "Payment confirmed and enrollment created",
                    payment: payment,
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
        console.error("Error details:", JSON.stringify(error, null, 2));

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