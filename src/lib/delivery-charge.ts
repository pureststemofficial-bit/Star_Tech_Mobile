/*
 * The delivery charge for a basket. Pure (no database), so the checkout page can show the customer
 * exactly what the server will charge when they pick their city.
 */
export function deliveryCharge(subtotalPence: number, cityFeePence: number, freeOverPence: number) {
  if (subtotalPence <= 0) return 0;
  if (freeOverPence > 0 && subtotalPence >= freeOverPence) return 0;
  return cityFeePence;
}
