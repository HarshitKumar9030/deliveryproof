import { z } from 'zod';
export function verifyRefreshableOrder(input: unknown, orderId: string) {
  const order = z.object({ id: z.string(), status: z.string() }).parse(input);
  if (order.id !== orderId || !['CREATED', 'PAYER_ACTION_REQUIRED', 'VOIDED'].includes(order.status)) {
    throw new Error('Complete or reconcile the existing payment before replacing it.');
  }
}
export function verifyApprovedOrder(input: unknown, expected: { orderId: string; projectId: string; value: string }) {
  const order=z.object({id:z.string(),intent:z.literal('CAPTURE'),status:z.literal('APPROVED'),purchase_units:z.array(z.object({custom_id:z.string(),amount:z.object({currency_code:z.literal('USD'),value:z.string()})})).length(1)}).parse(input);
  const unit=order.purchase_units[0]!;
  if(order.id!==expected.orderId || unit.custom_id!==expected.projectId || unit.amount.value!==expected.value) throw new Error('Approved order does not match project');
}
export function verifiedCapture(input: unknown, expected: { orderId: string; projectId: string; value: string }) {
  const order=z.object({id:z.string(),status:z.literal('COMPLETED'),purchase_units:z.array(z.object({custom_id:z.string(),amount:z.object({currency_code:z.literal('USD'),value:z.string()}).optional(),payments:z.object({captures:z.array(z.object({id:z.string(),status:z.literal('COMPLETED'),amount:z.object({currency_code:z.literal('USD'),value:z.string()})})).length(1)})})).length(1)}).parse(input);
  const unit=order.purchase_units[0]!; const capture=unit.payments.captures[0]!;
  if(order.id!==expected.orderId || unit.custom_id!==expected.projectId || capture.amount.value!==expected.value || (unit.amount && unit.amount.value!==expected.value)) throw new Error('Capture does not match project');
  return capture;
}
