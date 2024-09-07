import {
  GoogleMap,
  LoadScript,
  Marker,
  DirectionsService,
  DirectionsRenderer,
  useJsApiLoader,
} from "@react-google-maps/api";
import React, { useState, useEffect, useCallback } from "react";
import { fetchDistanceDuration } from "./utils";

const containerStyle = {
  width: "80%", // Increased width for better visibility
  height: "500px", // Slightly increased height
  margin: "auto", // Center the map horizontally
  borderRadius: "10px", // Add some border-radius for aesthetics
  boxShadow: "0 4px 8px rgba(0, 0, 0, 0.2)", // Add subtle shadow
};

const mapContainerStyle = {
  display: "flex",
  flexDirection: "column", // Align content in a column
  justifyContent: "center",
  alignItems: "center",
  height: "100vh", // Vertically center the entire content
  backgroundColor: "#f0f0f0", // Light background for contrast
};

const tableStyle = {
  marginTop: "20px", // Add space between the map and table
  marginBottom: "20px",
  borderCollapse: "collapse", // Collapse borders for a clean look
  boxShadow: "0 4px 8px rgba(0, 0, 0, 0.1)", // Add subtle shadow to table
};

const cellStyle = {
  padding: "10px 20px", // Padding inside table cells
  textAlign: "center", // Center align text inside cells
  border: "1px solid #ccc", // Add a light border
};
//Add the APi KEy here
const API_KEY = "Your Key";
const RouteMap = () => {
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: API_KEY,
  });
  const [intermediateCoordinates, setIntermediateCoordinates] = useState([
    { lat: 13.028497, lng: 77.625436 },
  ]);
  const [initialCoordinates, setInitialCoordinates] = useState({
    lat: 13.024784,
    lng: 77.625352,
  });
  const [finalCoordinates, setFinalCoordinates] = useState({
    lat: 13.029108,
    lng: 77.62813,
  });
  const [forwardDirections, setForwardDirections] = useState(null);
  const [currentCord, setCurrentCord] = useState(initialCoordinates);
  const [originalTravelData, setOriginalTravelData] = useState([]);
  const [currentTravelData, setCurrentTravelData] =
    useState(originalTravelData);
  const directionsCallback = useCallback((result, status) => {
    if (status === "OK") {
      setForwardDirections(result);
    } else {
      console.error("Directions request failed due to " + status);
    }
  }, []);
  const initialTravelData = async () => {
    try {
      // Fetch distance and duration to the final coordinates
      const finalTravelData = await fetchDistanceDuration(
        currentCord,
        finalCoordinates
      );

      // Create a key for the final coordinates
      const finalKey = `${finalCoordinates.lat},${finalCoordinates.lng}`;

      // Fetch distance and duration for intermediate coordinates
      const travelDataPromises = intermediateCoordinates.map(async (cord) => {
        const travelData = await fetchDistanceDuration(currentCord, cord);

        // Use latitude and longitude as the key
        const key = `${cord.lat},${cord.lng}`;

        return {
          [key]: {
            distance: travelData.distance,
            duration: travelData.duration,
          },
        };
      });

      // Resolve all promises and update state once
      const resolvedTravelData = await Promise.all(travelDataPromises);
      const combinedTravelData = Object.assign({}, ...resolvedTravelData);

      // Add the final coordinates data to the combined travel data
      combinedTravelData[finalKey] = {
        distance: finalTravelData.distance,
        duration: finalTravelData.duration,
      };

      setOriginalTravelData(combinedTravelData);
      setCurrentTravelData(combinedTravelData);
    } catch (error) {
      console.error("Error initializing travel data:", error);
    }
  };

  useEffect(() => {
    const fetchCoordinates = async () => {
      try {
        const response = await fetch("http://localhost:5000/get_coordinates");
        const data = await response.json();

        // Update the current coordinates asynchronously
        await setCurrentCord({
          lat: data.coordinates[0],
          lng: data.coordinates[1],
        });

        // Clear previous directions to update with new coordinates
        setForwardDirections(null);
      } catch (error) {
        console.error("Error fetching coordinates: ", error);
      }
    };

    // Initial fetch of coordinates and start the interval for periodic fetching
    fetchCoordinates();
    const intervalId = setInterval(fetchCoordinates, 10000);

    return () => clearInterval(intervalId); // Cleanup interval on unmount
  }, []); // This useEffect will handle periodic coordinate fetching
  useEffect(() => {
    const initializeData = async () => {
      await initialTravelData();
    };

    initializeData();
  }, []);
  useEffect(() => {
    const updateData = async () => {
      if (currentCord) {
        await updateDistanceDuration();
      }
    };

    updateData();
  }, [currentCord]);
  useEffect(() => {
    // Remove data for coordinates that are closer than 70 meters
    const filteredCurrentTravelData = Object.keys(currentTravelData).reduce(
      (acc, key) => {
        // Check if the key corresponds to a coordinate in the filtered list
        if (
          intermediateCoordinates.some(
            (coord) => `${coord.lat},${coord.lng}` === key
          )
        ) {
          acc[key] = currentTravelData[key];
        }
        return acc;
      },
      {}
    );
    setCurrentTravelData(filteredCurrentTravelData);
    const filteredOriginalTravelData = Object.keys(originalTravelData).reduce(
      (acc, key) => {
        // Check if the key corresponds to a coordinate in the filtered list
        if (
          intermediateCoordinates.some(
            (coord) => `${coord.lat},${coord.lng}` === key
          )
        ) {
          acc[key] = originalTravelData[key];
        }
        return acc;
      },
      {}
    );
    setOriginalTravelData(filteredOriginalTravelData);
  }, [intermediateCoordinates]);
  const updateDistanceDuration = async () => {
    if (
      Object.keys(currentTravelData).length > 0 &&
      Object.keys(originalTravelData).length > 0
    ) {
      console.log("Inside the updation of the current travel data");
      console.log({ currentTravelData, originalTravelData });
      try {
        const updatedTravelData = await Promise.all(
          intermediateCoordinates.map(async (cord) => {
            const key = `${cord.lat},${cord.lng}`;
            console.log({ key });
            const currentData = currentTravelData[key];
            const originalData = originalTravelData[key];
            if (
              currentData.distance >= 0 &&
              currentData.distance >= 0.8 * originalData.distance
            ) {
              return {
                [key]: {
                  distance: currentData.distance - 100,
                  duration: currentData.duration - 2 / 6,
                },
              };
            } else {
              const data = await fetchDistanceDuration(currentCord, cord);
              setOriginalTravelData((prevData) => ({
                ...prevData,
                [key]: {
                  distance: data.distance,
                  duration: data.duration,
                },
              }));
              console.log("fetching real data");
              return {
                [key]: {
                  distance: data.distance,
                  duration: data.duration,
                },
              };
            }
          })
        );
        // Update the intermediateCoordinates list by filtering out those that are closer than 70 meters
        const filteredIntermediateCoordinates = intermediateCoordinates.filter(
          (cord) => {
            const key = `${cord.lat},${cord.lng}`;
            const currentData = currentTravelData[key];
            return currentData?.distance >= 70; // Only keep coordinates that are >= 70 meters away
          }
        );
        setIntermediateCoordinates(filteredIntermediateCoordinates); // Update the state
        // Process final coordinates

        const finalKey = `${finalCoordinates.lat},${finalCoordinates.lng}`;
        const finalCurrentData = currentTravelData[finalKey];
        const finalOriginalData = originalTravelData[finalKey];

        let finalUpdate = {};
        if (
          finalCurrentData.distance >= 0 &&
          finalCurrentData.distance >= 0.8 * finalOriginalData.distance
        ) {
          finalUpdate[finalKey] = {
            distance: finalCurrentData.distance - 100,
            duration: finalCurrentData.duration - 2 / 6,
          };
        } else {
          const data = await fetchDistanceDuration(
            currentCord,
            finalCoordinates
          );
          setOriginalTravelData((prevData) => ({
            ...prevData,
            [finalKey]: {
              distance: data.distance,
              duration: data.duration,
            },
          }));
          finalUpdate[finalKey] = {
            distance: data.distance,
            duration: data.duration,
          };
        }

        // Merge all updates (intermediate and final) into one object
        const combinedUpdates = Object.assign(
          {},
          ...updatedTravelData,
          finalUpdate
        );

        // Update currentTravelData state once
        setCurrentTravelData((prevData) => ({
          ...prevData,
          ...combinedUpdates,
        }));
      } catch (error) {
        console.error("Error updating travel data:", error);
      }
    } else {
      console.log("No data available for update");
    }
  };
  const remainingRoutePath = () => ({
    origin: currentCord,
    destination: finalCoordinates,
    waypoints: intermediateCoordinates.map((coord) => ({ location: coord })),
    travelMode: "DRIVING",
  });

  if (!isLoaded) {
    return <div>Loading...</div>;
  }

  return (
    <div style={mapContainerStyle}>
      {/* Rendering the Google Map with initialCoordinates as the center */}
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={initialCoordinates}
        zoom={14}
        options={{
          zoomControl: true,
          streetViewControl: false,
          mapTypeControl: false,
          fullscreenControl: false,
        }}
      >
        {/* Marker for the initial coordinate */}
        <Marker
          position={initialCoordinates}
          label={{ text: "Start", color: "black", fontWeight: "bold" }}
        />
        {/* Marker for the finalCoordinates */}
        <Marker
          position={finalCoordinates}
          label={{ text: "End", color: "black", fontWeight: "bold" }}
        />
        {/* Getting the direction */}
        <DirectionsService
          options={remainingRoutePath()}
          callback={directionsCallback}
        />
        {/* Rendering the Route based on route mentioned in direction service */}
        {forwardDirections && (
          <DirectionsRenderer
            directions={forwardDirections}
            options={{
              suppressMarkers: true,
              polylineOptions: { suppressMarkers: true, strokeColor: "blue" },
            }}
          />
        )}

        <Marker
          position={currentCord}
          icon={{
            url: "https://img.icons8.com/ios-filled/50/000000/bus.png",
            scaledSize: new window.google.maps.Size(50, 50),
          }}
        />
      </GoogleMap>

      <table style={tableStyle}>
        <thead>
          <tr>
            <th style={cellStyle}>Estimated Travel Time</th>
            <th style={cellStyle}>Estimated Travel Distance</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={cellStyle}>
              {currentTravelData[
                `${finalCoordinates.lat},${finalCoordinates.lng}`
              ]?.duration || 0}
              mins
            </td>
            <td style={cellStyle}>
              {currentTravelData[
                `${finalCoordinates.lat},${finalCoordinates.lng}`
              ]?.distance || 0}
              Meters
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
};

export default RouteMap;
