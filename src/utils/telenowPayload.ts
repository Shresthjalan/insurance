/**
 * Helper to normalize incoming Telenow webhook payloads.
 * Telenow AI agent function calling wraps parameters inside an `arguments` object
 * and might pass caller phone number or customer name under slightly different keys.
 */
export function extractTelenowPayload(body: unknown): Record<string, unknown> {
  if (typeof body !== 'object' || body === null) return {};
  const raw = body as Record<string, unknown>;
  const args = typeof raw.arguments === 'object' && raw.arguments !== null
    ? (raw.arguments as Record<string, unknown>)
    : {};

  // Merge arguments with top-level raw fields
  const payload: Record<string, unknown> = { ...args, ...raw };
  delete payload.arguments;

  // Extract phone number from any potential Telenow field
  const phone =
    payload.phone_number ??
    payload.phoneNumber ??
    payload.phone ??
    payload.caller_phone ??
    payload.caller_id ??
    payload.from;

  if (phone && (typeof phone === 'string' || typeof phone === 'number')) {
    payload.phone_number = String(phone).trim();
  }

  // Extract or default customer name
  const name = payload.customer_name ?? payload.customerName;
  if (typeof name === 'string' && name.trim().length > 0) {
    payload.customer_name = name.trim();
  } else if (!payload.customer_name || typeof payload.customer_name !== 'string' || payload.customer_name.trim() === '') {
    payload.customer_name = payload.phone_number ? `Customer (${payload.phone_number})` : 'Valued Customer';
  }

  return payload;
}
