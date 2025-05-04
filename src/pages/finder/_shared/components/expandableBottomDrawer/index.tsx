import { useEffect, useState, useRef } from "react";
import usePubAreas from "../../../../../_shared/hooks/pubAreas/usePubAreas";
import { Pub } from "../../../../../_shared/types";

const ExpandableBottomDrawer = () => {
  // State for animations
  const [isContentVisible, setIsContentVisible] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);
  const [renderPubContent, setRenderPubContent] = useState(false);
  const [renderSliderContent, setRenderSliderContent] = useState(false);
  const prevSelectedPubRef = useRef<Pub | null>(null);

  // Hooks
  const {
    data: { selectedPub },
    operations: { onSetSelectedPub },
  } = usePubAreas();

  // Animation timing constants
  const FADE_DURATION = 200; // ms - how long opacity transitions take
  const HEIGHT_DURATION = 300; // ms - how long height transitions take

  // Handle transitions between pub states
  useEffect(() => {
    const hadPub = prevSelectedPubRef.current !== null;
    const hasPub = selectedPub !== null;

    // Going from pub to no pub
    if (hadPub && !hasPub) {
      // 1. First hide the content
      setIsContentVisible(false);

      // 2. After content is hidden, switch what's rendered and collapse
      setTimeout(() => {
        setRenderPubContent(false);
        setRenderSliderContent(true);
        setIsExpanded(false);

        // 3. After height transition completes, show content
        setTimeout(() => {
          setIsContentVisible(true);
        }, HEIGHT_DURATION);
      }, FADE_DURATION);
    }
    // Going from no pub to pub
    else if (!hadPub && hasPub) {
      // 1. First hide the content
      setIsContentVisible(false);

      // 2. After content is hidden, switch what's rendered and expand
      setTimeout(() => {
        setRenderSliderContent(false);
        setRenderPubContent(true);
        setIsExpanded(true);

        // 3. After height transition completes, show content
        setTimeout(() => {
          setIsContentVisible(true);
        }, HEIGHT_DURATION);
      }, FADE_DURATION);
    }
    // Changing between pubs
    else if (hasPub && hadPub) {
      // Just update content without height changes
      setIsContentVisible(false);

      setTimeout(() => {
        setRenderPubContent(true);
        setRenderSliderContent(false);
        setIsContentVisible(true);
      }, FADE_DURATION);
    }

    // Update ref for next comparison
    prevSelectedPubRef.current = selectedPub;
  }, [selectedPub]);

  // Initialize states based on initial selectedPub value
  useEffect(() => {
    // Set initial states based on whether we have a selectedPub
    const hasPub = !!selectedPub;
    setIsExpanded(hasPub);
    setRenderPubContent(hasPub);
    setRenderSliderContent(!hasPub);
    setIsContentVisible(true); // Start with content visible
    prevSelectedPubRef.current = selectedPub;
  }, []);

  return (
    <div
      className={`transition-all duration-300 ease-in-out fixed bottom-[0px] left-[8px] right-[8px] p-4 bg-white shadow-lg border-1 border-slate-800 rounded-t-xl ${isExpanded ? "h-[80vh]" : "h-16"}`}
    >
      <div
        className={`${isContentVisible ? "opacity-100" : "opacity-0"} transition-opacity duration-200 overflow-hidden h-full`}
      >
        {/* Only render one type of content at a time */}
        {renderPubContent && (
          <div>
            {selectedPub?.id && (
              <>
                <button onClick={() => onSetSelectedPub(null)}>
                  {selectedPub?.id || ""}
                </button>
                <button onClick={() => onSetSelectedPub(null)}>
                  {selectedPub?.id || ""}
                </button>
                <button onClick={() => onSetSelectedPub(null)}>
                  {selectedPub?.id || ""}
                </button>
                <button onClick={() => onSetSelectedPub(null)}>
                  {selectedPub?.id || ""}
                </button>
                <button onClick={() => onSetSelectedPub(null)}>
                  {selectedPub?.id || ""}
                </button>
                <button onClick={() => onSetSelectedPub(null)}>
                  {selectedPub?.id || ""}
                </button>
                <button onClick={() => onSetSelectedPub(null)}>
                  {selectedPub?.id || ""}
                </button>
              </>
            )}
          </div>
        )}
        {renderSliderContent && (
          <div className="h-16">
            <p>Time slider here</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ExpandableBottomDrawer;
