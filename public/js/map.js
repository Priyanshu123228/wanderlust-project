    /* let mapToken="<%= process.env.MAP_TOKEN %>" */
    /* let mapToken=mapToken; */


    
mapboxgl.accessToken = mapToken;

const map = new mapboxgl.Map({
   container: "map",
   style: "mapbox://styles/mapbox/streets-v12",
   center: coordinates,
   zoom: 9
});

new mapboxgl.Marker()
   .setLngLat(coordinates)
   .setPopup(
      new mapboxgl.Popup({ offset: 25 })
         .setHTML(`
            <h4>${listingTitle}</h4>
            <p>${listingLocation}</p>
            <p>Exact location will be provided after booking</p>
         `)
   )
   .addTo(map);