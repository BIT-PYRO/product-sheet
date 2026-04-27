/**
 * Next.js middleware entry point.
 * Delegates all auth / approval guard logic to proxy.js.
 * This file MUST be named `middleware.js` and live at the frontend root
 * so Next.js discovers it automatically.
 */
export { proxy as middleware, config } from './proxy.js';
