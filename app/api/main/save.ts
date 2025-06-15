import { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { SpecializedQueries } from "@/types";

export const saveResults = async (
  user: User,
  submittedQuery: string,
  allOptimizedQueries: SpecializedQueries,
  activeComponents: string[]
) => {
  try {
    const captureResultsOnly = async () => {
      return new Promise<string>((resolve, reject) => {
        const safeStringify = (obj: unknown) => {
          const cache = new WeakSet();
          return JSON.stringify(obj, (key, value) => {
            if (typeof value === 'object' && value !== null) {
              if (cache.has(value)) {
                return '[Circular]';
              }
              cache.add(value);
            }

            if (typeof value === 'function') return undefined;
            if (key === 'Provider' || key === 'context') return undefined;
            
            return value;
          }, 2);
        };

        const captureImagesBase64 = () => {
          const resultsSection = document.getElementById('results-section');
          if (!resultsSection) return [];
          
          return Array.from(resultsSection.querySelectorAll('img')).map(img => {
            try {
              const canvas = document.createElement('canvas');
              canvas.width = img.naturalWidth;
              canvas.height = img.naturalHeight;
              const ctx = canvas.getContext('2d');
              ctx?.drawImage(img, 0, 0);
              return {
                src: img.src,
                base64: canvas.toDataURL('image/png'),
                width: img.naturalWidth,
                height: img.naturalHeight,
                alt: img.alt
              };
            } catch {
              return {
                src: img.src,
                base64: null,
                width: img.naturalWidth,
                height: img.naturalHeight,
                alt: img.alt
              };
            }
          });
        };

        const captureApplicationState = () => {
          return {
            query: submittedQuery || '',
            specializedQueries: allOptimizedQueries || {},
            activeComponents: activeComponents || [],
            timestamp: new Date().toISOString(),
            userContext: user ? {
              id: user.id,
              email: user.email
            } : null,
            windowInfo: {
              innerWidth: window.innerWidth,
              innerHeight: window.innerHeight,
              devicePixelRatio: window.devicePixelRatio,
              userAgent: navigator.userAgent,
              platform: navigator.platform
            }
          };
        };

        const createResultsSnapshot = () => {
          const resultsSection = document.getElementById('results-section');
          const resultsHTML = resultsSection ? resultsSection.outerHTML : '<div>No results found</div>';
          
          const snapshotData = {
            applicationState: captureApplicationState(),
            images: captureImagesBase64(),
          };

          const snapshotScript = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Peekaboo Results Snapshot - ${submittedQuery}</title>
  <style>
    body { 
      font-family: Arial, sans-serif; 
      background: black; 
      color: white; 
      margin: 0; 
      padding: 20px; 
    }
    .snapshot-header {
      text-align: center;
      margin-bottom: 30px;
      padding: 20px;
      border-bottom: 1px solid #333;
    }
    .query-info {
      background: #111;
      padding: 15px;
      border-radius: 8px;
      margin-bottom: 20px;
    }
    .results-container {
      display: grid;
      gap: 20px;
    }
    .result-card {
      background: black;
      border: 1px solid #333;
      border-radius: 8px;
      padding: 20px;
    }
  </style>
  <script id="__PEEKABOO_SNAPSHOT__" type="application/json">
  ${safeStringify(snapshotData)}
  </script>
</head>
<body>
  <div class="snapshot-header">
    <h1>Peekaboo Results</h1>
    <p>Saved on: ${new Date().toLocaleString()}</p>
  </div>
  <div class="query-info">
    <h2>Search Query: ${submittedQuery}</h2>
    <p>Active Components: ${activeComponents.join(', ')}</p>
  </div>
  ${resultsHTML}
</body>
</html>
`;

          return snapshotScript;
        };

        try {
          const snapshotHTML = createResultsSnapshot();
          const blob = new Blob([snapshotHTML], { type: 'text/html' });
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        } catch (error) {
          reject(error);
        }
      });
    };
    
    const snapshotData = await captureResultsOnly();
    
    const fileName = `search_reports/${user.id}/${Date.now()}_results.html`;
    
    const snapshotBlob = typeof snapshotData === 'string' && snapshotData.startsWith('data:')
      ? await (await fetch(snapshotData)).blob()
      : new Blob([snapshotData], { type: 'text/html' });
    
    const { error: uploadError } = await supabase.storage
      .from('search_reports')
      .upload(fileName, snapshotBlob, {
        cacheControl: '3600',
        upsert: false,
        contentType: 'text/html'
      });
    
    if (uploadError) throw uploadError;
    
    const { data: { publicUrl } } = supabase.storage
      .from('search_reports')
      .getPublicUrl(fileName);
    
    const { error } = await supabase
      .from('search_history')
      .insert({
        user_id: user.id,
        query: submittedQuery,
        specialized_queries: allOptimizedQueries,
        active_components: activeComponents,
        html_url: publicUrl,
        created_at: new Date().toISOString()
      });
    
    if (error) throw error;
    
    alert('Results snapshot saved successfully!');
  } catch (error) {
    console.error('Snapshot capture error:', error);
    alert('Failed to save results snapshot');
  }
};