"use client";

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import "@/styles/images.css";
import { searchImages } from "@/app/api/imageSearchApi";

interface ImageResult {
  link: string;
  title: string;
}

interface ImageResultProps {
  query: string;
  className?: string;
  heading?: string;
}

const ImageResult: React.FC<ImageResultProps> = ({ 
  query, 
  className = "", 
  heading = "Explore Related Images" 
}) => {
  const [images, setImages] = useState<ImageResult[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [sliderValue, setSliderValue] = useState<number>(0);

  const sliderRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchImages = async () => {
      if (!query.trim()) return;

      setLoading(true);
      setError(null);

      try {
        const results = await searchImages(query);
        if (results) {
          setImages(results);
        } else {
          setError("Failed to fetch images");
        }
      } catch (error) {
        console.error("Image search error:", error);
        setError("An error occurred while fetching images");
      } finally {
        setLoading(false);
      }
    };

    fetchImages();
  }, [query]);

  // Handle slider change
  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!trackRef.current || !sliderRef.current) return;
    
    const value = parseInt(e.target.value);
    setSliderValue(value);
    
    const track = trackRef.current;
    const slider = sliderRef.current;
    
    const trackWidth = track.scrollWidth;
    const sliderWidth = slider.offsetWidth;
    const maxScroll = trackWidth - sliderWidth;
    
    const scrollAmount = (value / 100) * maxScroll;
    track.style.transform = `translateX(-${scrollAmount}px)`;
  };

  // Update slider when images load
  useEffect(() => {
    setSliderValue(0);
    if (trackRef.current) {
      trackRef.current.style.transform = "translateX(0px)";
    }
  }, [images]);

  if (error) {
    return <div className="error-message">{error}</div>;
  }

  return (
    <div className={`images-container ${className}`}>
      <div className="images-header">
        <h2 className="images-heading">{heading}</h2>
        <p className="images-subheading">Use the slider to browse images</p>
      </div>

      {loading ? (
        <div className="loading-container">
          <div className="loading-spinner" />
        </div>
      ) : images.length > 0 ? (
        <div className="image-gallery-container">
          <div className="images-slider" ref={sliderRef}>
            <div className="images-track" ref={trackRef}>
              {images.map((image, index) => (
                <div key={index} className="image-card">
                  <div className="image-wrapper">
                    <Image
                      src={image.link}
                      alt={image.title || `Result ${index + 1}`}
                      loading="lazy"
                      width={200}
                      height={150}
                    />
                  </div>
                  <div className="image-title-container">
                    <span className="image-title">
                      {image.title || `Image ${index + 1}`}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <div className="slider-container">
            <input
              type="range"
              min="0"
              max="100"
              value={sliderValue}
              onChange={handleSliderChange}
              className="transparent-slider"
              aria-label="Image gallery slider"
            />
          </div>
        </div>
      ) : (
        <div className="no-results">No results found for &quot;{query}&quot;.</div>
      )}
    </div>
  );
};

export default ImageResult;
