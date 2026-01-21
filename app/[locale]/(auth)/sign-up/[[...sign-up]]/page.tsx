// ################################################################################
// # Check: 12/13/2025                                                            #
// ################################################################################

import { SignUp } from "@clerk/nextjs";
import { ROUTES } from "@/lib/navigation/routes";

export default function SignUpPage() {
  return <SignUp signInUrl={ROUTES.auth.signIn} unsafeMetadata={{}} />;
}
