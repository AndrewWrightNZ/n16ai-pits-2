import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

// Context
import {
  PubLabelsState,
  usePubLabelsContext,
} from "../providers/PubLabelsProvider";

// Hooks
import { supabaseClient } from "../../../../_shared/hooks/useSupabase";

// Types
import { Pub, PubLabel } from "../../../../_shared/types";
import { usePubAreasContext } from "../../../../_shared/providers/PubAreasProvider";

interface SetPubLabelsAddedPayload {
  pub_id: number;
}

interface CreatePubLabelPayload {
  name: string;
  description: string;
  type: string;
}

interface AddLabelToPubPayload {
  pubId: number;
  labelId: number;
}

interface PubLabelsData extends PubLabelsState {
  // Loading
  isSettingPubLabelsAdded: boolean;
  isLoadingAvailablePubLabels: boolean;
  isCreatingPubLabel: boolean;
  isAddingLabelToPub: boolean;
  isLoadingPubLabels: boolean;

  // Labels
  availablePubLabels: PubLabel[];
  pubLabels: PubLabel[];
}

interface PubLabelsOperations {
  // Update state
  onUpdatePubLabelDetails: (
    newPubLabelDetails: Partial<PubLabelsState>
  ) => void;

  // Update for pub
  onSetPubLabelsAdded: () => void;

  // Create new label
  onCreatePubLabel: (
    labelData: CreatePubLabelPayload,
    options?: {
      onSuccess?: () => void;
      onError?: (error: any) => void;
    }
  ) => void;

  // Add label to pub
  onAddLabelToPub: (
    data: AddLabelToPubPayload,
    options?: {
      onSuccess?: () => void;
      onError?: (error: any) => void;
    }
  ) => void;
}

interface PubLabelsResponse {
  data: PubLabelsData;
  operations: PubLabelsOperations;
}

