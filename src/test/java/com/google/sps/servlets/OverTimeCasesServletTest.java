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
public final class OverTimeCasesServletTest {
  @Mock private HttpServletRequest request;
  @Mock private HttpServletResponse response;
  private OverTimeCasesServlet servlet;
  private String globalTimeReportsJson;
  private String usTimeReportsJson;
  private StringWriter stringWriter;
  private PrintWriter writer;

  @Before
  public void setUp() throws IOException {
    MockitoAnnotations.initMocks(this);
    servlet = new OverTimeCasesServlet();
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
  public void servletReturnsCorrectGlobalLocation() throws IOException {
    resetResponseWriter();
    when(request.getParameter("lat")).thenReturn("40.463667");
    when(request.getParameter("lng")).thenReturn("-3.74922");
    servlet.doGet(request, response);
    Assert.assertTrue(stringWriter.toString().contains("Spain"));
    Assert.assertTrue(stringWriter.toString().contains("5/17/20"));
    Assert.assertTrue(stringWriter.toString().contains("[0,"));
    Assert.assertTrue(stringWriter.toString().contains("cases"));
    Assert.assertTrue(stringWriter.toString().contains("dates"));
  }

  @Test
  public void servletReturnsCorrectUSLocation() throws IOException {
    resetResponseWriter();
    when(request.getParameter("lat")).thenReturn("33.03484597");
    when(request.getParameter("lng")).thenReturn("-116.7365326");
    servlet.doGet(request, response);
    Assert.assertTrue(stringWriter.toString().contains("San Diego"));
    Assert.assertTrue(stringWriter.toString().contains("8/23/20"));
    Assert.assertTrue(stringWriter.toString().contains("[0,"));
    Assert.assertTrue(stringWriter.toString().contains("cases"));
    Assert.assertTrue(stringWriter.toString().contains("dates"));
  }

  @Test
  public void servletReturnsCorrectWorldWideCases() throws IOException {
    resetResponseWriter();
    when(request.getParameter("lat")).thenReturn("0.0");
    when(request.getParameter("lng")).thenReturn("0.0");
    servlet.doGet(request, response);
    Assert.assertTrue(stringWriter.toString().contains("Worldwide"));
    Assert.assertTrue(stringWriter.toString().contains("1/22/20"));
    Assert.assertTrue(stringWriter.toString().contains("cases"));
    Assert.assertTrue(stringWriter.toString().contains("dates"));

  }
}
