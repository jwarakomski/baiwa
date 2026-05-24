/** Stripe Payment Link — safe to use in the client (public checkout URL). */
export const DONATE_URL =
  import.meta.env.VITE_DONATE_URL?.trim() ||
  "https://buy.stripe.com/00wdR8bq45oP5sI8d11VK00";
