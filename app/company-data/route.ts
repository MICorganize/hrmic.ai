/**
 * Internal company endpoint.  This deliberately lives outside `/api` because
 * a browser extension in the local environment blocks requests under that
 * prefix before they reach Next.js.
 */
export { GET, POST } from "@/app/api/companies/route";
