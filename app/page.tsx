"use client";
import React, { useState, useEffect, useContext } from "react";
import { LayoutContext } from './context/LayoutContext';
import "styles/page.css";
// Import new components
import AuthComponent from "@/app/components/main/AuthComponent";
import SearchForm from "@/app/components/main/SearchForm";
import ComponentToggle from "@/app/components/main/ComponentToggle"
import ResultsSection from "@/app/components/main/ResultsSection";
// Import services and config
import { supabase } from "@/lib/supabase";
import { generateSpecializedQueries } from "@/app/api/main/smartQuery";
import { saveResults } from "@/app/api/main/save";
import { SpecializedQueries } from "@/types";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

const Page: React.FC = () => {
  const { user, setSaveHandler } = useContext(LayoutContext);
  const [query, setQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [activeComponents, setActiveComponents] = useState<string[]>([]);
  const [allOptimizedQueries, setAllOptimizedQueries] = useState<SpecializedQueries>({});

  // Set up the save handler for the layout to use
  useEffect(() => {
    const handleSave = async () => {
      if (!user) return;
      await saveResults(user, submittedQuery, allOptimizedQueries, activeComponents);
    };
    
    setSaveHandler(handleSave);
  }, [user, submittedQuery, allOptimizedQueries, activeComponents, setSaveHandler]);

  const handleSearch = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    
    // If no components are selected, don't search anything
    if (activeComponents.length === 0) {
      setSubmittedQuery(query);
      setIsSearching(false);
      return;
    }

    setSubmittedQuery(query);
    setIsSearching(true);

    try {
      const optimizedQueries = await generateSpecializedQueries(query);
      setAllOptimizedQueries(optimizedQueries);
    } catch (error) {
      console.error("Error in query optimization:", error);
    } finally {
      setIsSearching(false);
    }
  };

  const toggleComponent = (componentName: string) => {
    setActiveComponents(prev => {
      return prev.includes(componentName)
        ? prev.filter(name => name !== componentName)
        : [...prev, componentName];
    });
  };

  const getCurrentSpecializedQueries = (): SpecializedQueries => {
    const currentQueries: SpecializedQueries = {};
    activeComponents.forEach(componentName => {
      if (allOptimizedQueries[componentName]) {
        currentQueries[componentName] = allOptimizedQueries[componentName];
      }
    });
    return currentQueries;
  };

  const handleSignIn = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${siteUrl}/auth/callback`,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent'
        }
      }
    });
  };

  if (!user) {
    return <AuthComponent onSignIn={handleSignIn} />;
  }

  return (
    <div className="search-container bg-black min-h-screen text-white relative">
      <div className="background-layer" />
      
      <h1 className="main-heading text-white text-center text-4xl my-8">
        Peekaboo
      </h1>

      <div className="search-section">
        <SearchForm
          query={query}
          setQuery={setQuery}
          handleSearch={handleSearch}
          isSearching={isSearching}
        />
      </div>

      <ComponentToggle 
        activeComponents={activeComponents}
        toggleComponent={toggleComponent}
      />

      {submittedQuery && (
        <div className="query-display text-center my-4">
          Showing results for: <span className="query-text">{submittedQuery}</span>
        </div>
      )}

      {submittedQuery && activeComponents.length > 0 && (
        <ResultsSection 
          submittedQuery={submittedQuery} 
          activeComponents={activeComponents}
          specializedQueries={getCurrentSpecializedQueries()}
        />
      )}
    </div>
  );
};

export default Page;