import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";

// Hooks
import usePubs from "../finder/_shared/hooks/usePubs";

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

  return (
    <div className="flex flex-col gap-4 p-2">
      <h1 className="text-2xl font-bold">Admin Overview</h1>
      <p>Pubs in DB: {pubs.length || "0"}</p>

      <p>Pubs with areas added: {pubsWithAreasAdded.length || "0"}</p>
      <p>Pubs with areas measured: {pubsWithAreasMeasured.length || "0"}</p>
    </div>
  );
};

export default AdminOverview;
