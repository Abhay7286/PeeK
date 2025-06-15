import React from "react";
import { User } from "@supabase/supabase-js";

// Create a context for sharing user state and save functionality
export const LayoutContext = React.createContext<{
  user: User | null;
  handleSave: (() => Promise<void>) | null;
  setSaveHandler: (handler: () => Promise<void>) => void;
}>({
  user: null,
  handleSave: null,
  setSaveHandler: () => {},
});