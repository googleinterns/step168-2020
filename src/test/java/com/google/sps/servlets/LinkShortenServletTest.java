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

import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.io.IOException;
import java.io.PrintWriter;
import java.io.StringWriter;
import java.net.HttpURLConnection;
import java.util.Collections;
import javax.servlet.ServletOutputStream;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import org.junit.Assert;
import org.junit.Before;
import org.junit.After;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.junit.runners.JUnit4;
import org.mockito.Mock;
import org.mockito.Mockito;
import org.mockito.MockitoAnnotations;
import com.google.appengine.tools.development.testing.LocalDatastoreServiceTestConfig;
import com.google.appengine.tools.development.testing.LocalServiceTestHelper;

@RunWith(JUnit4.class)
public final class LinkShortenServletTest {
  @Mock private HttpServletRequest request;
  @Mock private HttpServletResponse response;
  private LinkShortenServlet servlet;
  private String reportsJson;
  private StringWriter stringWriter;
  private PrintWriter writer;

  // Maximum eventual consistency.
  private final LocalServiceTestHelper helper =
      new LocalServiceTestHelper(new LocalDatastoreServiceTestConfig()
          .setDefaultHighRepJobPolicyUnappliedJobPercentage(100));

  @After
  public void tearDown() {
    helper.tearDown();
  }

  @Before
  public void setUp() throws IOException {
    MockitoAnnotations.initMocks(this);
    servlet = new LinkShortenServlet();
    helper.setUp();
    reset();
    servlet.doGet(request, response);
  }

  /**
   * Creates new String/PrintWriter and sets status, method, and protocol
   */
  private void reset() throws IOException {
    stringWriter = new StringWriter();
    writer = new PrintWriter(stringWriter);
    when(response.getStatus()).thenReturn(HttpURLConnection.HTTP_OK);
    when(request.getMethod()).thenReturn("get");
    when(request.getProtocol()).thenReturn("http");
    when(response.getWriter()).thenReturn(writer);
  }

  /**
   * Servlet returns correct contentType, CharacterEncoding, Writer, Headers, and Status
   */
  @Test
  public void servletBehavesCorrectly() throws IOException {
    verify(response).setContentType("text/html");
    verify(response).setCharacterEncoding("UTF-8");
    verify(response).getWriter();
    Assert.assertEquals(Collections.<String>emptyList(), response.getHeaderNames());
    Assert.assertEquals(200, response.getStatus());
  }

  /**
   * Url parameter not provided
   */
  @Test
  public void blankUrl() throws IOException {
    reset();
    servlet.doGet(request, response);
    Assert.assertEquals("No url recieved\n", stringWriter.toString());
  }

  /**
   * Returns key when url paramter provided
   * For testing, keys start at 1 and increment so this request will have key value of 1
   */
  @Test
  public void singleRequest() throws IOException {
    reset();
    when(request.getParameter("url")).thenReturn("http://exmaple.com");
    servlet.doGet(request, response);
    Assert.assertEquals("1\n", stringWriter.toString());
  }

  /**
   * Returns correct key each time for multiple requests
   */
  @Test
  public void multipleRequests() throws IOException {
    final int NUM_REQUESTS = 5;
    for (int i = 0; i < NUM_REQUESTS; i++) {
      reset();
      when(request.getParameter("url")).thenReturn("http://exmaple" + Integer.toString(i + 1));
      servlet.doGet(request, response);
      Assert.assertEquals(Integer.toString(i + 1) + '\n', stringWriter.toString());
    }
  }
}
