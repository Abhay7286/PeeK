"use client";
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Geist, Geist_Mono } from "next/font/google"; 
import { User, AuthChangeEvent, Session } from "@supabase/supabase-js";
import { SideHistory } from "@/app/components/SideHistory";
import { Menu, Save } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { LayoutContext } from "@/app/context/LayoutContext";
import "@/styles/global.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [user, setUser] = useState<User | null>(null);
  const [isSideHistoryOpen, setIsSideHistoryOpen] = useState(false);
  const [saveHandler, setSaveHandler] = useState<(() => Promise<void>) | null>(null);
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    checkUser();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event: AuthChangeEvent, session: Session | null) => {
        setUser(session?.user ?? null);
      }
    );

    // Add smooth scroll listener with requestAnimationFrame for better performance
    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          setScrollY(window.scrollY);
          ticking = false;
        });
        ticking = true;
      }
    };
    
    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      authListener?.subscription?.unsubscribe();
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const handleSignOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const handleSave = useCallback(async () => {
    if (saveHandler) {
      await saveHandler();
    }
  }, [saveHandler]);

  // Use useCallback to memoize the setSaveHandler function
  const setSaveHandlerWrapper = useCallback((handler: () => Promise<void>) => {
    setSaveHandler(() => handler);
  }, []);

  // Memoize the context value to prevent unnecessary re-renders
  const contextValue = useMemo(() => ({
    user,
    handleSave: user ? handleSave : null,
    setSaveHandler: setSaveHandlerWrapper
  }), [user, handleSave, setSaveHandlerWrapper]);

  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <LayoutContext.Provider value={contextValue}>
          {/* Fixed floating sidebar and save buttons - only visible when logged in */}
          {user && (
            <>
              {/* Side History Component */}
              <SideHistory 
                isOpen={isSideHistoryOpen} 
                onClose={() => setIsSideHistoryOpen(false)}
                user={user}
                onSignOut={handleSignOut}
              />
              
              {/* Fixed floating menu button with smooth movement */}
              {!isSideHistoryOpen && (
                <button 
                  onClick={() => setIsSideHistoryOpen(!isSideHistoryOpen)}
                  className="
                    fixed z-[9999] 
                    bg-white/20 backdrop-blur-sm 
                    p-2 rounded-full 
                    shadow-lg hover:shadow-xl 
                    transition-all duration-300 ease-in-out 
                    hover:bg-white/30 hover:scale-110
                    will-change-transform
                  "
                  style={{ 
                    left: '16px',
                    transform: `translateY(${scrollY + 16}px)`,
                    transition: 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1), background-color 0.3s ease, box-shadow 0.3s ease, transform 0.3s ease'
                  }}
                  aria-label="Open history menu"
                >
                  <Menu className="text-white w-6 h-6 transition-transform duration-200" />
                </button>
              )}

              {/* Fixed floating save button with smooth movement */}
              <button 
                onClick={handleSave} 
                className="
                  fixed z-[9999]
                  bg-white/10 hover:bg-white/20 
                  backdrop-blur-md 
                  p-3 rounded-full 
                  shadow-lg hover:shadow-xl hover:scale-110
                  transition-all duration-300 ease-in-out
                  flex items-center justify-center
                  border border-white/10 hover:border-white/30
                  will-change-transform
                "
                style={{ 
                  right: '16px',
                  transform: `translateY(${scrollY + 16}px)`,
                  transition: 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1), background-color 0.3s ease, box-shadow 0.3s ease, transform 0.3s ease'
                }}
                aria-label="Save current search"
              >
                <Save className="text-white/80 hover:text-white w-6 h-6 transition-all duration-200" />
              </button>
            </>
          )}
          
          {children}
        </LayoutContext.Provider>
      </body>
    </html>
  );
}