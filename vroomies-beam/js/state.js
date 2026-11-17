const NAMES=['Mimi','Lulu','Coco','Nunu','Riri','Toto','Bibi','Fifi','Popo','Zuzu','Vivi','Dodo','Gigi','Kiki','Momo','Pipi','Titi','Lala','Baba','Sasa','Roro','Tutu','Wawa','Yoyo','Juju','Mumu','Papa','Bebé','Coco2','Nana'];
const SKINS=['#ff6b8a','#9bbcff','#a8e6cf','#fff3a0','#d4a574','#ffb3d9','#c7a3ff','#8b5a3c','#ff8fc7','#ffb347','#b3e5fc','#ce93d8','#f48fb1','#80deea','#aed581','#ffcc80','#bcaaa4','#90a4ae','#ef9a9a','#80cbc4','#fff59d','#ffe082','#ffab91','#c5e1a5','#b39ddb','#9fa8da','#f06292','#64b5f6','#ffb74d','#a1887f'];
const Game={state:'menu',menuScreen:'main',settings:{sound:true,players:1},selectedTrack:0,kartCount:8,laps:3,difficulty:'Normal',char:'Mimi',pause:false,race:null,records:(()=>{try{return JSON.parse(localStorage.getItem('vroomiiies_records')||'{}');}catch(e){return {};}})()};
function setState(s){Game.state=s; if(window.UI&&UI.refresh)UI.refresh();}
function saveSettings(){localStorage.setItem('vroomiiies_settings',JSON.stringify(Game.settings));}
function loadSettings(){try{const s=JSON.parse(localStorage.getItem('vroomiiies_settings')||'null');if(s)Game.settings={...Game.settings,...s};}catch(e){}}
