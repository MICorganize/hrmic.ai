import { LoginForm } from "@/components/auth/LoginForm";

/** The root route is the login screen, avoiding a redirect round trip. */
export default function Home() {
  return <LoginForm kind="employee" />;
}
