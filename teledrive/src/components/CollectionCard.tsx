"use client";

import React from "react";

interface CollectionCardProps {
  title: string;
  subCount: number;
  fileCount: number;
  thumbnailUrl?: string | null;
  onClick: () => void;
}

export default function CollectionCard({
  title,
  subCount,
  fileCount,
  thumbnailUrl,
  onClick,
}: CollectionCardProps) {
  return (
    <div className="coll-card" onClick={onClick}>
      <div className="coll-cover" style={{ background: thumbnailUrl ? "none" : "linear-gradient(135deg,#d9c6f3,#f7d5e8)" }}>
        {thumbnailUrl ? (
          <img 
            src={thumbnailUrl} 
            alt={title} 
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} 
          />
        ) : (
          <div className="mosaic">
            <div style={{ background: "linear-gradient(140deg,#c9d9f7,#e9def6)" }}></div>
            <div style={{ background: "linear-gradient(140deg,#f0d8e6,#d9c6f3)" }}></div>
            <div style={{ background: "linear-gradient(140deg,#e3d6f2,#c9d9f7)" }}></div>
          </div>
        )}
        <div className="vf-corner tl"></div>
        <div className="vf-corner tr"></div>
        <div className="vf-corner bl"></div>
        <div className="vf-corner br"></div>
      </div>
      <div className="coll-body">
        <h3>{title}</h3>
        <div className="coll-meta">
          <span>{subCount > 0 ? `${subCount} sub-collections` : "No sub-collections"}</span>
          <span className="coll-badge">{fileCount.toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
}
