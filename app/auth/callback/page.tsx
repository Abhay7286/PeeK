"use client";

import React, { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";

const Page: React.FC = () => {
  const [status, setStatus] = useState("Authenticating");
  const router = useRouter();
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    const handleAuth = async () => {
      try {
        // First, check for existing session
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionData.session) {
          setStatus("Welcome");
          setTimeout(() => router.push('/'), 1500);
          return;
        }

        // If no session, try to get the current user
        const { data: userData, error: userError } = await supabase.auth.getUser();
        
        if (userData.user) {
          setStatus("Welcome");
          setTimeout(() => router.push('/'), 1500);
          return;
        }

        // If both session and user checks fail, log detailed error
        if (sessionError) {
          console.error('Session Error:', sessionError);
        }
        
        if (userError) {
          console.error('User Error:', userError);
        }

        // Attempt manual sign-in to complete OAuth flow
        const { error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: process.env.NEXT_PUBLIC_SITE_URL
          }
        });

        if (error) {
          console.error('OAuth Error:', error);
          setStatus("Authentication Failed");
          setTimeout(() => router.push('/'), 2000);
        }
      } catch (error) {
        console.error('Unexpected Authentication Error:', error);
        setStatus("Authentication Failed");
        setTimeout(() => router.push('/'), 2000);
      }
    };

    handleAuth();
  }, [router, supabase]);

  return (
    <>
      <style jsx>{`
        .auth-container {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: black;
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 9999;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
        }
        .auth-card {
          text-align: center;
          color: white;
        }
        .status {
          font-size: 1.2rem;
          margin-bottom: 20px;
        }
        .apple-spinner {
          width: 50px;
          height: 50px;
          border: 3px solid rgba(255,255,255,0.3);
          border-radius: 50%;
          border-top-color: white;
          animation: spin 1s ease-in-out infinite;
          margin: 0 auto;
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .dot-animation {
          display: inline-block;
          overflow: hidden;
          vertical-align: bottom;
        }
        .dot-animation span {
          display: inline-block;
          animation: dots 1.4s infinite both;
        }
        .dot-animation span:nth-child(2) {
          animation-delay: 0.2s;
        }
        .dot-animation span:nth-child(3) {
          animation-delay: 0.4s;
        }
        @keyframes dots {
          0%, 20% { opacity: 0; transform: translateY(0); }
          50% { opacity: 1; transform: translateY(-5px); }
          80%, 100% { opacity: 0; transform: translateY(0); }
        }
      `}</style>
      <div className="auth-container">
        <div>
          <div className="status">
            {status}
            <span className="dot-animation">
              <span>.</span>
              <span>.</span>
              <span>.</span>
            </span>
          </div>
          <div className="apple-spinner"></div>
        </div>
      </div>
    </>
  );
};

export default Page;
