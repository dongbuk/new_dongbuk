export const BOUNDS = 35;
export const RADIUS = .38;
export const walls = [];
export function obstacle(x,z,w,d,h=2,kind='wall'){const o={x,z,w,d,h,kind};walls.push(o);return o;}
// Shared geometry is deliberately independent of Three.js for the future authoritative server.
obstacle(0,-25,42,1,5); obstacle(-21,-20,1,10,5);obstacle(21,-20,1,10,5);
obstacle(-14,-15,14,1,5);obstacle(14,-15,14,1,5); // two broad entrances
for(const x of [-14,0,14]){obstacle(x,-21,1,7,4);}
obstacle(-28,-9,1,20,4); obstacle(-22,-19,12,1,4);obstacle(-22,1,12,1,4);obstacle(-16,-12,1,14,4);
obstacle(28,-9,1,20,4);obstacle(22,-19,12,1,4);obstacle(22,1,12,1,4);obstacle(16,-12,1,14,4);
for(const [x,z] of [[-24,12],[-29,19],[-20,24],[-13,20],[24,10],[28,21],[18,27],[-30,-28],[29,-28]])obstacle(x,z,1.2,1.2,4,'tree');
export const benches=[{x:-10,z:8},{x:10,z:8},{x:-22,z:17},{x:23,z:15}];
for(const b of benches)obstacle(b.x,b.z,2.5,.8,1,'bench');
// The jail is explorable in stage one; gating belongs to the server phase.
obstacle(25,30,9,.3,2,'fence');obstacle(20.5,27,.3,6,2,'fence');obstacle(29.5,27,.3,6,2,'fence');
export function collides(x,z,r=RADIUS){if(Math.abs(x)>BOUNDS-r||Math.abs(z)>BOUNDS-r)return true;return walls.some(o=>{const dx=x-Math.max(o.x-o.w/2,Math.min(x,o.x+o.w/2));const dz=z-Math.max(o.z-o.d/2,Math.min(z,o.z+o.d/2));return dx*dx+dz*dz<r*r;});}
export function move(p,dx,dz){const steps=Math.max(1,Math.ceil(Math.hypot(dx,dz)/.15));for(let i=0;i<steps;i++){if(!collides(p.x+dx/steps,p.z))p.x+=dx/steps;if(!collides(p.x,p.z+dz/steps))p.z+=dz/steps;}return p;}
export function zone(x,z){if(z<-14)return '본관 · 1층 복도';if(x<-15&&z<2)return '체육관';if(x>15&&z<2)return '도서관';if(x>19&&z>23)return '감옥 · 구출 구역';if(x<-13&&z>8)return '초록 정원';if(z>14)return '운동장';return '중앙 광장';}
