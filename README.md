# Videomap

<img src="https://user-images.githubusercontent.com/36008213/91629325-ee36b280-e97c-11ea-9ec8-994a088b64a7.png" width=500>
<img src="https://user-images.githubusercontent.com/55601789/91622207-dfcfa300-e94a-11ea-83a6-dd8b2095e58e.gif" width=500>
<img src="https://user-images.githubusercontent.com/36008213/90663960-33314b00-e1ff-11ea-9790-fa5883098d59.png" width=500>

## About
Videomap is an interactive map that comnbines Google Maps and Youtube to provide a simple way for users to find videos related to location. Videomap includes additional features related to COVID-19 including:
- statistical and graphical data related to the virus
- routing with COVID-19 information
- heat map functionality based on various COVID-19 data points (confirmed, active, deaths, recovered, per capita)

## Technologies and APIs used
### Front End:
- [Javascript](https://en.wikipedia.org/wiki/JavaScript)
- [Google Maps API](https://cloud.google.com/maps-platform/)
- [Google Geocoding API](https://developers.google.com/maps/documentation/geocoding/overview)
- [Google Directions API](https://cloud.google.com/maps-platform/routes)
- [Youtube API](https://developers.google.com/youtube/v3)
- [Google Places API](https://cloud.google.com/maps-platform/places)
- [Openstreetmaps](https://www.openstreetmap.org/copyright)
### Backend
- [App Engine](https://cloud.google.com/appengine)
- [Datastore](https://cloud.google.com/datastore)
- [Servlets](https://docs.oracle.com/cd/E17802_01/products/products/servlet/2.5/docs/servlet-2_5-mr2/javax/servlet/package-summary.html)
- [JHU CSSE COVID-19 Data](https://github.com/CSSEGISandData/COVID-19)

## Run and Deploy
Videomap uses maven to build and deploy. The project id and version along with dependencies and other settings can be found in [pom.xml](pom.xml).
The easiest way to test Videomap is to use Cloud Shell as it has gcloud and dependencies preinstalled.
### Testing Servlets
Run
`mvn test`
### Testing Servlets + Webpage
Run
`mvn package appengine:run`
Then if on Cloud Shell, click on the webpreview button in the upper right corner.

### Deploy to App Engine
Run
`mvn package appengine:deploy`
