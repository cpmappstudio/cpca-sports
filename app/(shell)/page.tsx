import { OrganizationList } from "@clerk/nextjs";
import React from "react";

function SignInPage() {
  return (
    <div className="flex justify-center items-center h-screen">
      <OrganizationList
        afterCreateOrganizationUrl="/:slug"
        afterSelectOrganizationUrl="/:slug"
      />
    </div>
  );
}

export default SignInPage;
