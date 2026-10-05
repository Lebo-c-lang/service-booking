// Thin wrapper around Paystack Inline JS (loaded via <script> in index.html).
// We use Inline rather than a server-side "initialize transaction" call so this
// stays frontend-only — the Edge Function webhook is still the source of truth
// for actually confirming payment (never trust the client-side callback alone).

const PAYSTACK_PUBLIC_KEY = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY;

/**
 * Opens the Paystack checkout popup.
 * @param {Object} opts
 * @param {string} opts.email
 * @param {number} opts.amountNaira - amount in naira (will be converted to kobo)
 * @param {string} opts.reference - unique reference, store this on the booking row
 * @param {function} opts.onSuccess - called with the Paystack response on success
 * @param {function} opts.onClose - called if the user closes the popup without paying
 */
export function payWithPaystack({ email, amountNaira, reference, onSuccess, onClose }) {
  if (!window.PaystackPop) {
    console.error("Paystack script not loaded — check index.html includes js.paystack.co/v1/inline.js");
    return;
  }

  const handler = window.PaystackPop.setup({
    key: PAYSTACK_PUBLIC_KEY,
    email,
    amount: Math.round(amountNaira * 100), // kobo
    ref: reference,
    callback: (response) => onSuccess(response),
    onClose: () => onClose && onClose(),
  });

  handler.openIframe();
}

export function generateReference(prefix = "bkg") {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}
