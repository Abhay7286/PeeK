import React, { Suspense } from "react";
import { SEARCH_COMPONENTS } from "@/config/searchComponents";
import { SpecializedQueries } from "@/types";

interface ResultsSectionProps {
  submittedQuery: string;
  activeComponents: string[];
  specializedQueries: SpecializedQueries;
}

const ResultsSection: React.FC<ResultsSectionProps> = ({ 
  submittedQuery, 
  activeComponents,
  specializedQueries 
}) => (
  <div className="results-container" id="results-section">
    <Suspense fallback={<div className="results-loader text-white">Loading components...</div>}>
      {SEARCH_COMPONENTS.filter(comp => activeComponents.includes(comp.name)).map((config) => {
        const optimizedQuery = specializedQueries[config.name] || submittedQuery;
        
        if (config.propType === 'query') {
          const Component = config.component;
          return (
            <div
              key={config.name}
              className="result-card bg-black text-white border border-gray-800"
              data-component={config.name.toLowerCase()}
            >
              <Component query={optimizedQuery} />
            </div>
          );
        } else {
          const Component = config.component;
          return (
            <div
              key={config.name}
              className="result-card bg-black text-white border border-gray-800"
              data-component={config.name.toLowerCase()}
            >
              <Component keyword={optimizedQuery} />
            </div>
          );
        }
      })}
    </Suspense>
  </div>
);

export default ResultsSection;