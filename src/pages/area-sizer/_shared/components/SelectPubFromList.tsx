import React, { useState, useEffect } from "react";
import { Pub } from "../../../../_shared/types";

interface PubListProps {
  pubs: Pub[];
  selectedPub: Pub | null;
  onSelectPub: (pub: Pub) => void;
}

const PubList: React.FC<PubListProps> = ({
  pubs,
  selectedPub,
  onSelectPub,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredPubs, setFilteredPubs] = useState<Pub[]>(pubs);

  // Update filtered pubs when search term or pubs list changes
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredPubs(pubs);
    } else {
      const normalizedSearchTerm = searchTerm.toLowerCase().trim();
      const filtered = pubs.filter(
        (pub) =>
          pub.name.toLowerCase().includes(normalizedSearchTerm) ||
          pub.address_text.toLowerCase().includes(normalizedSearchTerm)
      );
      setFilteredPubs(filtered);
    }
  }, [searchTerm, pubs]);

  if (!pubs || pubs.length === 0) {
    return (
      <div className="p-4 text-center text-gray-500">No pubs available</div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="p-3 bg-gray-50 border-b border-gray-200">
        <h3 className="text-sm font-medium text-gray-700 mb-2">
          Select a pub to measure its outside area
        </h3>
        <div className="relative">
          <input
            type="text"
            placeholder="Search pubs by name or address..."
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button
              className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-500"
              onClick={() => setSearchTerm("")}
              aria-label="Clear search"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          )}
        </div>
      </div>

      <div className="max-h-[500px] overflow-y-auto">
        {filteredPubs.length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            No pubs match your search criteria
          </div>
        ) : (
          filteredPubs.map((pub) => (
            <div
              key={pub.id}
              className={`
                p-3 border-b border-gray-100 last:border-b-0 cursor-pointer
                hover:bg-blue-50 transition-colors duration-150
                ${selectedPub?.id === pub.id ? "bg-blue-100" : ""}
              `}
              onClick={() => onSelectPub(pub)}
            >
              <div className="flex items-start">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">
                    {pub.name}
                  </p>
                  <p className="text-sm text-gray-500 truncate">
                    {pub.address_text}
                  </p>
                  <div className="flex items-center mt-1 text-xs text-gray-400">
                    <span>
                      {pub.latitude.toFixed(5)}, {pub.longitude.toFixed(5)}
                    </span>
                  </div>
                </div>
                {selectedPub?.id === pub.id && (
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
          ))
        )}
      </div>

      {/* Show count of results when filtering */}
      {searchTerm && (
        <div className="p-2 text-xs text-gray-500 border-t border-gray-100 bg-gray-50">
          Showing {filteredPubs.length} of {pubs.length} pubs
        </div>
      )}
    </div>
  );
};

export default PubList;
