import {describe,it,expect} from 'vitest';
import {financialFixture} from './fixtures/financial';
import {monthlyChecklistView} from '../src/domain/monthly-checklist';
import {readCSV,inspectColumns} from '../src/io/import';
import {possiblePlanDuplicates} from '../src/domain/insights';
describe('independent audit regression coverage',()=>{
 it('does not give daily income a fictitious expected day',()=>{
  const p=financialFixture().data;
  p.categories.find(c=>c.group==='Income')!.timing='Daily';
  expect(monthlyChecklistView(p,'2026-11').income[0]?.plannedDate).toBeNull();
 });
 it('rejects oversized CSV before parsing it',()=>{
  expect(()=>readCSV('x'.repeat(10*1024*1024+1),financialFixture().data)).toThrow('10 MB');
 });
 it('rejects oversized inspection before opening the workbook',async()=>{
  await expect(inspectColumns(new Uint8Array(10*1024*1024+1),'test.xlsx')).rejects.toThrow('10 MB');
 });
 it('reviews repeated Entries without removing legitimate repeats',()=>{
  const p=financialFixture().data;
  p.entries=[{id:'a',date:'2026-11-02',categoryId:'bill',amount:100,payment:'Cash',description:'',notes:''}];
  expect(possiblePlanDuplicates(p,{date:'2026-11-02',categoryId:'bill',amount:100})).toEqual(['a']);
  expect(possiblePlanDuplicates(p,{id:'a',date:'2026-11-02',categoryId:'bill',amount:100})).toEqual([]);
 });
});
