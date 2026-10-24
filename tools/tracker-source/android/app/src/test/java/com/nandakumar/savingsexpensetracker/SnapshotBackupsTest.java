package com.nandakumar.savingsexpensetracker;
import org.junit.Test;
import static org.junit.Assert.*;
import java.io.File;
import java.nio.file.Files;
import java.nio.file.attribute.FileTime;
import java.nio.charset.StandardCharsets;

public class SnapshotBackupsTest {
 @Test public void repeatedAppSwitchesKeepOneUnchangedSnapshot() throws Exception {
  File folder=Files.createTempDirectory("tracker-backups").toFile();
  byte[] bytes="{\"saved\":123}".getBytes(StandardCharsets.UTF_8);
  File first=SnapshotBackups.create(bytes,folder);
  for(int i=0;i<20;i++)assertEquals(first,SnapshotBackups.create(bytes,folder));
  assertEquals(1,SnapshotBackups.list(folder).length);
 }
 @Test public void keepsTenDistinctSnapshotsAndCurrentContents() throws Exception {
  File folder=Files.createTempDirectory("tracker-backups").toFile();
  File latest=null;
  for(int i=0;i<15;i++){
   latest=SnapshotBackups.create(("{\"amount\":"+i+"}").getBytes(StandardCharsets.UTF_8),folder);
   Files.setLastModifiedTime(latest.toPath(),FileTime.fromMillis(100000+i));
  }
  assertEquals(10,SnapshotBackups.list(folder).length);
  assertTrue(latest.exists());
  assertEquals("{\"amount\":14}",new String(Files.readAllBytes(SnapshotBackups.list(folder)[0].toPath()),StandardCharsets.UTF_8));
 }
 @Test public void changedSnapshotDoesNotReplaceThePreviousContents() throws Exception {
  File folder=Files.createTempDirectory("tracker-backups").toFile();
  File first=SnapshotBackups.create("first".getBytes(StandardCharsets.UTF_8),folder);
  SnapshotBackups.create("second".getBytes(StandardCharsets.UTF_8),folder);
  assertEquals(2,SnapshotBackups.list(folder).length);
  assertEquals("first",new String(Files.readAllBytes(first.toPath()),StandardCharsets.UTF_8));
 }
}
