/**
 * Payment integration stubs for Ethiopian payment providers.
 * Replace with actual API integrations when ready.
 */

/**
 * Initiate a Telebirr payment
 */
export const initiateTelebirr = async ({ amount, phone, orderId }) => {
    // TODO: Integrate with Telebirr API
    console.log(`[Payment] Telebirr payment initiated: ${amount} ETB for order ${orderId}`);
    return {
        success: true,
        transactionId: `TB-${Date.now()}`,
        message: 'Telebirr payment initiated (stub)',
    };
};

/**
 * Initiate a CBE Birr payment
 */
export const initiateCBEBirr = async ({ amount, phone, orderId }) => {
    // TODO: Integrate with CBE Birr API
    console.log(`[Payment] CBE Birr payment initiated: ${amount} ETB for order ${orderId}`);
    return {
        success: true,
        transactionId: `CBE-${Date.now()}`,
        message: 'CBE Birr payment initiated (stub)',
    };
};

/**
 * Verify a payment transaction
 */
export const verifyPayment = async (transactionId) => {
    // TODO: Verify with actual payment gateway
    console.log(`[Payment] Verifying transaction: ${transactionId}`);
    return {
        verified: true,
        transactionId,
        message: 'Payment verified (stub)',
    };
};
