package com.nandakumar.savingsexpensetracker;

import android.graphics.Color;
import android.graphics.drawable.ColorDrawable;
import android.graphics.drawable.LayerDrawable;
import android.os.Bundle;
import android.view.Gravity;
import android.view.View;
import android.os.Build;
import android.Manifest;
import androidx.activity.EdgeToEdge;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
 private int topColor=Color.WHITE, bottomColor=Color.rgb(104,87,199), navigationInset=0;

 @Override public void onCreate(Bundle state) {
  registerPlugin(TrackerNativePlugin.class);
  super.onCreate(state);
  // Schedule OS-managed release notifications without accessing financial records.
  try { TrackerUpdateWorker.schedule(getApplicationContext()); }
  catch (RuntimeException ignored) { /* In-app version checking stays available. */ }
  if (Build.VERSION.SDK_INT >= 33 && checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != android.content.pm.PackageManager.PERMISSION_GRANTED)
   requestPermissions(new String[]{Manifest.permission.POST_NOTIFICATIONS}, 4101);
  EdgeToEdge.enable(this);
  // Inset the application content, never DecorView: Android can overwrite decor padding
  // during window layout, allowing the WebView to cover the time/battery and gesture bar.
  View content=findViewById(android.R.id.content);
  getWindow().setNavigationBarContrastEnforced(false);
  ViewCompat.setOnApplyWindowInsetsListener(content,(view,insets)->{
   Insets safe=insets.getInsets(WindowInsetsCompat.Type.systemBars()|WindowInsetsCompat.Type.displayCutout());
   Insets keyboard=insets.getInsets(WindowInsetsCompat.Type.ime());
   int bottom=Math.max(safe.bottom,keyboard.bottom);
   view.setPadding(safe.left,safe.top,safe.right,bottom);
   navigationInset=safe.bottom;
   updateBarBackgrounds();
   return new WindowInsetsCompat.Builder(insets)
    .setInsets(WindowInsetsCompat.Type.systemBars()|WindowInsetsCompat.Type.displayCutout()|WindowInsetsCompat.Type.ime(),Insets.NONE)
    .build();
  });
  ViewCompat.requestApplyInsets(content);
 }

 @Override public void onConfigurationChanged(android.content.res.Configuration config) {
  super.onConfigurationChanged(config);
  getWindow().getDecorView().post(this::updateBarBackgrounds);
 }
 public void setBarColors(int top,int bottom) { topColor=top;bottomColor=bottom;updateBarBackgrounds(); }
 private void updateBarBackgrounds() {
  LayerDrawable background=new LayerDrawable(new android.graphics.drawable.Drawable[]{new ColorDrawable(topColor),new ColorDrawable(bottomColor)});
  background.setLayerGravity(1,Gravity.BOTTOM);
  background.setLayerHeight(1,navigationInset);
  getWindow().getDecorView().setBackground(background);
 }
 @Override public void onStop(){super.onStop();new Thread(()->{try{TrackerNativePlugin.backupFiles(this);}catch(Exception ignored){}}).start();}
}
