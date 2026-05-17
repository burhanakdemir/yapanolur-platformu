/** Üye kayıt formu: admin OTP bayraklarından UI kapıları (null = henüz yüklenmedi). */
export function computeSignupOtpGates(
  signupEmailRequired: boolean | null,
  signupPhoneRequired: boolean | null,
) {
  return {
    emailOtpGate: signupEmailRequired === true,
    phoneOtpGate: signupPhoneRequired === true,
    phoneOtpUiEnabled: signupPhoneRequired === true,
  };
}

export function isSignupBlockedUntilVerified(
  isReadonly: boolean,
  emailOtpGate: boolean,
  phoneOtpGate: boolean,
  emailVerified: boolean,
  phoneVerified: boolean,
): boolean {
  return (
    !isReadonly &&
    ((emailOtpGate && !emailVerified) || (phoneOtpGate && !phoneVerified))
  );
}
