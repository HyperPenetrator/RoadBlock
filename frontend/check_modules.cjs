try {
  require('leaflet');
  console.log('leaflet found');
} catch (e) {
  console.log('leaflet NOT found');
}
try {
  require('react-leaflet');
  console.log('react-leaflet found');
} catch (e) {
  console.log('react-leaflet NOT found');
}
