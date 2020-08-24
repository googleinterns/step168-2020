// Copyright 2020 Google LLC
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     https://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

package com.google.sps.servlets;

import com.google.gson.Gson;
import java.io.IOException;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.Scanner;
import javax.servlet.annotation.WebServlet;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

/**
 * Builds and returns case data as a JSON array, e.g.
 * [{"lat": 38.4404675, "lng": -122.7144313, "active": 5,
 * "confirmed": 20, "deaths": 0, "recovered": 15}]
 */
@WebServlet("/timereport")
public class OverTimeCasesServlet extends HttpServlet {
  private HashMap<LocLatLng, ArrayList<Integer>> usTimeReports;
  private HashMap<LocLatLng, ArrayList<Integer>> globalTimeReports;
  private ArrayList<Integer> worldCases;
  private ArrayList<String> dates;
  public static final String CTYPE = "application/json"; // HttpServletResponse content type
  public static final String ENCODING = "UTF-8"; // HttpServletResponse character encoding

  /**
   * Builds Json array using data set
   */
  @Override
  public void init() {
    usTimeReports = new HashMap<LocLatLng, ArrayList<Integer>>();
    Scanner usScanner = connectToData("US");
    fillDataMap(usScanner, usTimeReports, 7, 6, 5, 9);

    globalTimeReports = new HashMap<LocLatLng, ArrayList<Integer>>();
    Scanner globalScanner = connectToData("global");
    fillDataMap(globalScanner, globalTimeReports, 0, 0, 0, 0);
  }

  /**
   * Returns location-based COIVD-19 data
   */
  @Override
  public void doGet(HttpServletRequest request, HttpServletResponse response) throws IOException {
    response.setCharacterEncoding(ENCODING);
    response.setContentType(CTYPE);

    double lat = Double.parseDouble(getRequestParameterOrDefault(request, "lat", "0.0"));
    double lng = Double.parseDouble(getRequestParameterOrDefault(request, "lng", "0.0"));

    if(lat == 0.0 && lng == 0.0) {
      LocationCases toReturn = new LocationCases("WorldWide", worldCases, dates);
      Gson gson = new Gson();
      String timeReportJson = gson.toJson(toReturn);
      response.getWriter().println(timeReportJson);
      return;
    }

    double minimumDistance = 1000.0;
    LocLatLng potentialReport = null;
    boolean usReport = false;
    for (LocLatLng key : globalTimeReports.keySet()) {
      double reportDistance = Math.abs(key.lat - lat) +
          Math.abs(key.lng - lng);
      if (reportDistance < minimumDistance) {
        minimumDistance = reportDistance;
        potentialReport = key;
      }
    }
    for (LocLatLng key : usTimeReports.keySet()) {
      double reportDistance = Math.abs(key.lat - lat) +
          Math.abs(key.lng - lng);
      if (reportDistance <= minimumDistance) {
        usReport = true;
        minimumDistance = reportDistance;
        potentialReport = key;
      }
    }

    LocationCases toReturn;
    if (usReport) {
      toReturn = new LocationCases(potentialReport.location, usTimeReports.get(potentialReport), dates);
    }
    else {
      toReturn = new LocationCases(potentialReport.location, globalTimeReports.get(potentialReport), dates);
    }
    Gson gson = new Gson();
    String timeReportJson = gson.toJson(toReturn);
    response.getWriter().println(timeReportJson);
  }

  /**
   * Establish connection to live Coivd-19 data set
   */
  private Scanner connectToData(String type) {
    URL covidDataUrl = null;
    HttpURLConnection connection = null;
    int responseCode = 0;
    Scanner scanner = null;

    try {
      String url =
          "https://raw.githubusercontent.com/CSSEGISandData/COVID-19/master/csse_covid_19_data/csse_covid_19_time_series/time_series_covid19_confirmed_"
          + type + ".csv";
      covidDataUrl = new URL(url);
      connection = (HttpURLConnection) covidDataUrl.openConnection();
      connection.setRequestMethod("GET");
      responseCode = connection.getResponseCode();
      if (responseCode == HttpURLConnection.HTTP_OK) {
        scanner = new Scanner(covidDataUrl.openStream());
      }
    } catch (IOException e) {
      System.out.println("Unable to open connection");
    }
    return scanner;
  }

