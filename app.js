(() => {
  'use strict';
  function boot() {
    document.documentElement.classList.add('js');
    const cfg = window.WEDDING_CONFIG || {};
    const $ = id => document.getElementById(id);
    const setText = (id, value) => { const el = $(id); if (el && value != null) el.textContent = String(value); };
    const first = cfg.pareja?.nombre1 || 'Fátima';
    const second = cfg.pareja?.nombre2 || 'Humberto';
    const weddingDate = new Date(cfg.fechaISO || '2026-11-28T18:30:00-05:00');

    setText('fullName1', cfg.pareja?.nombreCompleto1 || 'Fátima Yarlequé Juarez');
    setText('fullName2', cfg.pareja?.nombreCompleto2 || 'Humberto Gómez García');
    setText('storyMessage', cfg.pareja?.mensaje);
    setText('ceremonyPlace', cfg.ceremonia?.lugar);
    setText('ceremonyReference', cfg.ceremonia?.referencia);
    setText('ceremonyTime', cfg.ceremonia?.hora);
    setText('receptionAddress', cfg.recepcion?.direccion);
    setText('closingMessage', cfg.mensajeFinal);
    if (cfg.ceremonia?.mapa) $('churchMap').href = cfg.ceremonia.mapa;
    if (cfg.recepcion?.mapa) $('receptionMap').href = cfg.recepcion.mapa;

    let toastTimer;
    function toast(message) {
      const el=$('toast'); if(!el) return;
      el.textContent=message;el.classList.add('is-visible');
      clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('is-visible'),4300);
    }

    const audio = $('weddingAudio');
    const player = $('audioPill');
    const toggle = $('audioToggle');
    let pendingMusic=false;
    if (audio) {
      // El archivo es local, no depende de plataformas de terceros.
      audio.volume=.65;
      audio.loop=true;
      audio.preload='auto';
      if (!audio.querySelector('source') && cfg.musica) audio.src=cfg.musica;
    }
    function updateMusicButton() {
      const playing=!!audio && !audio.paused;
      if (toggle) {
        toggle.textContent=playing?'Ⅱ':'▶';
        toggle.setAttribute('aria-label',playing?'Pausar música':'Reproducir música');
        toggle.title=playing?'Pausar música':'Reproducir música';
      }
      if(playing) {pendingMusic=false;player?.classList.remove('needs-tap');}
    }
    function playMusic(fromUser=false) {
      if(!audio) return;
      // La llamada a play() ocurre dentro del click que abre la carta.
      try {
        const attempt=audio.play();
        if(attempt && typeof attempt.then==='function') attempt.then(updateMusicButton).catch(() => {
          pendingMusic=true;player?.classList.add('needs-tap');updateMusicButton();
          if(fromUser) toast('Toca ▶ para comenzar nuestra canción.');
        });
      } catch(_) {
        pendingMusic=true;player?.classList.add('needs-tap');
        if(fromUser) toast('Puedes activar la música con el botón ▶.');
      }
    }
    if(audio) {
      ['play','pause','ended'].forEach(name=>audio.addEventListener(name,updateMusicButton));
      audio.addEventListener('error',() => {pendingMusic=true;player?.classList.add('needs-tap');updateMusicButton();});
    }
    toggle?.addEventListener('click', () => {
      if(!audio)return;
      if(audio.paused) playMusic(true); else audio.pause();
    });

    // Una sola secuencia de apertura: carta se levanta y después se revela el contenido.
    let opened=false;
    const opening=$('opening');
    function openInvitation() {
      if(opened)return;opened=true;
      if(player)player.hidden=false;
      playMusic(true);
      opening?.classList.add('is-opening');
      setTimeout(()=> {
        opening?.classList.add('is-dismissing');
        document.body.classList.remove('locked');
        document.body.classList.add('entered');
        buildPetals();
        setTimeout(()=>{if(opening) opening.hidden=true;},1150);
      },1000);
    }
    $('openInvite')?.addEventListener('click',openInvitation);
    $('letterButton')?.addEventListener('click',openInvitation);

    // Pétalos ligeros y espaciados; las fotografías permanecen inmóviles.
    function buildPetals() {
      const layer=$('petalLayer');
      if(!layer || layer.childElementCount || matchMedia('(prefers-reduced-motion: reduce)').matches)return;
      const count=innerWidth<700?9:15;
      for(let i=0;i<count;i++){
        const p=document.createElement('span');p.className='petal';
        const x=(i*31.7+11)%100;
        const size=9+(i%6)*1.7;
        const duration=26+(i%5)*3.2;
        p.style.setProperty('--x',x+'%');
        p.style.setProperty('--size',size+'px');
        p.style.setProperty('--duration',duration+'s');
        p.style.setProperty('--delay',(-i*3.9)+'s');
        p.style.setProperty('--sway',(i%2?-28:35)+'px');
        p.style.setProperty('--drift',((i%4)-1.5)*46+'px');
        layer.appendChild(p);
      }
    }

    function updateCountdown() {
      const diff=Math.max(0,weddingDate.getTime()-Date.now());
      setText('days',String(Math.floor(diff/86400000)).padStart(3,'0'));
      setText('hours',String(Math.floor(diff%86400000/3600000)).padStart(2,'0'));
      setText('minutes',String(Math.floor(diff%3600000/60000)).padStart(2,'0'));
      setText('seconds',String(Math.floor(diff%60000/1000)).padStart(2,'0'));
    }
    updateCountdown();setInterval(updateCountdown,1000);

    $('calendarButton')?.addEventListener('click', () => {
      const escapeICS=v=>String(v||'').replace(/\\/g,'\\\\').replace(/\n/g,'\\n').replace(/,/g,'\\,').replace(/;/g,'\\;');
      const icsTime=d=>d.toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,'');
      const lines=[
        'BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Boda Fatima Humberto//ES','CALSCALE:GREGORIAN','BEGIN:VEVENT',
        'UID:boda-fh-20261128@invitacion.local','DTSTAMP:'+icsTime(new Date()),'DTSTART:'+icsTime(weddingDate),
        'DURATION:PT1H','SUMMARY:'+escapeICS('Matrimonio de '+first+' y '+second),
        'LOCATION:'+escapeICS((cfg.ceremonia?.lugar||'')+', Piura, Perú'),
        'DESCRIPTION:'+escapeICS('Ceremonia religiosa a las 6:30 p. m. '+(cfg.ceremonia?.mapa||'')),
        'END:VEVENT','END:VCALENDAR'
      ];
      const blob=new Blob([lines.join('\r\n')],{type:'text/calendar;charset=utf-8'});
      const url=URL.createObjectURL(blob);
      const a=document.createElement('a');a.href=url;a.download='boda-fatima-humberto.ics';
      document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),2500);
      toast('Se descargó el recordatorio del 28 de noviembre.');
    });

    $('shareButton')?.addEventListener('click',async()=>{
      const data={title:'Boda de '+first+' y '+second,text:'Acompáñanos el 28 de noviembre de 2026.',url:location.href};
      try{
        if(navigator.share){await navigator.share(data);return;}
        if(navigator.clipboard?.writeText){await navigator.clipboard.writeText(location.href);toast('Enlace copiado.');return;}
        prompt('Copia el enlace de la invitación:',location.href);
      }catch(e){if(e?.name!=='AbortError')toast('No se pudo compartir el enlace.');}
    });

    const targets=document.querySelectorAll('.reveal');
    if('IntersectionObserver' in window){
      const observer=new IntersectionObserver(entries=>{
        entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('is-visible');observer.unobserve(entry.target);}});
      },{threshold:.07,rootMargin:'0px 0px -30px 0px'});
      targets.forEach(el=>observer.observe(el));
    } else targets.forEach(el=>el.classList.add('is-visible'));
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
