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
import java.io.BufferedInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.Reader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.HashSet;
import java.util.Scanner;
import java.util.Set;
import javax.servlet.annotation.WebServlet;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

/**
 * Retrieves live testing center information
 * Takes coordinates in request and returns
 * all testing centers within coordinates
 */
@WebServlet("/testcenters")
public class TestCentersServlet extends HttpServlet {
  private Set<Center> centers;
  private String centersJson;

  /**
   * Builds testing center set
   */
  @Override
  public void init() {
    // Build US hashmap
    centers = new HashSet<Center>();
    InputStream stream = connectToData();
    try {
      fillCenterSet(stream, centers);
    } catch (IOException e) {
      System.out.println("Unable to fill set");
    }
  }

  /**
   * Returns testing centers within given coordinates
   */
  @Override
  public void doGet(HttpServletRequest request, HttpServletResponse response) throws IOException {
    response.setCharacterEncoding(Constants.ENCODING);
    response.setContentType(Constants.CASESCTYPE);

    // Get coordinates from request
    double swlat = Double.parseDouble(getRequestParameterOrDefault(request, "swlat", "0.0"));
    double swlng = Double.parseDouble(getRequestParameterOrDefault(request, "swlng", "0.0"));
    double nelat = Double.parseDouble(getRequestParameterOrDefault(request, "nelat", "0.0"));
    double nelng = Double.parseDouble(getRequestParameterOrDefault(request, "nelng", "0.0"));

    // Return centers within given coordinates
    Set<Center> returnCenters = new HashSet<Center>();
    for (Center center : centers) {
      if (center.lat > swlat && center.lat < nelat && center.lng > swlng && center.lng < nelng) {
        returnCenters.add(center);
      }
    }
    Gson gson = new Gson();
    String returnCentersJson = gson.toJson(returnCenters);
    response.getWriter().println(returnCentersJson);
  }

  /**
   * Establish connection to live Coivd-19 testing centers data set
   */
  private InputStream connectToData() {
    URL centersUrl = null;
    HttpURLConnection connection = null;
    int responseCode = 0;
    InputStream stream = null;

    try {
      String url =
          "https://services.arcgis.com/8ZpVMShClf8U8dae/arcgis/rest/services/TestingLocations_public/FeatureServer/0/query?where=1%3D1&outFields=fulladdr,phone,operhours,name&outSR=4326&f=json";
      centersUrl = new URL(url);
      connection = (HttpURLConnection) centersUrl.openConnection();
      connection.setRequestMethod("GET");
      responseCode = connection.getResponseCode();
      if (responseCode == HttpURLConnection.HTTP_OK) {
        stream = centersUrl.openStream();
      }
    } catch (IOException e) {
      System.out.println("Unable to open connection");
    }
    return stream;
  }

  /**
   * Parse through data, one character at a time,
   * filling up centers set
   */
  private void fillCenterSet(InputStream stream, Set<Center> centers) throws IOException {
    BufferedInputStream bufStream = new BufferedInputStream(stream);
    Reader reader = new InputStreamReader(bufStream, Constants.ENCODING);
    int c;

    // Skip header to get to actual data
    boolean firstBracketSeen = false;
    int counter = 0;
    while ((c = reader.read()) >= 0) {
      if (c == 'f' && reader.read() == 'u' && reader.read() == 'l' && reader.read() == 'l'
          && reader.read() == 'a' && reader.read() == 'd' && reader.read() == 'd'
          && reader.read() == 'r' && reader.read() == '"' && reader.read() == ':') {
        String addr = "Unknown";
        // Check if null
        if (reader.read() == '"') {
          // Construct address, which ends with quotation mark
          StringBuilder addrSB = new StringBuilder();
          while ((c = reader.read()) != '"') {
            addrSB.append((char) c);
          }
          addr = addrSB.toString();
        } else {
          // Read 3 times to skip null
          for (int i = 0; i < 3; ++i) {
            reader.read();
          }
        }
        // Read 9 times to skip ,"phone":
        for (int i = 0; i < 9; ++i) {
          reader.read();
        }

        String phone = "Unknown";
        // Check if null
        if (reader.read() == '"') {
          // Construct phone number, which ends with quotation mark
          StringBuilder phoneSB = new StringBuilder();
          while ((c = reader.read()) != '"') {
            phoneSB.append((char) c);
          }
          phone = phoneSB.toString();
        } else {
          // Read 3 times to skip null
          for (int i = 0; i < 3; ++i) {
            reader.read();
          }
        }
        // Read 13 times to skip ,"operhours":
        for (int i = 0; i < 13; ++i) {
          reader.read();
        }

        String hours = "Unknown";
        // Check if null
        if (reader.read() == '"') {
          // Construct hours, which ends with quotation mark
          StringBuilder hoursSB = new StringBuilder();
          while ((c = reader.read()) != '"') {
            hoursSB.append((char) c);
          }
          hours = hoursSB.toString();
        } else {
          // Read 3 times to skip null
          for (int i = 0; i < 3; ++i) {
            reader.read();
          }
        }
        // Read 8 times to skip ,"name":
        for (int i = 0; i < 8; ++i) {
          reader.read();
        }

        String name = "Unknown";
        // Check if null
        if (reader.read() == '"') {
          // Construct name, which ends with quotation mark
          StringBuilder nameSB = new StringBuilder();
          while ((c = reader.read()) != '"') {
            nameSB.append((char) c);
          }
          name = nameSB.toString();
        } else {
          // Read 3 times to skip null
          for (int i = 0; i < 3; ++i) {
            reader.read();
          }
        }
        // Read 3 times to skip },"
        for (int i = 0; i < 3; ++i) {
          reader.read();
        }

        // Ensure that there is a geometry
        if (!(reader.read() == 'g' && reader.read() == 'e' && reader.read() == 'o'
                && reader.read() == 'm' && reader.read() == 'e' && reader.read() == 't'
                && reader.read() == 'r' && reader.read() == 'y')) {
          continue;
        }
        // Read 7 times to skip ":{"x":
        for (int i = 0; i < 7; ++i) {
          reader.read();
        }
        // Construct longitude, which ends with comma
        StringBuilder lngSB = new StringBuilder();
        while ((c = reader.read()) != ',') {
          lngSB.append((char) c);
        }
        double lng = Double.parseDouble(lngSB.toString());
        // Read 4 times to skip "y":
        for (int i = 0; i < 4; ++i) {
          reader.read();
        }
        // Construct latitude, which ends with brace
        StringBuilder latSB = new StringBuilder();
        while ((c = reader.read()) != '}') {
          latSB.append((char) c);
        }
        double lat = Double.parseDouble(latSB.toString());

        centers.add(new Center(lat, lng, name, addr, phone, hours));
      }
    }
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
   * Maintains Center with coordinates, name, address, phone number, and open hours
   */
  class Center {
    private double lat;
    private double lng;
    private String name;
    private String addr;
    private String phone;
    private String hours;

    public Center(double lat, double lng, String name, String addr, String phone, String hours) {
      this.lat = lat;
      this.lng = lng;
      this.name = name;
      this.addr = addr;
      this.phone = phone;
      this.hours = hours;
    }

    public String toString() {
      return "Lat: " + lat + "; Lng: " + lng + "; Name: " + name + "; Address: " + addr
          + "; Phone: " + phone + "; Hours: " + hours;
    }
  }
}
