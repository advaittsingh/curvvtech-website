"use client";

/** OAuth removed with unified JWT API — use email/password above. */
const SocialSignIn = ({ actionText: _actionText = "Sign In" }: { actionText?: string }) => {
  return (
    <p className="text-center text-sm text-dark_black/50 dark:text-white/50">
      Social sign-in is disabled. Use email and password with the unified API.
    </p>
  );
};

export default SocialSignIn;
