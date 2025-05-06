import { useState } from "react";

// Hooks
import useEarlyAccess from "../../../../_shared/hooks/earlyAccess/useEarlyAccess";

// Icon
import { ChevronRight } from "lucide-react";

const SignUpForEarlyAccess = () => {
  //

  // State
  const [earlyAccessEmailAddress, setEarlyAccessEmailAddress] = useState("");

  //

  // Hooks
  const {
    data: { showSignUpSuccess },
    operations: { onToggleSignUpForEarlyAccess, onSignUpForEarlyAccess },
  } = useEarlyAccess();

  //

  // Handlers
  const handleSignUpForEarlyAccess = () => {
    onSignUpForEarlyAccess(earlyAccessEmailAddress);
    setEarlyAccessEmailAddress("");
  };

  return (
    <>
      {showSignUpSuccess ? (
        <p className="text-white text-xs font-poppins font-bold mt-8">
          Thank you for signing up for early access! We'll be in touch in the
          next few days.
        </p>
      ) : (
        <>
          <div className="flex flex-col md:flex-row items-center justify-start gap-4">
            <input
              type="email"
              autoFocus
              className="w-full md:w-[300px] border-white border-2 rounded-md p-4 h-16 text-white placeholder:text-gray-200"
              placeholder="Enter your email address"
              value={earlyAccessEmailAddress}
              onChange={(e) => setEarlyAccessEmailAddress(e.target.value)}
            />
            <button
              onClick={handleSignUpForEarlyAccess}
              className="flex flex-row items-center justify-center h-16 p-4 w-full md:w-[200px] bg-white text-[#2962FF] font-poppins cursor-pointer font-bold rounded-md transition-all duration-300 hover:opacity-70"
            >
              Sign up <ChevronRight className="w-6 h-6" />
            </button>
          </div>

          <button
            className="text-white text-xs font-poppins font-bold underline mt-8 opacity-100 hover:opacity-70 transition-all duration-300"
            onClick={onToggleSignUpForEarlyAccess}
          >
            Have an Early Access code? Enter it here
          </button>
        </>
      )}
    </>
  );
};

export default SignUpForEarlyAccess;
