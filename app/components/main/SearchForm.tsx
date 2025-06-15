import React from "react";

interface SearchFormProps {
  query: string;
  setQuery: (query: string) => void;
  handleSearch: (event: React.FormEvent<HTMLFormElement>) => void;
  isSearching: boolean;
}

const SearchForm: React.FC<SearchFormProps> = ({ 
  query, 
  setQuery, 
  handleSearch, 
  isSearching 
}) => (
  <form onSubmit={handleSearch} className="search-form">
    <div className="search-bar-wrapper">
      <input
        type="text"
        placeholder="Enter your query here..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="search-input bg-black text-white"
      />
      <button
        type="submit"
        className="search-button bg-white text-black"
        disabled={isSearching}
      >
        {isSearching ? "Analyzing..." : "Search"}
      </button>
    </div>
  </form>
);

export default SearchForm;