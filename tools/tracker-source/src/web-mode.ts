/** Only the dedicated website build requires an online-verified account. */
export const WEB_APP = import.meta.env.MODE === 'web' || import.meta.env.MODE === 'audit-ui';
