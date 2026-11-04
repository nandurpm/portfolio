import type {Envelope} from '../domain/types';
import {cloudPlan,equal} from './model';
/** Clear only cloud-confirmed browser data on session end; never erase offline edits. */
export function canClearSignedOutCache(envelope:Envelope) {
 return !!envelope.sync && equal(cloudPlan(envelope.data),envelope.sync.base);
}
