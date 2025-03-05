import React from 'react'
import { GoogleMap, useJsApiLoader } from '@react-google-maps/api'

const containerStyle = {
  width: '100%',
  height: '600px',
}

// Middle of london coordinates
const center = {
  lat: 37.7749,
  lng: -122.4194
}

function PhotorealisticMap() {
  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string,
    // Make sure to include these libraries for 3D functionality
    libraries: ['places', 'visualization']
  })

  const [map, setMap] = React.useState<google.maps.Map | null>(null)

  // Set map options to enable 3D rendering
  const mapOptions = {
    tilt: 45, // Tilts the view to show the 3D effect
    heading: 0, // Initial heading/rotation
    zoom: 17, // Higher zoom level for better 3D detail
    mapTypeId: 'satellite', // Use satellite view for photorealistic imagery
    mapTypeControl: true,
    mapTypeControlOptions: {
      mapTypeIds: ['roadmap', 'satellite', 'hybrid']
    }
  }

  const onLoad = React.useCallback(function callback(map: google.maps.Map) {
    // Enable WebGL rendering for 3D effects
    
    // Set the center and zoom directly rather than using bounds
    map.setCenter(center)
    map.setZoom(17)
    
    // Enable 45-degree imagery if available
    map.setTilt(45)

    setMap(map)
  }, [])


  const onUnmount = React.useCallback(function callback() {
    setMap(null)
  }, [])

  // Function to handle tilting the map view
  const tiltMap = () => {
    if (map) {
      // Toggle between 0 and 45 degrees tilt
      const currentTilt = map.getTilt() || 0
      map.setTilt(currentTilt === 0 ? 45 : 0)
    }
  }

  // Function to rotate the map view
  const rotateMap = () => {
    if (map) {
      // Increase heading by 45 degrees
      const currentHeading = map.getHeading() || 0
      map.setHeading((currentHeading + 45) % 360)
    }
  }

  return isLoaded ? (
    <div className="map-container">
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={center}
        zoom={mapOptions.zoom}
        tilt={mapOptions.tilt}
        heading={mapOptions.heading}
        mapTypeId={mapOptions.mapTypeId}
        options={mapOptions}
        onLoad={onLoad}
        onUnmount={onUnmount}
      >
        {/* Child components, such as markers, info windows, etc. */}
        <></>
      </GoogleMap>
      
   
    </div>
  ) : (
    <div>Loading map...</div>
  )
}

export default React.memo(PhotorealisticMap)