import usePubs from "../finder/_shared/hooks/usePubs";

const AdminOverview = () => {
  //

  // Hooks
  const {
    data: { pubs = [] },
  } = usePubs();

  //

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
