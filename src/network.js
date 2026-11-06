export class SchoolConnection {
 constructor(url,onState,onStatus,onEvent=()=>{}){this.onEvent=onEvent;this.url=url;this.onState=onState;this.onStatus=onStatus;this.connected=false;this.seq=0;this.pending=[];this.retry=0;}
 connect(profile){this.profile=profile;this.stopped=false;this.open();}
 open(){
  this.onStatus('서버 연결 중…');const ws=this.ws=new WebSocket(this.url);
  ws.onopen=()=>{const key=`school:${this.url}:${this.profile.role}:${this.profile.number}`;this.key=key;ws.send(JSON.stringify({type:'join',...this.profile,token:sessionStorage.getItem(key)}));};
  ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.type==='error'){this.stopped=true;this.onStatus(m.message);}
   if(m.type==='welcome'){this.connected=true;this.id=m.id;this.seq=m.ack;this.pending=[];sessionStorage.setItem(this.key,m.token);this.onStatus('연결 완료');this.retry=0;}
   if(['gameEvent','commandRejected'].includes(m.type))this.onEvent(m);
   if(m.type==='state'&&this.connected)this.onState(m);
  };
  ws.onerror=()=>this.onStatus('서버에 연결할 수 없어요. 서버 주소와 실행 상태를 확인해 주세요.');
  ws.onclose=()=>{this.connected=false;if(this.stopped)return;this.onStatus('연결 끊김 · 다시 연결 중…');if(++this.retry<=20)setTimeout(()=>this.open(),Math.min(10000,700*2**Math.min(this.retry,4))+Math.random()*300);else this.onStatus('재연결하지 못했어요. 페이지를 새로고침해 주세요.');};
 }
 send(m){if(this.connected&&this.ws.readyState===WebSocket.OPEN)this.ws.send(JSON.stringify(m));}
 input(i){if(!this.connected||this.pending.length>=90)return false;const m={type:'input',seq:++this.seq,...i};this.pending.push(m);this.ws.send(JSON.stringify(m));return true;}
}
