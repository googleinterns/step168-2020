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
import org.junit.Test;
import org.junit.runner.RunWith;
import org.junit.runners.JUnit4;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

/** */
@RunWith(JUnit4.class)
public final class TestCentersServletTest {
  @Mock private HttpServletRequest request;
  @Mock private HttpServletResponse response;
  private TestCentersServlet servlet;
  private StringWriter stringWriter;
  private PrintWriter writer;

  @Before
  public void setUp() throws IOException {
    MockitoAnnotations.initMocks(this);
    servlet = new TestCentersServlet();
    servlet.init();
    StringWriter stringWriter = new StringWriter();
    PrintWriter writer = new PrintWriter(stringWriter);
    when(response.getStatus()).thenReturn(HttpURLConnection.HTTP_OK);
    when(request.getMethod()).thenReturn("get");
    when(request.getProtocol()).thenReturn("http");
    when(response.getWriter()).thenReturn(writer);
  }

  private void resetResponseWriter() throws IOException {
    stringWriter = new StringWriter();
    writer = new PrintWriter(stringWriter);
    when(response.getWriter()).thenReturn(writer);
  }

  @Test
  public void servletBehavesCorrectly() throws IOException {
    servlet.doGet(request, response);
    verify(response).setContentType("application/json");
    verify(response).setCharacterEncoding("UTF-8");
    verify(response).getWriter();
    Assert.assertEquals(Collections.<String>emptyList(), response.getHeaderNames());
    Assert.assertEquals(200, response.getStatus());
  }

  @Test
  public void servletDoesNotReturnFieldsWhenCoordsOutOfBounds() throws IOException {
    resetResponseWriter();
    when(request.getParameter("swlat")).thenReturn("0.0");
    when(request.getParameter("swlng")).thenReturn("0.0");
    when(request.getParameter("nelat")).thenReturn("0.0");
    when(request.getParameter("nelng")).thenReturn("0.0");
    servlet.doGet(request, response);
    Assert.assertFalse(stringWriter.toString().contains("Lat:"));
    Assert.assertFalse(stringWriter.toString().contains("Lng:"));
    Assert.assertFalse(stringWriter.toString().contains("Name:"));
    Assert.assertFalse(stringWriter.toString().contains("Address:"));
    Assert.assertFalse(stringWriter.toString().contains("Hours"));
    Assert.assertFalse(stringWriter.toString().contains("Phone"));
  }

  @Test
  public void servletReturnsCorrectFieldsWhenCoordsInBounds() throws IOException {
    resetResponseWriter();
    when(request.getParameter("swlat")).thenReturn("32.0");
    when(request.getParameter("swlng")).thenReturn("-117.0");
    when(request.getParameter("nelat")).thenReturn("34.0");
    when(request.getParameter("nelng")).thenReturn("-115.0");
    servlet.doGet(request, response);
    Assert.assertTrue(stringWriter.toString().contains("lat"));
    Assert.assertTrue(stringWriter.toString().contains("lng"));
    Assert.assertTrue(stringWriter.toString().contains("name"));
    Assert.assertTrue(stringWriter.toString().contains("addr"));
    Assert.assertTrue(stringWriter.toString().contains("hours"));
    Assert.assertTrue(stringWriter.toString().contains("phone"));
  }

  @Test
  public void servletReturnsCorrectValues() throws IOException {
    resetResponseWriter();
    when(request.getParameter("swlat")).thenReturn("30.0");
    when(request.getParameter("swlng")).thenReturn("-119.0");
    when(request.getParameter("nelat")).thenReturn("36.0");
    when(request.getParameter("nelng")).thenReturn("-113.0");
    servlet.doGet(request, response);
    Assert.assertTrue(stringWriter.toString().contains("Perlman"));
    Assert.assertTrue(stringWriter.toString().contains("La Jolla"));
    Assert.assertTrue(stringWriter.toString().contains("CVS Health"));
    Assert.assertTrue(stringWriter.toString().contains("Pure Care Pharmacy"));
  }
}
