/* One original drawing on a depth-shaped mesh. No video, camera or pose swapping. */
(() => {
  'use strict';
  const $ = s => document.querySelector(s);
  const stage = $('#stage'), canvas = $('#portrait'), wire = $('#wireframe');
  const status = $('#status'), direction = $('#direction');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const state = { x:0, y:0, gx:0, gy:0, tx:0, ty:0, blink:0, breath:0, phase:0, paused:reduced.matches, mesh:false, ready:false };
  const channels = {head:true, eyes:true, blink:true, breath:true};
  let gl, ctx2d, portraitImage, program, data, texture, buffer, indices, coords, drawPoints, profiles, sampler;
  let renders=0, renderTime=0;
  let lastRender='';
  let frame = 0, last = 0, visible = true, blinkAt = 0, blinkAnimation, returnTimer;
  const upper = [[246,161,160,159,158,157,173], [466,388,387,386,385,384,398]];
  const lower = [[7,163,144,145,153,154,155], [249,390,373,374,380,381,382]];
  const eyeCorners = [[33,133],[263,362]];
  const iris = [[468,469,470,471,472],[473,474,475,476,477]];
  const smooth = (a,b,v) => {const t=Math.max(0,Math.min(1,(v-a)/(b-a)));return t*t*(3-2*t);};
  const damp = (value,target,amount) => {const next=value+(target-value)*amount;return Math.abs(next-target)<.0001?target:next;};

  function prepareRegions() {
    const nose=data.points[1];
    profiles=data.points.map(p=>{
      const x=p[0]-.5,y=(p[1]-.34)*1.25;
      const ellipsoid=Math.max(0,1-x*x/(.34*.34)-y*y/(.43*.43));
      const z=.24*ellipsoid+.06*Math.exp(-((p[0]-nose[0])**2/.0015+(p[1]-nose[1])**2/.004));
      const head=1-smooth(.58,.82,p[1]);
      // Zero on the head and image perimeter. Deform the chest/shoulders locally,
      // never scale or translate the whole portrait to simulate a breath.
      // Start below the lowest face-adjacent vertices in the coarse fallback
      // mesh too; otherwise a long fallback triangle can tug the lower jaw.
      const torso=smooth(.64,.79,p[1])*(1-smooth(.90,1,p[1]))*smooth(0,.04,p[0])*(1-smooth(.96,1,p[0]));
      return {x,y,z,head,torso};
    });
  }

  function shader(type, source) {
    const s = gl.createShader(type); gl.shaderSource(s,source); gl.compileShader(s);
    if (!gl.getShaderParameter(s,gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    return s;
  }
  function setup() {
    gl = canvas.getContext('webgl', {alpha:false,antialias:true,preserveDrawingBuffer:true});
    coords=new Float32Array(data.points.length*4);
    drawPoints=new Float32Array(data.points.length*2);
    if (!gl) {
      ctx2d=canvas.getContext('2d',{alpha:false});
      if(!ctx2d)throw new Error('Canvas unavailable');
      indices=new Uint16Array(data.fallbackTriangles);
      canvas.classList.add('canvas-2d');stage.dataset.renderer='canvas2d';return;
    }
    stage.dataset.renderer='webgl';
    program = gl.createProgram();
    gl.attachShader(program,shader(gl.VERTEX_SHADER,`
      attribute vec2 position; attribute vec2 uv;
      varying vec2 texCoord;
      void main(){texCoord=uv;
        gl_Position=vec4(position.x*2.0-1.0,1.0-position.y*2.0,0.0,1.0);}`));
    gl.attachShader(program,shader(gl.FRAGMENT_SHADER,`
      precision mediump float;
      uniform sampler2D portrait;
      varying vec2 texCoord;
      void main(){vec3 c=texture2D(portrait,texCoord).rgb;
        gl_FragColor=vec4(c*vec3(0.952941,0.949020,0.929412),1.0);}`));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program,gl.LINK_STATUS)) throw new Error('Cannot link portrait shader');
    gl.useProgram(program);
    sampler=gl.getUniformLocation(program,'portrait');
    buffer=gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
    ['position','uv'].forEach((name,i)=>{
      const a=gl.getAttribLocation(program,name); gl.enableVertexAttribArray(a);
      gl.vertexAttribPointer(a,2,gl.FLOAT,false,16,i*8);
    });
    const ib=gl.createBuffer();gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,ib);
    indices=new Uint16Array(data.triangles);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,indices,gl.STATIC_DRAW);
  }
  function makeTexture(img) {
    const t=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,t);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D,0,gl.RGB,gl.RGB,gl.UNSIGNED_BYTE,img);
    return t;
  }
  function resize() {
    if (!gl && !ctx2d) return;
    const w=Math.min(ctx2d?800:1200,Math.round(stage.clientWidth*Math.min(devicePixelRatio||1,2)));
    const h=Math.round(w/0.8);
    if (canvas.width!==w || canvas.height!==h) {
      canvas.width=wire.width=w;canvas.height=wire.height=h;if(gl)gl.viewport(0,0,w,h);
    }
    render();
  }
  function render() {
    if (!state.ready) return;
    const started=performance.now();
    const yaw=state.x*.26,pitch=state.y*.16;
    const cy=Math.cos(yaw),sy=Math.sin(yaw),cp=Math.cos(pitch),sp=Math.sin(pitch);
    for(let i=0;i<drawPoints.length/2;i++){
      const p=data.points[i],r=profiles[i];
      const rx=r.x*cy+r.z*sy,rz=-r.x*sy+r.z*cy;
      const ry=r.y*cp+rz*sp;
      drawPoints[i*2]=p[0]+(rx-r.x)*r.head+r.x*.012*r.torso*state.breath;
      drawPoints[i*2+1]=p[1]+(ry-r.y)*r.head/1.25-.004*r.torso*state.breath;
      coords[i*4+2]=p[0];coords[i*4+3]=p[1];
    }
    // The irises follow slightly ahead of the head, independently of its pose.
    iris.flat().forEach(i=>{drawPoints[i*2]+=state.gx*.005;drawPoints[i*2+1]+=state.gy*.0025;});
    // Eyelid controls change the mesh itself. The illustrated eye texture closes
    // with the lid; no painted overlay or hidden video supplies the blink.
    for(let eye=0;eye<2;eye++){
      const [a,b]=eyeCorners[eye];
      const ax=drawPoints[a*2],ay=drawPoints[a*2+1],bx=drawPoints[b*2],by=drawPoints[b*2+1];
      const lineY=i=>ay+(by-ay)*(drawPoints[i*2]-ax)/(bx-ax);
      [...upper[eye],...lower[eye],...iris[eye]].forEach(i=>{
        const y0=drawPoints[i*2+1];drawPoints[i*2+1]=y0+(lineY(i)-y0)*state.blink*.985;
      });
    }
    for(let i=0;i<drawPoints.length/2;i++){
      coords[i*4]=drawPoints[i*2];coords[i*4+1]=drawPoints[i*2+1];
    }
    if(gl){
      gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,coords,gl.DYNAMIC_DRAW);
      gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,texture);gl.uniform1i(sampler,0);
      gl.drawElements(gl.TRIANGLES,indices.length,gl.UNSIGNED_SHORT,0);
    }else renderCanvas2D();
    if(state.mesh){
      const c=wire.getContext('2d');c.clearRect(0,0,wire.width,wire.height);
      c.strokeStyle='rgba(245,189,90,.50)';c.lineWidth=.65;c.beginPath();
      for(let i=0;i<indices.length;i+=3){
        for(let k=0;k<3;k++){
          const v=indices[i+k];const px=drawPoints[v*2]*wire.width,py=drawPoints[v*2+1]*wire.height;
          if(k===0)c.moveTo(px,py);else c.lineTo(px,py);
        }c.closePath();
      }c.stroke();
      // These are the actual independently driven vertices, not a decorative grid.
      const dots=(vertices,color)=>{c.fillStyle=color;vertices.forEach(i=>{c.beginPath();c.arc(drawPoints[i*2]*wire.width,drawPoints[i*2+1]*wire.height,2.3,0,Math.PI*2);c.fill();});};
      dots(iris.flat(),'#fff');dots([...upper.flat(),...lower.flat()],'#b76d34');
      dots(profiles.map((r,i)=>r.torso>.8?i:-1).filter(i=>i>=0),'#444');
    }
    stage.dataset.aim=`${state.x.toFixed(3)},${state.y.toFixed(3)}`;
    stage.dataset.gaze=`${state.gx.toFixed(3)},${state.gy.toFixed(3)}`;
    stage.dataset.blink=state.blink.toFixed(3);
    stage.dataset.breath=state.breath.toFixed(4);
    stage.dataset.frames=String(++renders);
    renderTime+=performance.now()-started;
    if(renders%24===1) $('#render-info').textContent=`[ ${gl?'WebGL':'Canvas 2D'} / ${indices.length/3} triangles / ${(renderTime/renders).toFixed(1)} ms average CPU draw ]`;
  }
  function renderCanvas2D() {
    const c=ctx2d,w=canvas.width,h=canvas.height,iw=portraitImage.naturalWidth,ih=portraitImage.naturalHeight;
    c.setTransform(1,0,0,1,0,0);c.fillStyle='#fff';c.fillRect(0,0,w,h);
    for(let n=0;n<indices.length;n+=3){
      const vs=[indices[n],indices[n+1],indices[n+2]];
      const s=vs.map(i=>[data.points[i][0]*iw,data.points[i][1]*ih]);
      const d=vs.map(i=>[drawPoints[i*2]*w,drawPoints[i*2+1]*h]);
      const sx1=s[1][0]-s[0][0],sy1=s[1][1]-s[0][1],sx2=s[2][0]-s[0][0],sy2=s[2][1]-s[0][1];
      const dx1=d[1][0]-d[0][0],dy1=d[1][1]-d[0][1],dx2=d[2][0]-d[0][0],dy2=d[2][1]-d[0][1];
      const det=sx1*sy2-sx2*sy1;if(Math.abs(det)<.0001)continue;
      const a=(dx1*sy2-dx2*sy1)/det,b=(dy1*sy2-dy2*sy1)/det;
      const cc=(dx2*sx1-dx1*sx2)/det,dd=(dy2*sx1-dy1*sx2)/det;
      const sides=[Math.hypot(d[1][0]-d[2][0],d[1][1]-d[2][1]),Math.hypot(dx2,dy2),Math.hypot(dx1,dy1)];
      const perimeter=sides[0]+sides[1]+sides[2];if(perimeter<.001)continue;
      const mx=d.reduce((v,p,k)=>v+p[0]*sides[k],0)/perimeter,my=d.reduce((v,p,k)=>v+p[1]*sides[k],0)/perimeter;
      const radius=Math.abs(dx1*dy2-dx2*dy1)/perimeter;
      const overlap=1+Math.min(10,.7/Math.max(.01,radius));
      c.save();c.beginPath();
      d.forEach(([x,y],k)=>{const ex=mx+(x-mx)*overlap,ey=my+(y-my)*overlap;if(k===0)c.moveTo(ex,ey);else c.lineTo(ex,ey);});
      c.closePath();c.clip();
      c.setTransform(a,b,cc,dd,d[0][0]-a*s[0][0]-cc*s[0][1],d[0][1]-b*s[0][0]-dd*s[0][1]);
      c.drawImage(portraitImage,0,0);c.restore();
    }
  }
  function schedule() { if(!frame && state.ready && visible && !document.hidden) frame=requestAnimationFrame(tick); }
  function tick(time) {
    frame=0;if(state.paused || !visible || document.hidden || !state.ready)return;
    if(time-last<1000/(ctx2d?24:60)-.5){schedule();return;}
    const dt=Math.min(.1,(time-last)/1000||.016);last=time;
    if(!state.paused){
      const follow=1-Math.exp(-dt*11);
      state.x=damp(state.x,channels.head?state.tx:0,follow);state.y=damp(state.y,channels.head?state.ty:0,follow);
      const gaze=1-Math.exp(-dt*24);state.gx=damp(state.gx,channels.eyes?state.tx:0,gaze);state.gy=damp(state.gy,channels.eyes?state.ty:0,gaze);
      if(channels.breath){state.phase+=dt;state.breath=(1-Math.cos(state.phase*Math.PI*2/5.8))*.5;}
      else state.breath=damp(state.breath,0,follow);
    }
    const key=[state.x,state.y,state.gx,state.gy,state.blink,state.breath].map(v=>v.toFixed(4)).join(':');
    if(key!==lastRender){render();lastRender=key;}
    if(!state.paused && visible && !document.hidden){
      if(channels.blink && time>blinkAt && !blinkAnimation){blink();blinkAt=time+4400+Math.random()*2800;}
      schedule();
    }
  }
  function blink() {
    if(state.paused || !state.ready || !visible || document.hidden || !window.anime) return;
    blinkAnimation?.revert();state.blink=0;
    blinkAnimation=window.anime.createTimeline({onComplete:()=>{state.blink=0;blinkAnimation=null;}})
      .add(state,{blink:1,duration:95,ease:'inQuad'})
      .add(state,{blink:0,duration:165,ease:'outQuad'},'+=35');
    blinkAt=performance.now()+5000;schedule();
  }
  function aim(x,y) {
    if(state.paused || !state.ready) return;
    clearTimeout(returnTimer);state.tx=Math.max(-1,Math.min(1,x));state.ty=Math.max(-1,Math.min(1,y));
    const h=Math.abs(x)<.2?'':x<0?'left':'right';const v=Math.abs(y)<.2?'':y<0?'Up':'Down';
    direction.textContent=[v,h].filter(Boolean).join(' ')||'Center';
    document.querySelectorAll('[data-aim]').forEach(b=>b.classList.toggle('selected',b.dataset.aim===`${state.tx},${state.ty}`));
    schedule();
  }
  function pause(value) {
    state.paused=value;$('#pause').setAttribute('aria-pressed',String(value));
    $('#pause').textContent=value?'Enable motion':'Pause motion';
    stage.classList.toggle('paused',value);stage.classList.remove('tracking');
    status.textContent=value?'[ Motion paused ]':'[ Follow mode ]';
    blinkAnimation?.revert();blinkAnimation=null;state.blink=0;
    if(value){cancelAnimationFrame(frame);frame=0;render();}
    else{last=performance.now();blinkAt=last+5000;schedule();}
    $('#blink').disabled=value || !window.anime;
    $('#center').disabled=value;
    $('.channels').disabled=value;
    document.querySelectorAll('[data-aim]').forEach(b=>b.disabled=value);
  }
  function pointer(e) {
    if(state.paused || (e.pointerType==='touch' && !stage.hasPointerCapture(e.pointerId))) return;
    const r=stage.getBoundingClientRect();const x=(e.clientX-r.left)/r.width,y=(e.clientY-r.top)/r.height;
    aim((x-.5)*2,(y-.4)*2.5);
    $('.reticle').style.left=`${Math.max(0,Math.min(1,x))*100}%`;
    $('.reticle').style.top=`${Math.max(0,Math.min(1,y))*100}%`;
    stage.classList.add('tracking');
  }
  stage.addEventListener('pointerdown',e=>{if(e.button!==0 || state.paused || !state.ready)return;stage.setPointerCapture(e.pointerId);pointer(e);});
  stage.addEventListener('pointermove',pointer);
  stage.addEventListener('pointerup',e=>{if(stage.hasPointerCapture(e.pointerId))stage.releasePointerCapture(e.pointerId);stage.classList.remove('tracking');});
  stage.addEventListener('pointercancel',()=>{stage.classList.remove('tracking');aim(0,0);});
  stage.addEventListener('pointerleave',e=>{if(!stage.hasPointerCapture(e.pointerId)){stage.classList.remove('tracking');if(e.pointerType!=='touch')returnTimer=setTimeout(()=>aim(0,0),500);}});
  stage.addEventListener('keydown',e=>{
    const keys={ArrowLeft:[-.25,0],ArrowRight:[.25,0],ArrowUp:[0,-.25],ArrowDown:[0,.25]};
    if(keys[e.key]){e.preventDefault();aim(state.tx+keys[e.key][0],state.ty+keys[e.key][1]);}
    if(e.key==='Home'){e.preventDefault();aim(0,0);}if(e.key.toLowerCase()==='b')blink();
  });
  $('#blink').addEventListener('click',blink);$('#center').addEventListener('click',()=>aim(0,0));
  $('#pause').addEventListener('click',()=>pause(!state.paused));
  $('#mesh').addEventListener('click',()=>{state.mesh=!state.mesh;stage.classList.toggle('show-mesh',state.mesh);$('#mesh').textContent=state.mesh?'Hide rig':'Show rig';$('#mesh').setAttribute('aria-pressed',String(state.mesh));render();});
  document.querySelectorAll('[data-aim]').forEach(b=>b.addEventListener('click',()=>aim(...b.dataset.aim.split(',').map(Number))));
  for(const [id,channel] of Object.entries({'move-head':'head','move-eyes':'eyes','auto-blink':'blink','breathe':'breath'})){
    $('#'+id).addEventListener('change',e=>{channels[channel]=e.target.checked;
      if(channel==='blink' && !channels.blink){blinkAnimation?.revert();blinkAnimation=null;state.blink=0;}
      if(channel==='breath' && channels.breath)state.phase=0;
      schedule();
    });
  }
  reduced.addEventListener('change',()=>{if(reduced.matches)pause(true);});
  function visibilityChanged(){
    if(state.paused || !visible || document.hidden){cancelAnimationFrame(frame);frame=0;blinkAnimation?.pause();}
    else {blinkAnimation?.resume();last=performance.now();blinkAt=last+4000;schedule();}
  }
  document.addEventListener('visibilitychange',visibilityChanged);
  new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;visibilityChanged();},{threshold:.01}).observe(stage);
  new ResizeObserver(resize).observe(stage);
  canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();pause(true);state.ready=false;stage.classList.remove('ready');status.textContent='[ Static portrait ]';document.querySelectorAll('button').forEach(b=>b.disabled=true);});
  async function init() {
    try {
      const response=await fetch('rig-data.json');if(!response.ok)throw new Error('Portrait data unavailable');data=await response.json();
      const img=await new Promise((resolve,reject)=>{const i=new Image();i.onload=()=>resolve(i);i.onerror=()=>reject(new Error('Portrait image unavailable'));i.src=data.file;});
      portraitImage=img;prepareRegions();setup();if(gl)texture=makeTexture(img);state.ready=true;resize();
      stage.classList.add('ready');document.querySelectorAll('button').forEach(b=>b.disabled=false);
      pause(reduced.matches);
    } catch(error) {
      status.textContent='[ Static portrait ]';$('.lead').textContent='The interactive portrait could not load. The original artwork is shown.';
      stage.dataset.error=error.message || 'Image unavailable';
    }
  }
  init();
})();
