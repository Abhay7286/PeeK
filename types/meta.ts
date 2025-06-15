// Add or update these interfaces in your facebookAds.ts file

export interface AdSnapshot {
    body: string;
    // Add other snapshot properties as needed
  }
  
  export interface MetaAd {
    adArchiveID: string;
    pageName: string;
    publisherPlatform: string[];
    snapshot: AdSnapshot;
    isActive: boolean;
    startDate: number;
    // ... other properties
  }