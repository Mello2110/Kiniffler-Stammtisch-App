"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchPayPalTransactions = exports.fetchPayPalBalance = exports.paypalClientSecret = exports.paypalClientId = void 0;
const params_1 = require("firebase-functions/params");
// PayPal Credentials (to be set via firebase functions:secrets:set)
exports.paypalClientId = (0, params_1.defineSecret)('PAYPAL_CLIENT_ID');
exports.paypalClientSecret = (0, params_1.defineSecret)('PAYPAL_CLIENT_SECRET');
// Set this to 'live' when ready for production
const PAYPAL_ENV = 'sandbox';
const PAYPAL_API_BASE = PAYPAL_ENV === 'live'
    ? 'https://api-m.paypal.com'
    : 'https://api-m.sandbox.paypal.com';
async function getAccessToken(clientId, clientSecret) {
    const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    const response = await fetch(`${PAYPAL_API_BASE}/v1/oauth2/token`, {
        method: 'POST',
        headers: {
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: 'grant_type=client_credentials',
    });
    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`PayPal Auth Error: ${response.status} - ${errorText}`);
    }
    const data = await response.json();
    return data.access_token;
}
async function fetchPayPalBalance() {
    const token = await getAccessToken(exports.paypalClientId.value(), exports.paypalClientSecret.value());
    const response = await fetch(`${PAYPAL_API_BASE}/v1/reporting/balances`, {
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
    });
    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`PayPal Balance Error: ${response.status} - ${errorText}`);
    }
    const data = await response.json();
    const primaryBalance = data.balances.find((b) => b.primary) || data.balances[0];
    return {
        amount: parseFloat(primaryBalance.total_balance.value),
        currency: primaryBalance.total_balance.currency_code,
        asOfTime: data.as_of_time,
        lastRefreshTime: data.last_refresh_time
    };
}
exports.fetchPayPalBalance = fetchPayPalBalance;
async function fetchPayPalTransactions(startDate, endDate) {
    const token = await getAccessToken(exports.paypalClientId.value(), exports.paypalClientSecret.value());
    // Construct URL with query params
    const url = new URL(`${PAYPAL_API_BASE}/v1/reporting/transactions`);
    url.searchParams.append('start_date', startDate);
    url.searchParams.append('end_date', endDate);
    url.searchParams.append('fields', 'all');
    const response = await fetch(url.toString(), {
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
    });
    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`PayPal Transactions Error: ${response.status} - ${errorText}`);
    }
    const data = await response.json();
    return data.transaction_details || [];
}
exports.fetchPayPalTransactions = fetchPayPalTransactions;
//# sourceMappingURL=paypalService.js.map