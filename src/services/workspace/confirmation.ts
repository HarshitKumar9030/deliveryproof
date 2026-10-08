import { createHash } from 'node:crypto';
export const confirmationTokenPattern = /^[A-Za-z0-9_-]{43}$/;
export const hashConfirmationToken = (token: string) => createHash('sha256').update(token).digest('hex');
export type ConfirmationLink = { tokenHash: string; projectId: string; ownerId: string; deliveryLink: string; expiresAt: Date };
