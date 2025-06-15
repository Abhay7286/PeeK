import React from "react";
import { SEARCH_COMPONENTS } from "@/config/searchComponents";

interface ComponentToggleProps {
  activeComponents: string[];
  toggleComponent: (componentName: string) => void;
}

const ComponentToggle: React.FC<ComponentToggleProps> = ({
  activeComponents,
  toggleComponent
}) => {
  return (
    <div className="component-toggle-container flex justify-center space-x-2 my-4">
      {SEARCH_COMPONENTS.map(({ name }) => (
        <button
          key={name}
          onClick={() => toggleComponent(name)}
          className={`glass-toggle ${activeComponents.includes(name) 
            ? 'active bg-white/30 text-white' 
            : 'bg-black/50 text-white/50'} 
            w-4 h-4 rounded-full transition-all duration-300 ease-in-out hover:scale-105`}
          data-component={name.toLowerCase()}
          aria-label={`Toggle ${name}`}
        />
      ))}
    </div>
  );
};

export default ComponentToggle;