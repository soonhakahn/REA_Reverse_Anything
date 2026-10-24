// Pure helpers shared by the UI and regression checks.
export const TYPES={choice:'객관식',blank:'코드 빈칸',output:'결과 예측',error:'오류 찾기'};
export const LEVELS={1:'기초',2:'응용',3:'심화'};
export function hydrate(raw){
 const v=raw&&typeof raw==='object'&&!Array.isArray(raw)?raw:{};
 return {...v,done:Array.isArray(v.done)?v.done.filter(x=>Number.isInteger(x)&&x>=0&&x<8):[],history:Array.isArray(v.history)?v.history.filter(x=>x&&typeof x==='object'):[],attempts:v.attempts&&typeof v.attempts==='object'&&!Array.isArray(v.attempts)?v.attempts:{},wrongNotes:v.wrongNotes&&typeof v.wrongNotes==='object'&&!Array.isArray(v.wrongNotes)?v.wrongNotes:{}};
}
export function questionId(q,examId,index){return q.id||`legacy:${examId}:${index}`}
export function breakdown(questions,answers){
 const rows=Array.from({length:8},(_,lesson)=>({lesson,total:0,correct:0}));
 questions.forEach((q,i)=>{if(rows[q.lesson]){rows[q.lesson].total++;if(answers[i]===q.answer)rows[q.lesson].correct++}});
 return rows.map(r=>({...r,percent:r.total?Math.round(100*r.correct/r.total):null}));
}
export function makeRecord(exam,attempt,automatic=false,now=Date.now(),id=crypto.randomUUID()){
 const answers=exam.questions.map((q,i)=>Number.isInteger(attempt.answers[i])&&attempt.answers[i]>=0&&attempt.answers[i]<q.options.length?attempt.answers[i]:null);
 const correct=exam.questions.filter((q,i)=>q.answer===answers[i]).length;
 return {id,exam:exam.id,title:exam.title,answers,questions:structuredClone(exam.questions),score:Math.round(100*correct/exam.questions.length),correct,at:now,automatic};
}
export function recordWrong(notes,record,questions){
 questions.forEach((q,i)=>{if(record.answers?.[i]===q.answer)return;
 const id=questionId(q,record.exam,i),prev=notes[id];
 if(prev&&prev.lastAt>=record.at)return;
 notes[id]={id,question:structuredClone({...q,id}),answer:record.answers?.[i]??null,firstAt:prev?.firstAt??record.at,lastAt:record.at,count:(prev?.count||0)+1,recordId:record.id,resolved:false};
 });return notes;
}
export function migrateWrong(state,exams){
 if(state.wrongNotesMigrated)return;
 [...state.history].sort((a,b)=>a.at-b.at).forEach(r=>{
 const qs=r.questions||exams.find(e=>e.id===r.exam)?.questions;
 if(Array.isArray(qs)&&Array.isArray(r.answers)&&Number.isFinite(r.at))recordWrong(state.wrongNotes,r,qs);
 });state.wrongNotesMigrated=true;
}
export function validAttempt(a,e){return a&&Array.isArray(a.answers)&&a.answers.length===e.questions.length&&Number.isFinite(a.deadline)}