const usePubLabels = (): PubLabelsResponse => {
  //

  // Hooks
  const queryClient = useQueryClient();

  //

  // Context
  const { pubLabelsState, updatePubLabelsState } = usePubLabelsContext();
  const { pubAreasState } = usePubAreasContext();

  //

  // Variables
  const { selectedPubId } = pubAreasState || {};

  //

  // Mutations
  const GET_PUB_BY_ID_QUERY_KEY = ["pubById", selectedPubId];
  const GET_PUB_LABELS_QUERY_KEY = ["getPubLabels"];
  const GET_PUB_LABELS_FOR_PUB_QUERY_KEY = [
    "getPubLabelsForPub",
    selectedPubId,
  ];

  const { mutate: setPubLabelsAdded, isPending: isSettingPubLabelsAdded } =
    useMutation({
      mutationFn: async ({ pub_id }: SetPubLabelsAddedPayload) => {
        // Update pub to indicate labels have been added
        const { data, error } = await supabaseClient
          .from("pub")
          .update({ has_labels_added: true })
          .eq("id", pub_id);
        if (error) throw error;
        return data;
      },
    });

  const { mutate: createPubLabel, isPending: isCreatingPubLabel } = useMutation(
    {
      mutationFn: async (labelData: CreatePubLabelPayload) => {
        // Create a new pub label
        const { data, error } = await supabaseClient
          .from("pub_label")
          .insert([{ ...labelData, id: Date.now() }])
          .select("*")
          .single();

        if (error) throw error;
        return data;
      },
    }
  );

  const { mutate: addLabelToPub, isPending: isAddingLabelToPub } = useMutation({
    mutationFn: async ({ pubId, labelId }: AddLabelToPubPayload) => {
      // 1. Get the current pub record to access the label_ids array
      const { data: pubData, error: pubError } = await supabaseClient
        .from("pub")
        .select("label_ids")
        .eq("id", pubId)
        .single();

      if (pubError) throw pubError;

      // 2. Update the pub with the new label_id added to the array
      const currentLabelIds = pubData.label_ids || [];

      // Check if label is already in the array to avoid duplicates
      if (currentLabelIds.includes(labelId)) {
        return { message: "Label already added to pub" };
      }

      const updatedLabelIds = [...currentLabelIds, labelId];

      const { data, error } = await supabaseClient
        .from("pub")
        .update({ label_ids: updatedLabelIds })
        .eq("id", pubId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
  });

  //

  // Query functions
  const fetchAvailablePubLabels = async (): Promise<PubLabel[]> => {
    // Fetch all available pub labels
    const { data, error } = await supabaseClient.from("pub_label").select("*");

    if (error) throw error;
    return data;
  };

  const fetchPubLabels = async (): Promise<PubLabel[]> => {
    if (!selectedPubId) return [];

    // First get the pub record to get the label_ids array
    const { data: pubData, error: pubError } = await supabaseClient
      .from("pub")
      .select("label_ids")
      .eq("id", selectedPubId)
      .single();

    if (pubError) throw pubError;

    const labelIds = pubData.label_ids || [];

    // If no labels, return empty array
    if (labelIds.length === 0) return [];

    // Fetch all labels that match the IDs
    const { data, error } = await supabaseClient
      .from("pub_label")
      .select("*")
      .in("id", labelIds);

    if (error) throw error;
    return data;
  };

  //

  // Queries
  const {
    data: availablePubLabels = [],
    isLoading: isLoadingAvailablePubLabels,
  } = useQuery({
    queryKey: GET_PUB_LABELS_QUERY_KEY,
    queryFn: fetchAvailablePubLabels,
  });

  const { data: pubLabels = [], isLoading: isLoadingPubLabels } = useQuery({
    queryKey: GET_PUB_LABELS_FOR_PUB_QUERY_KEY,
    queryFn: fetchPubLabels,
    enabled: !!selectedPubId, // Only run when a pub is selected
  });

  //

  // Handlers
  const onUpdatePubLabelDetails = (
    newPubLabelDetails: Partial<PubLabelsState>
  ) => {
    updatePubLabelsState({
      ...pubLabelsState,
      ...newPubLabelDetails,
    });
  };

  const onSetPubLabelsAdded = () => {
    setPubLabelsAdded(
      {
        pub_id: selectedPubId || 0,
      },
      {
        onSuccess: () => {
          // Manually update the query
          queryClient.setQueryData(
            GET_PUB_BY_ID_QUERY_KEY,
            (oldData: Pub | undefined) => {
              if (!oldData) return null;
              return { ...oldData, has_labels_added: true };
            }
          );

          // Refetch the 'pubs' query
          queryClient.refetchQueries({
            queryKey: ["pubs"],
          });
        },
        onError: (error) => {
          console.error("Error setting labels added:", error);
        },
      }
    );
  };

  const onCreatePubLabel = (
    labelData: CreatePubLabelPayload,
    options?: {
      onSuccess?: () => void;
      onError?: (error: any) => void;
    }
  ) => {
    createPubLabel(labelData, {
      onSuccess: (newLabel) => {
        // Update the cache with the new label
        queryClient.setQueryData(
          GET_PUB_LABELS_QUERY_KEY,
          (oldData: PubLabel[] | undefined) => {
            if (!oldData) return [newLabel];
            return [...oldData, newLabel];
          }
        );

        // Call custom success handler if provided
        if (options?.onSuccess) {
          options.onSuccess();
        }
      },
      onError: (error) => {
        console.error("Error creating pub label:", error);

        // Call custom error handler if provided
        if (options?.onError) {
          options.onError(error);
        }
      },
    });
  };

  const onAddLabelToPub = (
    data: AddLabelToPubPayload,
    options?: {
      onSuccess?: () => void;
      onError?: (error: any) => void;
    }
  ) => {
    addLabelToPub(data, {
      onSuccess: () => {
        // Invalidate and refetch the pub labels
        queryClient.invalidateQueries({
          queryKey: GET_PUB_LABELS_FOR_PUB_QUERY_KEY,
        });

        // Call custom success handler if provided
        if (options?.onSuccess) {
          options.onSuccess();
        }
      },
      onError: (error) => {
        console.error("Error adding label to pub:", error);

        // Call custom error handler if provided
        if (options?.onError) {
          options.onError(error);
        }
      },
    });
  };

  return {
    data: {
      ...pubLabelsState,

      // Loading
      isSettingPubLabelsAdded,
      isLoadingAvailablePubLabels,
      isCreatingPubLabel,
      isAddingLabelToPub,
      isLoadingPubLabels,

      // Labels
      availablePubLabels,
      pubLabels,
    },
    operations: {
      // Update state
      onUpdatePubLabelDetails,

      // Update DB
      onSetPubLabelsAdded,
      onCreatePubLabel,
      onAddLabelToPub,
    },
  };
};

export default usePubLabels;
