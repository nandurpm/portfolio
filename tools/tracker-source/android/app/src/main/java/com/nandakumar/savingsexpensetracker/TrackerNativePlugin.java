package com.nandakumar.savingsexpensetracker;

import android.app.Activity;
import android.content.Intent;
import android.database.Cursor;
import android.net.Uri;
import android.provider.OpenableColumns;
import android.print.PrintManager;
import android.content.Context;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.media.AudioManager;
import android.media.ToneGenerator;
import android.os.Build;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyProperties;
import android.util.Base64;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import androidx.activity.result.ActivityResult;
import com.getcapacitor.*;
import com.getcapacitor.annotation.*;
import java.io.*;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.security.KeyStore;
import java.text.SimpleDateFormat;
import java.util.*;
import javax.crypto.*;
import javax.crypto.spec.GCMParameterSpec;

@CapacitorPlugin(name="TrackerNative")
public class TrackerNativePlugin extends Plugin {
 @PluginMethod public void beginWidgets(PluginCall call) {
  try { JSObject result=new JSObject();result.put("epoch",new WidgetStore(getContext()).begin());TrackerWidgets.updateAll(getContext());call.resolve(result); }
  catch(Exception e) { call.reject("Widget cache unavailable",e); }
 }
 @PluginMethod public void updateWidgets(PluginCall call) {
  try {
   new WidgetStore(getContext()).write(call.getLong("epoch",-1L),call.getLong("sequence",-1L),call.getString("owner",""),call.getString("access","attention"),call.getObject("snapshot"));
   TrackerWidgets.updateAll(getContext());call.resolve();
  } catch(Exception e) { call.reject("Could not update home-screen widgets",e); }
 }
 @PluginMethod public void consumeWidgetAction(PluginCall call) {
  getActivity().runOnUiThread(()->{
   Intent intent=getActivity().getIntent();String action=WidgetPolicy.action(intent==null?null:intent.getAction());
   if(action!=null) intent.setAction(Intent.ACTION_MAIN);
   JSObject result=new JSObject();result.put("action",action==null?org.json.JSONObject.NULL:action);call.resolve(result);
  });
 }
 @Override protected void handleOnNewIntent(Intent intent) {
  if(WidgetPolicy.action(intent.getAction())!=null) notifyListeners("trackerWidgetAction",new JSObject());
 }
 private void widgetSession(String slot,String value) {
  if(!"tracker-auth-v1".equals(slot)) return;
  String owner="";
  try { if(value!=null) owner=new org.json.JSONObject(value).getJSONObject("user").getString("id"); }
  catch(Exception ignored) { /* Missing identity always hides the widget cache. */ }
  try { new WidgetStore(getContext()).sessionOwner(owner); TrackerWidgets.updateAll(getContext()); }
  catch(RuntimeException ignored) { /* Optional display cache must never break secure session storage. */ }
 }
 static final Object LOCK = new Object();
 private static final String CHANNEL_ID = "tracker-reminders";
 private void ensureNotificationChannel() {
  if (Build.VERSION.SDK_INT < 26) return;
  NotificationManager manager = (NotificationManager)getContext().getSystemService(Context.NOTIFICATION_SERVICE);
  if (manager == null || manager.getNotificationChannel(CHANNEL_ID) != null) return;
  NotificationChannel channel = new NotificationChannel(CHANNEL_ID, "Tracker reminders", NotificationManager.IMPORTANCE_DEFAULT);
  channel.setDescription("Salary, EMI, recharge and missing-entry reminders");
  channel.enableVibration(true);
  manager.createNotificationChannel(channel);
 }
 @PluginMethod public void feedback(PluginCall call) {
  String kind = call.getString("kind", "success");
  long[] pattern = "reminder".equals(kind) ? new long[]{0, 48, 30, 90} : "budget".equals(kind) ? new long[]{0, 24, 20, 45} : new long[]{0, 18};
  try {
   Vibrator vibrator = (Vibrator)getContext().getSystemService(Context.VIBRATOR_SERVICE);
   if (vibrator != null && vibrator.hasVibrator()) vibrator.vibrate(VibrationEffect.createWaveform(pattern, -1));
   ToneGenerator tone = new ToneGenerator(AudioManager.STREAM_NOTIFICATION, "reminder".equals(kind) ? 85 : 65);
   tone.startTone("reminder".equals(kind) ? ToneGenerator.TONE_PROP_BEEP2 : ToneGenerator.TONE_PROP_ACK, "reminder".equals(kind) ? 180 : 90);
   new android.os.Handler(android.os.Looper.getMainLooper()).postDelayed(tone::release, 260);
   call.resolve();
  } catch (Exception e) { call.reject("Could not play feedback", e); }
 }
 @PluginMethod public void notify(PluginCall call) {
  try {
   ensureNotificationChannel();
   NotificationManager manager = (NotificationManager)getContext().getSystemService(Context.NOTIFICATION_SERVICE);
   if (manager == null) throw new IOException("Notifications unavailable");
   String title = call.getString("title", "Savings and Expense Tracker");
   String body = call.getString("body", "You have a tracker reminder.");
   Notification.Builder builder = Build.VERSION.SDK_INT >= 26 ? new Notification.Builder(getContext(), CHANNEL_ID) : new Notification.Builder(getContext());
   builder.setSmallIcon(com.nandakumar.savingsexpensetracker.R.drawable.ic_launcher_foreground).setContentTitle(title).setContentText(body).setAutoCancel(true).setCategory(Notification.CATEGORY_REMINDER).setDefaults(Notification.DEFAULT_ALL);
   manager.notify(Math.abs((title + body).hashCode()), builder.build());
   call.resolve();
  } catch (Exception e) { call.reject("Could not show reminder", e); }
 }
 @PluginMethod public void setBarBackgrounds(PluginCall call) {
  try {
   String top=call.getString("topColor"),bottom=call.getString("bottomColor");
   if(top==null||bottom==null||!top.matches("#[0-9a-fA-F]{6}")||!bottom.matches("#[0-9a-fA-F]{6}"))throw new IllegalArgumentException("Invalid bar colors");
   int topColor=android.graphics.Color.parseColor(top),bottomColor=android.graphics.Color.parseColor(bottom);
   getActivity().runOnUiThread(()->{((MainActivity)getActivity()).setBarColors(topColor,bottomColor);call.resolve();});
  }catch(Exception e){call.reject("Could not update system bar backgrounds",e);}
 }

