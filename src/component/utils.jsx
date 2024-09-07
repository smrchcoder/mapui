export const fetchDistanceDuration = async (originCoordinate, destinationCoordinate) => {
  try {
    // console.log({ originCoordinate, destinationCoordinate });

    const response = await fetch(
      `http://localhost:5000/get_travel_info?origin_lat=${originCoordinate.lat}&origin_lon=${originCoordinate.lng}&dest_lat=${destinationCoordinate.lat}&dest_lon=${destinationCoordinate.lng}`
    );

    // console.log({ response });

    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}`);
    }

    // Try to parse the JSON response
    const data = await response.json();

    // Return the distance and duration
    return { distance: data.distance*1000, duration: data.duration };
  } catch (error) {
    console.error("Error fetching travel info:", error);
    throw error;
  }
};


