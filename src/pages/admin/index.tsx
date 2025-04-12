import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";

// Hooks
import usePubs from "../finder/_shared/hooks/usePubs";
import ProgressBar from "./_shared/components/ProgressBar";

const AdminOverview = () => {
  // Add query client
  const queryClient = useQueryClient();

  // Hooks
  const {
    data: { pubs = [] },
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

  // Targets
  const pubsTarget = 1000;
  const areasAddedPercentTarget = 100;
  const areasMeasuredPercentTarget = 100;

  // Calculate percentages
  const areasAddedPercent = pubs.length
    ? Math.round((pubsWithAreasAdded.length / pubs.length) * 100)
    : 0;
  const areasMeasuredPercent = pubs.length
    ? Math.round((pubsWithAreasMeasured.length / pubs.length) * 100)
    : 0;

  return (
    <div className="flex flex-col gap-6 p-4 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold">Admin Overview</h1>

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
              max={areasAddedPercentTarget}
              label="Pubs with Areas Added"
              percentage={true}
            />

            <ProgressBar
              value={pubsWithAreasMeasured.length}
              max={areasMeasuredPercentTarget}
              label="Pubs with Areas Measured"
              percentage={true}
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
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminOverview;
