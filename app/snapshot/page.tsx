"use client";

import React, { useState, useEffect, Suspense, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { AlertCircle, Download, FileText } from 'lucide-react';

export default function SnapshotPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-800">
      <Suspense fallback={<LoadingState />}>
        <SnapshotContent />
      </Suspense>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="flex justify-center items-center h-screen">
      <div className="text-center p-8 rounded-2xl backdrop-blur-xl bg-white/10 border border-white/20 shadow-2xl">
        <div className="animate-spin inline-block mb-4">
          <svg className="w-8 h-8 text-white/80" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
          </svg>
        </div>
        <p className="text-xl text-white/90 font-medium">Loading snapshot...</p>
      </div>
    </div>
  );
}

function SnapshotContent() {
  const [snapshotContent, setSnapshotContent] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const searchParams = useSearchParams();
  const htmlUrl = searchParams.get('url');

  useEffect(() => {
    // Ensure this runs only on the client side
    if (typeof window === 'undefined') return;

    const fetchFullPageContent = async () => {
      if (!htmlUrl) {
        setError('No URL provided');
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const response = await fetch(htmlUrl, {
          method: 'GET',
          headers: {
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
          }
        });
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const htmlContent = await response.text();
        
        // Basic sanitization and error prevention
        const sanitizedHtml = sanitizeHtml(htmlContent);
        
        setSnapshotContent(sanitizedHtml);
        setIsLoading(false);
      } catch (error) {
        console.error('Error fetching full page content:', error);
        setError(error instanceof Error ? error.message : 'An unknown error occurred');
        setIsLoading(false);
      }
    };

    fetchFullPageContent();
  }, [htmlUrl]);

  // HTML sanitization function
  const sanitizeHtml = (html: string): string => {
    try {
      // Remove potentially problematic scripts
      html = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
      
      // Remove inline event handlers
      html = html.replace(/on\w+="[^"]*"/gi, '');
      
      // Replace problematic image sources
      html = html.replace(
        /src=["'](https:\/\/lookaside\.instagram\.com\/seo\/google_widget\/crawler\/\?media_id=[^"']+)["']/g, 
        'src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZGRkIiAvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LXNpemU9IjE2IiBmaWxsPSIjNjY2IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBhbGlnbm1lbnQtYmFzZWxpbmU9Im1pZGRsZSI+SW1hZ2UgVW5hdmFpbGFibGU8L3RleHQ+PC9zdmc+"'
      );
      
      return html;
    } catch (error) {
      console.error('HTML sanitization error:', error);
      return '<div>Error processing page content</div>';
    }
  };

  // PDF Export function with optimized styling
  const exportToPDF = async () => {
    if (!contentRef.current || !snapshotContent) return;

    setIsExporting(true);
    
    try {
      // Create a new window for printing
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        throw new Error('Could not open print window. Please allow popups.');
      }

      // Get the current page's base URL for relative resources
      const baseUrl = htmlUrl ? new URL(htmlUrl).origin : window.location.origin;
      
      // Create the print document with optimized styling
      const printDocument = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Snapshot Export</title>
          <base href="${baseUrl}/">
          <style>
            @media print {
              * {
                box-sizing: border-box;
              }
              
              body { 
                margin: 0; 
                padding: 15px;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                line-height: 1.5;
                background: white !important;
                color: #333 !important;
                max-width: 190mm; /* Optimized for A4 */
                width: 100%;
              }
              
              @page {
                margin: 10mm;
                size: A4;
              }
              
              /* Content width optimization */
              .content-wrapper {
                max-width: 180mm;
                margin: 0 auto;
                overflow-wrap: break-word;
                word-wrap: break-word;
              }
              
              /* Image optimization */
              img {
                max-width: 100% !important;
                height: auto !important;
                page-break-inside: avoid;
                display: block;
                margin: 0 auto;
              }
              
              /* Table optimization */
              table {
                width: 100% !important;
                table-layout: fixed;
                border-collapse: collapse;
              }
              
              td, th {
                word-wrap: break-word;
                overflow-wrap: break-word;
                padding: 8px;
                border: 1px solid #ddd;
              }
              
              /* Text elements */
              p, div, span {
                orphans: 3;
                widows: 3;
                max-width: 100%;
                overflow-wrap: break-word;
              }
              
              /* Headings */
              h1, h2, h3, h4, h5, h6 {
                page-break-after: avoid;
                margin-top: 1em;
                margin-bottom: 0.5em;
                color: #222 !important;
              }
              
              /* Links */
              a {
                color: #0066cc !important;
                text-decoration: underline;
              }
              
              /* Hide elements that shouldn't print */
              .no-print, 
              nav, 
              .navigation,
              .sidebar,
              .ads,
              .advertisement,
              button:not(.print-button),
              .social-share,
              .comments {
                display: none !important;
              }
              
              /* Ensure dark backgrounds become white */
              * {
                background: white !important;
                background-color: white !important;
              }
              
              /* Fix text colors */
              * {
                color: #333 !important;
              }
              
              /* Special handling for certain elements */
              .dark, .bg-dark, .text-white {
                background: white !important;
                color: #333 !important;
              }
            }
            
            /* Screen styles */
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              line-height: 1.5;
              color: #333;
              max-width: 1200px;
              margin: 0 auto;
              padding: 20px;
            }
            
            img {
              max-width: 100%;
              height: auto;
            }
            
            .content-wrapper {
              width: 100%;
              max-width: 100%;
            }
          </style>
        </head>
        <body>
          <div class="content-wrapper">
            ${snapshotContent}
          </div>
          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
                window.onafterprint = function() {
                  window.close();
                };
              }, 1500);
            };
          </script>
        </body>
        </html>
      `;

      printWindow.document.write(printDocument);
      printWindow.document.close();

    } catch (error) {
      console.error('PDF export error:', error);
      alert(error instanceof Error ? error.message : 'Failed to export PDF');
    } finally {
      setIsExporting(false);
    }
  };

  // Alternative PDF export using HTML canvas (fallback method)
  const exportToPDFCanvas = async () => {
    if (!contentRef.current) return;

    setIsExporting(true);
    
    try {
      // Import html2canvas dynamically
      const html2canvas = await import('html2canvas').catch(() => null);
      if (!html2canvas) {
        // Fallback to print method
        await exportToPDF();
        return;
      }

      const canvas = await html2canvas.default(contentRef.current, {
        useCORS: true,
        allowTaint: true,
        scale: 2,
        scrollX: 0,
        scrollY: 0,
        width: Math.min(contentRef.current.scrollWidth, 1200),
        height: contentRef.current.scrollHeight,
        backgroundColor: '#ffffff',
      });

      // Create PDF using jsPDF
      const jsPDF = await import('jspdf').catch(() => null);
      if (!jsPDF) {
        // Fallback to print method
        await exportToPDF();
        return;
      }

      const pdf = new jsPDF.jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const imgData = canvas.toDataURL('image/png');
      const imgWidth = 190; // Optimized width for A4 with margins
      const pageHeight = 277; // A4 height with margins
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;

      let position = 0;

      pdf.addImage(imgData, 'PNG', 10, 10, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 10, position + 10, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      // Generate filename
      const filename = `snapshot-${new Date().toISOString().split('T')[0]}.pdf`;
      pdf.save(filename);

    } catch (error) {
      console.error('Canvas PDF export error:', error);
      // Fallback to print method
      await exportToPDF();
    } finally {
      setIsExporting(false);
    }
  };

  // Client-side rendering logic
  if (isLoading) {
    return <LoadingState />;
  }

  if (error) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-center p-8 rounded-2xl backdrop-blur-xl bg-white/10 border border-white/20 shadow-2xl max-w-md">
          <AlertCircle className="mx-auto mb-4 text-red-400" size={48} />
          <h2 className="text-2xl font-bold text-white mb-2">Snapshot Error</h2>
          <p className="text-white/80 mb-4">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-red-500/80 backdrop-blur-sm text-white rounded-xl hover:bg-red-500 transition-all duration-300 border border-red-400/30"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!snapshotContent) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-center p-8 rounded-2xl backdrop-blur-xl bg-white/10 border border-white/20 shadow-2xl">
          <p className="text-xl text-white/90">No snapshot found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen">
      {/* Export Controls */}
      <div className="fixed top-6 right-6 z-50 no-print">
        <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-4 shadow-2xl">
          <div className="flex gap-3">
            <button
              onClick={exportToPDF}
              disabled={isExporting}
              className="flex items-center gap-2 px-4 py-3 bg-blue-500/80 backdrop-blur-sm text-white rounded-xl hover:bg-blue-500 disabled:bg-gray-500/50 disabled:cursor-not-allowed transition-all duration-300 border border-blue-400/30 shadow-lg"
              title="Export as PDF (Print)"
            >
              {isExporting ? (
                <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
              ) : (
                <FileText size={16} />
              )}
              <span className="hidden sm:inline font-medium">Print PDF</span>
            </button>
            
            <button
              onClick={exportToPDFCanvas}
              disabled={isExporting}
              className="flex items-center gap-2 px-4 py-3 bg-green-500/80 backdrop-blur-sm text-white rounded-xl hover:bg-green-500 disabled:bg-gray-500/50 disabled:cursor-not-allowed transition-all duration-300 border border-green-400/30 shadow-lg"
              title="Export as PDF (Canvas)"
            >
              {isExporting ? (
                <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
              ) : (
                <Download size={16} />
              )}
              <span className="hidden sm:inline font-medium">Save PDF</span>
            </button>
          </div>
          
          {isExporting && (
            <div className="mt-3 text-sm text-white/80 text-center">
              <div className="flex items-center justify-center gap-2">
                <div className="w-2 h-2 bg-white/60 rounded-full animate-pulse"></div>
                <span>Generating PDF...</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Content Container */}
      <div className="container mx-auto px-6 py-8 max-w-6xl">
        <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-3xl shadow-2xl overflow-hidden">
          <div 
            ref={contentRef}
            dangerouslySetInnerHTML={{ __html: snapshotContent }}
            className="w-full min-h-screen p-6 overflow-x-auto"
            style={{
              maxWidth: '100%',
              wordWrap: 'break-word',
              overflowWrap: 'break-word'
            }}
          />
        </div>
      </div>

      {/* Background Elements */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl"></div>
        <div className="absolute top-3/4 left-1/2 w-64 h-64 bg-green-500/5 rounded-full blur-3xl"></div>
      </div>
    </div>
  );
}