  private void fillDataMap(Scanner scanner, HashMap<LocLatLng, ArrayList<Integer>> timeReports, int datesOffset, int coordOffset, int territoryOffset, int dataOffset) {
    boolean header = true;
    boolean firstAccess = true;
    worldCases = new ArrayList<Integer>();

    // Parse the data set
    String line = scanner.nextLine();
    while (scanner.hasNextLine()) {
      if (header) {
        header = false;
        String[] cells = line.split(",");
        dates = new ArrayList<String>();
        for (int j = 4+datesOffset; j<cells.length; ++j) {
          if (!cells[j].equals("")) {
            dates.add(cells[j]);
          }
        }
      }
      line = scanner.nextLine();
      String[] cells = line.split(",");
      ArrayList<Integer> cases = new ArrayList<Integer>();
      String territory = "";

      int tempCoordOffset = coordOffset;
      int tempTerritoryOffset = territoryOffset;
      int tempDataOffset = dataOffset;
      if (cells[0+tempCoordOffset].contains("\"") || cells[1+tempCoordOffset].contains("\"")) {
        ++tempCoordOffset;
        ++tempDataOffset;
        ++tempTerritoryOffset;
      }
      // Ignore unassigned entires
      if (cells[2+tempCoordOffset].equals("") || cells[3+tempCoordOffset].equals("")) { // Entries represent coordinates
        continue;
      }
      if(cells[2+tempCoordOffset].equals("0.0") || cells[3+tempCoordOffset].equals("0.0")) { // No coodrinates
        continue;
      }

      if (!cells[0+tempTerritoryOffset].equals("")) { // Entry represents territory name
        territory = cells[0+tempTerritoryOffset];
      } else if (!cells[1+tempTerritoryOffset].equals("")) { // For foreign territories, name will appear in index 2
        territory = cells[1+tempTerritoryOffset];
      }
      double lat = Double.parseDouble(cells[2 + tempCoordOffset]);
      double lng = Double.parseDouble(cells[3 + tempCoordOffset]);

      if (firstAccess) {
        firstAccess = false;
        for (int i = 4+tempDataOffset; i<cells.length; ++i) {
          if (!cells[i].equals("")) {
            int numCase = Integer.parseInt(cells[i]);
            cases.add(numCase);
            if(coordOffset == 0) {
              worldCases.add(numCase);
            }
          }
        }
      } else {
        int globalOffset = -1;
        for (int i = 4+tempDataOffset; i<cells.length; ++i) {
          if (!cells[i].equals("")) {
            int numCase = Integer.parseInt(cells[i]);
            cases.add(numCase);
            if(coordOffset == 0) {
              ++globalOffset;
              worldCases.set(globalOffset, worldCases.get(globalOffset) + numCase);
            }
          }
        }
      }

      timeReports.put(new LocLatLng(territory, lat, lng), cases);
    }

    scanner.close();
  }

  /**
   * @return the request parameter, or the default value if the parameter
   *         was not specified by the client
   */
  private String getRequestParameterOrDefault(
      HttpServletRequest request, String name, String defaultValue) {
    String value = request.getParameter(name);
    if (value == null) {
      return defaultValue;
    }
    return value;
  }

  class LocLatLng {
    private String location;
    private double lat;
    private double lng;

    public LocLatLng(String location, double lat, double lng) {
      this.location = location;
      this.lat = lat;
      this.lng = lng;
    }

    public String toString() {
      return "Location: " + location + "; " + "Lat: " + lat + "; " + "Lng: " + lng;
    }
  }

  class LocationCases {
    private String location;
    private ArrayList<Integer> cases;
    private ArrayList<String> dates;

    public LocationCases(String location, ArrayList<Integer> cases, ArrayList<String> dates) {
      this.location = location;
      this.cases = cases;
      this.dates = dates;
    }
    
    public String toString() {
      return "Location: " + location + "; Cases: " + cases.toString() + "; Dates: " + dates.toString();
    }
  }
}
