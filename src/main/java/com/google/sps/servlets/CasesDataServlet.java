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
import com.google.sps.servlets.Constants;
import java.io.IOException;
import java.net.HttpURLConnection;
import java.net.URL;
import java.time.Clock;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Collection;
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
@WebServlet("/report")
public class CasesDataServlet extends HttpServlet {
  private String reportsJson;

  /**
   * Builds Json array using data set
   */
  @Override
  public void init() {
    Collection<Report> reports = new ArrayList<>();
    Scanner scanner = connectToData();

    // Parse the data set
    String line = scanner.nextLine();
    while (scanner.hasNextLine()) {
      // Skip the first line (header)
      line = scanner.nextLine();
      String[] cells = line.split(",");
      // Ignore unassigned entires
      if (cells[5].equals("") || cells[6].equals("")) { // Entries represent coordinates
        continue;
      }
      // Countries with extra delimiter in name need to be bumped by one
      if (cells[2].contains("\"")
          || cells[3].contains("\"")) { // Entries represent city and country name
        addReport(reports, cells, 1);
        continue;
      }
      addReport(reports, cells, 0);
    }
    scanner.close();
    Gson gson = new Gson();
    reportsJson = gson.toJson(reports);
  }

  /**
   * Returns location-based COIVD-19 data
   */
  @Override
  public void doGet(HttpServletRequest request, HttpServletResponse response) throws IOException {
    response.setCharacterEncoding(Constants.ENCODING);
    response.setContentType(Constants.CASESCTYPE);
    response.getWriter().println(reportsJson);
  }

  public String getReportsJson() {
    return reportsJson;
  }

  /**
   * Establish connection to live Coivd-19 data set
   */
  private Scanner connectToData() {
    URL covidDataUrl = null;
    HttpURLConnection connection = null;
    int responseCode = 0;
    Scanner scanner = null;

    try {
      String date = getDate();
      String url =
          "https://raw.githubusercontent.com/CSSEGISandData/COVID-19/master/csse_covid_19_data/csse_covid_19_daily_reports/"
          + date + ".csv";
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
   * Returns the date in mm-dd-yyyy format to retrieve most recent data set
   */
  private String getDate() {
    Clock today = Clock.systemUTC();
    Instant in = today.instant();
    // Instant to string format: yyyy-mm-ddThh:mm:ss.msZ
    int hour = Integer.parseInt(in.toString().substring(11, 13));
    in = in.minus(1, ChronoUnit.DAYS);
    // The dataset updates at 5. If it is before 5, need previous set
    if (hour < 5) {
      in = in.minus(1, ChronoUnit.DAYS);
    }
    // dateTime format : yyyy/mm/dd
    String dateTime = in.toString();
    String year = dateTime.substring(0, 4);
    String month = dateTime.substring(5, 7);
    String day = dateTime.substring(8, 10);
    return month + "-" + day + "-" + year;
  }

  /**
   * Creates a report based on the data and adds it to the collection
   */
  private void addReport(Collection<Report> reports, String[] cells, int commaFlag) {
    double lat = Double.parseDouble(cells[5 + commaFlag]);
    double lng = Double.parseDouble(cells[6 + commaFlag]);
    double perCap = 0.0;
    int active = 0;
    int confirmed = 0;
    int deaths = 0;
    int recovered = 0;
    String territory = "";
    if (!cells[10 + commaFlag].equals("")) { // Entry represents active cases
      active = Integer.parseInt(cells[10 + commaFlag]);
    }
    if (!cells[7 + commaFlag].equals("")) { // Entry represents confirmed cases
      confirmed = Integer.parseInt(cells[7 + commaFlag]);
    }
    if (!cells[8 + commaFlag].equals("")) { // Entry represents deaths
      deaths = Integer.parseInt(cells[8 + commaFlag]);
    }
    if (!cells[9 + commaFlag].equals("")) { // Entry represents recovered cases
      recovered = Integer.parseInt(cells[9 + commaFlag]);
    }
    if (!cells[1].equals("")) { // Entry represents territory name
      territory = cells[1];
    } else if (!cells[2].equals("")) { // For foreign territories, name will appear in index 2
      territory = cells[2];
    } else { // For countries, name will appear in index 3
      territory = cells[3];
    }
    if (territory.substring(0, 1).equals("\"")) { // Some countries have " in name, remove the "
      territory = territory.substring(1);
    }
    if (!(cells[cells.length - 2].equals("") || confirmed == 0)) { // Cases per 100,000 persons
      perCap = Double.parseDouble(cells[cells.length - 2]);
    }
    reports.add(new Report(territory, lat, lng, active, confirmed, deaths, recovered, perCap));
  }

  /**
   * Represents number of active, confirmed, deaths, recovered, and per-capita cases
   * at a specific lat lng point in a territory
   */
  class Report {
    private String territory;
    private double lat;
    private double lng;
    private double perCap;
    private int active;
    private int confirmed;
    private int deaths;
    private int recovered;

    public Report(String territory, double lat, double lng, int active, int confirmed, int deaths,
        int recovered, double perCap) {
      this.territory = territory;
      this.lat = lat;
      this.lng = lng;
      this.active = active;
      this.confirmed = confirmed;
      this.deaths = deaths;
      this.recovered = recovered;
      this.perCap = perCap;
    }
  }
}
