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

import com.google.appengine.api.datastore.DatastoreService;
import com.google.appengine.api.datastore.DatastoreServiceFactory;
import com.google.appengine.api.datastore.Entity;
import com.google.appengine.api.datastore.Key;
import com.google.gson.Gson;
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
 * Stores URLs in datastore
 */
@WebServlet("/linkshorten")
public class LinkShortenServlet extends HttpServlet {
  private final DatastoreService datastore = DatastoreServiceFactory.getDatastoreService();
  public static final String CTYPE = "text/html"; // HttpServletResponse content type
  public static final String ENCODING = "UTF-8"; // HttpServletResponse character encoding

  /**
   * Saves url in datastore and returns key
   */
  @Override
  public void doGet(HttpServletRequest request, HttpServletResponse response) throws IOException {
    response.setCharacterEncoding(ENCODING);
    response.setContentType(CTYPE);
    String url = getRequestParameterOrDefault(request, "url", "");
    if (url.length() < 1) {
      response.getWriter().println("No url recieved");
      return;
    }
    System.out.println("Url: " + url);
    Entity urlEntity = new Entity("url");
    urlEntity.setProperty("url", url);
    Key key = urlEntity.getKey();
    datastore.put(urlEntity);
    response.getWriter().println(key.getId());
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
}
