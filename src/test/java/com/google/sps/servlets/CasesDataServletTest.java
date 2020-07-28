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

import static org.mockito.Mockito.when;

import java.io.IOException;
import java.net.HttpURLConnection;
import java.util.Collections;
import java.util.List;
import javax.servlet.annotation.WebServlet;
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
public final class CasesDataServletTest {
  @Mock private HttpServletRequest request;
  @Mock private HttpServletResponse response;
  private CasesDataServlet servlet;

  @Test
  public void servletBehavesCorrectly() throws IOException {
    MockitoAnnotations.initMocks(this);
    servlet = new CasesDataServlet();
    when(response.getContentType()).thenReturn(servlet.CTYPE);
    when(response.getCharacterEncoding()).thenReturn(servlet.ENCODING);
    when(response.getStatus()).thenReturn(HttpURLConnection.HTTP_OK);
    when(request.getMethod()).thenReturn("get");
    when(request.getProtocol()).thenReturn("http");
    servlet.doGet(request, response);

    Assert.assertEquals("application/json", response.getContentType());
    Assert.assertEquals("UTF-8", response.getCharacterEncoding());
    Assert.assertEquals("/WEB-INF/cases.csv", servlet.STATS);
    Assert.assertEquals(Collections.<String>emptyList(), response.getHeaderNames());
    Assert.assertEquals(200, response.getStatus());
    Assert.assertEquals("get", request.getMethod());
    Assert.assertEquals("http", request.getProtocol());
  }
}