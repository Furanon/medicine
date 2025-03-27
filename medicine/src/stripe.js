const Stripe = require('stripe');

// Initialize Stripe client
let stripeClient = null;

/**
 * Initializes the Stripe client with the provided API key
 * @param {string} apiKey - Stripe secret API key
 * @returns {Object} - Stripe client instance
 */
function initStripe(apiKey) {
  if (!stripeClient) {
    stripeClient = new Stripe(apiKey);
  }
  return stripeClient;
}

/**
 * Process a payment using Stripe
 * @param {number} amount - Amount to charge in cents
 * @param {string} currency - Three-letter currency code (e.g., 'usd')
 * @param {string} paymentMethod - Stripe payment method ID
 * @param {Object} metadata - Additional metadata for the payment
 * @returns {Promise<Object>} - Stripe payment intent object
 */
async function processPayment(amount, currency, paymentMethod, metadata = {}) {
  if (!stripeClient) {
    throw new Error('Stripe client not initialized. Call initStripe() first.');
  }

  try {
    // Create a payment intent
    const paymentIntent = await stripeClient.paymentIntents.create({
      amount,
      currency,
      payment_method: paymentMethod,
      confirm: true,
      metadata,
      return_url: metadata.returnUrl || '',
    });

    return paymentIntent;
  } catch (error) {
    console.error('Stripe payment processing error:', error);
    throw error;
  }
}

/**
 * Handle Stripe webhook events
 * @param {Request} request - Incoming request object
 * @param {string} webhookSecret - Stripe webhook signing secret
 * @returns {Promise<Object>} - Response with status and event data
 */
async function handleStripeWebhook(request, webhookSecret) {
  if (!stripeClient) {
    throw new Error('Stripe client not initialized. Call initStripe() first.');
  }

  try {
    // Get the request body as text
    const payload = await request.text();
    
    // Get the Stripe signature from headers
    const signature = request.headers.get('stripe-signature');
    
    if (!signature) {
      return {
        status: 'error',
        code: 400,
        message: 'Missing Stripe signature',
      };
    }

    // Verify the event
    let event;
    try {
      event = stripeClient.webhooks.constructEvent(payload, signature, webhookSecret);
    } catch (err) {
      console.error('Webhook signature verification failed:', err.message);
      return {
        status: 'error',
        code: 400,
        message: `Webhook signature verification failed: ${err.message}`,
      };
    }

    // Handle different event types
    const response = await handleStripeEvent(event);
    return {
      status: 'success',
      code: 200,
      event: event.type,
      data: response,
    };
  } catch (error) {
    console.error('Webhook error:', error);
    return {
      status: 'error',
      code: 500,
      message: `Webhook error: ${error.message}`,
    };
  }
}

/**
 * Handle different Stripe event types
 * @param {Object} event - Stripe event object
 * @returns {Promise<Object>} - Result of the event handling
 */
async function handleStripeEvent(event) {
  const eventType = event.type;
  const eventData = event.data.object;

  switch (eventType) {
    case 'payment_intent.succeeded':
      return await handlePaymentSuccess(eventData);
    
    case 'payment_intent.payment_failed':
      return await handlePaymentFailure(eventData);
    
    case 'checkout.session.completed':
      return await handleCheckoutCompleted(eventData);
    
    // Add more event handlers as needed
    
    default:
      console.log(`Unhandled event type: ${eventType}`);
      return { received: true, handled: false, eventType };
  }
}

/**
 * Handle successful payment
 * @param {Object} paymentIntent - Stripe payment intent object
 * @returns {Promise<Object>} - Result of handling successful payment
 */
async function handlePaymentSuccess(paymentIntent) {
  // Extract booking ID or other relevant info from metadata
  const { bookingId } = paymentIntent.metadata || {};
  
  // You would typically update your database here
  // For example: await updateBookingPaymentStatus(bookingId, 'paid');
  
  console.log(`Payment succeeded for booking ${bookingId}`);
  
  return {
    success: true,
    paymentIntentId: paymentIntent.id,
    bookingId,
    amount: paymentIntent.amount,
    status: 'paid',
  };
}

/**
 * Handle failed payment
 * @param {Object} paymentIntent - Stripe payment intent object
 * @returns {Promise<Object>} - Result of handling failed payment
 */
async function handlePaymentFailure(paymentIntent) {
  // Extract booking ID or other relevant info from metadata
  const { bookingId } = paymentIntent.metadata || {};
  const errorMessage = paymentIntent.last_payment_error?.message || 'Unknown error';
  
  // You would typically update your database here
  // For example: await updateBookingPaymentStatus(bookingId, 'failed', errorMessage);
  
  console.error(`Payment failed for booking ${bookingId}: ${errorMessage}`);
  
  return {
    success: false,
    paymentIntentId: paymentIntent.id,
    bookingId,
    error: errorMessage,
    status: 'failed',
  };
}

/**
 * Handle completed checkout session
 * @param {Object} session - Stripe checkout session object
 * @returns {Promise<Object>} - Result of handling completed checkout
 */
async function handleCheckoutCompleted(session) {
  // Extract booking ID or other relevant info from metadata
  const { bookingId } = session.metadata || {};
  
  // You would typically update your database here
  // For example: await updateBookingPaymentStatus(bookingId, 'paid');
  
  console.log(`Checkout completed for booking ${bookingId}`);
  
  return {
    success: true,
    sessionId: session.id,
    bookingId,
    amount: session.amount_total,
    status: 'paid',
  };
}

module.exports = {
  initStripe,
  processPayment,
  handleStripeWebhook,
};

