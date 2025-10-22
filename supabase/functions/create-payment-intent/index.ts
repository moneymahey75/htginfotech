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

        const { data: stripeConfigArray, error: configError } = await supabase
            .from("tbl_stripe_config")
            .select("*")
            .limit(1);

        if (configError || !stripeConfigArray || stripeConfigArray.length === 0) {
            throw new Error("Stripe configuration not found");
        }

        const stripeConfig = stripeConfigArray[0];

        const stripe = new Stripe(stripeConfig.tsc_secret_key, {
            apiVersion: "2024-11-20.acacia",
        });

        const { data: courseArray, error: courseError } = await supabase
            .from("tbl_courses")
            .select("tc_id, tc_title, tc_price")
            .eq("tc_id", courseId)
            .limit(1);

        if (courseError || !courseArray || courseArray.length === 0) {
            throw new Error("Course not found");
        }

        const course = courseArray[0];

        const { data: splits } = await supabase.rpc(
            "get_payment_splits_for_course",
            {
                p_course_id: courseId,
            },
        );

        const amountInCents = Math.round(parseFloat(amount) * 100);

        const paymentIntentData: any = {
            amount: amountInCents,
            currency: "usd",
            metadata: {
                courseId: courseId,
                userId: userId,
                courseName: course.tc_title,
            },
            description: `Payment for course: ${course.tc_title}`,
            automatic_payment_methods: {
                enabled: true,
            },
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
                tp_amount: amount,
                tp_currency: "usd",
                tp_payment_method: "stripe",
                tp_payment_status: "pending",
                tp_stripe_payment_intent_id: paymentIntent.id,
                tp_payment_date: new Date().toISOString(),
                tp_metadata: {
                    courseTitle: course.tc_title,
                    splits: splits || [],
                },
            })
            .select();

        if (paymentError) {
            console.error("Error creating payment record:", paymentError);
            throw paymentError;
        }

        const payment = paymentArray?.[0];

        // Create payment split transactions if splits exist
        if (splits && splits.length > 0 && payment) {
            for (const split of splits) {
                const splitAmount = (parseFloat(amount) * parseFloat(split.split_percentage)) / 100;

                await supabase.from("tbl_payment_split_transactions").insert({
                    tpst_payment_id: payment.tp_id,
                    tpst_stripe_account_id: split.account_id,
                    tpst_split_amount: splitAmount,
                    tpst_split_percentage: split.split_percentage,
                    tpst_status: "pending",
                });
            }
        }

        return new Response(
            JSON.stringify({
                clientSecret: paymentIntent.client_secret,
                paymentIntentId: paymentIntent.id,
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