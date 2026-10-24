import assert from 'node:assert/strict';
import fs from 'node:fs';
import {hydrate,breakdown,makeRecord,recordWrong,migrateWrong,validAttempt} from '../site/assets/practice-core.js';
const root=new URL('../site/',import.meta.url),read=p=>JSON.parse(fs.readFileSync(new URL(p,root)));
const bank=read('assets/question-bank.json'),exams=read('assets/exams.json');
const old=JSON.parse(fs.readFileSync(new URL('baseline-exams.json',import.meta.url)));
assert.deepEqual(exams.slice(0,3),old,'old exams remain byte-equivalent as data');
assert.equal(bank.length,160);assert.equal(new Set(bank.map(q=>q.id)).size,160);assert.equal(new Set(bank.map(q=>q.text)).size,160);
for(let i=0;i<8;i++)assert.equal(bank.filter(q=>q.lesson===i).length,20);
for(const q of bank){assert.ok(q.level>=1&&q.level<=3);assert.ok(q.answer>=0&&q.answer<4);assert.equal(new Set(q.options).size,4);assert.equal(q.optionExplanations.length,4);assert.ok(q.optionExplanations.every(x=>x.trim().length>0));}
assert.equal(exams.length,8);
assert.equal(new Set(exams.slice(3).flatMap(e=>e.questions.map(q=>q.id))).size,70);
for(const e of exams.slice(3)){assert.equal(new Set(e.questions.map(q=>q.type)).size,4);for(const i of [0,1,2,3,4,6,7])assert.ok(e.questions.some(q=>q.lesson===i));}
for(const e of exams.slice(3)){assert.equal(e.minutes,90);assert.equal(e.questions.length,14);assert.equal(new Set(e.questions.map(q=>q.id)).size,14);assert.equal(e.questions.filter(q=>[0,1].includes(q.lesson)).length,5);assert.equal(e.questions.filter(q=>q.lesson===2).length,4);assert.equal(e.questions.filter(q=>[3,4,6,7].includes(q.lesson)).length,5);}
const legacy={done:[1,3],history:[{id:'old-record',exam:'core',title:'old',at:100,answers:old[0].questions.map(q=>q.answer)}],attempts:{core:{answers:Array(10).fill(null),deadline:99999999,index:2,submitted:false}},customKeep:'untouched'};
const state=hydrate(legacy);assert.deepEqual(state.done,legacy.done);assert.deepEqual(state.history,legacy.history);assert.deepEqual(state.attempts,legacy.attempts);assert.equal(state.customKeep,'untouched');
migrateWrong(state,exams);assert.equal(Object.keys(state.wrongNotes).length,0);
const e=exams[3],a={answers:e.questions.map((q,i)=>i===0?(q.answer+1)%4:q.answer),deadline:99999};
const record=makeRecord(e,a,false,200,'r1');assert.equal(record.correct,13);assert.equal(record.score,93);assert.equal(record.questions.length,14);
a.answers[1]=null;assert.notEqual(record.answers[1],null,'history is immutable');
recordWrong(state.wrongNotes,record,e.questions);const note=Object.values(state.wrongNotes)[0];assert.equal(Object.keys(state.wrongNotes).length,1);assert.equal(note.count,1);
note.resolved=true;recordWrong(state.wrongNotes,record,e.questions);assert.equal(note.resolved,true,'same result does not reopen note');
recordWrong(state.wrongNotes,{...record,id:'r2',at:300},e.questions);assert.equal(Object.values(state.wrongNotes)[0].count,2);assert.equal(Object.values(state.wrongNotes)[0].resolved,false);
const rows=breakdown(e.questions,record.answers);assert.equal(rows.reduce((n,x)=>n+x.correct,0),13);assert.equal(rows[5].percent,null);
assert.equal(validAttempt(a,e),true);assert.equal(validAttempt({...a,deadline:'bad'},e),false);
const unfinished=makeRecord(e,{answers:[]},true,400,'r3');assert.equal(unfinished.correct,0);assert.equal(unfinished.answers.every(x=>x===null),true);
const reload=hydrate(JSON.parse(JSON.stringify(state)));assert.deepEqual(reload,state);
console.log(JSON.stringify({status:'PASS',questions:bank.length,codeQuestions:bank.filter(q=>q.code).length,types:Object.fromEntries(['choice','blank','output','error'].map(t=>[t,bank.filter(q=>q.type===t).length])),levels:Object.fromEntries([1,2,3].map(t=>[t,bank.filter(q=>q.level===t).length])),tests:['legacy exam preservation','legacy state preservation','wrong-note migration','stable question IDs','grading','history snapshot independence','deduplication','resolved/reopened lifecycle','breakdown','unanswered grading','reload']},null,2));
