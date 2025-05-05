// Hooks
import useEarlyAccess from "../../../../_shared/hooks/earlyAccess/useEarlyAccess";

// Icons
import { ChevronRight } from "lucide-react";

// Components
import SignUpForEarlyAccess from "./SignUpForEarlyAccess";

const EnterEarlyAccessCode = () => {
  //

  // Hooks
  const {
    data: {
      showSignUpForEarlyAccess,
      showSignUpSuccess,
      enteredAccessCode,
      showAccessCodeEnteredSuccess,
    },
    operations: {
      onAttemptEarlyAccess,
      onToggleSignUpForEarlyAccess,
      onUpdateAccessCode,
    },
  } = useEarlyAccess();

  //

  // Variables

  const notYetSuccesfull = !showSignUpSuccess && !showAccessCodeEnteredSuccess;

  return (
    <div>
      {notYetSuccesfull && (
        <h2 className="text-md font-bold text-white font-poppins mb-4">
          {showSignUpForEarlyAccess
            ? "Sign up for early access"
            : "Enter your Early Access Code"}
        </h2>
      )}

      {showSignUpForEarlyAccess ? (
        <SignUpForEarlyAccess />
      ) : (
        <>
          {!showAccessCodeEnteredSuccess && (
            <>
              <div className="flex flex-col md:flex-row items-center justify-start gap-4">
                <input
                  type="text"
                  autoFocus
                  className="w-full md:w-[300px] border-white border-2 rounded-md p-4 h-16 text-white placeholder:text-gray-200"
                  placeholder="Enter your Early Access Code"
                  value={enteredAccessCode}
                  onChange={(e) => onUpdateAccessCode(e.target.value)}
                />
                <button
                  onClick={onAttemptEarlyAccess}
                  className="flex flex-row items-center justify-center h-16 p-4 w-full md:w-[200px] bg-white text-[#2962FF] font-poppins cursor-pointer font-bold rounded-md transition-all duration-300 hover:opacity-70"
                >
                  Submit <ChevronRight className="w-6 h-6" />
                </button>
              </div>

              <button
                className="text-white text-xs font-poppins font-bold underline mt-8 opacity-100 hover:opacity-70 transition-all duration-300"
                onClick={onToggleSignUpForEarlyAccess}
              >
                Don't have a code? SIgn up for early access here
              </button>
            </>
          )}
        </>
      )}
    </div>
  );
};

export default EnterEarlyAccessCode;
