package com.nandakumar.savingsexpensetracker;

import android.content.Context;
import android.content.Intent;
import android.content.ComponentName;
import android.appwidget.AppWidgetHost;
import android.appwidget.AppWidgetManager;
import android.os.Bundle;
import android.content.res.Configuration;
import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.view.View;
import android.view.ViewGroup;
import android.widget.FrameLayout;
import android.widget.TextView;
import androidx.test.platform.app.InstrumentationRegistry;
import androidx.test.core.app.ActivityScenario;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import org.json.JSONObject;
import org.junit.Test;
import org.junit.Assume;
import org.junit.runner.RunWith;
import java.io.File;
import java.io.FileOutputStream;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicBoolean;
import static org.junit.Assert.*;

@RunWith(AndroidJUnit4.class)
public class WidgetsTest {
 private Context context() { return InstrumentationRegistry.getInstrumentation().getTargetContext(); }
 private WidgetStore cache() {
  Context c=context();c.getSharedPreferences("widget-test-only",Context.MODE_PRIVATE).edit().clear().commit();
  return new WidgetStore(c,"widget-test-only");
 }
 private JSONObject snapshot(long now) throws Exception {
  return new JSONObject().put("month",TrackerWidgets.month(now)).put("monthText","Test month").put("updatedAt",now)
   .put("income","₹18,000.15").put("expenses","₹2,001.05").put("savings","₹15,999.10").put("status","ready");
 }
 @Test public void installedProvidersBindAndAcceptLauncherResizeOptions() {
  AppWidgetManager manager=AppWidgetManager.getInstance(context());
  AppWidgetHost host=new AppWidgetHost(context(),70431);
  InstrumentationRegistry.getInstrumentation().getUiAutomation().adoptShellPermissionIdentity("android.permission.BIND_APPWIDGET");
  try {
   for(Class<?> provider:new Class<?>[]{QuickEntryWidget.class,MonthlySummaryWidget.class}) {
    int id=host.allocateAppWidgetId();
    try {
     assertTrue(manager.bindAppWidgetIdIfAllowed(id,new ComponentName(context(),provider)));
     assertEquals(new ComponentName(context(),provider),manager.getAppWidgetInfo(id).provider);
     Bundle options=new Bundle();options.putInt(AppWidgetManager.OPTION_APPWIDGET_MIN_WIDTH,180);
     options.putInt(AppWidgetManager.OPTION_APPWIDGET_MIN_HEIGHT,300);
     manager.updateAppWidgetOptions(id,options);
     assertEquals(180,manager.getAppWidgetOptions(id).getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_WIDTH));
     options.putInt(AppWidgetManager.OPTION_APPWIDGET_MIN_WIDTH,480);manager.updateAppWidgetOptions(id,options);
     assertEquals(480,manager.getAppWidgetOptions(id).getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_WIDTH));
    } finally { host.deleteAppWidgetId(id); }
   }
  } finally { host.deleteHost();InstrumentationRegistry.getInstrumentation().getUiAutomation().dropShellPermissionIdentity(); }
 }
 @Test public void coldExpenseAndWarmIncomeIntentsOpenExistingEmptyForms() throws Exception {
  Intent expense=new Intent(context(),MainActivity.class).setAction(context().getPackageName()+".WIDGET_EXPENSE").addFlags(Intent.FLAG_ACTIVITY_NEW_TASK|Intent.FLAG_ACTIVITY_CLEAR_TASK);
  try(ActivityScenario<MainActivity> scenario=ActivityScenario.launch(expense)) {
   scenario.onActivity(activity->assertFalse("Native bridge payloads must not be logged",activity.getBridge().getConfig().isLoggingEnabled()));
   assertWebForm(scenario,"Expense");
   CountDownLatch draft=new CountDownLatch(1);
   scenario.onActivity(activity->activity.getBridge().getWebView().evaluateJavascript(
    "(()=>{const e=document.querySelector('[aria-label=\"New transaction amount\"]');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(e,'123');e.dispatchEvent(new Event('input',{bubbles:true}));return e.value;})()",
    value->draft.countDown()));
   assertTrue("Draft input callback must return",draft.await(10,TimeUnit.SECONDS));
   CountDownLatch chooser=new CountDownLatch(1);
   scenario.onActivity(activity->activity.getBridge().getWebView().evaluateJavascript("document.querySelector('.mobile-quick-add').click()",value->chooser.countDown()));
   assertTrue("Quick-add chooser callback must return",chooser.await(10,TimeUnit.SECONDS));
   assertWebCondition(scenario,"Boolean(document.querySelector('[role=dialog]'))","Quick-add chooser must be open before a warm widget action");
   InstrumentationRegistry.getInstrumentation().runOnMainSync(()->context().startActivity(new Intent(context(),MainActivity.class)
    .setAction(context().getPackageName()+".WIDGET_INCOME").addFlags(Intent.FLAG_ACTIVITY_NEW_TASK|Intent.FLAG_ACTIVITY_SINGLE_TOP)));
   assertWebForm(scenario,"Income");
  }
 }
 private void assertWebForm(ActivityScenario<MainActivity> scenario,String kind) throws Exception {
  assertWebCondition(scenario,"Boolean(!document.querySelector('[role=dialog]') && document.querySelector('.quick-add') && [...document.querySelectorAll('.entry-kind button')].some(x=>x.textContent.trim()==='Add "+kind+"' && x.getAttribute('aria-pressed')==='true') && document.querySelector('[aria-label=\"New transaction amount\"]').value==='')","Widget must open an unobscured empty "+kind+" form without submitting");
 }
 private void assertWebCondition(ActivityScenario<MainActivity> scenario,String condition,String message) throws Exception {
  AtomicBoolean found=new AtomicBoolean(false);
  long deadline=android.os.SystemClock.elapsedRealtime()+60000;
  while(android.os.SystemClock.elapsedRealtime()<deadline && !found.get()) {
   CountDownLatch latch=new CountDownLatch(1);
   scenario.onActivity(activity->activity.getBridge().getWebView().evaluateJavascript(
    condition,
    value->{if("true".equals(value))found.set(true);latch.countDown();}));
   latch.await(10,TimeUnit.SECONDS);if(!found.get())Thread.sleep(250);
  }
  assertTrue(message,found.get());
 }
 @Test public void restartLogoutSwitchAndLateUpdatesAreIsolated() throws Exception {
  WidgetStore store=cache();long now=System.currentTimeMillis(),epoch=store.begin();
  store.sessionOwner("alice");assertTrue(store.write(epoch,1,"alice","ready",snapshot(now)));
  WidgetStore restarted=new WidgetStore(context(),"widget-test-only");assertNotNull(restarted.snapshot());
  assertTrue(restarted.hidden(123));restarted.hidden(123,false);
  assertFalse(new WidgetStore(context(),"widget-test-only").hidden(123));
  restarted.sessionOwner("");assertNull(restarted.snapshot());
  assertFalse(restarted.write(epoch,2,"alice","ready",snapshot(now)));
  restarted.sessionOwner("bob");assertNull(restarted.snapshot());
  assertFalse(restarted.write(epoch,3,"alice","ready",snapshot(now)));
  assertTrue(restarted.write(epoch,4,"bob","ready",snapshot(now)));
  long next=restarted.begin();assertNull(restarted.snapshot());
  assertFalse(restarted.write(epoch,100,"bob","ready",snapshot(now)));
  assertTrue(restarted.write(next,1,"bob","ready",snapshot(now)));
  assertTrue(restarted.write(next,2,"","locked",null));assertNull(restarted.snapshot());
 }
 @Test public void remoteViewsRenderInLightDarkCompactWideAndLargeFontWithoutClipping() throws Exception {
  WidgetStore store=cache();long now=System.currentTimeMillis(),epoch=store.begin();
  assertTrue(store.write(epoch,1,"local","ready",snapshot(now)));store.hidden(1,false);
  for(boolean dark:new boolean[]{false,true}) for(float scale:new float[]{1f,1.3f,2f}) for(int width:new int[]{180,250,360,480}) {
   Configuration config=new Configuration(context().getResources().getConfiguration());
   config.fontScale=scale;config.uiMode=(config.uiMode&~Configuration.UI_MODE_NIGHT_MASK)|(dark?Configuration.UI_MODE_NIGHT_YES:Configuration.UI_MODE_NIGHT_NO);
   Context themed=context().createConfigurationContext(config);
   int height=scale>1.3f?650:410;
   InstrumentationRegistry.getInstrumentation().runOnMainSync(()->{
    View view=TrackerWidgets.views(themed,store,1,true,width,height,now).apply(themed,new FrameLayout(themed));
    float density=themed.getResources().getDisplayMetrics().density;
    int w=Math.round(width*density),h=Math.round(height*density);
    view.measure(View.MeasureSpec.makeMeasureSpec(w,View.MeasureSpec.EXACTLY),View.MeasureSpec.makeMeasureSpec(h,View.MeasureSpec.EXACTLY));view.layout(0,0,w,h);
    try { save(themed,view,"summary-"+width+"-"+scale+"-"+(dark?"dark":"light")); }
    catch(Exception e) { throw new AssertionError(e); }
    try { checkBounds(view); } catch(AssertionError error) { throw new AssertionError("Summary width="+width+" fontScale="+scale+" dark="+dark+": "+error.getMessage(),error); }
    assertEquals("Normal monthly totals must remain visible",View.VISIBLE,view.findViewById(R.id.widget_totals).getVisibility());
    for(int valueId:new int[]{R.id.widget_income_value,R.id.widget_expenses_value,R.id.widget_savings_value}) {
     TextView value=view.findViewById(valueId);
     assertEquals("Financial values must not split across lines",1,value.getLineCount());
     assertEquals("Financial values must not be truncated",0,value.getLayout().getEllipsisCount(0));
     assertTrue("Complete amount must fit",value.getPaint().measureText(value.getText().toString())<=value.getWidth()+0.5f);
    }
    assertEquals("₹18,000.15",((TextView)view.findViewById(R.id.widget_income_value)).getText().toString());
    assertTrue(view.findViewById(R.id.widget_refresh).hasOnClickListeners());
   });
  }
 }
 @Test public void oversizedAmountsRequireEnlargingInsteadOfShowingPartialCurrency() throws Exception {
  WidgetStore store=cache();long now=System.currentTimeMillis(),epoch=store.begin();
  assertTrue(store.write(epoch,1,"local","ready",snapshot(now)));store.hidden(1,false);
  InstrumentationRegistry.getInstrumentation().runOnMainSync(()->{
   View minimum=TrackerWidgets.views(context(),store,1,true,180,250,now).apply(context(),new FrameLayout(context()));
   assertEquals("Ordinary totals must fit the minimum summary size",View.VISIBLE,minimum.findViewById(R.id.widget_totals).getVisibility());
  });
  JSONObject large=snapshot(now).put("income","₹9,99,99,99,99,99,99,99,999.99");
  assertTrue(store.write(epoch,2,"local","ready",large));
  InstrumentationRegistry.getInstrumentation().runOnMainSync(()->{
   View view=TrackerWidgets.views(context(),store,1,true,180,650,now).apply(context(),new FrameLayout(context()));
   assertEquals(View.GONE,view.findViewById(R.id.widget_totals).getVisibility());
   assertTrue(((TextView)view.findViewById(R.id.widget_status)).getText().toString().contains("Enlarge"));
  });
 }
 @Test public void hiddenStaleMissingAndNewMonthStatesNeverInventZeros() throws Exception {
  // A fixed mid-month fixture keeps this stale-cache test valid on the first of a month too.
  WidgetStore store=cache();long now=new java.util.GregorianCalendar(2026,10,8,12,0).getTimeInMillis(),epoch=store.begin();
  assertTrue(store.write(epoch,1,"local","ready",snapshot(now-WidgetPolicy.STALE_AFTER_MS-100)));
  InstrumentationRegistry.getInstrumentation().runOnMainSync(()->{
   View hidden=TrackerWidgets.views(context(),store,1,true,250,410,now).apply(context(),new FrameLayout(context()));
   assertEquals("••••",((TextView)hidden.findViewById(R.id.widget_income_value)).getText().toString());
   assertTrue(((TextView)hidden.findViewById(R.id.widget_status)).getText().toString().contains("Cached"));
   View missing=TrackerWidgets.views(context(),store,1,true,250,410,now+40L*24*60*60*1000).apply(context(),new FrameLayout(context()));
   assertEquals("—",((TextView)missing.findViewById(R.id.widget_income_value)).getText().toString());
  });
 }
 @Test public void quickEntryRemainsTouchableAtMinimumSizeAndLargeFonts() {
  WidgetStore store=cache();
  for(float scale:new float[]{1f,1.3f,2f}) {
   Configuration config=new Configuration(context().getResources().getConfiguration());config.fontScale=scale;
   Context themed=context().createConfigurationContext(config);
   InstrumentationRegistry.getInstrumentation().runOnMainSync(()->{
    float density=themed.getResources().getDisplayMetrics().density;
    View view=TrackerWidgets.views(themed,store,1,false,180,140,System.currentTimeMillis()).apply(themed,new FrameLayout(themed));
    int w=Math.round(180*density),h=Math.round(140*density);
    view.measure(View.MeasureSpec.makeMeasureSpec(w,View.MeasureSpec.EXACTLY),View.MeasureSpec.makeMeasureSpec(h,View.MeasureSpec.EXACTLY));view.layout(0,0,w,h);
    try { save(themed,view,"quick-180-"+scale); } catch(Exception e) { throw new AssertionError(e); }
    checkBounds(view);assertTrue(view.findViewById(R.id.widget_expense).getHeight()>=48*density);
    assertTrue(view.findViewById(R.id.widget_income).getHeight()>=48*density);
    for(int actionId:new int[]{R.id.widget_expense,R.id.widget_income}) {
     TextView action=view.findViewById(actionId);
     String label=action.getText().toString();
     for(int line=0;line<action.getLineCount()-1;line++) {
      int end=action.getLayout().getLineEnd(line);
      assertTrue("Action words must not split at large fonts: "+label,end==0 || end>=label.length() || Character.isWhitespace(label.charAt(end-1)) || Character.isWhitespace(label.charAt(end)));
     }
    }
   });
  }
 }
 @Test public void separateProcessRestoresPrivateCacheAndPrivacy() throws Exception {
  String phase=InstrumentationRegistry.getArguments().getString("widgetProcessPhase");
  Assume.assumeTrue("Invoked separately by the release process-restart check",phase!=null);
  WidgetStore store=new WidgetStore(context(),"widget-process-test-only");
  if("seed".equals(phase)) {
   context().getSharedPreferences("widget-process-test-only",Context.MODE_PRIVATE).edit().clear().commit();
   long epoch=store.begin();store.hidden(91,false);
   assertTrue(store.write(epoch,1,"local","ready",snapshot(System.currentTimeMillis())));
  } else {
   assertEquals("read",phase);assertNotNull(store.snapshot());assertFalse(store.hidden(91));
   assertEquals("₹18,000.15",store.snapshot().getString("income"));
   context().getSharedPreferences("widget-process-test-only",Context.MODE_PRIVATE).edit().clear().commit();
  }
 }
 private void checkBounds(View view) {
  if(view.getVisibility()!=View.VISIBLE)return;
  if(view instanceof ViewGroup) {
   ViewGroup group=(ViewGroup)view;
   for(int i=0;i<group.getChildCount();i++) {
    View child=group.getChildAt(i);if(child.getVisibility()!=View.VISIBLE)continue;
    assertTrue("Widget child extends past bottom: "+(child.getId()==View.NO_ID?child.getClass().getSimpleName():group.getResources().getResourceEntryName(child.getId()))+" bottom="+child.getBottom()+" height="+group.getHeight(),child.getBottom()<=group.getHeight());
    assertTrue("Widget child extends past right: "+(child.getId()==View.NO_ID?child.getClass().getSimpleName():group.getResources().getResourceEntryName(child.getId()))+" right="+child.getRight()+" width="+group.getWidth(),child.getRight()<=group.getWidth());
    checkBounds(child);
   }
  }
  if(view instanceof TextView) {
   TextView text=(TextView)view;
   if(text.getLayout()!=null)assertTrue("Clipped text: "+text.getText(),text.getLayout().getHeight()<=text.getHeight()-text.getCompoundPaddingTop()-text.getCompoundPaddingBottom());
  }
 }
 private void save(Context c,View view,String name) throws Exception {
  Bitmap image=Bitmap.createBitmap(view.getWidth(),view.getHeight(),Bitmap.Config.ARGB_8888);view.draw(new Canvas(image));
  File dir=new File(c.getExternalFilesDir(null),"widget-test-screenshots");dir.mkdirs();
  try(FileOutputStream file=new FileOutputStream(new File(dir,name+".png"))){image.compress(Bitmap.CompressFormat.PNG,100,file);}image.recycle();
 }
}
