import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

// Hooks
import ProgressBar from "./_shared/components/ProgressBar";
import usePubs from "../../_shared/hooks/pubs/usePubs";
import { useSupabase } from "../../_shared/hooks/useSupabase";
import { supabaseClient } from "../../_shared/hooks/useSupabaseAuth";

const AdminOverview = () => {
  // State
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Hooks
  const { isAuthenticated, isAuthorizedUser } = useSupabase();
  const queryClient = useQueryClient();

  // Hooks
  const {
    data: { pubs = [], pubsProcessedThisJulianWeek = [] },
  } = usePubs();

  // Effect to refetch pubs when component mounts
  useEffect(() => {
    queryClient.refetchQueries({ queryKey: ["pubs"] });
  }, [queryClient]);

  // Variables

  const pubsWithAreasAdded = pubs.filter(({ has_areas_added }) => {
    return has_areas_added;
  });

  const pubsWithAreasMeasured = pubs.filter(({ has_areas_measured }) => {
    return has_areas_measured;
  });

  const pubsWithLabelsAdded = pubs.filter(({ has_labels_added }) => {
    return has_labels_added;
  });

  const pubsWithVisionMasksAdded = pubs.filter(({ has_vision_masks_added }) => {
    return has_vision_masks_added;
  });

  // Targets
  const pubsTarget = 1000;

  // Calculate percentages
  const areasAddedPercent = pubs.length
    ? Math.round((pubsWithAreasAdded.length / pubs.length) * 100)
    : 0;
  const areasMeasuredPercent = pubs.length
    ? Math.round((pubsWithAreasMeasured.length / pubs.length) * 100)
    : 0;
  const labelsAddedPercent = pubs.length
    ? Math.round((pubsWithLabelsAdded.length / pubs.length) * 100)
    : 0;
  const visionMasksAddedPercent = pubs.length
    ? Math.round((pubsWithVisionMasksAdded.length / pubs.length) * 100)
    : 0;

  // Login function
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { error } = await supabaseClient.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      // Refresh the page data after login
      queryClient.refetchQueries({ queryKey: ["pubs"] });
    } catch (err: any) {
      setError(err.message || "Failed to sign in");
      console.error("Login error:", err);
    } finally {
      setLoading(false);
    }
  };

  // Logout function
  const handleLogout = async () => {
    setLoading(true);
    try {
      await supabaseClient.auth.signOut();
    } catch (err) {
      console.error("Logout error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex w-full h-full flex-col items-center justify-center gap-6 p-4 max-w-3xl mx-auto">
      {isAuthenticated && isAuthorizedUser ? (
        <>
          <div className="flex justify-between items-center w-full max-w-3xl mb-4">
            <h1 className="text-2xl font-bold">Admin Overview</h1>
            <button
              onClick={handleLogout}
              className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
              disabled={loading}
            >
              {loading ? "Logging out..." : "Log out"}
            </button>
          </div>

          <div className="space-y-6">
            <div className="p-4 bg-white rounded-lg shadow">
              <h2 className="text-xl font-semibold mb-4">Overall Progress</h2>
              <ProgressBar
                value={pubs.length}
                max={pubsTarget}
                label="Total Pubs"
              />
            </div>

            <div className="p-4 bg-white rounded-lg shadow">
              <h2 className="text-xl font-semibold mb-4">
                Area Completion Metrics
              </h2>
              <div className="space-y-4">
                <ProgressBar
                  value={pubsWithAreasAdded.length}
                  max={pubs.length}
                  label="Pubs with Areas Added"
                />

                <ProgressBar
                  value={pubsWithAreasMeasured.length}
                  max={pubs.length}
                  label="Pubs with Areas Measured"
                />

                <ProgressBar
                  value={pubsWithVisionMasksAdded.length}
                  max={pubs.length}
                  label="Pubs with Vision Masks Added"
                />

                <ProgressBar
                  value={pubsWithLabelsAdded.length}
                  max={pubs.length}
                  label="Pubs with Labels added"
                />
              </div>

              <div className="mt-4 text-sm text-gray-600">
                <p>
                  Pubs with areas added: {pubsWithAreasAdded.length} of{" "}
                  {pubs.length} ({areasAddedPercent}%)
                </p>
                <p>
                  Pubs with areas measured: {pubsWithAreasMeasured.length} of{" "}
                  {pubs.length} ({areasMeasuredPercent}%)
                </p>

                <p>
                  Pubs with labels added: {pubsWithLabelsAdded.length} of{" "}
                  {pubs.length} ({labelsAddedPercent}%)
                </p>

                <p>
                  Pubs with vision masks added:{" "}
                  {pubsWithVisionMasksAdded.length} of {pubs.length} (
                  {visionMasksAddedPercent}%)
                </p>
              </div>
            </div>

            <div className="p-4 bg-white rounded-lg shadow">
              <h2 className="text-xl font-semibold mb-4">
                Sun Evaluation Metrics
              </h2>
              <div className="space-y-4">
                <ProgressBar
                  value={pubsProcessedThisJulianWeek.length}
                  max={pubsWithVisionMasksAdded.length}
                  label="Pubs processed for this week"
                />
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center gap-6 p-8 bg-blue-500 bg-opacity-10 rounded-lg backdrop-blur-sm max-w-md w-full">
          <h1 className="text-2xl font-bold text-white">
            Admin Authentication Required
          </h1>
          <p className="text-white text-center mb-4">
            You need to log in with an admin account to access this page and
            perform administrative actions.
          </p>

          <form onSubmit={handleLogin} className="w-full space-y-4">
            {error && (
              <div className="bg-red-500 bg-opacity-80 text-white p-3 rounded text-sm">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="email" className="text-white text-sm block mb-1">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2 rounded bg-white bg-opacity-20 text-white border border-white border-opacity-30 focus:outline-none focus:ring-2 focus:ring-white focus:ring-opacity-50"
                required
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="text-white text-sm block mb-1"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 rounded bg-white bg-opacity-20 text-white border border-white border-opacity-30 focus:outline-none focus:ring-2 focus:ring-white focus:ring-opacity-50"
                required
              />
            </div>

            <button
              type="submit"
              className="bg-white text-blue-900 px-6 py-3 rounded-md font-semibold shadow-lg hover:bg-opacity-90 transition-all w-full disabled:opacity-50"
              disabled={loading}
            >
              {loading ? "Logging in..." : "Log in with Supabase"}
            </button>
          </form>

          <p className="text-white text-sm text-center mt-4">
            Only authorized administrators can perform actions that modify data
            in the database.
          </p>
        </div>
      )}
    </div>
  );
};

export default AdminOverview;
