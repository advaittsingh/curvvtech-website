-- amount_cents stores Razorpay minor units (paise for INR), not USD cents.
COMMENT ON COLUMN billing_invoices.amount_cents IS 'Payment provider minor currency units (e.g. paise for INR). Legacy column name.';
