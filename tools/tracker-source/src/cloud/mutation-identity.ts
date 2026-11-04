import type {CloudPlan} from './model';
import {equal} from './model';
/** Retain the idempotency key if a response is lost and the same revision/payload is retried. */
export class MutationIdentity {
 private pending?: {owner:string;revision:number;data:CloudPlan;id:string};
 idFor(owner:string,revision:number,data:CloudPlan) {
  if(this.pending?.owner===owner && this.pending.revision===revision && equal(this.pending.data,data)) return this.pending.id;
  const id=crypto.randomUUID();this.pending={owner,revision,data:structuredClone(data),id};return id;
 }
}
