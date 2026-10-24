package com.nandakumar.savingsexpensetracker;

import static org.junit.Assert.*;
import android.view.View;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.test.core.app.ActivityScenario;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;
import org.junit.Test;
import org.junit.runner.RunWith;

/** Device regression: a browser-sized viewport cannot detect DecorView padding being reset. */
@RunWith(AndroidJUnit4.class)
public class SystemBarClearanceTest {
 @Test public void webViewStaysOutsideStatusAndNavigationBarsAfterWindowRelayout() {
  try (ActivityScenario<MainActivity> scenario = ActivityScenario.launch(MainActivity.class)) {
   InstrumentationRegistry.getInstrumentation().waitForIdleSync();
   scenario.onActivity(activity -> activity.getWindow().getDecorView().requestLayout());
   InstrumentationRegistry.getInstrumentation().waitForIdleSync();
   scenario.onActivity(activity -> {
    View decor=activity.getWindow().getDecorView();
    WindowInsetsCompat insets=ViewCompat.getRootWindowInsets(decor);
    assertNotNull("Root window insets must be available",insets);
    Insets bars=insets.getInsets(WindowInsetsCompat.Type.systemBars()|WindowInsetsCompat.Type.displayCutout());
    View web=activity.getBridge().getWebView();
    int[] origin=new int[2], location=new int[2];
    decor.getLocationOnScreen(origin);web.getLocationOnScreen(location);
    assertTrue("WebView must have been laid out",web.getHeight()>0);
    assertTrue("Web content overlaps status icons",location[1]>=origin[1]+bars.top);
    assertTrue("Web content overlaps navigation/gesture bar",location[1]+web.getHeight()<=origin[1]+decor.getHeight()-bars.bottom);
   });
  }
 }
}
