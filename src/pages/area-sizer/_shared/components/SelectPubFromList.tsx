import React from "react";
import { Pub } from "../../../../_shared/types";

interface PubListProps {
  pubs: Pub[];
  selectedPubId: number;
  onSelectPub: (pubId: number) => void;
}

const PubList: React.FC<PubListProps> = ({
  pubs,
  selectedPubId,
  onSelectPub,
}) => {
  if (!pubs || pubs.length === 0) {
    return (
      <div className="p-4 text-center text-gray-500">No pubs available</div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="p-3 bg-gray-50 border-b border-gray-200">
        <h3 className="text-sm font-medium text-gray-700">
          Select a pub to measure its outside area
        </h3>
      </div>

      <div className="max-h-[500px] overflow-y-auto">
        {pubs.map((pub) => (
          <div
            key={pub.id}
            className={`
              p-3 border-b border-gray-100 last:border-b-0 cursor-pointer
              hover:bg-blue-50 transition-colors duration-150
              ${selectedPubId === pub.id ? "bg-blue-100" : ""}
            `}
            onClick={() => onSelectPub(pub.id)}
          >
            <div className="flex items-start">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 truncate">{pub.name}</p>
                <p className="text-sm text-gray-500 truncate">
                  {pub.address_text}
                </p>
                <div className="flex items-center mt-1 text-xs text-gray-400">
                  <span>
                    {pub.latitude.toFixed(5)}, {pub.longitude.toFixed(5)}
                  </span>
                </div>
              </div>
              {selectedPubId === pub.id && (
                <span className="inline-flex items-center justify-center w-5 h-5 bg-blue-500 rounded-full">
                  <svg
                    className="w-3 h-3 text-white"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PubList;
