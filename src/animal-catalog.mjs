export const ANIMALS=Object.freeze({
 cat:{name:'고양이',icon:'🐱',externalTexture:true,flipY:true},
 fox:{name:'여우',icon:'🦊',externalTexture:true,flipY:true},
 owl:{name:'부엉이',icon:'🦉',externalTexture:true,flipY:true},
 colobus:{name:'콜로부스 원숭이',icon:'🐒'},gecko:{name:'도마뱀',icon:'🦎'},
 herring:{name:'청어',icon:'🐟'},inkfish:{name:'오징어',icon:'🦑'},
 muskrat:{name:'사향쥐',icon:'🐭'},pudu:{name:'푸두 사슴',icon:'🦌'},
 sparrow:{name:'참새',icon:'🐦'},taipan:{name:'타이판 뱀',icon:'🐍'},
 happy_horse:{name:'말',icon:'🐴',pack:'ithappy',smoothTexture:true},
 happy_deer:{name:'사슴',icon:'🦌',pack:'ithappy',smoothTexture:true},
 happy_kitty:{name:'아기 고양이',icon:'🐈',pack:'ithappy',smoothTexture:true},
 happy_dog:{name:'강아지',icon:'🐶',pack:'ithappy',smoothTexture:true},
 happy_penguin:{name:'펭귄',icon:'🐧',pack:'ithappy',smoothTexture:true},
 happy_chicken:{name:'닭',icon:'🐔',pack:'ithappy',smoothTexture:true},
 happy_tiger:{name:'호랑이',icon:'🐯',pack:'ithappy',smoothTexture:true},
 slime_big:{name:'큰 슬라임',icon:'🟢',pack:'slime',smoothTexture:true},
 slime_small:{name:'작은 슬라임',icon:'🟢',pack:'slime',smoothTexture:true},
 stickman:{name:'스틱맨',icon:'🧍',pack:'stickman',smoothTexture:true}
});
export const animalId=value=>Object.hasOwn(ANIMALS,value)?value:'cat';
export function motionFor(speed,y){return y>.015?'jump':speed>.12?(speed>5?'run':'walk'):'idle';}
