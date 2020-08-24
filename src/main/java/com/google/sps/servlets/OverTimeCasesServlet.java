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
 * Retrieves historical confirmed case data
 * starting from 1-22-20. Takes coordinates
 * in request and returns closest report
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
   * Builds report hashmaps for US counties and international countires
   */
  @Override
  public void init() {
    // Build US hashmap
    usTimeReports = new HashMap<LocLatLng, ArrayList<Integer>>();
    Scanner usScanner = connectToData("US");
    fillDataMap(usScanner, usTimeReports, 7, 6, 5, 9);

    // Build international hashmap
    globalTimeReports = new HashMap<LocLatLng, ArrayList<Integer>>();
    Scanner globalScanner = connectToData("global");
    fillDataMap(globalScanner, globalTimeReports, 0, 0, 0, 0);
  }

  /**
   * Returns history of confirmed cases for the location specificed by cooridnates
   */
  @Override
  public void doGet(HttpServletRequest request, HttpServletResponse response) throws IOException {
    response.setCharacterEncoding(ENCODING);
    response.setContentType(CTYPE);

    // Get coordinates from request
    double lat = Double.parseDouble(getRequestParameterOrDefault(request, "lat", "0.0"));
    double lng = Double.parseDouble(getRequestParameterOrDefault(request, "lng", "0.0"));

    // Coordinates 0 0 are located in the atlantic ocean, will be used to request worldwide cases
    if (lat == 0.0 && lng == 0.0) {
      LocationCases toReturn = new LocationCases("Worldwide", worldCases, dates);
      Gson gson = new Gson();
      String timeReportJson = gson.toJson(toReturn);
      response.getWriter().println(timeReportJson);
      return;
    }

    // Find closest report to coordinates in request
    double minimumDistance = 1000.0;
    LocLatLng potentialReport = null;
    boolean usReport = false;
    // First look through global reports
    for (LocLatLng key : globalTimeReports.keySet()) {
      double reportDistance = Math.abs(key.lat - lat) + Math.abs(key.lng - lng);
      if (reportDistance < minimumDistance) {
        minimumDistance = reportDistance;
        potentialReport = key;
      }
    }
    // Then look thorugh US reports
    for (LocLatLng key : usTimeReports.keySet()) {
      double reportDistance = Math.abs(key.lat - lat) + Math.abs(key.lng - lng);
      if (reportDistance <= minimumDistance) {
        usReport = true;
        minimumDistance = reportDistance;
        potentialReport = key;
      }
    }

    // Return location name, cases, and dates
    LocationCases toReturn;
    if (usReport) {
      toReturn =
          new LocationCases(potentialReport.location, usTimeReports.get(potentialReport), dates);
    } else {
      toReturn = new LocationCases(
          potentialReport.location, globalTimeReports.get(potentialReport), dates);
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

  /**
   * Fill up the hashmap with the name of the location and coordinates as the key
   * and with an array consisting of the confirmed case numbers as the value
   */
  private void fillDataMap(Scanner scanner, HashMap<LocLatLng, ArrayList<Integer>> timeReports,
      int datesOffset, int coordOffset, int territoryOffset, int dataOffset) {
    boolean header = true;
    boolean firstAccess = true;
    worldCases = new ArrayList<Integer>();

    // Parse the data set
    String line = scanner.nextLine();
    while (scanner.hasNextLine()) {
      // If header line, get the dates that are being tracked
      if (header) {
        header = false;
        String[] cells = line.split(",");
        dates = new ArrayList<String>();
        for (int j = 4 + datesOffset; j < cells.length; ++j) {
          if (!cells[j].equals("")) {
            dates.add(cells[j]);
          }
        }
      }
      line = scanner.nextLine();
      String[] cells = line.split(",");
      ArrayList<Integer> cases = new ArrayList<Integer>();
      String territory = "";

      // If the name of the territory contains a ", the offset needs to be bumped
      int tempCoordOffset = coordOffset;
      int tempTerritoryOffset = territoryOffset;
      int tempDataOffset = dataOffset;
      if (cells[0 + tempCoordOffset].contains("\"") || cells[1 + tempCoordOffset].contains("\"")) {
        ++tempCoordOffset;
        ++tempDataOffset;
        ++tempTerritoryOffset;
      }
      // Ignore unassigned entires
      if (cells[2 + tempCoordOffset].equals("")
          || cells[3 + tempCoordOffset].equals("")) { // Entries represent coordinates
        continue;
      }
      if (cells[2 + tempCoordOffset].equals("0.0")
          || cells[3 + tempCoordOffset].equals("0.0")) { // No coodrinates
        continue;
      }

      if (!cells[0 + tempTerritoryOffset].equals("")) { // Entry represents territory name
        territory = cells[0 + tempTerritoryOffset];
      } else if (!cells[1 + tempTerritoryOffset].equals(
                     "")) { // For countires, name will appear in index 1
        territory = cells[1 + tempTerritoryOffset];
      }
      // Coordinates appear in these indicies
      double lat = Double.parseDouble(cells[2 + tempCoordOffset]);
      double lng = Double.parseDouble(cells[3 + tempCoordOffset]);

      // For building total worldwide history
      if (firstAccess) {
        firstAccess = false;
        for (int i = 4 + tempDataOffset; i < cells.length; ++i) {
          if (!cells[i].equals("")) {
            int numCase = Integer.parseInt(cells[i]);
            cases.add(numCase);
            // If looking at global cases, create new entry in world array
            if (coordOffset == 0) {
              worldCases.add(numCase);
            }
          }
        }
      } else {
        int globalOffset = -1;
        for (int i = 4 + tempDataOffset; i < cells.length; ++i) {
          if (!cells[i].equals("")) {
            int numCase = Integer.parseInt(cells[i]);
            cases.add(numCase);
            // If looking at global cases, add to entry in world array
            if (coordOffset == 0) {
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

  /**
   * Maintains location name with its coordinates. Used as key
   */
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
      return "Location: " + location + "; "
          + "Lat: " + lat + "; "
          + "Lng: " + lng;
    }
  }

  /**
   * Maintains location name with its cases and dates. Used to return when get is called
   */
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
      return "Location: " + location + "; Cases: " + cases.toString()
          + "; Dates: " + dates.toString();
    }
  }
}
