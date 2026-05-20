import LoginClient from "./login-client";
import { sanitizePublicNextPath } from "@/lib/safeRedirectPath";

type Props = {
  searchParams: Promise<{ next?: string }>;
};

export default async function LoginPage({ searchParams }: Props) {
  const params = await searchParams;
  const nextParam = params.next;
  const explicitNext = typeof nextParam === "string" && nextParam.length > 0;
  const nextPath = explicitNext ? sanitizePublicNextPath(nextParam) : "/panel/user";
  return <LoginClient nextPath={nextPath} explicitNext={explicitNext} />;
}
