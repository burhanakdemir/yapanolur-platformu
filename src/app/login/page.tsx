import LoginClient from "./login-client";

type Props = {
  searchParams: Promise<{ next?: string }>;
};

export default async function LoginPage({ searchParams }: Props) {
  const params = await searchParams;
  const nextParam = params.next;
  const explicitNext = typeof nextParam === "string" && nextParam.length > 0;
  return (
    <LoginClient
      nextPath={explicitNext ? nextParam : "/panel/user"}
      explicitNext={explicitNext}
    />
  );
}