 private File file(){ return new File(getContext().getFilesDir(),"plan.json"); }
 private static String digest(byte[] data)throws Exception{return Base64.encodeToString(java.security.MessageDigest.getInstance("SHA-256").digest(data),Base64.NO_WRAP);}
 private static void mark(Context c,byte[] data)throws Exception{if(!c.getSharedPreferences("validated",Context.MODE_PRIVATE).edit().putString("hash",digest(data)).commit())throw new IOException("Could not confirm saved data");}
 private static String iso(long time){ SimpleDateFormat f=new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'",Locale.US);f.setTimeZone(TimeZone.getTimeZone("UTC"));return f.format(new Date(time)); }
 private static File[] backups(Context c){return SnapshotBackups.list(new File(c.getFilesDir(),"backups"));}
 static String backupFiles(Context c)throws Exception {synchronized(LOCK){File source=new File(c.getFilesDir(),"plan.json");if(!source.exists())throw new IOException("No saved plan yet");byte[] validated=Files.readAllBytes(source.toPath());if(!digest(validated).equals(c.getSharedPreferences("validated",Context.MODE_PRIVATE).getString("hash","")))throw new IOException("Plan has not been validated; restore before backing up");return SnapshotBackups.create(validated,new File(c.getFilesDir(),"backups")).getAbsolutePath();}}
 @PluginMethod public void load(PluginCall call){synchronized(LOCK){try{JSObject o=new JSObject();o.put("text",file().exists()?new String(Files.readAllBytes(file().toPath()),StandardCharsets.UTF_8):null);o.put("dataPath",file().getAbsolutePath());call.resolve(o);}catch(Exception e){call.reject("Cannot read saved plan",e);}}}
 @PluginMethod public void save(PluginCall call){synchronized(LOCK){try{String text=call.getString("text");if(text==null||text.length()>100000000)throw new IOException("Invalid plan");new org.json.JSONObject(text);File temp=new File(file().getPath()+".tmp");try(FileOutputStream out=new FileOutputStream(temp)){out.write(text.getBytes(StandardCharsets.UTF_8));out.getFD().sync();}try{Files.move(temp.toPath(),file().toPath(),StandardCopyOption.ATOMIC_MOVE,StandardCopyOption.REPLACE_EXISTING);}catch(AtomicMoveNotSupportedException unsupported){Files.move(temp.toPath(),file().toPath(),StandardCopyOption.REPLACE_EXISTING);}mark(getContext(),text.getBytes(StandardCharsets.UTF_8));call.resolve();}catch(Exception e){call.reject("Could not save; keep the app open and retry",e);}}}
 @PluginMethod public void confirmValid(PluginCall call){synchronized(LOCK){try{byte[] bytes=Files.readAllBytes(file().toPath());if(!digest(bytes).equals(digest(call.getString("text","").getBytes(StandardCharsets.UTF_8))))throw new IOException("Plan changed while validating");mark(getContext(),bytes);call.resolve();}catch(Exception e){call.reject("Could not confirm saved data",e);}}}
 @PluginMethod public void preserveCorrupt(PluginCall call){synchronized(LOCK){try{Files.copy(file().toPath(),new File(getContext().getFilesDir(),"plan-corrupt-"+System.currentTimeMillis()+".json").toPath());call.resolve();}catch(Exception e){call.reject("Could not preserve unreadable file",e);}}}
 @PluginMethod public void readBackups(PluginCall call){synchronized(LOCK){JSArray a=new JSArray();for(File f:backups(getContext())){try{JSObject item=new JSObject();item.put("name",f.getName());item.put("text",new String(Files.readAllBytes(f.toPath()),StandardCharsets.UTF_8));a.put(item);}catch(Exception ignored){}}JSObject o=new JSObject();o.put("items",a);call.resolve(o);}}
 @PluginMethod public void backup(PluginCall call){try{JSObject o=new JSObject();o.put("path",backupFiles(getContext()));call.resolve(o);}catch(Exception e){call.reject("Backup failed",e);}}
 @PluginMethod public void status(PluginCall call){JSObject o=new JSObject();File[] b=backups(getContext());o.put("lastSavedAt",file().exists()?iso(file().lastModified()):"");o.put("lastBackupAt",b.length>0?iso(b[0].lastModified()):"");call.resolve(o);}
 private static final java.util.concurrent.atomic.AtomicBoolean UPDATE_BUSY =
     new java.util.concurrent.atomic.AtomicBoolean(false);
 private static final java.util.concurrent.ExecutorService UPDATE_EXECUTOR =
     java.util.concurrent.Executors.newSingleThreadExecutor();

 @PluginMethod public void isUpdateDownloaded(PluginCall call) {
  try {
   String version=TrackerApkUpdate.requireVersion(call.getString("version"));
   String sha=TrackerApkUpdate.requireDigest(call.getString("sha256"));
   UPDATE_EXECUTOR.execute(() -> {
    JSObject response=new JSObject();
    response.put("ready",TrackerApkUpdate.isDownloaded(getContext(),version,sha));
    call.resolve(response);
   });
  } catch(Exception e) { call.reject("Cannot check downloaded update",e); }
 }

 @PluginMethod public void downloadUpdate(PluginCall call) {
  final String version,sha,url;
  try {
   version=TrackerApkUpdate.requireVersion(call.getString("version"));
   sha=TrackerApkUpdate.requireDigest(call.getString("sha256"));
   url=TrackerApkUpdate.requireUrl(call.getString("url"),version);
  } catch(Exception e) { call.reject("Untrusted APK update details",e); return; }
  if(!UPDATE_BUSY.compareAndSet(false,true)){
   call.reject("An update download is already running");
   return;
  }
  UPDATE_EXECUTOR.execute(() -> {
   try {
    TrackerApkUpdate.download(getContext(),version,url,sha,(received,total)->{
     JSObject progress=new JSObject();
     progress.put("received",received);
     progress.put("total",total);
     progress.put("percent",total>0 ? (int)Math.min(100,received*100/total) : -1);
     notifyListeners("trackerUpdateProgress",progress);
    });
    JSObject result=new JSObject();
    result.put("ready",true);
    call.resolve(result);
   } catch(Exception e) {
    call.reject("Cannot download and verify the official update: "+e.getMessage(),e);
   } finally {
    UPDATE_BUSY.set(false);
   }
  });
 }

 @PluginMethod public void installDownloadedUpdate(PluginCall call) {
  try {
   final String version=TrackerApkUpdate.requireVersion(call.getString("version"));
   final String sha=TrackerApkUpdate.requireDigest(call.getString("sha256"));
   getActivity().runOnUiThread(() -> {
    try {
     boolean launched=TrackerApkUpdate.install(getActivity(),version,sha);
     JSObject result=new JSObject();
     result.put("launched",launched);
     result.put("permissionRequired",!launched);
     call.resolve(result);
    } catch(Exception e) {
     call.reject("Cannot launch the Android update installer: "+e.getMessage(),e);
    }
   });
  } catch(Exception e) { call.reject("Invalid update installation details",e); }
 }

 @PluginMethod public void openRelease(PluginCall call) {
  try {
   android.net.Uri uri=android.net.Uri.parse(call.getString("url", ""));
   String location=uri.getPath();
   boolean releaseNotes=location!=null && location.matches("^/nandurpm/portfolio/releases/tag/tracker-v[0-9]+\\.[0-9]+\\.[0-9]+$");
   boolean signedApk=location!=null && location.matches("^/nandurpm/portfolio/releases/download/tracker-v[0-9]+\\.[0-9]+\\.[0-9]+/Savings-and-Expense-Tracker-[0-9]+\\.[0-9]+\\.[0-9]+\\.apk$");
   if(!"https".equals(uri.getScheme()) || !"github.com".equals(uri.getHost()) ||
     uri.getPort()!=-1 || uri.getUserInfo()!=null || uri.getQuery()!=null || uri.getFragment()!=null ||
     !(releaseNotes||signedApk)) throw new IllegalArgumentException("Untrusted release address");
   getActivity().runOnUiThread(() -> {
    try {
     getActivity().startActivity(new android.content.Intent(android.content.Intent.ACTION_VIEW,uri));
     call.resolve();
    } catch(Exception e) { call.reject("Could not open the official GitHub release",e); }
   });
  } catch(Exception e) { call.reject("Invalid official GitHub release link",e); }
 }
 @PluginMethod public void openGoogle(PluginCall call) {
  try {
   android.net.Uri uri=android.net.Uri.parse(call.getString("url", ""));
   if (!"https".equals(uri.getScheme()) || !"svqtisipjyymguswxteb.supabase.co".equals(uri.getHost()) || uri.getPort()!=-1 || uri.getUserInfo()!=null || !"/auth/v1/authorize".equals(uri.getPath()) || !"google".equals(uri.getQueryParameter("provider")) || !"com.nandakumar.savingsexpensetracker://auth/callback".equals(uri.getQueryParameter("redirect_to")) || !"s256".equals(uri.getQueryParameter("code_challenge_method")) || uri.getQueryParameter("code_challenge")==null) throw new IllegalArgumentException("Invalid Google authorization address");
   getActivity().runOnUiThread(() -> {
    try { getActivity().startActivity(new android.content.Intent(android.content.Intent.ACTION_VIEW,uri)); call.resolve(); }
    catch(Exception e) { call.reject("Could not open your browser for Google sign-in",e); }
   });
  } catch(Exception e) { call.reject("Could not start secure Google sign-in",e); }
 }
 private void checkKey(PluginCall c)throws Exception{String k=c.getString("key");if(k==null||k.length()>160||!k.matches("^tracker-auth-v1(?:-[A-Za-z0-9._:-]+)?$"))throw new IOException("Unknown credential key");}
 private javax.crypto.SecretKey key()throws Exception{KeyStore ks=KeyStore.getInstance("AndroidKeyStore");ks.load(null);String alias="SavingsTrackerSession";if(!ks.containsAlias(alias)){KeyGenerator gen=KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES,"AndroidKeyStore");gen.init(new KeyGenParameterSpec.Builder(alias,KeyProperties.PURPOSE_ENCRYPT|KeyProperties.PURPOSE_DECRYPT).setBlockModes(KeyProperties.BLOCK_MODE_GCM).setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE).setKeySize(256).build());gen.generateKey();}return (javax.crypto.SecretKey)ks.getKey(alias,null);}
 @PluginMethod public void sessionGet(PluginCall call){try{checkKey(call);}catch(Exception e){call.reject("Unknown credential key",e);return;}String slot=call.getString("key");android.content.SharedPreferences prefs=getContext().getSharedPreferences("auth",Context.MODE_PRIVATE);try{String stored=prefs.getString(slot,null);boolean legacy=false;if(stored==null&&"tracker-auth-v1".equals(slot)){stored=prefs.getString("session",null);legacy=stored!=null;}String value=null;if(stored!=null){String[] parts=stored.split("\\.");Cipher cipher=Cipher.getInstance("AES/GCM/NoPadding");cipher.init(Cipher.DECRYPT_MODE,key(),new GCMParameterSpec(128,Base64.decode(parts[0],Base64.NO_WRAP)));value=new String(cipher.doFinal(Base64.decode(parts[1],Base64.NO_WRAP)),StandardCharsets.UTF_8);if(legacy&&!prefs.edit().putString(slot,stored).remove("session").commit())throw new IOException("Credential migration failed");}JSObject o=new JSObject();o.put("value",value);widgetSession(slot,value);call.resolve(o);}catch(Exception e){android.content.SharedPreferences.Editor edit=prefs.edit().remove(slot);if("tracker-auth-v1".equals(slot))edit.remove("session");edit.commit();JSObject o=new JSObject();o.put("value",org.json.JSONObject.NULL);widgetSession(slot,null);call.resolve(o);}}
 @PluginMethod public void sessionSet(PluginCall call){try{checkKey(call);String value=call.getString("value");if(value==null||value.length()>100000)throw new IOException("Invalid session");Cipher c=Cipher.getInstance("AES/GCM/NoPadding");c.init(Cipher.ENCRYPT_MODE,key());String encrypted=Base64.encodeToString(c.getIV(),Base64.NO_WRAP)+"."+Base64.encodeToString(c.doFinal(value.getBytes(StandardCharsets.UTF_8)),Base64.NO_WRAP);if(!getContext().getSharedPreferences("auth",Context.MODE_PRIVATE).edit().putString(call.getString("key"),encrypted).commit())throw new IOException("Credential storage failed");widgetSession(call.getString("key"),value);call.resolve();}catch(Exception e){call.reject("Secure sign-in storage failed",e);}}
 @PluginMethod public void sessionRemove(PluginCall call){try{checkKey(call);String slot=call.getString("key");android.content.SharedPreferences.Editor edit=getContext().getSharedPreferences("auth",Context.MODE_PRIVATE).edit().remove(slot);if("tracker-auth-v1".equals(slot))edit.remove("session");if(!edit.commit())throw new IOException("Credential removal failed");widgetSession(slot,null);call.resolve();}catch(Exception e){call.reject("Could not sign out securely",e);}}
 private String mime(String ext){if("xlsx".equals(ext))return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";if("csv".equals(ext))return "text/csv";if("pdf".equals(ext))return "application/pdf";return "application/json";}
 @PluginMethod public void saveFile(PluginCall call){String ext=call.getString("extension");if(!Arrays.asList("xlsx","csv","json","pdf").contains(ext)){call.reject("Unsupported export");return;}Intent i=new Intent(Intent.ACTION_CREATE_DOCUMENT);i.addCategory(Intent.CATEGORY_OPENABLE);i.setType(mime(ext));i.putExtra(Intent.EXTRA_TITLE,call.getString("name","Savings and Expense Tracker."+ext));startActivityForResult(call,i,"exportDone");}
 @ActivityCallback private void exportDone(PluginCall call,ActivityResult result){if(call==null)return;try{JSObject o=new JSObject();Uri uri=result.getData()==null?null:result.getData().getData();if(result.getResultCode()!=Activity.RESULT_OK||uri==null){o.put("path",org.json.JSONObject.NULL);call.resolve(o);return;}byte[] bytes=Base64.decode(call.getString("base64",""),Base64.DEFAULT);try(OutputStream out=getContext().getContentResolver().openOutputStream(uri,"wt")){if(out==null)throw new IOException("Cannot open destination");out.write(bytes);}o.put("path",uri.toString());call.resolve(o);}catch(Exception e){call.reject("Export failed",e);}}
 @PluginMethod public void openFile(PluginCall call){Intent i=new Intent(Intent.ACTION_OPEN_DOCUMENT);i.addCategory(Intent.CATEGORY_OPENABLE);i.setType("*/*");i.putExtra(Intent.EXTRA_MIME_TYPES,new String[]{"application/json","application/octet-stream","text/plain","text/csv","application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"});startActivityForResult(call,i,"importDone");}
 @ActivityCallback private void importDone(PluginCall call,ActivityResult result){if(call==null)return;Uri uri=result.getData()==null?null:result.getData().getData();if(result.getResultCode()!=Activity.RESULT_OK||uri==null){call.resolve();return;}try{String name="import.json";try(Cursor c=getContext().getContentResolver().query(uri,null,null,null,null)){if(c!=null&&c.moveToFirst()){int col=c.getColumnIndex(OpenableColumns.DISPLAY_NAME);if(col>=0)name=c.getString(col);}}byte[] data;try(InputStream in=getContext().getContentResolver().openInputStream(uri);ByteArrayOutputStream out=new ByteArrayOutputStream()){if(in==null)throw new IOException("Cannot read file");byte[] buf=new byte[8192];int n;while((n=in.read(buf))!=-1){out.write(buf,0,n);if(out.size()>100000000)throw new IOException("File is too large");}data=out.toByteArray();}JSObject o=new JSObject();o.put("name",name);o.put("base64",Base64.encodeToString(data,Base64.NO_WRAP));call.resolve(o);}catch(Exception e){call.reject("Import failed",e);}}
 private WebView printWebView;
 private void releasePrintView(WebView view){if(printWebView==view){view.destroy();printWebView=null;}}
 @Override protected void handleOnDestroy(){if(printWebView!=null){printWebView.destroy();printWebView=null;}}
 @PluginMethod public void printReport(PluginCall call){
  String html=call.getString("html");
  if(html==null||html.length()>5000000){call.reject("Invalid report");return;}
  getActivity().runOnUiThread(()->{
   if(printWebView!=null){call.reject("Finish or cancel the current print job first");return;}
   WebView view=new WebView(getActivity());printWebView=view;
   view.getSettings().setJavaScriptEnabled(false);view.getSettings().setBlockNetworkLoads(true);
   view.setWebViewClient(new WebViewClient(){
    private boolean started=false;
    @Override public void onPageFinished(WebView v,String url){
     if(started)return;started=true;
     try{
      PrintManager manager=(PrintManager)getActivity().getSystemService(Context.PRINT_SERVICE);
      if(manager==null)throw new IOException("Printing is unavailable");
      android.print.PrintDocumentAdapter delegate=v.createPrintDocumentAdapter("Savings and Expense Tracker");
      android.print.PrintDocumentAdapter adapter=new android.print.PrintDocumentAdapter(){
       @Override public void onStart(){delegate.onStart();}
       @Override public void onLayout(android.print.PrintAttributes oldAttributes,android.print.PrintAttributes newAttributes,android.os.CancellationSignal signal,LayoutResultCallback callback,android.os.Bundle extras){delegate.onLayout(oldAttributes,newAttributes,signal,callback,extras);}
       @Override public void onWrite(android.print.PageRange[] pages,android.os.ParcelFileDescriptor destination,android.os.CancellationSignal signal,WriteResultCallback callback){delegate.onWrite(pages,destination,signal,callback);}
       @Override public void onFinish(){try{delegate.onFinish();}finally{releasePrintView(v);}}
      };
      if(manager.print(call.getString("name","Savings and Expense Tracker"),adapter,null)==null)throw new IOException("Could not start printing");
      call.resolve();
     }catch(Exception e){releasePrintView(v);call.reject("Could not print report",e);}
    }
    @Override public void onReceivedError(WebView v,android.webkit.WebResourceRequest request,android.webkit.WebResourceError error){if(request.isForMainFrame()&&!started){started=true;releasePrintView(v);call.reject("Could not prepare print report");}}
   });
   try{view.loadDataWithBaseURL("https://localhost/",html,"text/html","UTF-8",null);}catch(Exception e){releasePrintView(view);call.reject("Could not prepare print report",e);}
  });
 }
}
