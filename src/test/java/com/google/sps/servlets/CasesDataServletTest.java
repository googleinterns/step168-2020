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

import java.io.IOException;
import java.io.PrintWriter;
import java.io.StringWriter;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collection;
import java.util.Collections;
import java.util.List;
import javax.servlet.ServletException;
import javax.servlet.annotation.WebServlet;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import org.junit.Assert;
import org.junit.Before;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.junit.runners.JUnit4;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

/** */
@RunWith(JUnit4.class)
public final class CasesDataServletTest {
  private CasesDataServlet servlet;
  private MockHttpServletRequest request;
  private MockHttpServletResponse response;

  @Before
  public void setUp() throws ServletException, IOException {
    servlet = new CasesDataServlet();
    request = new MockHttpServletRequest();
    request.setMethod("get");
    response = new MockHttpServletResponse();
    servlet.doGet(request, response);
  }

  @Test
  public void correctContentType() {
    Assert.assertEquals("application/json", response.getContentType());
  }

  @Test
  public void correctCharacterEncoding() {
    Assert.assertEquals("UTF-8", response.getCharacterEncoding());
  }

  @Test
  public void correctDataFile() {
    Assert.assertEquals("/WEB-INF/cases.csv", servlet.STATS);
  }

  @Test
  public void noHeaders() {
    Assert.assertEquals(Collections.<String>emptySet(), response.getHeaderNames());
  }

  @Test
  public void doesNotRedirect() {
    Assert.assertEquals(null, response.getRedirectedUrl());
  }

  @Test
  public void statusOK() {
    Assert.assertEquals(200, response.getStatus());
  }

  @Test
  public void correctlyCallsGetMethod() {
    Assert.assertEquals("get", request.getMethod());
  }

  @Test
  public void usesHTTP() {
    Assert.assertEquals("http", request.getProtocol());
  }
}