// Zonas de carga de archivos: arrastrar y soltar, selector y estado de cada zona.
(() => {
  const PYL = globalThis.PYL;
  const { $ } = PYL.ui.dom;

  const ZONES = ['dropi', 'meta', 'metrics'];

  // state: 'done' | 'err' | '' (neutro).
  function setStatus(which, msg, state) {
    const st = $('#st-' + which);
    st.textContent = msg;
    st.className = 'st ' + (state === 'err' ? 'bad' : state === 'done' ? 'ok' : 'muted');
    $('#drop-' + which).classList.toggle('done', state === 'done');
    $('#drop-' + which).classList.toggle('err', state === 'err');
  }

  // onFiles(files, zone) recibe los archivos soltados o elegidos en cada zona.
  function bind(onFiles) {
    ZONES.forEach((z) => {
      const drop = $('#drop-' + z), input = $('#file-' + z);
      input.addEventListener('change', () => { if (input.files.length) onFiles([...input.files], z); input.value = ''; });
      drop.addEventListener('dragover', (e) => { e.preventDefault(); drop.classList.add('over'); });
      drop.addEventListener('dragleave', () => drop.classList.remove('over'));
      drop.addEventListener('drop', (e) => { e.preventDefault(); drop.classList.remove('over'); if (e.dataTransfer.files.length) onFiles([...e.dataTransfer.files], z); });
    });
    // Soltar fuera de una zona no debe abrir el archivo en la pestaña.
    window.addEventListener('dragover', (e) => e.preventDefault());
    window.addEventListener('drop', (e) => e.preventDefault());
  }

  PYL.ui.uploadZones = { setStatus, bind };
})();
