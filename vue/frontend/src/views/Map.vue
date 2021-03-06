
<style lang="stylus" scoped>

#map
  position absolute
  width 100%
  height 100%

  img 
    display none

  .leaflet-control-layers,leaflet-control
    display none !important

</style>


<template lang="pug">
.page-map
  #map
    #popup
      PingPopup
</template>

<script lang='ls'>

``import 'leaflet/dist/leaflet.css'``
``import needle from 'needle'``
``import 'leaflet.markercluster/dist/MarkerCluster.css'``
``import 'leaflet.markercluster/dist/MarkerCluster.Default.css'``
``import 'leaflet-draw/dist/leaflet.draw.css'``

``import 'leaflet/dist/images/marker-icon-2x.png'``
``import 'leaflet/dist/images/marker-icon.png'``
``import 'leaflet/dist/images/marker-shadow.png'``

``import L from 'leaflet'``
``import 'leaflet.markercluster/dist/leaflet.markercluster.js'``
``import 'leaflet-draw/dist/leaflet.draw.js'``

``import pointsWithinPolygon from '@turf/points-within-polygon'``

``import PingPopup from '../components/PingPopup.vue'``

``import {bus} from '../main'``

layerPicker = L.control.layers!

makeMarkers = ->
  markers = L.geoJson @$store.getters.pingsActive, do
    pointToLayer: (feature,latlng) ->
      #// Mortality is red
      s = feature.properties.animal_status
      colour = if s is 'Mortality' then '#ff0000' else '#00ff44'

      pointStyle = do
        radius: 8
        fillColor: colour
        color: "#000"
        weight: 1
        opacity: 1
        fillOpacity: 0.9
      L.circleMarker latlng, pointStyle

    onEachFeature: (feature,layer) ->
      layer.bindPopup document.querySelector '#popup .popup'

  storeData = ~> @$store.commit 'pingActive', it.layer.feature.properties

  markers.on 'click',storeData


drawPingLayer = (map) ->
  clusterLayer = L.markerClusterGroup do
    disableClusteringAtZoom: 12
    iconCreateFunction: (cluster) ->
      count = cluster.getChildCount!
      points = cluster.getAllChildMarkers!

      mortality = no
      for point in points
        p = point.feature.properties
        if p.animal_status == 'Mortality' then mortality = yes

      cl = if mortality
        'marker-cluster marker-cluster-large'
      else
        'marker-cluster marker-cluster-small'

      new L.DivIcon do
        html: "<div><span>#count</span></div>"
        className: cl
        iconSize: new L.Point 40,40

  #// Define the marker layer
  markers = makeMarkers.call @
  clusterLayer.addLayer markers

  layerPicker.addOverlay clusterLayer, 'Critter point locations'



  chooseToToggleCluster = ~> 
    if @$store.getters.clusterCritters
      map.removeLayer markers
      map.addLayer clusterLayer
    else
      map.addLayer markers
      map.removeLayer clusterLayer

  chooseToToggleCluster!

  refreshCritters = ~>
    clusterLayer.clearLayers!
    map.removeLayer markers
    markers := makeMarkers.call @ #// Parent function wide 
    clusterLayer.addLayers markers
    chooseToToggleCluster!

  /*
    Refresh all critter layers.
   */

  bus.$on 'refreshCritterLayers', refreshCritters
  
  /*
    Toggle the critter clustering
   */
  @$root.$on 'toggleClusterCritters', chooseToToggleCluster


/* ## drawSelectedLayer
  Draw the layer that holds all the selected pings
  @param map {object} Leaflet map object
  @param drawnItems {object} Leaflet layer object
    for storing and displaying selected points
 */
drawSelectedLayer = (map, drawnItems) !->
  #// Remove previous selection
  map.eachLayer -> if it.options.class === 'selected-ping' then map.removeLayer it

  clipper = drawnItems.toGeoJSON! #// The drawn polygons to cut by
  pings = @$store.getters.pingsActive #// The active pings

  selected = pointsWithinPolygon pings, clipper
  @$store.commit 'pingsSelected', selected

  L.geoJson(@$store.getters.pingsSelected, do
    pointToLayer: (feature,latlng) ->
      pointStyle = do
        class: 'selected-ping'
        radius: 8
        fillColor: '#00fbff'
        color: "#000"
        weight: 1
        opacity: 1
        fillOpacity: 0.9
      L.circleMarker latlng, pointStyle
  ).addTo map


/* ## drawTracksLayer
  Draw the layer that holds all tracks
  @param map {object} Leaflet map object
  @param drawnItems {object} Leaflet layer object
    for storing and displaying selected points
 */
drawTracksLayer = (map) !->
  api = if @.$store.getters.isProd then '/api' else 'http://localhost:3000'
  h1 = location.protocol
  h2 = location.hostname
  h3 = if @$store.getters.isProd then location.port else 3000
  h4 = if @$store.getters.isProd then '/api' else ''
  url = "#{h1}//#{h2}:#{h3}#{h4}/get-critter-tracks?start=2020-10-18&end=2020-11-26";
  console.log url

  needle.get url, (err,data) ->
    tracksLayer = L.geoJson(data.body).addTo map
    layerPicker.addOverlay tracksLayer, 'Critter Travel Tracks &nbsp;'





/* ## draw
  Draw the map
 */
draw = ->
  V = @

  map = L.map 'map', zoomControl: no
    .setView [55,-128], 6

  L.control.zoom position: 'bottomright'
    .addTo map

  bingOrtho = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">ESRI Basemap</a> ',
    maxZoom: 18
  }).addTo map

  getBCGovBaseLayer = L.tileLayer('https://maps.gov.bc.ca/arcgis/rest/services/province/roads_wm/MapServer/tile/{z}/{y}/{x}', { maxZoom: 24 }).addTo map

  drawPingLayer.call @, map #// Draw cluster layer

  drawTracksLayer.call @, map #// Draw tracks layer

  drawnItems = new L.FeatureGroup!
  map.addLayer drawnItems
  drawControl = new L.Control.Draw do
    position: 'topright'
    draw:
      marker: false
      polyline: false
      circle: false
      circlemarker: false
    edit:
      featureGroup: drawnItems
      remove: true
      edit: true

  layerPicker.addBaseLayer getBCGovBaseLayer, 'BC Gov Basemap &nbsp; &nbsp; &nbsp;'
  layerPicker.addBaseLayer bingOrtho, 'Bing Satellite Imagery'

  map.addControl drawControl
  map.addControl layerPicker



  #// Add new shape to map
  map.on 'draw:created', ->
    drawnItems.addLayer it.layer
    drawSelectedLayer.call V, map, drawnItems

  map.on 'draw:edited', ->
    drawSelectedLayer.call V, map, drawnItems

  map.on 'draw:deletestop', ->
    drawSelectedLayer.call V, map, drawnItems

``
export default {
  name: 'Map',
  mounted: draw,
  components: {
    PingPopup
  }
}
``
</script>