"use client";

import React from "react";

export default function Page() {
  const handleNavigate = () => {
    const originLat = 14.591252464355598;
    const originLng = 121.03183351689901;

    const destLat = 16.007002213855547;
    const destLng = 120.15582576111619;

    window.open(
      `https://www.google.com/maps/dir/?api=1&origin=${originLat},${originLng}&destination=${destLat},${destLng}&travelmode=driving`,
      "_blank"
    );
  };

  return (
    <div>
      <button onClick={handleNavigate}>
        Open Google Maps
      </button>
    </div>
  );
}