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
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.IOException;
import java.io.Reader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.HashSet;
import java.util.Set;
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
@WebServlet("/testcenters")
public class TestCentersServlet extends HttpServlet {
  private Set<Center> centers;
  private String centersJson;

  /**
   * Builds report hashmaps for US counties and international countires
   */
  @Override
  public void init() {
    // Build US hashmap
    centers = new HashSet<Center>();
    System.out.println("DONE with new centers");
    InputStream stream = connectToData();
    System.out.println("DONE WITH CONNECT");
    try {
      fillCenterSet(stream, centers);
    } catch (IOException e) {
      System.out.println("Unable to fill set");
    }
    System.out.println("DONE WITH FILL SET");
  }

  /**
   * Returns history of confirmed cases for the location specificed by cooridnates
   */
  @Override
  public void doGet(HttpServletRequest request, HttpServletResponse response) throws IOException {
    response.setCharacterEncoding(Constants.ENCODING);
    response.setContentType(Constants.CASESCTYPE);

    // Get coordinates from request
    double lat = Double.parseDouble(getRequestParameterOrDefault(request, "lat", "0.0"));
    double lng = Double.parseDouble(getRequestParameterOrDefault(request, "lng", "0.0"));
  }

  /**
   * Establish connection to live Coivd-19 data set
   */
  private InputStream connectToData() {
    URL centersUrl = null;
    HttpURLConnection connection = null;
    int responseCode = 0;
    InputStream stream = null;

    try {
      String url =
          "https://services.arcgis.com/8ZpVMShClf8U8dae/arcgis/rest/services/TestingLocations_public/FeatureServer/0/query?where=1%3D1&outFields=fulladdr,phone,operhours&outSR=4326&f=json";
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
   * Fill up the hashmap with the name of the location and coordinates as the key
   * and with an array consisting of the confirmed case numbers as the value
   */
  private void fillCenterSet(InputStream stream, Set<Center> centers) throws IOException {
    BufferedInputStream bufStream = new BufferedInputStream(stream);
    Reader reader = new InputStreamReader(bufStream, Constants.ENCODING);
    int c;

    // Skip header to get to actual data
    boolean firstBracketSeen = false;
    int counter = 0;
    while ((c = reader.read()) >= 0) {
      if (c == 'f' && reader.read() == 'u' && reader.read() == 'l' && reader.read() == 'l' && reader.read() == 'a' && reader.read() == 'd' && reader.read() == 'd' && reader.read() == 'r' && reader.read() == '"' && reader.read() == ':') {
        // Read 1 time to skip quotation
        reader.read();
        // Construct address, which ends with quotation mark
        StringBuilder addrSB = new StringBuilder();
        while((c = reader.read()) != '"') {
          addrSB.append((char)c);
        }
        String addr = addrSB.toString();
        System.out.println(addr);
        // Will get shifted because there is no quotation mark
        if (addr == "ull,") {
          addr = "null";
        }
        else {
          // Read 2 times to skip quotation and comma
          for (int i = 0; i < 2; ++i) {
            reader.read();
          }
        }

        // Read 8 times to skip phone":"
        for (int i = 0; i < 8; ++i) {
          reader.read();
        }
        // Construct phone number, which ends with quotation mark
        StringBuilder phoneSB = new StringBuilder();
        while((c = reader.read()) != '"') {
          phoneSB.append((char)c);
        }
        String phone = phoneSB.toString();
        System.out.println(phone);
        // Will get shifted because there is no quotation mark
        if (addr == "ull,") {
          addr = "null";
        }
        else {
          // Read 2 times to skip quotation and comma
          for (int i = 0; i < 2; ++i) {
            reader.read();
          }
        }

        // Read 
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
   * Maintains location name with its coordinates. Used as key
   */
  class Center {
    private Attributes attributes;
    private Geometry geometry;
  }

  class Attributes {
    private String name;
    private String fulladdr;
    private String phone;
    private String agencyurl;
    private String operhours;
  }

  class Geometry {
    private double x;
    private double y;
  }
}
