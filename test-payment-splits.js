/**
 * Diagnostic script to test payment splits configuration
 * Run with: node test-payment-splits.js <course_id>
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testPaymentSplits(courseId) {
  console.log('\n=== Testing Payment Splits Configuration ===\n');
  console.log('Course ID:', courseId);
  console.log('');

  // 1. Check if course exists
  console.log('1. Checking if course exists...');
  const { data: course, error: courseError } = await supabase
    .from('tbl_courses')
    .select('tc_id, tc_title, tc_price')
    .eq('tc_id', courseId)
    .maybeSingle();

  if (courseError) {
    console.error('❌ Error fetching course:', courseError);
    return;
  }

  if (!course) {
    console.error('❌ Course not found with ID:', courseId);
    return;
  }

  console.log('✅ Course found:', course.tc_title);
  console.log('   Price:', course.tc_price);
  console.log('');

  // 2. Check Stripe Connect accounts
  console.log('2. Checking Stripe Connect accounts...');
  const { data: accounts, error: accountsError } = await supabase
    .from('tbl_stripe_connect_accounts')
    .select('*');

  if (accountsError) {
    console.error('❌ Error fetching accounts:', accountsError);
  } else {
    console.log(`✅ Found ${accounts.length} Stripe Connect account(s):`);
    accounts.forEach((acc, idx) => {
      console.log(`   ${idx + 1}. ${acc.tsca_account_name}`);
      console.log(`      ID: ${acc.tsca_id}`);
      console.log(`      Stripe Account ID: ${acc.tsca_stripe_account_id}`);
      console.log(`      Active: ${acc.tsca_is_active}`);
      console.log(`      Default Split: ${acc.tsca_default_split_percentage}%`);
    });
  }
  console.log('');

  // 3. Check payment splits for this course
  console.log('3. Checking payment splits for this course...');
  const { data: splits, error: splitsError } = await supabase
    .from('tbl_payment_splits')
    .select(`
      *,
      tbl_stripe_connect_accounts(*)
    `)
    .eq('tps_course_id', courseId);

  if (splitsError) {
    console.error('❌ Error fetching splits:', splitsError);
  } else {
    console.log(`✅ Found ${splits.length} payment split(s) for this course:`);
    splits.forEach((split, idx) => {
      console.log(`   ${idx + 1}. Split ${split.tps_split_percentage}%`);
      console.log(`      Split ID: ${split.tps_id}`);
      console.log(`      Connected Account ID (UUID): ${split.tps_stripe_account_id}`);
      console.log(`      Active: ${split.tps_is_active}`);
      if (split.tbl_stripe_connect_accounts) {
        console.log(`      Account Name: ${split.tbl_stripe_connect_accounts.tsca_account_name}`);
        console.log(`      Stripe Account ID: ${split.tbl_stripe_connect_accounts.tsca_stripe_account_id}`);
      }
    });
  }
  console.log('');

  // 4. Test the database function
  console.log('4. Testing get_payment_splits_for_course function...');
  const { data: functionResult, error: functionError } = await supabase.rpc(
    'get_payment_splits_for_course',
    { p_course_id: courseId }
  );

  if (functionError) {
    console.error('❌ Error calling function:', functionError);
  } else {
    console.log(`✅ Function returned ${functionResult?.length || 0} result(s):`);
    if (functionResult && functionResult.length > 0) {
      functionResult.forEach((result, idx) => {
        console.log(`   ${idx + 1}. Account: ${result.account_name}`);
        console.log(`      Account ID (UUID): ${result.account_id}`);
        console.log(`      Stripe Account ID: ${result.stripe_account_id}`);
        console.log(`      Split Percentage: ${result.split_percentage}%`);
      });
    } else {
      console.log('   ⚠️  No splits returned by function!');
    }
  }
  console.log('');

  // 5. Summary and recommendations
  console.log('=== Summary ===\n');

  if (!functionResult || functionResult.length === 0) {
    console.log('⚠️  PROBLEM DETECTED: No payment splits found for this course!\n');
    console.log('Possible causes:');
    console.log('1. No payment split configured for this course in tbl_payment_splits');
    console.log('2. The payment split is set to inactive (tps_is_active = false)');
    console.log('3. The linked Stripe Connect account is inactive (tsca_is_active = false)');
    console.log('\nTo fix:');
    console.log('- Go to Admin Dashboard → Settings → Stripe Connect');
    console.log('- Add a payment split for this course');
    console.log('- Ensure both the split and the account are active');
  } else {
    const split = functionResult[0];
    const amount = parseFloat(course.tc_price);
    const splitAmount = (amount * parseFloat(split.split_percentage)) / 100;
    const platformAmount = amount - splitAmount;

    console.log('✅ Payment split is configured correctly!\n');
    console.log(`For a $${amount.toFixed(2)} payment:`);
    console.log(`- Connected Account (${split.account_name}) receives: $${splitAmount.toFixed(2)} (${split.split_percentage}%)`);
    console.log(`- Platform Account retains: $${platformAmount.toFixed(2)} (${(100 - parseFloat(split.split_percentage)).toFixed(2)}%)`);
    console.log(`\nStripe will transfer to: ${split.stripe_account_id}`);
  }
}

// Get course ID from command line
const courseId = process.argv[2];

if (!courseId) {
  console.error('Usage: node test-payment-splits.js <course_id>');
  process.exit(1);
}

testPaymentSplits(courseId)
  .then(() => {
    console.log('\n=== Test Complete ===\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  });
