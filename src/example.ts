import { generateInvoice } from "./invoice_service.ts";

const order = { donorName: "Lin Mei", donorEmail: "lin@example.org", campaign: "Community meals", amountCents: 12500, orderId: "gift-2026-09-01-001" };
const result = await generateInvoice(order);
console.log(JSON.stringify({ orderId: order.orderId, receipt: result }, null, 2));
