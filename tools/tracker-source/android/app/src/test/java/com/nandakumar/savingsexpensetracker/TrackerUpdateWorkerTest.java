package com.nandakumar.savingsexpensetracker;

import org.junit.Test;
import static org.junit.Assert.assertEquals;

public class TrackerUpdateWorkerTest {
    @Test public void comparesVersionSegmentsNumerically() {
        assertEquals(1, TrackerUpdateWorker.compareVersions("tracker-v2.2.10", "2.2.9"));
        assertEquals(-1, TrackerUpdateWorker.compareVersions("tracker-v2.2.3", "2.2.4"));
        assertEquals(0, TrackerUpdateWorker.compareVersions("tracker-v2.2.4", "2.2.4"));
    }

    @Test public void rejectsUnexpectedAndInvalidVersionStrings() {
        assertEquals(0, TrackerUpdateWorker.compareVersions("another-product-v4.0.0", "2.2.4"));
        assertEquals(0, TrackerUpdateWorker.compareVersions("bad", "2.2.4"));
        assertEquals(0, TrackerUpdateWorker.compareVersions("tracker-v2.2.99999999999999999999", "2.2.4"));
    }
}
